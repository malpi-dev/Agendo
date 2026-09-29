import type { AgendoSupabaseClient } from '@/core/supabase/client';
import { run } from '@/core/supabase/run';
import { subscribeToBroadcast } from '@/core/supabase/subscribe-broadcast';
import type { Appointment } from '@/features/appointments/domain/appointment';
import { toAppointment } from '@/features/appointments/data/mappers';
import { DomainError } from '@/core/errors';

import type { BookInput, BookingRepository } from '../domain/booking-repository';
import type { BusyRange } from '../domain/slot';
import type { LiveStatus, Unsubscribe } from '../domain/types';

export class SupabaseBookingRepository implements BookingRepository {
  constructor(private readonly client: AgendoSupabaseClient) {}

  async getBusyRanges(professionalId: string, from: Date, to: Date): Promise<BusyRange[]> {
    const rows = await run(() =>
      this.client.rpc('get_busy_ranges', {
        p_professional_id: professionalId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      }),
    );
    return rows.map((r) => ({ start: new Date(r.starts_at), end: new Date(r.ends_at) }));
  }

  async book({ serviceId, professionalId, start }: BookInput): Promise<Appointment> {
    const created = await run(() =>
      this.client.rpc('book_appointment', {
        p_service_id: serviceId,
        p_professional_id: professionalId,
        p_starts_at: start.toISOString(),
      }),
    );
    return this.readExpanded(created.id);
  }

  async reschedule(appointmentId: string, newStart: Date): Promise<Appointment> {
    const updated = await run(() =>
      this.client.rpc('reschedule_appointment', {
        p_id: appointmentId,
        p_new_starts_at: newStart.toISOString(),
      }),
    );
    return this.readExpanded(updated.id);
  }

  subscribeToAvailability(
    professionalId: string,
    onChange: () => void,
    onStatus?: (status: LiveStatus) => void,
  ): Unsubscribe {
    return subscribeToBroadcast(
      this.client,
      `agendo:availability:${professionalId}`,
      'appointment_changed',
      onChange,
      onStatus,
    );
  }

  private async readExpanded(id: string): Promise<Appointment> {
    const row = await run(() =>
      this.client.from('appointments_expanded').select('*').eq('id', id).maybeSingle(),
    );
    if (!row) throw new DomainError('notFound', 'Appointment not found');
    return toAppointment(row);
  }
}
