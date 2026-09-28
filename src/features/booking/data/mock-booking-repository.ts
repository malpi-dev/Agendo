import { DomainError } from '@/core/errors';
import { addDaysToLocalDate, toLocalDate } from '@/core/time';
import { canModifyAppointment } from '@/features/appointments/domain/can-modify-appointment';
import type { Appointment } from '@/features/appointments/domain/appointment';
import { cloneAppointment } from '@/features/demo/data/clone';
import { FAKE_CLIENTS } from '@/features/demo/data/fixtures';
import type { MockDb } from '@/features/demo/data/mock-db';

import type { BookInput, BookingRepository } from '../domain/booking-repository';
import { getAvailableSlots } from '../domain/get-available-slots';
import { rangesOverlap } from '../domain/ranges';
import type { BusyRange, TimeRange } from '../domain/slot';
import type { LiveStatus, Unsubscribe } from '../domain/types';

const CONCURRENT_BOOKING_DELAY_MS = 5000;

export class MockBookingRepository implements BookingRepository {
  constructor(private readonly db: MockDb) {}

  async getBusyRanges(professionalId: string, from: Date, to: Date): Promise<BusyRange[]> {
    await this.db.delay();
    this.db.lastBusyQuery = { professionalId, from, to };
    return this.bookedFor(professionalId)
      .filter((a) => rangesOverlap(a, { start: from, end: to }))
      .map((a) => ({ start: new Date(a.start), end: new Date(a.end) }));
  }

  async book(input: BookInput): Promise<Appointment> {
    await this.db.delay();
    const service = this.db.services.find((s) => s.id === input.serviceId && s.isActive);
    const professional = this.db.professionals.find(
      (p) => p.id === input.professionalId && p.isActive,
    );
    if (!service || !professional) throw new DomainError('notFound');
    if (!professional.serviceIds.includes(service.id)) throw new DomainError('validation');

    const range = this.rangeFor(input.start, service.durationMinutes);
    this.assertBookable(input.professionalId, range);
    this.assertNoConflicts(input.professionalId, range);

    const appointment: Appointment = {
      id: this.db.newAppointmentId(),
      clientId: this.db.currentUser.id,
      professionalId: professional.id,
      serviceId: service.id,
      start: range.start,
      end: range.end,
      status: 'booked',
      createdAt: this.db.now(),
      cancelledAt: null,
      serviceName: service.name,
      professionalName: professional.name,
      clientName: this.db.currentUser.fullName,
    };
    this.db.appointments.push(appointment);
    this.db.emit({ type: 'appointmentChanged', professionalId: professional.id });
    return cloneAppointment(appointment);
  }

  async reschedule(appointmentId: string, newStart: Date): Promise<Appointment> {
    await this.db.delay();
    const appointment = this.db.appointments.find((a) => a.id === appointmentId);
    if (!appointment || appointment.clientId !== this.db.currentUser.id) {
      throw new DomainError('notFound');
    }
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

    const service = this.db.services.find((s) => s.id === appointment.serviceId);
    const range = this.rangeFor(newStart, service?.durationMinutes ?? 0);
    this.assertBookable(appointment.professionalId, range);
    this.assertNoConflicts(appointment.professionalId, range, appointment.id);

    appointment.start = range.start;
    appointment.end = range.end;
    this.db.emit({ type: 'appointmentChanged', professionalId: appointment.professionalId });
    return cloneAppointment(appointment);
  }

  subscribeToAvailability(
    professionalId: string,
    onChange: () => void,
    onStatus?: (status: LiveStatus) => void,
  ): Unsubscribe {
    onStatus?.('live');
    const off = this.db.on((event) => {
      if (event.professionalId === professionalId) onChange();
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (this.db.simulateConcurrentBooking && !this.db.concurrentBookingSimulated) {
      timer = setTimeout(
        () => this.simulateConcurrentBooking(professionalId),
        CONCURRENT_BOOKING_DELAY_MS,
      );
    }

    return () => {
      clearTimeout(timer);
      off();
    };
  }

  private bookedFor(professionalId: string): Appointment[] {
    return this.db.appointments.filter(
      (a) => a.professionalId === professionalId && a.status === 'booked',
    );
  }

  private rangeFor(start: Date, durationMinutes: number): TimeRange {
    return { start: new Date(start), end: new Date(start.getTime() + durationMinutes * 60_000) };
  }

  /** Mirrors the checks of the book/reschedule RPCs: window, working hours. */
  private assertBookable(professionalId: string, range: TimeRange): void {
    const { business } = this.db;
    const now = this.db.now();
    const today = toLocalDate(now, business.timezone);
    const date = toLocalDate(range.start, business.timezone);
    if (
      range.start.getTime() < now.getTime() + business.minNoticeMinutes * 60_000 ||
      date >= addDaysToLocalDate(today, business.maxAdvanceDays)
    ) {
      throw new DomainError('bookingWindow');
    }
    const slots = getAvailableSlots({
      date,
      service: { durationMinutes: (range.end.getTime() - range.start.getTime()) / 60_000 },
      workingHours: this.db.workingHours.filter((h) => h.professionalId === professionalId),
      busyRanges: [],
      business,
      now,
    });
    if (!slots.some((s) => s.start.getTime() === range.start.getTime())) {
      throw new DomainError('outsideWorkingHours');
    }
  }

  /** Mirrors the EXCLUDE constraints. `ignoreId` excludes the appointment being rescheduled. */
  private assertNoConflicts(professionalId: string, range: TimeRange, ignoreId?: string): void {
    const booked = this.db.appointments.filter((a) => a.status === 'booked' && a.id !== ignoreId);
    if (booked.some((a) => a.professionalId === professionalId && rangesOverlap(a, range))) {
      throw new DomainError('slotUnavailable');
    }
    if (booked.some((a) => a.clientId === this.db.currentUser.id && rangesOverlap(a, range))) {
      throw new DomainError('clientOverlap');
    }
  }

  /** Demo of live updates: someone else takes the first free slot of the day being viewed. */
  private simulateConcurrentBooking(professionalId: string): void {
    const { db } = this;
    const query = db.lastBusyQuery;
    if (db.concurrentBookingSimulated || !query || query.professionalId !== professionalId) return;
    const professional = db.professionals.find((p) => p.id === professionalId);
    const services = db.services.filter((s) => professional?.serviceIds.includes(s.id));
    const shortest = services.reduce<(typeof services)[number] | undefined>(
      (min, s) => (!min || s.durationMinutes < min.durationMinutes ? s : min),
      undefined,
    );
    if (!professional || !shortest) return;

    const [slot] = getAvailableSlots({
      date: toLocalDate(query.from, db.business.timezone),
      service: shortest,
      workingHours: db.workingHours.filter((h) => h.professionalId === professionalId),
      busyRanges: this.bookedFor(professionalId).map(({ start, end }) => ({ start, end })),
      business: db.business,
      now: db.now(),
    });
    if (!slot) return;

    const stranger = FAKE_CLIENTS[FAKE_CLIENTS.length - 1];
    db.concurrentBookingSimulated = true;
    db.appointments.push({
      id: db.newAppointmentId(),
      clientId: stranger?.id ?? '',
      professionalId,
      serviceId: shortest.id,
      start: slot.start,
      end: slot.end,
      status: 'booked',
      createdAt: db.now(),
      cancelledAt: null,
      serviceName: shortest.name,
      professionalName: professional.name,
      clientName: stranger?.name ?? null,
    });
    db.emit({ type: 'appointmentChanged', professionalId });
  }
}
