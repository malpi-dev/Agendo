import type { AppointmentStatus } from '@/features/appointments/domain/appointment';
import { at, makeAppointment } from '@/features/booking/domain/__tests__/test-fixtures';

import { groupAgendaByProfessional } from '../group-agenda-by-professional';

const apt = (
  id: string,
  proId: string,
  proName: string,
  time: string,
  status: AppointmentStatus = 'booked',
) =>
  makeAppointment({
    id,
    professionalId: proId,
    professionalName: proName,
    start: at('2026-10-01', time),
    status,
  });

describe('groupAgendaByProfessional', () => {
  it('groups by professional sorted by name, appointments by start', () => {
    const groups = groupAgendaByProfessional([
      apt('1', 'p2', 'Zoe', '11:00'),
      apt('2', 'p1', 'Alex', '12:00'),
      apt('3', 'p1', 'Alex', '09:00'),
    ]);
    expect(groups.map((g) => g.professionalName)).toEqual(['Alex', 'Zoe']);
    expect(groups[0]?.appointments.map((a) => a.id)).toEqual(['3', '2']);
  });

  it('ignores cancelled appointments and drops empty groups', () => {
    const groups = groupAgendaByProfessional([
      apt('1', 'p1', 'Alex', '09:00', 'cancelled'),
      apt('2', 'p2', 'Zoe', '10:00'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.professionalId).toBe('p2');
  });

  it('returns an empty list for no appointments', () => {
    expect(groupAgendaByProfessional([])).toEqual([]);
  });
});
