import { formatLongDate, formatTime } from '@/core/time';
import { AppText } from '@/core/ui';
import { useAppointment } from '@/features/appointments/presentation/hooks/use-appointment';
import { useBusiness } from '@/features/catalog/presentation/hooks/use-business';

/** "Current: <date and time>" on top of Choose slot while rescheduling. */
export function RescheduleBanner({ appointmentId }: { appointmentId: string }) {
  const appointment = useAppointment(appointmentId);
  const business = useBusiness();
  if (!appointment.data || !business.data) return null;
  const tz = business.data.timezone;
  return (
    <AppText
      tone="muted"
      className="mx-4 mt-4 rounded-xl bg-surface-muted px-4 py-3"
      testID="reschedule-banner"
    >
      Current: {formatLongDate(appointment.data.start, tz)} at{' '}
      {formatTime(appointment.data.start, tz)}
    </AppText>
  );
}
