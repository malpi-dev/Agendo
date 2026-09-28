import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { DomainError } from '@/core/errors';
import { formatLongDate, formatTime } from '@/core/time';
import { AppText, Card, EmptyState, ErrorState, Screen, Skeleton } from '@/core/ui';
import { useBusiness } from '@/features/catalog/presentation/hooks/use-business';

import { StatusBadge } from '../components/status-badge';
import { useAppointment } from '../hooks/use-appointment';

// Read-only for now: phase 08 adds cancel and reschedule.
export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointment = useAppointment(id);
  const business = useBusiness();

  if (appointment.isError) {
    const notFound =
      appointment.error instanceof DomainError && appointment.error.code === 'notFound';
    return (
      <Screen edges={['left', 'right']}>
        {notFound ? (
          <EmptyState title="This appointment no longer exists" testID="appointment-not-found" />
        ) : (
          <ErrorState error={appointment.error} onRetry={() => void appointment.refetch()} />
        )}
      </Screen>
    );
  }
  if (!appointment.data || !business.data) {
    return (
      <Screen edges={['left', 'right']} className="pt-4" testID="appointment-loading">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </Screen>
    );
  }

  const a = appointment.data;
  const tz = business.data.timezone;
  return (
    <Screen
      scroll
      edges={['left', 'right']}
      className="gap-4 pt-4"
      testID="appointment-detail-screen"
    >
      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <AppText variant="subtitle">{a.serviceName}</AppText>
          <StatusBadge status={a.status} />
        </View>
        <AppText tone="muted">with {a.professionalName}</AppText>
        <AppText variant="label">{formatLongDate(a.start, tz)}</AppText>
        <AppText variant="label" tabular>
          {formatTime(a.start, tz)} – {formatTime(a.end, tz)}
        </AppText>
        <AppText variant="caption" tone="muted">
          Times are shown in the business timezone ({tz})
        </AppText>
      </Card>
    </Screen>
  );
}
