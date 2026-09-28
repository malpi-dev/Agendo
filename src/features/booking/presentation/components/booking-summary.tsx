import { View } from 'react-native';

import { formatLongDate, formatPrice, formatTime } from '@/core/time';
import { AppText, Card } from '@/core/ui';
import type { Business } from '@/features/catalog/domain/business';
import type { Professional } from '@/features/catalog/domain/professional';
import type { Service } from '@/features/catalog/domain/service';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4">
      <AppText tone="muted">{label}</AppText>
      <AppText variant="label" className="flex-shrink text-right" tabular>
        {value}
      </AppText>
    </View>
  );
}

interface BookingSummaryProps {
  service: Service;
  professional: Professional;
  business: Business;
  start: Date;
}

export function BookingSummary({ service, professional, business, start }: BookingSummaryProps) {
  const tz = business.timezone;
  return (
    <Card testID="booking-summary" className="gap-3">
      <Row label="Service" value={service.name} />
      <Row label="Professional" value={professional.name} />
      <Row label="Date" value={formatLongDate(start, tz)} />
      <Row label="Time" value={formatTime(start, tz)} />
      <Row label="Duration" value={`${service.durationMinutes} min`} />
      <Row label="Price" value={formatPrice(service.priceCents, business.currency)} />
      <AppText variant="caption" tone="muted">
        Times are shown in the business timezone ({tz})
      </AppText>
    </Card>
  );
}
