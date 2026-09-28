import { at, business, makeAppointment } from '@/features/booking/domain/__tests__/test-fixtures';

import { canModifyAppointment } from '../can-modify-appointment';

const start = at('2026-10-05', '12:00');
const check = (now: Date, status: 'booked' | 'cancelled' = 'booked') =>
  canModifyAppointment({ appointment: makeAppointment({ start, status }), business, now });

describe('canModifyAppointment', () => {
  it('rejects cancelled appointments', () =>
    expect(check(at('2026-10-01', '12:00'), 'cancelled')).toEqual({
      allowed: false,
      reason: 'notBooked',
    }));

  it('rejects appointments that already started', () =>
    expect(check(at('2026-10-05', '12:30'))).toEqual({ allowed: false, reason: 'alreadyStarted' }));

  it('rejects at exactly the start time', () =>
    expect(check(start)).toEqual({ allowed: false, reason: 'alreadyStarted' }));

  it('rejects with 1h59m left', () =>
    expect(check(new Date(start.getTime() - 119 * 60_000))).toEqual({
      allowed: false,
      reason: 'windowClosed',
    }));

  it('allows at exactly 2h', () =>
    expect(check(new Date(start.getTime() - 2 * 3_600_000))).toEqual({ allowed: true }));

  it('allows with 3 days left', () =>
    expect(check(new Date(start.getTime() - 3 * 86_400_000))).toEqual({ allowed: true }));
});
