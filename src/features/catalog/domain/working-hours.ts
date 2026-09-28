import type { LocalTime } from '@/core/time';

export interface WorkingHours {
  professionalId: string;
  weekday: number; // 0 = Sunday … 6 = Saturday
  startTime: LocalTime;
  endTime: LocalTime;
}
