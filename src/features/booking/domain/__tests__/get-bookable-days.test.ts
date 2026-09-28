import { getBookableDays } from '../get-bookable-days';
import { business, hours } from './test-fixtures';

const NOW = new Date('2026-10-02T03:00:00Z'); // still 2026-10-01 in Mexico City
const weekdaysMonToSat = [1, 2, 3, 4, 5, 6].map((d) => hours(d, '09:00', '18:00'));

describe('getBookableDays', () => {
  it('returns maxAdvanceDays days starting today in the business timezone', () => {
    const days = getBookableDays({ now: NOW, business, workingHours: weekdaysMonToSat });
    expect(days).toHaveLength(30);
    expect(days[0]?.date).toBe('2026-10-01');
    expect(days[29]?.date).toBe('2026-10-30');
  });

  it('disables weekdays without working blocks', () => {
    const days = getBookableDays({ now: NOW, business, workingHours: weekdaysMonToSat });
    expect(days.find((d) => d.date === '2026-10-04')?.isDisabled).toBe(true); // Sunday
    expect(days.find((d) => d.date === '2026-10-05')?.isDisabled).toBe(false); // Monday
  });

  it('disables everything when the professional has no hours', () => {
    const days = getBookableDays({ now: NOW, business, workingHours: [] });
    expect(days.every((d) => d.isDisabled)).toBe(true);
  });
});
