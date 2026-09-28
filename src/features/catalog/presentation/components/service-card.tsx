import { View } from 'react-native';

import { formatPrice } from '@/core/time';
import { AppText, Card } from '@/core/ui';

import type { Service } from '../../domain/service';

interface ServiceCardProps {
  service: Service;
  currency: string;
  onPress: (service: Service) => void;
}

export function ServiceCard({ service, currency, onPress }: ServiceCardProps) {
  return (
    <Card testID={`service-card-${service.id}`} onPress={() => onPress(service)} className="gap-1">
      <View className="flex-row items-start justify-between gap-3">
        <AppText variant="subtitle" className="flex-1">
          {service.name}
        </AppText>
        <AppText variant="label" tone="primary" tabular>
          {formatPrice(service.priceCents, currency)}
        </AppText>
      </View>
      <AppText tone="muted" variant="caption" numberOfLines={1}>
        {service.description}
      </AppText>
      <AppText variant="caption" tone="muted" tabular>
        {service.durationMinutes} min
      </AppText>
    </Card>
  );
}
