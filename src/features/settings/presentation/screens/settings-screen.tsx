import Constants from 'expo-constants';
import { useState } from 'react';
import { Linking } from 'react-native';

import { useRepositoriesOrNull } from '@/core/di';
import { useSessionStore } from '@/core/session';
import { AppText, Button, Card, Screen, showToast, Skeleton } from '@/core/ui';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { useCurrentUser } from '@/features/auth/presentation/hooks/use-current-user';
import { useReminderPermission } from '@/features/notifications/presentation/hooks/use-reminder-permission';
import { unregisterPushToken } from '@/features/notifications/presentation/unregister-push-token';

// Minimal version: phase 11 adds theme selection and profile editing.
export default function SettingsScreen() {
  const mode = useSessionStore((s) => s.mode);
  const demoRole = useSessionStore((s) => s.demoRole);
  const setDemoRole = useSessionStore((s) => s.setDemoRole);
  const exitDemo = useSessionStore((s) => s.exitDemo);
  const repositories = useRepositoriesOrNull();
  const email = useAuthStore((s) => s.session?.email);
  const user = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);
  const permission = useReminderPermission();

  // The auth listener clears the cache and the route guards return to Sign in.
  const signOut = async () => {
    if (!repositories) return;
    setSigningOut(true);
    try {
      await unregisterPushToken(repositories);
      await repositories.auth.signOut();
    } catch {
      showToast("Couldn't sign out. Please try again.", 'danger');
      setSigningOut(false);
    }
  };

  return (
    <Screen scroll edges={['left', 'right']} className="gap-4 pt-4" testID="settings-screen">
      <AppText variant="title">Settings</AppText>

      {mode === 'demo' ? (
        <Card className="gap-3">
          <AppText variant="subtitle">Demo</AppText>
          <AppText tone="muted" variant="caption">
            You are exploring as {demoRole}. Data lives in memory and resets when the app closes.
          </AppText>
          <Button
            title="Switch role (demo)"
            variant="secondary"
            onPress={() => setDemoRole(demoRole === 'admin' ? 'client' : 'admin')}
            testID="demo-switch-role"
          />
          <Button title="Exit demo" variant="danger" onPress={exitDemo} testID="demo-exit" />
        </Card>
      ) : null}

      <Card className="gap-3" testID="reminders-section">
        <AppText variant="subtitle">Reminders</AppText>
        {permission === 'unknown' ? (
          <Skeleton className="h-5 w-40" testID="reminders-loading" />
        ) : permission === 'granted' ? (
          <AppText tone="muted" variant="caption" testID="reminders-on">
            On
          </AppText>
        ) : permission === 'denied' ? (
          <>
            <AppText tone="muted" variant="caption" testID="reminders-disabled">
              Reminders disabled
            </AppText>
            <Button
              title="Open settings"
              variant="secondary"
              onPress={() => void Linking.openSettings()}
              testID="reminders-open-settings"
            />
          </>
        ) : (
          <AppText tone="muted" variant="caption" testID="reminders-unavailable">
            Not available on this device
          </AppText>
        )}
      </Card>

      {mode === 'supabase' ? (
        <Card className="gap-3">
          <AppText variant="subtitle">Account</AppText>
          {user ? <AppText testID="settings-name">{user.fullName}</AppText> : null}
          {email ? (
            <AppText tone="muted" variant="caption" testID="settings-email">
              {email}
            </AppText>
          ) : null}
          <Button
            title="Sign out"
            variant="danger"
            loading={signingOut}
            onPress={() => void signOut()}
            testID="sign-out-button"
          />
        </Card>
      ) : null}

      <AppText tone="muted" variant="caption">
        Version {Constants.expoConfig?.version ?? '—'}
      </AppText>
    </Screen>
  );
}
