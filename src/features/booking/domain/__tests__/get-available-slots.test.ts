import { getAvailableSlots, type GetAvailableSlotsInput } from '../get-available-slots';
import { at, business, hours, TZ } from './test-fixtures';

const THURSDAY = '2026-10-01'; // weekday 4
const NOW = at('2026-09-30', '12:00');

const run = (overrides: Partial<GetAvailableSlotsInput>) =>
  getAvailableSlots({
    date: THURSDAY,
    service: { durationMinutes: 30 },
    workingHours: [hours(4, '09:00', '10:00')],
    busyRanges: [],
    business,
    now: NOW,
    ...overrides,
  });

const starts = (input: Partial<GetAvailableSlotsInput>, tz = TZ) =>
  run(input).map((s) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(s.start),
  );

describe('getAvailableSlots', () => {
  it('1. generates slots every interval that fit in the block', () => {
    expect(starts({})).toEqual(['09:00', '09:15', '09:30']);
  });

  it('2. returns nothing when the service is longer than the block', () => {
    expect(run({ service: { durationMinutes: 90 } })).toEqual([]);
  });

  it('3. never crosses the lunch break', () => {
    const result = starts({
      service: { durationMinutes: 60 },
      workingHours: [hours(4, '09:00', '13:00'), hours(4, '14:00', '19:00')],
    });
    expect(result).toContain('12:00');
    expect(result).not.toContain('12:15');
    expect(result).not.toContain('13:00');
    expect(result).toContain('14:00');
    expect(result[result.length - 1]).toBe('18:00');
  });

  it('4. excludes slots overlapping a busy range', () => {
    const result = starts({
      workingHours: [hours(4, '09:00', '10:30')],
      busyRanges: [{ start: at(THURSDAY, '09:20'), end: at(THURSDAY, '09:40') }],
    });
    expect(result).toEqual(['09:45', '10:00']);
  });

  it('5. a busy range ending at 09:30 leaves 09:30 free (half-open)', () => {
    const result = starts({
      busyRanges: [{ start: at(THURSDAY, '09:00'), end: at(THURSDAY, '09:30') }],
    });
    expect(result).toEqual(['09:30']);
  });

  it('6. a slot ending exactly when a busy range starts is free', () => {
    const result = starts({
      busyRanges: [{ start: at(THURSDAY, '09:30'), end: at(THURSDAY, '10:00') }],
    });
    expect(result).toEqual(['09:00']);
  });

  it('7. respects minimum notice', () => {
    const result = starts({
      now: at(THURSDAY, '08:30'),
      workingHours: [hours(4, '09:00', '11:00')],
    });
    expect(result[0]).toBe('09:30');
  });

  it('8. returns nothing when now is past the block', () => {
    expect(run({ now: at(THURSDAY, '11:00') })).toEqual([]);
  });

  it('9. returns nothing for past dates', () => {
    expect(run({ date: '2026-09-24', workingHours: [hours(4, '09:00', '10:00')] })).toEqual([]);
  });

  it('10. respects the max advance window', () => {
    const now = at('2026-10-01', '12:00');
    const wh = Array.from({ length: 7 }, (_, d) => hours(d, '09:00', '10:00'));
    expect(run({ now, workingHours: wh, date: '2026-10-31' })).toEqual([]); // today + 30
    expect(run({ now, workingHours: wh, date: '2026-10-30' })).not.toEqual([]); // today + 29
  });

  it('11. returns nothing on a weekday without blocks', () => {
    expect(run({ date: '2026-10-02' })).toEqual([]); // Friday
  });

  it('12. busy ranges from other days do not affect the result', () => {
    const result = starts({
      busyRanges: [{ start: at('2026-10-02', '09:00'), end: at('2026-10-02', '10:00') }],
    });
    expect(result).toEqual(['09:00', '09:15', '09:30']);
  });

  it('13. handles the DST shift (EDT after March 8)', () => {
    const ny = { ...business, timezone: 'America/New_York' };
    const result = run({
      business: ny,
      date: '2026-03-09',
      now: at('2026-03-08', '12:00', 'America/New_York'),
      workingHours: [hours(1, '09:00', '10:00')],
    });
    expect(result[0]?.start.toISOString()).toBe('2026-03-09T13:00:00.000Z');
  });

  it('14. handles standard time before the DST shift (EST)', () => {
    const ny = { ...business, timezone: 'America/New_York' };
    const result = run({
      business: ny,
      date: '2026-03-06',
      now: at('2026-03-05', '12:00', 'America/New_York'),
      workingHours: [hours(5, '09:00', '10:00')],
    });
    expect(result[0]?.start.toISOString()).toBe('2026-03-06T14:00:00.000Z');
  });

  it('15. sorts results even when working hours are unordered', () => {
    const result = run({
      workingHours: [hours(4, '14:00', '15:00'), hours(4, '09:00', '10:00')],
    });
    const times = result.map((s) => s.start.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(result).toHaveLength(6);
  });

  it('16. accepts Postgres time format HH:MM:SS', () => {
    expect(starts({ workingHours: [hours(4, '09:00:00', '10:00:00')] })).toEqual(
      starts({ workingHours: [hours(4, '09:00', '10:00')] }),
    );
  });

  it('sets each slot end to start + duration', () => {
    const [slot] = run({});
    expect(slot && slot.end.getTime() - slot.start.getTime()).toBe(30 * 60_000);
  });
});
