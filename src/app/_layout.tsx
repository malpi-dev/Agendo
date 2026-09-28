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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createMockRepositories, RepositoryProvider } from '@/core/di';
import { queryClient, setupQueryManagers } from '@/core/query';
import { useSessionStore } from '@/core/session';
import { ThemeGate } from '@/core/theme';
import { ToastHost } from '@/core/ui';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const ready = fontsLoaded || fontError !== null;

  const isDemo = useSessionStore((s) => s.mode === 'demo');
  const demoDb = useSessionStore((s) => s.demoDb);
  const repositories = useMemo(
    () => (isDemo && demoDb ? createMockRepositories(demoDb) : null),
    [isDemo, demoDb],
  );

  useEffect(() => setupQueryManagers(), []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeGate>
            <RepositoryProvider repositories={repositories}>
              <Stack screenOptions={{ headerShown: false }}>
                {/* Phase 07: auth guard also considers the Supabase session and profile. */}
                <Stack.Protected guard={!isDemo}>
                  <Stack.Screen name="(auth)" />
                </Stack.Protected>
                <Stack.Protected guard={isDemo}>
                  <Stack.Screen name="(app)" />
                </Stack.Protected>
              </Stack>
            </RepositoryProvider>
            <ToastHost />
          </ThemeGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
