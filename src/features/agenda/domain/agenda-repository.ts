import type { LocalDate } from '@/core/time';
import type { Appointment } from '@/features/appointments/domain/appointment';
import type { LiveStatus, Unsubscribe } from '@/features/booking/domain/types';

export interface AgendaRepository {
  /** Booked appointments only, for a day in the business timezone. */
  listForDay(date: LocalDate, professionalId?: string): Promise<Appointment[]>;
  subscribe(onChange: () => void, onStatus?: (status: LiveStatus) => void): Unsubscribe;
}
