import { zonedInstant } from '@/core/time';
import type { Appointment } from '@/features/appointments/domain/appointment';
import type { Business } from '@/features/catalog/domain/business';
import type { WorkingHours } from '@/features/catalog/domain/working-hours';

export const TZ = 'America/Mexico_City';

export const business: Business = {
  id: 'biz-1',
  name: 'Test Business',
  timezone: TZ,
  currency: 'USD',
  slotIntervalMinutes: 15,
  minNoticeMinutes: 60,
  maxAdvanceDays: 30,
  cancelLimitHours: 2,
  reminderLeadMinutes: 120,
};

export const at = (date: string, time: string, tz = TZ): Date => zonedInstant(date, time, tz);

export const hours = (
  weekday: number,
  startTime: string,
  endTime: string,
  professionalId = 'pro-1',
): WorkingHours => ({ professionalId, weekday, startTime, endTime });

export const makeAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'apt-1',
  clientId: 'client-1',
  professionalId: 'pro-1',
  serviceId: 'svc-1',
  start: at('2026-10-01', '10:00'),
  end: at('2026-10-01', '10:30'),
  status: 'booked',
  createdAt: at('2026-09-20', '10:00'),
  cancelledAt: null,
  serviceName: 'Haircut',
  professionalName: 'Alex',
  clientName: 'Sam',
  ...overrides,
});
