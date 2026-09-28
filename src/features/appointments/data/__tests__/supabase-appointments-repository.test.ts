import { createFakeSupabase } from '@/test/fake-supabase';

import { SupabaseAppointmentsRepository } from '../supabase-appointments-repository';

const expandedRow = {
  id: 'a1',
  client_id: 'u1',
  professional_id: 'p1',
  service_id: 's1',
  starts_at: '2026-09-29T15:00:00+00:00',
  ends_at: '2026-09-29T15:30:00+00:00',
  status: 'booked',
  created_at: '2026-09-28T10:00:00+00:00',
  cancelled_at: null,
  service_name: 'Haircut',
  professional_name: 'Marco',
  client_name: 'Casey',
};

function setup(signedIn = true) {
  const fake = createFakeSupabase();
  fake.auth.getSession.mockResolvedValue({
    data: { session: signedIn ? { user: { id: 'u1' } } : null },
    error: null,
  });
  return { fake, repo: new SupabaseAppointmentsRepository(fake.client) };
}

describe('SupabaseAppointmentsRepository', () => {
  it('lists my appointments filtered by client and mapped to the domain model', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [expandedRow] });
    const [appointment] = await repo.listMine();
    expect(appointment).toEqual({
      id: 'a1',
      clientId: 'u1',
      professionalId: 'p1',
      serviceId: 's1',
      start: new Date('2026-09-29T15:00:00Z'),
      end: new Date('2026-09-29T15:30:00Z'),
      status: 'booked',
      createdAt: new Date('2026-09-28T10:00:00Z'),
      cancelledAt: null,
      serviceName: 'Haircut',
      professionalName: 'Marco',
      clientName: 'Casey',
    });
    expect(fake.calls).toContainEqual(['from', 'appointments_expanded']);
    expect(fake.calls).toContainEqual(['eq', 'client_id', 'u1']);
    expect(fake.calls).toContainEqual(['order', 'starts_at']);
  });

  it('maps cancelled_at to a Date', async () => {
    const { fake, repo } = setup();
    fake.respond({
      data: [{ ...expandedRow, status: 'cancelled', cancelled_at: '2026-09-28T12:00:00+00:00' }],
    });
    const [appointment] = await repo.listMine();
    expect(appointment?.cancelledAt).toEqual(new Date('2026-09-28T12:00:00Z'));
  });

  it('throws unauthorized when there is no session', async () => {
    const { repo } = setup(false);
    await expect(repo.listMine()).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('getById throws notFound for a missing row', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: null });
    await expect(repo.getById('x')).rejects.toMatchObject({ code: 'notFound' });
  });

  it('cancel calls the RPC with the exact params', async () => {
    const { fake, repo } = setup();
    await repo.cancel('a1');
    expect(fake.rpc).toHaveBeenCalledWith('cancel_appointment', { p_id: 'a1' });
  });

  it('cancel maps a business error raised by the RPC', async () => {
    const { fake, repo } = setup();
    fake.respond({ error: { code: 'P0001', message: 'cancellationWindowClosed' } });
    await expect(repo.cancel('a1')).rejects.toMatchObject({ code: 'cancellationWindowClosed' });
  });
});
