import type { Database } from '@/core/supabase/database.generated';

import type { Business } from '../domain/business';
import type { Professional } from '../domain/professional';
import type { Service } from '../domain/service';
import type { WorkingHours } from '../domain/working-hours';

type Tables = Database['agendo']['Tables'];
type BusinessRow = Tables['business']['Row'];
type ServiceRow = Tables['services']['Row'];
type ProfessionalRow = Tables['professionals']['Row'] & {
  professional_services: { service_id: string }[];
};
type WorkingHoursRow = Tables['working_hours']['Row'];

export const toBusiness = (row: BusinessRow): Business => ({
  id: row.id,
  name: row.name,
  timezone: row.timezone,
  currency: row.currency,
  slotIntervalMinutes: row.slot_interval_minutes,
  minNoticeMinutes: row.min_notice_minutes,
  maxAdvanceDays: row.max_advance_days,
  cancelLimitHours: row.cancel_limit_hours,
  reminderLeadMinutes: row.reminder_lead_minutes,
});

export const toService = (row: ServiceRow): Service => ({
  id: row.id,
  name: row.name,
  description: row.description,
  durationMinutes: row.duration_minutes,
  priceCents: row.price_cents,
  isActive: row.is_active,
  sortOrder: row.sort_order,
});

export const toProfessional = (row: ProfessionalRow): Professional => ({
  id: row.id,
  name: row.name,
  bio: row.bio,
  avatarUrl: row.avatar_url,
  isActive: row.is_active,
  serviceIds: (row.professional_services ?? []).map((ps) => ps.service_id),
});

export const toWorkingHours = (row: WorkingHoursRow): WorkingHours => ({
  professionalId: row.professional_id,
  weekday: row.weekday,
  startTime: row.start_time,
  endTime: row.end_time,
});
