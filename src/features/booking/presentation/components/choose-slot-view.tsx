import { View } from 'react-native';

import type { LocalDate } from '@/core/time';
import { AppText, Button, EmptyState, ErrorState, Skeleton } from '@/core/ui';

import type { BookableDay } from '../../domain/get-bookable-days';
import type { Slot } from '../../domain/slot';
import type { LiveStatus } from '../../domain/types';
import { DayStrip } from './day-strip';
import { LiveIndicator } from './live-indicator';
import { SlotGrid } from './slot-grid';

export interface ChooseSlotViewProps {
  days: BookableDay[];
  selectedDate: LocalDate | null;
  onSelectDate: (date: LocalDate) => void;
  slots: Slot[];
  timeZone: string;
  liveStatus: LiveStatus;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onSelectSlot: (slot: Slot) => void;
  onNextDay: () => void;
}

/** Presentational: everything comes through props so it is easy to test. */
export function ChooseSlotView({
  days,
  selectedDate,
  onSelectDate,
  slots,
  timeZone,
  liveStatus,
  isLoading,
  error,
  onRetry,
  onSelectSlot,
  onNextDay,
}: ChooseSlotViewProps) {
  return (
    <View className="flex-1 gap-4 pt-4">
      <DayStrip days={days} selected={selectedDate} onSelect={onSelectDate} />
      <View className="gap-3 px-4">
        <LiveIndicator status={liveStatus} />
        {error ? (
          <ErrorState error={error} onRetry={onRetry} testID="slots-error" />
        ) : isLoading ? (
          <View className="-mx-1 flex-row flex-wrap" testID="slots-loading">
            {Array.from({ length: 8 }, (_, i) => (
              <View key={i} className="w-1/3 p-1">
                <Skeleton className="h-11 w-full rounded-xl" />
              </View>
            ))}
          </View>
        ) : slots.length === 0 ? (
          <View testID="slots-empty" className="items-center gap-2 py-8">
            <EmptyState title="No free times this day — try another day" />
            <Button
              title="Next available day"
              variant="secondary"
              onPress={onNextDay}
              testID="next-day-button"
            />
          </View>
        ) : (
          <>
            <AppText variant="caption" tone="muted">
              Times are shown in the business timezone
            </AppText>
            <SlotGrid slots={slots} timeZone={timeZone} onSelect={onSelectSlot} />
          </>
        )}
      </View>
    </View>
  );
}
