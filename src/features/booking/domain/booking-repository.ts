import type { Appointment } from '@/features/appointments/domain/appointment';

import type { BusyRange } from './slot';
import type { LiveStatus, Unsubscribe } from './types';

export interface BookInput {
  serviceId: string;
  professionalId: string;
  start: Date;
}

export interface BookingRepository {
  getBusyRanges(professionalId: string, from: Date, to: Date): Promise<BusyRange[]>;
  book(input: BookInput): Promise<Appointment>;
  reschedule(appointmentId: string, newStart: Date): Promise<Appointment>;
  subscribeToAvailability(
    professionalId: string,
    onChange: () => void,
    onStatus?: (status: LiveStatus) => void,
  ): Unsubscribe;
}
