import type { Appointment } from './appointment';

export function splitAppointments(
  appointments: Appointment[],
  now: Date,
): { upcoming: Appointment[]; past: Appointment[] } {
  const upcoming: Appointment[] = [];
  const past: Appointment[] = [];

  for (const a of appointments) {
    (a.status === 'booked' && a.end > now ? upcoming : past).push(a);
  }

  upcoming.sort((a, b) => a.start.getTime() - b.start.getTime());
  past.sort((a, b) => b.start.getTime() - a.start.getTime());
  return { upcoming, past };
}
