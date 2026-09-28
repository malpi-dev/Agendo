import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { DomainError, getErrorPresentation, toDomainError } from '@/core/errors';
import { formatLongDate, formatTime } from '@/core/time';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  showToast,
  Skeleton,
} from '@/core/ui';
import { useBusiness } from '@/features/catalog/presentation/hooks/use-business';

import { useAppointment } from '../hooks/use-appointment';
import { useCancelAppointment } from '../hooks/use-cancel-appointment';
import { useModifyDecision } from '../hooks/use-modify-decision';
import { ModifyNotice } from './modify-notice';
import { StatusBadge } from './status-badge';

export function AppointmentDetailContent({ id }: { id: string }) {
  const appointment = useAppointment(id);
  const business = useBusiness();
  const decision = useModifyDecision(appointment.data);
  const cancel = useCancelAppointment();

  if (appointment.isError) {
    const notFound =
      appointment.error instanceof DomainError && appointment.error.code === 'notFound';
    return (
      <Screen edges={['left', 'right']}>
        {notFound ? (
          <EmptyState
            title="This appointment no longer exists"
            actionLabel="Back to appointments"
            actionTestID="back-to-appointments-button"
            onAction={() => router.replace('/appointments')}
            testID="appointment-not-found"
          />
        ) : (
          <ErrorState error={appointment.error} onRetry={() => void appointment.refetch()} />
        )}
      </Screen>
    );
  }
  if (business.isError) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState error={business.error} onRetry={() => void business.refetch()} />
      </Screen>
    );
  }
  if (!appointment.data || !business.data || !decision) {
    return (
      <Screen edges={['left', 'right']} className="pt-4" testID="appointment-loading">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </Screen>
    );
  }

  const a = appointment.data;
  const tz = business.data.timezone;

  const confirmCancel = () =>
    cancel.mutate(a.id, {
      onSuccess: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Appointment cancelled', 'success');
      },
      onError: (error) => {
        showToast(getErrorPresentation(toDomainError(error).code).message, 'danger');
      },
    });

  const askToCancel = () =>
    Alert.alert('Cancel appointment?', 'This frees the time for other clients.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel appointment', style: 'destructive', onPress: confirmCancel },
    ]);

  const reschedule = () =>
    router.push({
      pathname: '/book/[serviceId]/[professionalId]',
      params: { serviceId: a.serviceId, professionalId: a.professionalId, rescheduleId: a.id },
    });

  // Buttons only make sense for a booked appointment that has not started.
  const showActions = a.status === 'booked' && a.start > new Date();
  const disabled = !decision.allowed;

  return (
    <Screen scroll edges={['left', 'right']} className="gap-4 pt-4" testID="appointment-detail">
      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <AppText variant="subtitle" className="flex-shrink">
            {a.serviceName}
          </AppText>
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
      {showActions ? (
        <View className="gap-3">
          {!decision.allowed ? (
            <ModifyNotice
              reason={decision.reason}
              cancelLimitHours={business.data.cancelLimitHours}
            />
          ) : null}
          <Button
            title="Reschedule"
            variant="secondary"
            onPress={reschedule}
            disabled={disabled}
            testID="reschedule-appointment-button"
          />
          <Button
            title="Cancel appointment"
            variant="danger"
            onPress={askToCancel}
            disabled={disabled}
            loading={cancel.isPending}
            testID="cancel-appointment-button"
          />
        </View>
      ) : null}
    </Screen>
  );
}
