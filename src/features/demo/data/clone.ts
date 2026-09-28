import type { Appointment } from '@/features/appointments/domain/appointment';

/** Repositories return copies so callers can never mutate the in-memory state. */
export const cloneAppointment = (a: Appointment): Appointment => ({
  ...a,
  start: new Date(a.start),
  end: new Date(a.end),
  createdAt: new Date(a.createdAt),
  cancelledAt: a.cancelledAt ? new Date(a.cancelledAt) : null,
});
