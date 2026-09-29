import '@/global.css';

import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { isSupabaseConfigured } from '@/core/config/env';
import {
  createMockRepositories,
  createSupabaseRepositories,
  RepositoryProvider,
  useRepositoriesOrNull,
  type Repositories,
} from '@/core/di';
import { queryClient, setUnauthorizedHandler, setupQueryManagers } from '@/core/query';
import { useSessionStore } from '@/core/session';
import { getSupabaseClient } from '@/core/supabase/client';
import { ThemeGate } from '@/core/theme';
import { Button, ErrorState, showToast, ToastHost } from '@/core/ui';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { useAuthBootstrap } from '@/features/auth/presentation/hooks/use-auth-bootstrap';
import { useMyProfile } from '@/features/auth/presentation/hooks/use-my-profile';
import { configureNotifications } from '@/features/notifications/presentation/notifications-service';
import { useNotificationObserver } from '@/features/notifications/presentation/hooks/use-notification-observer';
import { unregisterPushToken } from '@/features/notifications/presentation/unregister-push-token';

void SplashScreen.preventAutoHideAsync();
void configureNotifications().catch(() => undefined);

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const repositories = useRepositoriesOrNull();
  const isDemo = useSessionStore((s) => s.mode === 'demo');
  const authStatus = useAuthStore((s) => s.status);
  const profileQuery = useMyProfile();

  const signedIn = !isDemo && authStatus === 'signedIn';
  const profileLoaded = profileQuery.isSuccess;
  const hasProfile = profileLoaded && profileQuery.data !== null;
  const needsOnboarding = profileLoaded && profileQuery.data === null;
  const profileFailed = signedIn && profileQuery.isError;

  useNotificationObserver(isDemo || (signedIn && hasProfile));

  // Keep the splash until we know where to go, so no intermediate screen is visible.
  const resolved = isDemo || authStatus === 'signedOut' || profileLoaded || profileFailed;
  useEffect(() => {
    if (fontsReady && resolved) void SplashScreen.hideAsync();
  }, [fontsReady, resolved]);

  // An expired session (RLS/JWT rejects a request) signs the user out.
  useEffect(() => {
    if (!repositories || isDemo) return;
    let handling = false;
    setUnauthorizedHandler(() => {
      if (handling || useAuthStore.getState().status !== 'signedIn') return;
      handling = true;
      showToast('Your session expired. Please sign in again.', 'warning');
      void repositories.auth.signOut().finally(() => {
        handling = false;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, [repositories, isDemo]);

  if (!fontsReady || !resolved) return null;

  if (profileFailed) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState
          error={profileQuery.error}
          onRetry={() => void profileQuery.refetch()}
          testID="profile-error"
        />
        <View className="px-8 pb-12">
          <Button
            title="Sign out"
            variant="ghost"
            testID="profile-error-sign-out"
            onPress={() => {
              if (!repositories) return;
              void unregisterPushToken(repositories).then(() => repositories.auth.signOut());
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isDemo && authStatus === 'signedOut'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && needsOnboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={isDemo || (signedIn && hasProfile)}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const fontsReady = fontsLoaded || fontError !== null;

  const isDemo = useSessionStore((s) => s.mode === 'demo');
  const demoDb = useSessionStore((s) => s.demoDb);
  const repositories = useMemo<Repositories | null>(() => {
    if (isDemo) return demoDb ? createMockRepositories(demoDb) : null;
    return isSupabaseConfigured ? createSupabaseRepositories(getSupabaseClient()) : null;
  }, [isDemo, demoDb]);

  useAuthBootstrap(isDemo ? null : (repositories?.auth ?? null));
  useEffect(() => setupQueryManagers(), []);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeGate>
            <RepositoryProvider repositories={repositories}>
              <RootNavigator fontsReady={fontsReady} />
            </RepositoryProvider>
            <ToastHost />
          </ThemeGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
