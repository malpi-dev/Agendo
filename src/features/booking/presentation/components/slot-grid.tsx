import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import type { Slot } from '../../domain/slot';
import { SlotChip } from './slot-chip';

interface SlotGridProps {
  slots: Slot[];
  timeZone: string;
  onSelect: (slot: Slot) => void;
}

/** Signature component: a slot that disappears (live event) animates out instead of vanishing. */
export function SlotGrid({ slots, timeZone, onSelect }: SlotGridProps) {
  return (
    <View testID="slot-grid" className="-mx-1 flex-row flex-wrap">
      {slots.map((slot) => (
        <Animated.View
          key={slot.start.toISOString()}
          entering={FadeIn}
          exiting={FadeOut.duration(400)}
          layout={LinearTransition}
          className="w-1/3 p-1"
        >
          <SlotChip slot={slot} timeZone={timeZone} onPress={onSelect} />
        </Animated.View>
      ))}
    </View>
  );
}
