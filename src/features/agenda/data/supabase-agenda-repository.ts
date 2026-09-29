import { addDaysToLocalDate, zonedInstant, type LocalDate } from '@/core/time';
import type { AgendoSupabaseClient } from '@/core/supabase/client';
import { run } from '@/core/supabase/run';
import { subscribeToBroadcast } from '@/core/supabase/subscribe-broadcast';
import { toAppointment } from '@/features/appointments/data/mappers';
import type { Appointment } from '@/features/appointments/domain/appointment';
import type { LiveStatus, Unsubscribe } from '@/features/booking/domain/types';
import type { CatalogRepository } from '@/features/catalog/domain/catalog-repository';

import type { AgendaRepository } from '../domain/agenda-repository';

export class SupabaseAgendaRepository implements AgendaRepository {
  private timezone: Promise<string> | null = null;

  constructor(
    private readonly client: AgendoSupabaseClient,
    private readonly catalog: CatalogRepository,
  ) {}

  async listForDay(date: LocalDate, professionalId?: string): Promise<Appointment[]> {
    const timezone = await this.businessTimezone();
    const from = zonedInstant(date, '00:00', timezone);
    const to = zonedInstant(addDaysToLocalDate(date, 1), '00:00', timezone);
    const rows = await run(() => {
      let query = this.client
        .from('appointments_expanded')
        .select('*')
        .eq('status', 'booked')
        .gte('starts_at', from.toISOString())
        .lt('starts_at', to.toISOString());
      if (professionalId) query = query.eq('professional_id', professionalId);
      return query.order('starts_at');
    });
    return rows.map(toAppointment);
  }

  /** Only admins may receive this topic (RLS on realtime.messages). */
  subscribe(onChange: () => void, onStatus?: (status: LiveStatus) => void): Unsubscribe {
    return subscribeToBroadcast(
      this.client,
      'agendo:agenda',
      'appointment_changed',
      onChange,
      onStatus,
    );
  }

  private businessTimezone(): Promise<string> {
    if (!this.timezone) {
      const pending = this.catalog.getBusiness().then((b) => b.timezone);
      // Do not cache failures.
      pending.catch(() => {
        this.timezone = null;
      });
      this.timezone = pending;
    }
    return this.timezone;
  }
}
