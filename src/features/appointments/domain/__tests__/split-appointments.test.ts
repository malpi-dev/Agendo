import type { AppointmentStatus } from '@/features/appointments/domain/appointment';
import { at, makeAppointment } from '@/features/booking/domain/__tests__/test-fixtures';

import { splitAppointments } from '../split-appointments';

const apt = (
  id: string,
  day: string,
  time: string,
  endTime: string,
  status: AppointmentStatus = 'booked',
) => makeAppointment({ id, start: at(day, time), end: at(day, endTime), status });

describe('splitAppointments', () => {
  const now = at('2026-10-05', '10:15');

  it('sorts upcoming ascending and past descending', () => {
    const { upcoming, past } = splitAppointments(
      [
        apt('b', '2026-10-08', '09:00', '09:30'),
        apt('a', '2026-10-06', '09:00', '09:30'),
        apt('p1', '2026-10-01', '09:00', '09:30'),
        apt('p2', '2026-10-03', '09:00', '09:30'),
      ],
      now,
    );
    expect(upcoming.map((x) => x.id)).toEqual(['a', 'b']);
    expect(past.map((x) => x.id)).toEqual(['p2', 'p1']);
  });

  it('sends cancelled appointments to past even if in the future', () => {
    const { upcoming, past } = splitAppointments(
      [apt('c', '2026-10-09', '09:00', '09:30', 'cancelled')],
      now,
    );
    expect(upcoming).toEqual([]);
    expect(past.map((x) => x.id)).toEqual(['c']);
  });

  it('counts an in-progress appointment as upcoming', () => {
    const { upcoming } = splitAppointments([apt('live', '2026-10-05', '10:00', '10:30')], now);
    expect(upcoming.map((x) => x.id)).toEqual(['live']);
  });

  it('handles an empty list', () => {
    expect(splitAppointments([], now)).toEqual({ upcoming: [], past: [] });
  });
});
