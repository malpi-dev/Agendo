import type { Appointment } from '@/features/appointments/domain/appointment';
import type { UserRole } from '@/features/auth/domain/profile';
import type { Business } from '@/features/catalog/domain/business';
import type { Professional } from '@/features/catalog/domain/professional';
import type { Service } from '@/features/catalog/domain/service';
import type { WorkingHours } from '@/features/catalog/domain/working-hours';

import {
  buildDemoAppointments,
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  DEMO_USER_NAME,
  demoBusiness,
  demoProfessionals,
  demoServices,
  demoWorkingHours,
} from './fixtures';

export type MockEvent = { type: 'appointmentChanged'; professionalId: string };

export interface MockDbOptions {
  /** Injectable clock (tests). */
  now?: () => Date;
  /** Random latency range in ms. Default [200, 400]; tests use [0, 0]. */
  latencyMs?: [number, number];
  /** Simulate another user booking a slot after 5 s. Default true; tests may disable. */
  simulateConcurrentBooking?: boolean;
}

/** In-memory database with the same data as the Supabase seed. No React dependencies. */
export class MockDb {
  business: Business;
  services: Service[];
  professionals: Professional[];
  workingHours: WorkingHours[];
  appointments: Appointment[];
  currentUser: { id: string; fullName: string; role: UserRole; email: string };

  // state used by the realtime simulation
  lastBusyQuery: { professionalId: string; from: Date; to: Date } | null = null;
  concurrentBookingSimulated = false;
  readonly simulateConcurrentBooking: boolean;

  private readonly clock: () => Date;
  private readonly latencyMs: [number, number];
  private readonly listeners = new Set<(e: MockEvent) => void>();
  private nextAppointmentNumber: number;

  constructor(options: MockDbOptions = {}) {
    this.clock = options.now ?? (() => new Date());
    this.latencyMs = options.latencyMs ?? [200, 400];
    this.simulateConcurrentBooking = options.simulateConcurrentBooking ?? true;

    this.business = { ...demoBusiness };
    this.services = demoServices.map((s) => ({ ...s }));
    this.professionals = demoProfessionals.map((p) => ({ ...p, serviceIds: [...p.serviceIds] }));
    this.workingHours = demoWorkingHours.map((h) => ({ ...h }));
    this.appointments = buildDemoAppointments(this.clock());
    this.nextAppointmentNumber = this.appointments.length + 1;
    this.currentUser = {
      id: DEMO_USER_ID,
      fullName: DEMO_USER_NAME,
      role: 'client',
      email: DEMO_USER_EMAIL,
    };
  }

  now(): Date {
    return this.clock();
  }

  delay(): Promise<void> {
    const [min, max] = this.latencyMs;
    const ms = min + Math.random() * (max - min);
    return ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
  }

  on(listener: (e: MockEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(e: MockEvent): void {
    [...this.listeners].forEach((listener) => listener(e));
  }

  newAppointmentId(): string {
    return `demo-appt-${String(this.nextAppointmentNumber++).padStart(3, '0')}`;
  }
}
