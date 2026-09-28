import { rangesOverlap } from '../ranges';
import { at } from './test-fixtures';

const r = (a: string, b: string) => ({ start: at('2026-10-01', a), end: at('2026-10-01', b) });

describe('rangesOverlap', () => {
  it('detects overlap', () =>
    expect(rangesOverlap(r('09:00', '10:00'), r('09:30', '10:30'))).toBe(true));
  it('detects containment', () =>
    expect(rangesOverlap(r('09:00', '11:00'), r('09:30', '10:00'))).toBe(true));
  it('touching ranges do not overlap', () => {
    expect(rangesOverlap(r('09:00', '10:00'), r('10:00', '11:00'))).toBe(false);
    expect(rangesOverlap(r('10:00', '11:00'), r('09:00', '10:00'))).toBe(false);
  });
  it('disjoint ranges do not overlap', () =>
    expect(rangesOverlap(r('09:00', '10:00'), r('11:00', '12:00'))).toBe(false));
});
