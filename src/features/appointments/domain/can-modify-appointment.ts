import type { Business } from '@/features/catalog/domain/business';

import type { Appointment } from './appointment';

export type ModifyDecision =
  { allowed: true } | { allowed: false; reason: 'notBooked' | 'alreadyStarted' | 'windowClosed' };

const HOUR_MS = 3_600_000;

export function canModifyAppointment(input: {
  appointment: Pick<Appointment, 'status' | 'start'>;
  business: Business;
  now: Date;
}): ModifyDecision {
  const { appointment, business, now } = input;
  if (appointment.status !== 'booked') return { allowed: false, reason: 'notBooked' };
  if (appointment.start <= now) return { allowed: false, reason: 'alreadyStarted' };
  if (appointment.start.getTime() - now.getTime() < business.cancelLimitHours * HOUR_MS) {
    return { allowed: false, reason: 'windowClosed' };
  }
  return { allowed: true };
}
