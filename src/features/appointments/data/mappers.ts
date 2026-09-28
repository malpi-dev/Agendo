import type { Database } from '@/core/supabase/database.generated';

import type { Appointment } from '../domain/appointment';

type ExpandedRow = Database['agendo']['Views']['appointments_expanded']['Row'];

/** The view types every column as nullable; the underlying tables guarantee them. */
export const toAppointment = (row: ExpandedRow): Appointment => ({
  id: row.id as string,
  clientId: row.client_id as string,
  professionalId: row.professional_id as string,
  serviceId: row.service_id as string,
  start: new Date(row.starts_at as string),
  end: new Date(row.ends_at as string),
  status: row.status as Appointment['status'],
  createdAt: new Date(row.created_at as string),
  cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
  serviceName: row.service_name as string,
  professionalName: row.professional_name as string,
  clientName: row.client_name,
});
