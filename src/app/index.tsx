// Temporary component catalog (kitchen sink). Replaced by the real entry route in phase 05.
import { View } from 'react-native';

import { DomainError } from '@/core/errors';
import { useThemeStore, type ThemePreference } from '@/core/theme';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  showToast,
  Skeleton,
} from '@/core/ui';

const PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

export default function KitchenSink() {
  const { preference, setPreference } = useThemeStore();

  return (
    <Screen scroll className="gap-4 pt-4">
      <AppText variant="title">Agendo</AppText>
      <Badge label="Demo" tone="accent" />

      <Card className="gap-2">
        <AppText variant="subtitle">Theme</AppText>
        <View className="flex-row gap-2">
          {PREFERENCES.map((p) => (
            <Button
              key={p}
              title={p}
              variant={preference === p ? 'primary' : 'secondary'}
              onPress={() => setPreference(p)}
              className="flex-1 px-2"
              testID={`theme-${p}`}
            />
          ))}
        </View>
      </Card>

      <Card className="gap-2">
        <AppText variant="subtitle">Buttons</AppText>
        <Button title="Primary" onPress={() => showToast('Primary pressed', 'success')} />
        <Button title="Secondary" variant="secondary" onPress={() => showToast('Secondary')} />
        <Button title="Ghost" variant="ghost" onPress={() => showToast('Ghost')} />
        <Button title="Danger" variant="danger" onPress={() => showToast('Danger', 'danger')} />
        <Button title="Loading" loading onPress={() => undefined} />
        <Button title="Disabled" disabled onPress={() => undefined} />
      </Card>

      <Card className="gap-2">
        <AppText variant="subtitle">Text</AppText>
        <AppText>Body text</AppText>
        <AppText variant="caption" tone="muted">
          Caption muted
        </AppText>
        <AppText variant="label" tone="primary">
          Label primary
        </AppText>
        <AppText tone="danger">Danger tone</AppText>
        <AppText tabular>10:30 AM · $20.00</AppText>
      </Card>

      <Card className="gap-2">
        <AppText variant="subtitle">Badges</AppText>
        <View className="flex-row flex-wrap gap-2">
          <Badge label="Accent" tone="accent" />
          <Badge label="Success" tone="success" />
          <Badge label="Warning" tone="warning" />
          <Badge label="Danger" tone="danger" />
          <Badge label="Muted" tone="muted" />
        </View>
      </Card>

      <Card className="gap-2">
        <AppText variant="subtitle">Skeleton</AppText>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-full" />
      </Card>

      <Card className="h-52">
        <EmptyState
          title="No appointments yet"
          message="Book your first one."
          actionLabel="Browse services"
          onAction={() => showToast('Browse')}
        />
      </Card>

      <Card className="h-52">
        <ErrorState error={new DomainError('network')} onRetry={() => showToast('Retrying')} />
      </Card>
    </Screen>
  );
}
