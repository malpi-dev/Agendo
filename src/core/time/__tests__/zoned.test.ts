import {
  addDaysToLocalDate,
  compareLocalDate,
  formatDayChip,
  formatLongDate,
  formatPrice,
  formatTime,
  localTimeToMinutes,
  toLocalDate,
  weekdayOf,
  zonedInstant,
} from '../zoned';

describe('zoned', () => {
  it.each([
    ['2026-10-01', '10:00', 'America/Mexico_City', '2026-10-01T16:00:00.000Z'],
    ['2026-03-07', '09:00', 'America/New_York', '2026-03-07T14:00:00.000Z'],
    ['2026-03-09', '09:00', 'America/New_York', '2026-03-09T13:00:00.000Z'],
    ['2026-11-02', '09:00', 'America/New_York', '2026-11-02T14:00:00.000Z'],
  ])('zonedInstant(%s, %s, %s)', (date, time, tz, expected) => {
    expect(zonedInstant(date, time, tz).toISOString()).toBe(expected);
  });

  it('toLocalDate uses the business timezone', () => {
    expect(toLocalDate(new Date('2026-10-02T05:30:00Z'), 'America/Mexico_City')).toBe('2026-10-01');
  });

  it('addDaysToLocalDate crosses year and month boundaries', () => {
    expect(addDaysToLocalDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToLocalDate('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('weekdayOf returns 0 for Sunday', () => {
    expect(weekdayOf('2026-09-27')).toBe(0);
  });

  it('localTimeToMinutes accepts HH:MM and HH:MM:SS', () => {
    expect(localTimeToMinutes('09:30:00')).toBe(570);
    expect(localTimeToMinutes('09:30')).toBe(570);
  });

  it('formatTime', () => {
    expect(formatTime(new Date('2026-10-01T16:30:00Z'), 'America/Mexico_City')).toBe('10:30 AM');
    expect(formatTime(new Date('2026-10-01T18:00:00Z'), 'America/Mexico_City')).toBe('12:00 PM');
  });

  it('formatLongDate', () => {
    expect(formatLongDate(new Date('2026-10-06T16:00:00Z'), 'America/Mexico_City')).toBe(
      'Tuesday, Oct 6',
    );
  });

  it('formatDayChip', () => {
    expect(formatDayChip('2026-10-06')).toEqual({ weekday: 'Tue', day: '6', month: 'Oct' });
  });

  it('compareLocalDate', () => {
    expect(compareLocalDate('2026-01-01', '2026-01-02')).toBeLessThan(0);
    expect(compareLocalDate('2026-01-02', '2026-01-02')).toBe(0);
    expect(compareLocalDate('2026-02-01', '2026-01-02')).toBeGreaterThan(0);
  });

  it('formatPrice', () => {
    expect(formatPrice(2000, 'USD')).toBe('$20.00');
  });
});
