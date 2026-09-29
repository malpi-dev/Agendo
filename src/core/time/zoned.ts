import { TZDate } from '@date-fns/tz';

export type LocalDate = string; // 'YYYY-MM-DD' in the business timezone
export type LocalTime = string; // 'HH:MM' (also accepts 'HH:MM:SS' from Postgres)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const parseLocalDate = (date: LocalDate): [number, number, number] => {
  const [y, m, d] = date.split('-').map(Number);
  return [y ?? 0, m ?? 1, d ?? 1];
};

const pad = (n: number): string => String(n).padStart(2, '0');

export function toLocalDate(instant: Date, timeZone: string): LocalDate {
  const z = new TZDate(instant.getTime(), timeZone);
  return `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`;
}

export function zonedInstant(date: LocalDate, time: LocalTime, timeZone: string): Date {
  const [y, m, d] = parseLocalDate(date);
  const [h, min] = time.split(':').map(Number);
  const z = new TZDate(y, m - 1, d, h ?? 0, min ?? 0, timeZone);
  return new Date(z.getTime());
}

export function addDaysToLocalDate(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = parseLocalDate(date);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function weekdayOf(date: LocalDate): number {
  const [y, m, d] = parseLocalDate(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function localTimeToMinutes(time: LocalTime): number {
  const [h, min] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (min ?? 0);
}

/** 'HH:MM' (24 h) of an instant in the given timezone. */
export function toLocalTime(instant: Date, timeZone: string): LocalTime {
  const z = new TZDate(instant.getTime(), timeZone);
  return `${pad(z.getHours())}:${pad(z.getMinutes())}`;
}

export function formatTime(instant: Date, timeZone: string): string {
  const z = new TZDate(instant.getTime(), timeZone);
  const h = z.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(z.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatLongDate(instant: Date, timeZone: string): string {
  const z = new TZDate(instant.getTime(), timeZone);
  return `${LONG_WEEKDAYS[z.getDay()]}, ${MONTHS[z.getMonth()]} ${z.getDate()}`;
}

export function formatDayChip(date: LocalDate): { weekday: string; day: string; month: string } {
  const [, m, d] = parseLocalDate(date);
  return { weekday: WEEKDAYS[weekdayOf(date)] ?? '', day: String(d), month: MONTHS[m - 1] ?? '' };
}

/** Spoken form of a calendar day, e.g. "Tuesday, October 6" (screen readers). */
export function formatDayLabel(date: LocalDate): string {
  const [, m, d] = parseLocalDate(date);
  return `${LONG_WEEKDAYS[weekdayOf(date)] ?? ''}, ${LONG_MONTHS[m - 1] ?? ''} ${d}`;
}

export function compareLocalDate(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
