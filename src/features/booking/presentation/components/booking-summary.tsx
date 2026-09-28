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
  /** Rescheduling: the current time, shown next to the new one. */
  previousStart?: Date;
}

export function BookingSummary({
  service,
  professional,
  business,
  start,
  previousStart,
}: BookingSummaryProps) {
  const tz = business.timezone;
  return (
    <Card testID="booking-summary" className="gap-3">
      <Row label="Service" value={service.name} />
      <Row label="Professional" value={professional.name} />
      {previousStart ? (
        <>
          <View testID="reschedule-before" className="gap-1">
            <AppText variant="caption" tone="muted">
              Before
            </AppText>
            <AppText tone="muted" className="line-through" tabular>
              {formatLongDate(previousStart, tz)} · {formatTime(previousStart, tz)}
            </AppText>
          </View>
          <View testID="reschedule-after" className="gap-1">
            <AppText variant="caption" tone="primary">
              After
            </AppText>
            <AppText variant="subtitle" tabular>
              {formatLongDate(start, tz)} · {formatTime(start, tz)}
            </AppText>
          </View>
        </>
      ) : (
        <>
          <Row label="Date" value={formatLongDate(start, tz)} />
          <Row label="Time" value={formatTime(start, tz)} />
        </>
      )}
      <Row label="Duration" value={`${service.durationMinutes} min`} />
      <Row label="Price" value={formatPrice(service.priceCents, business.currency)} />
      <AppText variant="caption" tone="muted">
        Times are shown in the business timezone ({tz})
      </AppText>
    </Card>
  );
}
