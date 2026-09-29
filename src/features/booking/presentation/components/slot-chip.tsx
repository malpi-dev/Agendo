import { Pressable } from 'react-native';

import { formatTime, toLocalTime } from '@/core/time';
import { AppText } from '@/core/ui';

import type { Slot } from '../../domain/slot';

interface SlotChipProps {
  slot: Slot;
  timeZone: string;
  selected?: boolean;
  onPress: (slot: Slot) => void;
}

export function SlotChip({ slot, timeZone, selected = false, onPress }: SlotChipProps) {
  const testID = `slot-chip-${toLocalTime(slot.start, timeZone).replace(':', '-')}`;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={formatTime(slot.start, timeZone)}
      accessibilityState={{ selected }}
      onPress={() => onPress(slot)}
      className={`min-h-11 items-center justify-center rounded-xl border py-3 active:opacity-80 ${
        selected ? 'border-primary bg-primary' : 'border-border bg-surface'
      }`}
    >
      <AppText variant="label" tabular className={selected ? 'text-on-primary' : ''}>
        {formatTime(slot.start, timeZone)}
      </AppText>
    </Pressable>
  );
}
