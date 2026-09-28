import { DomainError } from '@/core/errors';
import { toLocalDate, type LocalDate } from '@/core/time';
import type { Appointment } from '@/features/appointments/domain/appointment';
import type { LiveStatus, Unsubscribe } from '@/features/booking/domain/types';
import { cloneAppointment } from '@/features/demo/data/clone';
import type { MockDb } from '@/features/demo/data/mock-db';

import type { AgendaRepository } from '../domain/agenda-repository';

export class MockAgendaRepository implements AgendaRepository {
  constructor(private readonly db: MockDb) {}

  async listForDay(date: LocalDate, professionalId?: string): Promise<Appointment[]> {
    await this.db.delay();
    this.assertAdmin();
    return this.db.appointments
      .filter(
        (a) =>
          a.status === 'booked' &&
          toLocalDate(a.start, this.db.business.timezone) === date &&
          (!professionalId || a.professionalId === professionalId),
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map(cloneAppointment);
  }

  subscribe(onChange: () => void, onStatus?: (status: LiveStatus) => void): Unsubscribe {
    onStatus?.('live');
    return this.db.on(onChange);
  }

  private assertAdmin(): void {
    if (this.db.currentUser.role !== 'admin') throw new DomainError('forbidden');
  }
}
