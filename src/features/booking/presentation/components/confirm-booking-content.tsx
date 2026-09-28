import { View } from 'react-native';

import { getErrorPresentation, toDomainError } from '@/core/errors';
import { AppText, Button, ErrorState, Skeleton } from '@/core/ui';
import type { Appointment } from '@/features/appointments/domain/appointment';
import { useBusiness } from '@/features/catalog/presentation/hooks/use-business';
import { useProfessional } from '@/features/catalog/presentation/hooks/use-professionals';
import { useService } from '@/features/catalog/presentation/hooks/use-services';

import { useAppointment } from '@/features/appointments/presentation/hooks/use-appointment';

import { useBookAppointment } from '../hooks/use-book-appointment';
import { useRescheduleAppointment } from '../hooks/use-reschedule-appointment';
import { BookingSummary } from './booking-summary';

interface ConfirmBookingContentProps {
  serviceId: string;
  professionalId: string;
  start: Date;
  /** Set when moving an existing appointment instead of creating a new one. */
  rescheduleId?: string;
  onBooked: (appointment: Appointment) => void;
  /** The slot was taken by someone else: the screen goes back to the refreshed list. */
  onConflict: () => void;
  /** Rescheduling only: the appointment was moved. */
  onRescheduled?: (appointment: Appointment) => void;
  /** Rescheduling only: the change window closed; go back to the appointment. */
  onBackToAppointment?: () => void;
}

export function ConfirmBookingContent({
  serviceId,
  professionalId,
  start,
  rescheduleId,
  onBooked,
  onConflict,
  onRescheduled,
  onBackToAppointment,
}: ConfirmBookingContentProps) {
  const service = useService(serviceId);
  const professional = useProfessional(professionalId);
  const business = useBusiness();
  const current = useAppointment(rescheduleId);
  const book = useBookAppointment();
  const reschedule = useRescheduleAppointment();
  const isRescheduling = rescheduleId !== undefined;
  const action = isRescheduling ? reschedule : book;

  const loadError = service.error ?? professional.error ?? business.error ?? current.error;
  if (loadError) {
    return (
      <ErrorState
        error={loadError}
        onRetry={() => {
          void service.refetch();
          void professional.refetch();
          void business.refetch();
          void current.refetch();
        }}
        testID="confirm-error"
      />
    );
  }
  if (!service.data || !professional.data || !business.data || (isRescheduling && !current.data)) {
    return (
      <View className="gap-3" testID="confirm-loading">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </View>
    );
  }

  const handlers = {
    onError: (error: unknown) => {
      if (toDomainError(error).code === 'slotUnavailable') onConflict();
    },
  };
  const confirm = () =>
    rescheduleId
      ? reschedule.mutate(
          { id: rescheduleId, newStart: start },
          { ...handlers, onSuccess: (appointment) => onRescheduled?.(appointment) },
        )
      : book.mutate({ serviceId, professionalId, start }, { ...handlers, onSuccess: onBooked });

  const bookingError = action.error ? toDomainError(action.error) : null;
  const inlineError =
    bookingError && bookingError.code !== 'slotUnavailable'
      ? bookingError.code === 'clientOverlap'
        ? 'You already have an appointment at that time.'
        : getErrorPresentation(bookingError.code).message
      : null;

  return (
    <View className="gap-4">
      <BookingSummary
        service={service.data}
        professional={professional.data}
        business={business.data}
        start={start}
        previousStart={isRescheduling ? current.data?.start : undefined}
      />
      {inlineError ? (
        <AppText tone="danger" testID="confirm-inline-error" accessibilityLiveRegion="polite">
          {inlineError}
        </AppText>
      ) : null}
      {bookingError?.code === 'cancellationWindowClosed' && onBackToAppointment ? (
        <Button
          title="Back to appointment"
          variant="secondary"
          onPress={onBackToAppointment}
          testID="back-to-appointment-button"
        />
      ) : (
        <Button
          title={isRescheduling ? 'Confirm new time' : 'Confirm booking'}
          onPress={confirm}
          loading={action.isPending}
          testID="confirm-booking-button"
        />
      )}
    </View>
  );
}
