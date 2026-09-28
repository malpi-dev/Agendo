import { DomainError } from '@/core/errors';
import type { AgendoSupabaseClient } from '@/core/supabase/client';
import { getCurrentUserId } from '@/core/supabase/current-user-id';
import { run } from '@/core/supabase/run';

import type { Appointment } from '../domain/appointment';
import type { AppointmentsRepository } from '../domain/appointments-repository';
import { toAppointment } from './mappers';

export class SupabaseAppointmentsRepository implements AppointmentsRepository {
  constructor(private readonly client: AgendoSupabaseClient) {}

  async listMine(): Promise<Appointment[]> {
    const userId = await getCurrentUserId(this.client);
    const rows = await run(() =>
      this.client
        .from('appointments_expanded')
        .select('*')
        .eq('client_id', userId)
        .order('starts_at'),
    );
    return rows.map(toAppointment);
  }

  async getById(id: string): Promise<Appointment> {
    const row = await run(() =>
      this.client.from('appointments_expanded').select('*').eq('id', id).maybeSingle(),
    );
    if (!row) throw new DomainError('notFound', 'Appointment not found');
    return toAppointment(row);
  }

  async cancel(id: string): Promise<void> {
    await run(() => this.client.rpc('cancel_appointment', { p_id: id }));
  }
}
