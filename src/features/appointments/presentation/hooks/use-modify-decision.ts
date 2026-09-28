import { useNow } from '@/core/time/use-now';
import { useBusiness } from '@/features/catalog/presentation/hooks/use-business';

import type { Appointment } from '../../domain/appointment';
import { canModifyAppointment, type ModifyDecision } from '../../domain/can-modify-appointment';

/** Whether the appointment can still be cancelled or rescheduled; null while the business rules load. */
export function useModifyDecision(appointment: Appointment | undefined): ModifyDecision | null {
  const business = useBusiness();
  const now = useNow();
  if (!appointment || !business.data) return null;
  return canModifyAppointment({ appointment, business: business.data, now });
}
