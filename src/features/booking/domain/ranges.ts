import type { TimeRange } from './slot';

/** Half-open overlap: touching ranges do not overlap. */
export const rangesOverlap = (a: TimeRange, b: TimeRange): boolean =>
  a.start < b.end && b.start < a.end;
