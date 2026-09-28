import { View } from 'react-native';

import { getErrorPresentation, toDomainError } from '@/core/errors';
import { AppText, Button, ErrorState, Skeleton } from '@/core/ui';
import type { Appointment } from '@/features/appointments/domain/appointment';
import { useBusiness } from '@/features/catalog/presentation/hooks/use-business';
import { useProfessional } from '@/features/catalog/presentation/hooks/use-professionals';
import { useService } from '@/features/catalog/presentation/hooks/use-services';

import { useBookAppointment } from '../hooks/use-book-appointment';
import { BookingSummary } from './booking-summary';

interface ConfirmBookingContentProps {
  serviceId: string;
  professionalId: string;
  start: Date;
  onBooked: (appointment: Appointment) => void;
  /** The slot was taken by someone else: the screen goes back to the refreshed list. */
  onConflict: () => void;
}

export function ConfirmBookingContent({
  serviceId,
  professionalId,
  start,
  onBooked,
  onConflict,
}: ConfirmBookingContentProps) {
  const service = useService(serviceId);
  const professional = useProfessional(professionalId);
  const business = useBusiness();
  const book = useBookAppointment();

  const loadError = service.error ?? professional.error ?? business.error;
  if (loadError) {
    return (
      <ErrorState
        error={loadError}
        onRetry={() => {
          void service.refetch();
          void professional.refetch();
          void business.refetch();
        }}
        testID="confirm-error"
      />
    );
  }
  if (!service.data || !professional.data || !business.data) {
    return (
      <View className="gap-3" testID="confirm-loading">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </View>
    );
  }

  const confirm = () =>
    book.mutate(
      { serviceId, professionalId, start },
      {
        onSuccess: onBooked,
        onError: (error) => {
          if (toDomainError(error).code === 'slotUnavailable') onConflict();
        },
      },
    );

  const bookingError = book.error ? toDomainError(book.error) : null;
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
      />
      {inlineError ? (
        <AppText tone="danger" testID="confirm-inline-error" accessibilityLiveRegion="polite">
          {inlineError}
        </AppText>
      ) : null}
      <Button
        title="Confirm booking"
        onPress={confirm}
        loading={book.isPending}
        testID="confirm-booking-button"
      />
    </View>
  );
}
