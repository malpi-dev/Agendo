import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';

import { DomainError } from '@/core/errors';
import { queryKeys } from '@/core/query';
import { ErrorState, Screen, showToast } from '@/core/ui';
import type { Appointment } from '@/features/appointments/domain/appointment';

import { ConfirmBookingContent } from '../components/confirm-booking-content';

const paramsSchema = z.object({
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  start: z.iso.datetime(),
  rescheduleId: z.string().min(1).optional(),
});

export default function ConfirmBookingScreen() {
  const rawParams = useLocalSearchParams();
  const queryClient = useQueryClient();
  const parsed = paramsSchema.safeParse(rawParams);

  if (!parsed.success) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState error={new DomainError('validation')} />
      </Screen>
    );
  }
  const { serviceId, professionalId, start, rescheduleId } = parsed.data;

  const onBooked = (appointment: Appointment) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Booked!', 'success');
    router.dismissAll();
    router.push({ pathname: '/appointments/[id]', params: { id: appointment.id } });
  };

  const onRescheduled = (appointment: Appointment) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Rescheduled', 'success');
    router.dismissAll();
    router.push({ pathname: '/appointments/[id]', params: { id: appointment.id } });
  };

  const onBackToAppointment = () => {
    if (!rescheduleId) return;
    router.dismissAll();
    router.push({ pathname: '/appointments/[id]', params: { id: rescheduleId } });
  };

  const onConflict = () => {
    showToast('That time was just taken. Please choose another.', 'warning');
    void queryClient.invalidateQueries({ queryKey: queryKeys.busy(professionalId) });
    router.back();
  };

  return (
    <Screen scroll edges={['left', 'right']} className="pt-4" testID="confirm-booking-screen">
      <ConfirmBookingContent
        serviceId={serviceId}
        professionalId={professionalId}
        start={new Date(start)}
        rescheduleId={rescheduleId}
        onBooked={onBooked}
        onConflict={onConflict}
        onRescheduled={onRescheduled}
        onBackToAppointment={onBackToAppointment}
      />
    </Screen>
  );
}
