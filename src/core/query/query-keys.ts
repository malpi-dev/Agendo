import type { LocalDate } from '@/core/time';

/** Every TanStack Query key lives here; they are also used to invalidate. */
export const queryKeys = {
  business: ['business'] as const,
  services: ['services'] as const,
  service: (id: string) => ['services', id] as const,
  professionals: (serviceId: string) => ['professionals', serviceId] as const,
  professional: (id: string) => ['professional', id] as const,
  workingHours: (professionalId: string) => ['workingHours', professionalId] as const,
  busy: (professionalId: string, date?: LocalDate) =>
    (date ? ['busy', professionalId, date] : ['busy', professionalId]) as readonly unknown[],
  busyAll: ['busy'] as const,
  appointmentsMine: ['appointments', 'mine'] as const,
  appointment: (id: string) => ['appointments', id] as const,
  appointmentsAll: ['appointments'] as const,
  agenda: (date: LocalDate, professionalId?: string) =>
    ['agenda', date, professionalId ?? 'all'] as const,
  agendaAll: ['agenda'] as const,
};
