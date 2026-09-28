import type { Appointment } from './appointment';

export interface AppointmentsRepository {
  listMine(): Promise<Appointment[]>;
  /** @throws DomainError('notFound') */
  getById(id: string): Promise<Appointment>;
  cancel(id: string): Promise<void>;
}
