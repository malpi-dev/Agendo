import { View } from 'react-native';

import { AppText, Avatar, Card } from '@/core/ui';

import type { Professional } from '../../domain/professional';

interface ProfessionalRowProps {
  professional: Professional;
  onPress: (professional: Professional) => void;
}

export function ProfessionalRow({ professional, onPress }: ProfessionalRowProps) {
  return (
    <Card testID={`professional-row-${professional.id}`} onPress={() => onPress(professional)}>
      <View className="flex-row items-center gap-3">
        <Avatar name={professional.name} avatarUrl={professional.avatarUrl} />
        <View className="flex-1">
          <AppText variant="subtitle">{professional.name}</AppText>
          <AppText tone="muted" variant="caption" numberOfLines={2}>
            {professional.bio}
          </AppText>
        </View>
      </View>
    </Card>
  );
}
