import { View } from 'react-native';

import { AppText } from '@/core/ui';

import type { LiveStatus } from '../../domain/types';

export function LiveIndicator({ status }: { status: LiveStatus }) {
  if (status === 'paused') {
    return (
      <View testID="live-indicator" className="flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-full bg-warning" />
        <AppText variant="caption" className="text-warning">
          Live updates paused
        </AppText>
      </View>
    );
  }
  return (
    <View testID="live-indicator" className="flex-row items-center gap-2">
      <View
        className={`h-2 w-2 rounded-full ${status === 'live' ? 'bg-success' : 'bg-text-muted'}`}
      />
      <AppText variant="caption" tone="muted">
        {status === 'live' ? 'Live' : 'Connecting…'}
      </AppText>
    </View>
  );
}
