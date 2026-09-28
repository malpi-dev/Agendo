import { rangesOverlap } from '@/features/booking/domain/ranges';
import { splitAppointments } from '@/features/appointments/domain/split-appointments';
import { getAvailableSlots } from '@/features/booking/domain/get-available-slots';
import { at } from '@/features/booking/domain/__tests__/test-fixtures';
import { toLocalDate, weekdayOf } from '@/core/time';

import { buildDemoAppointments, DEMO_USER_ID, demoBusiness, demoWorkingHours } from '../fixtures';

const TUESDAY = at('2026-09-29', '08:00'); // Tuesday
const SATURDAY = at('2026-10-03', '08:00');
const MONDAY = at('2026-09-28', '08:00');

const countOn = (now: Date) => {
  const today = toLocalDate(now, demoBusiness.timezone);
  return buildDemoAppointments(now).filter(
    (a) => toLocalDate(a.start, demoBusiness.timezone) === today && a.clientId !== DEMO_USER_ID,
  ).length;
};

describe('buildDemoAppointments', () => {
  it('has 5 appointments today on a weekday', () => expect(countOn(TUESDAY)).toBe(5));
  it('has 4 on a Saturday (no Lena 16:30)', () => expect(countOn(SATURDAY)).toBe(4));
  it('has 4 on a Monday (no Sam)', () => expect(countOn(MONDAY)).toBe(4));

  it('generates deterministic ids', () => {
    const a = buildDemoAppointments(TUESDAY);
    expect(a[0]?.id).toBe('demo-appt-001');
    expect(buildDemoAppointments(TUESDAY).map((x) => x.id)).toEqual(a.map((x) => x.id));
  });

  it('never overlaps booked appointments of the same professional or client', () => {
    const booked = buildDemoAppointments(TUESDAY).filter((a) => a.status === 'booked');
    for (const [i, a] of booked.entries()) {
      for (const b of booked.slice(i + 1)) {
        if (a.professionalId === b.professionalId || a.clientId === b.clientId) {
          expect(rangesOverlap(a, b)).toBe(false);
        }
      }
    }
  });

  it('gives Casey 2 upcoming and 3 past appointments (1 cancelled)', () => {
    const mine = buildDemoAppointments(TUESDAY).filter((a) => a.clientId === DEMO_USER_ID);
    const { upcoming, past } = splitAppointments(mine, TUESDAY);
    expect(upcoming).toHaveLength(2);
    expect(past).toHaveLength(3);
    expect(past.filter((a) => a.status === 'cancelled')).toHaveLength(1);
  });

  it('cancels every 4th appointment on days other than today', () => {
    const all = buildDemoAppointments(TUESDAY).filter((a) => a.clientId !== DEMO_USER_ID);
    const cancelled = all.filter((a) => a.status === 'cancelled');
    expect(cancelled.length).toBeGreaterThan(0);
    expect(cancelled.every((a) => a.cancelledAt !== null)).toBe(true);
  });

  it('places every booked appointment inside working hours', () => {
    const veryEarly = at('2026-09-01', '08:00');
    for (const a of buildDemoAppointments(TUESDAY).filter((x) => x.status === 'booked')) {
      const date = toLocalDate(a.start, demoBusiness.timezone);
      expect(weekdayOf(date)).not.toBe(0);
      const hours = demoWorkingHours.filter((h) => h.professionalId === a.professionalId);
      const slots = getAvailableSlots({
        date,
        service: { durationMinutes: (a.end.getTime() - a.start.getTime()) / 60_000 },
        workingHours: hours,
        busyRanges: [],
        business: { ...demoBusiness, maxAdvanceDays: 400, minNoticeMinutes: 0 },
        now: veryEarly,
      });
      expect(slots.some((s) => s.start.getTime() === a.start.getTime())).toBe(true);
    }
  });
});
