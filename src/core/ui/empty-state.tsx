import { View } from 'react-native';

import { AppText } from './app-text';
import { Button } from './button';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({ title, message, actionLabel, onAction, testID }: EmptyStateProps) {
  return (
    <View testID={testID} className="flex-1 items-center justify-center gap-2 p-8">
      <AppText variant="subtitle" className="text-center">
        {title}
      </AppText>
      {message ? (
        <AppText tone="muted" className="text-center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" className="mt-4" />
      ) : null}
    </View>
  );
}
