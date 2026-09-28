/** Half-open range [start, end). */
export interface TimeRange {
  start: Date;
  end: Date;
}
/** Contains no personal data. */
export type BusyRange = TimeRange;
export type Slot = TimeRange;
