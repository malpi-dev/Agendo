import { Pressable, ScrollView } from 'react-native';

import { AppText } from '@/core/ui';
import type { Professional } from '@/features/catalog/domain/professional';

interface ProfessionalFilterProps {
  professionals: Professional[];
  selectedId?: string;
  onSelect: (professionalId?: string) => void;
}

function Chip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-11 justify-center rounded-full border px-4 py-2 active:opacity-80 ${
        selected ? 'border-primary bg-primary' : 'border-border bg-surface'
      }`}
    >
      <AppText variant="label" className={selected ? 'text-on-primary' : ''}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ProfessionalFilter({
  professionals,
  selectedId,
  onSelect,
}: ProfessionalFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="gap-2"
    >
      <Chip
        testID="agenda-filter-all"
        label="All"
        selected={!selectedId}
        onPress={() => onSelect(undefined)}
      />
      {professionals.map((p) => (
        <Chip
          key={p.id}
          testID={`agenda-filter-${p.id}`}
          label={p.name}
          selected={selectedId === p.id}
          onPress={() => onSelect(p.id)}
        />
      ))}
    </ScrollView>
  );
}
