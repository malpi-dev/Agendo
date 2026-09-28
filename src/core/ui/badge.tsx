import { View } from 'react-native';

import { AppText } from './app-text';

export type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'muted';

const CONTAINER: Record<BadgeTone, string> = {
  accent: 'bg-accent/15',
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  danger: 'bg-danger/15',
  muted: 'bg-surface-muted',
};

const TEXT: Record<BadgeTone, string> = {
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  muted: 'text-text-muted',
};

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  testID?: string;
}

export function Badge({ label, tone = 'muted', testID }: BadgeProps) {
  return (
    <View testID={testID} className={`self-start rounded-full px-2.5 py-1 ${CONTAINER[tone]}`}>
      <AppText variant="caption" className={`font-semibold ${TEXT[tone]}`}>
        {label}
      </AppText>
    </View>
  );
}
