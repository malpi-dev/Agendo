import { Pressable, View } from 'react-native';

import { useThemeStore, type ThemePreference } from '@/core/theme';
import { AppText, Card } from '@/core/ui';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Segmented System / Light / Dark control backed by the persisted theme store. */
export function AppearanceSection() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <Card className="gap-3" testID="appearance-section">
      <AppText variant="subtitle">Appearance</AppText>
      <View className="flex-row rounded-xl bg-surface-muted p-1" accessibilityRole="radiogroup">
        {OPTIONS.map(({ value, label }) => {
          const selected = preference === value;
          return (
            <Pressable
              key={value}
              testID={`theme-${value}`}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => setPreference(value)}
              className={`min-h-11 flex-1 items-center justify-center rounded-lg ${selected ? 'bg-surface' : ''}`}
            >
              <AppText variant="label" tone={selected ? 'primary' : 'muted'}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
