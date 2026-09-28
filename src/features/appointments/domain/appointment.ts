export type AppointmentStatus = 'booked' | 'cancelled' | 'completed' | 'no_show';

export interface Appointment {
  id: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  createdAt: Date;
  cancelledAt: Date | null;
  serviceName: string;
  professionalName: string;
  clientName: string | null;
}
