import { addDaysToLocalDate, toLocalDate, weekdayOf, type LocalDate } from '@/core/time';
import type { Business } from '@/features/catalog/domain/business';
import type { WorkingHours } from '@/features/catalog/domain/working-hours';

export interface BookableDay {
  date: LocalDate;
  isDisabled: boolean;
}

export function getBookableDays(input: {
  now: Date;
  business: Business;
  workingHours: WorkingHours[];
}): BookableDay[] {
  const { now, business, workingHours } = input;
  const today = toLocalDate(now, business.timezone);
  const workingWeekdays = new Set(workingHours.map((h) => h.weekday));

  return Array.from({ length: business.maxAdvanceDays }, (_, i) => {
    const date = addDaysToLocalDate(today, i);
    return { date, isDisabled: !workingWeekdays.has(weekdayOf(date)) };
  });
}
