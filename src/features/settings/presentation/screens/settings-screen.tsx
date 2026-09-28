import Constants from 'expo-constants';

import { useSessionStore } from '@/core/session';
import { AppText, Button, Card, Screen } from '@/core/ui';

// Minimal version: phase 11 adds theme selection, profile and sign out.
export default function SettingsScreen() {
  const mode = useSessionStore((s) => s.mode);
  const demoRole = useSessionStore((s) => s.demoRole);
  const setDemoRole = useSessionStore((s) => s.setDemoRole);
  const exitDemo = useSessionStore((s) => s.exitDemo);

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

      <AppText tone="muted" variant="caption">
        Version {Constants.expoConfig?.version ?? '—'}
      </AppText>
    </Screen>
  );
}
