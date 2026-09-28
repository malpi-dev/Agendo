import { View } from 'react-native';

import { getErrorPresentation, toDomainError } from '@/core/errors';

import { AppText } from './app-text';
import { Button } from './button';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  testID?: string;
}

export function ErrorState({ error, onRetry, testID }: ErrorStateProps) {
  const { title, message, action } = getErrorPresentation(toDomainError(error).code);

  return (
    <View testID={testID} className="flex-1 items-center justify-center gap-2 p-8">
      <AppText variant="subtitle" className="text-center">
        {title}
      </AppText>
      <AppText tone="muted" className="text-center">
        {message}
      </AppText>
      {action === 'retry' && onRetry ? (
        <Button
          title="Retry"
          onPress={onRetry}
          variant="secondary"
          className="mt-4"
          testID={testID ? `${testID}-retry` : 'retry-button'}
        />
      ) : null}
    </View>
  );
}
