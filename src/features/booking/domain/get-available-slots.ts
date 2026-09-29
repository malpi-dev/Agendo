import {
  addDaysToLocalDate,
  toLocalDate,
  weekdayOf,
  zonedInstant,
  type LocalDate,
} from '@/core/time';
import type { Business } from '@/features/catalog/domain/business';
import type { Service } from '@/features/catalog/domain/service';
import type { WorkingHours } from '@/features/catalog/domain/working-hours';

import { rangesOverlap } from './ranges';
import type { BusyRange, Slot } from './slot';

const MINUTE_MS = 60_000;

export interface GetAvailableSlotsInput {
  date: LocalDate;
  service: Pick<Service, 'durationMinutes'>;
  /** Working hours of ONE professional. */
  workingHours: WorkingHours[];
  busyRanges: BusyRange[];
  /** While rescheduling: the appointment's own range, which must not block itself. */
  ignoreRange?: BusyRange | undefined;
  business: Business;
  now: Date;
}

/** Must stay in sync with the validation in the `book_appointment` RPC. */
export function getAvailableSlots({
  date,
  service,
  workingHours,
  busyRanges,
  ignoreRange,
  business,
  now,
}: GetAvailableSlotsInput): Slot[] {
  const tz = business.timezone;
  const today = toLocalDate(now, tz);
  if (date < today || date >= addDaysToLocalDate(today, business.maxAdvanceDays)) return [];

  const weekday = weekdayOf(date);
  const blocks = workingHours
    .filter((h) => h.weekday === weekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const earliest = now.getTime() + business.minNoticeMinutes * MINUTE_MS;
  const durationMs = service.durationMinutes * MINUTE_MS;
  const stepMs = business.slotIntervalMinutes * MINUTE_MS;
  const blocking = ignoreRange
    ? busyRanges.filter(
        (r) =>
          r.start.getTime() !== ignoreRange.start.getTime() ||
          r.end.getTime() !== ignoreRange.end.getTime(),
      )
    : busyRanges;
  const slots: Slot[] = [];

  for (const block of blocks) {
    const blockStart = zonedInstant(date, block.startTime, tz).getTime();
    const blockEnd = zonedInstant(date, block.endTime, tz).getTime();

    for (let t = blockStart; t + durationMs <= blockEnd; t += stepMs) {
      if (t < earliest) continue;
      const candidate: Slot = { start: new Date(t), end: new Date(t + durationMs) };
      if (blocking.some((busy) => rangesOverlap(candidate, busy))) continue;
      slots.push(candidate);
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}
