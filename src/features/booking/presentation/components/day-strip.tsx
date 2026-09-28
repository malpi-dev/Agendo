import { useEffect, useRef } from 'react';
import { FlatList, Pressable } from 'react-native';

import { formatDayChip, type LocalDate } from '@/core/time';
import { AppText } from '@/core/ui';

import type { BookableDay } from '../../domain/get-bookable-days';

const ITEM_WIDTH = 60;
const ITEM_GAP = 8;
const PADDING = 16;

interface DayStripProps {
  days: BookableDay[];
  selected: LocalDate | null;
  onSelect: (date: LocalDate) => void;
}

export function DayStrip({ days, selected, onSelect }: DayStripProps) {
  const listRef = useRef<FlatList<BookableDay>>(null);

  // Enabled days are numbered 0..n so E2E tests can pick "the 3rd bookable day".
  const enabledIndex = new Map<LocalDate, number>();
  days.filter((d) => !d.isDisabled).forEach((d, k) => enabledIndex.set(d.date, k));

  useEffect(() => {
    const index = days.findIndex((d) => d.date === selected);
    if (index >= 0) listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
  }, [days, selected]);

  return (
    <FlatList
      ref={listRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      data={days}
      keyExtractor={(d) => d.date}
      getItemLayout={(_, index) => ({
        length: ITEM_WIDTH + ITEM_GAP,
        offset: PADDING + index * (ITEM_WIDTH + ITEM_GAP),
        index,
      })}
      contentContainerStyle={{ paddingHorizontal: PADDING }}
      renderItem={({ item }) => {
        const chip = formatDayChip(item.date);
        const isSelected = item.date === selected;
        const testID = item.isDisabled
          ? `day-chip-disabled-${item.date}`
          : `day-chip-${enabledIndex.get(item.date)}`;
        return (
          <Pressable
            testID={testID}
            accessibilityRole="button"
            accessibilityState={{ disabled: item.isDisabled, selected: isSelected }}
            disabled={item.isDisabled}
            onPress={() => onSelect(item.date)}
            style={{ width: ITEM_WIDTH, marginRight: ITEM_GAP }}
            className={`items-center rounded-2xl border py-3 ${
              isSelected ? 'border-primary bg-primary' : 'border-border bg-surface'
            } ${item.isDisabled ? 'opacity-40' : 'active:opacity-80'}`}
          >
            <AppText
              variant="caption"
              className={isSelected ? 'text-on-primary' : ''}
              tone={isSelected ? 'default' : 'muted'}
            >
              {chip.weekday}
            </AppText>
            <AppText variant="subtitle" tabular className={isSelected ? 'text-on-primary' : ''}>
              {chip.day}
            </AppText>
            <AppText
              variant="caption"
              className={isSelected ? 'text-on-primary' : ''}
              tone={isSelected ? 'default' : 'muted'}
            >
              {chip.month}
            </AppText>
          </Pressable>
        );
      }}
    />
  );
}
