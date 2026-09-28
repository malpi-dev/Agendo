import { DomainError } from '@/core/errors';
import { cloneAppointment } from '@/features/demo/data/clone';
import type { MockDb } from '@/features/demo/data/mock-db';

import type { Appointment } from '../domain/appointment';
import type { AppointmentsRepository } from '../domain/appointments-repository';
import { canModifyAppointment } from '../domain/can-modify-appointment';

export class MockAppointmentsRepository implements AppointmentsRepository {
  constructor(private readonly db: MockDb) {}

  async listMine(): Promise<Appointment[]> {
    await this.db.delay();
    return this.db.appointments
      .filter((a) => a.clientId === this.db.currentUser.id)
      .map(cloneAppointment);
  }

  async getById(id: string): Promise<Appointment> {
    await this.db.delay();
    const appointment = this.db.appointments.find((a) => a.id === id);
    const visible =
      appointment &&
      (appointment.clientId === this.db.currentUser.id || this.db.currentUser.role === 'admin');
    if (!appointment || !visible) throw new DomainError('notFound');
    return cloneAppointment(appointment);
  }

  async cancel(id: string): Promise<void> {
    await this.db.delay();
    const appointment = this.db.appointments.find((a) => a.id === id);
    const allowedToTouch =
      appointment &&
      (appointment.clientId === this.db.currentUser.id || this.db.currentUser.role === 'admin');
    if (!appointment || !allowedToTouch) throw new DomainError('notFound');

    const decision = canModifyAppointment({
      appointment,
      business: this.db.business,
      now: this.db.now(),
    });
    if (!decision.allowed) {
      throw new DomainError(
        decision.reason === 'notBooked' ? 'validation' : 'cancellationWindowClosed',
      );
    }

    appointment.status = 'cancelled';
    appointment.cancelledAt = this.db.now();
    this.db.emit({ type: 'appointmentChanged', professionalId: appointment.professionalId });
  }
}
