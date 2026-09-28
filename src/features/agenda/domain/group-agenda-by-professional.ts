import type { Appointment } from '@/features/appointments/domain/appointment';

export interface AgendaGroup {
  professionalId: string;
  professionalName: string;
  appointments: Appointment[];
}

export function groupAgendaByProfessional(appointments: Appointment[]): AgendaGroup[] {
  const groups = new Map<string, AgendaGroup>();

  for (const a of appointments) {
    if (a.status !== 'booked') continue;
    const group = groups.get(a.professionalId) ?? {
      professionalId: a.professionalId,
      professionalName: a.professionalName,
      appointments: [],
    };
    group.appointments.push(a);
    groups.set(a.professionalId, group);
  }

  return [...groups.values()]
    .map((g) => ({
      ...g,
      appointments: g.appointments.sort((a, b) => a.start.getTime() - b.start.getTime()),
    }))
    .sort((a, b) => a.professionalName.localeCompare(b.professionalName));
}
