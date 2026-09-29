import { createFakeSupabase } from '@/test/fake-supabase';

import { SupabaseBookingRepository } from '../supabase-booking-repository';

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

function setup() {
  const fake = createFakeSupabase();
  return { fake, repo: new SupabaseBookingRepository(fake.client) };
}

describe('SupabaseBookingRepository', () => {
  it('getBusyRanges sends ISO params and maps to Date ranges', async () => {
    const { fake, repo } = setup();
    fake.respond({
      data: [{ starts_at: '2026-09-29T15:00:00+00:00', ends_at: '2026-09-29T15:30:00+00:00' }],
    });
    const from = new Date('2026-09-29T00:00:00Z');
    const to = new Date('2026-09-30T00:00:00Z');
    const ranges = await repo.getBusyRanges('p1', from, to);
    expect(fake.rpc).toHaveBeenCalledWith('get_busy_ranges', {
      p_professional_id: 'p1',
      p_from: '2026-09-29T00:00:00.000Z',
      p_to: '2026-09-30T00:00:00.000Z',
    });
    expect(ranges).toEqual([
      { start: new Date('2026-09-29T15:00:00Z'), end: new Date('2026-09-29T15:30:00Z') },
    ]);
  });

  it('book calls the RPC then reads the expanded row', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: { id: 'a1' } }, { data: expandedRow });
    const appointment = await repo.book({
      serviceId: 's1',
      professionalId: 'p1',
      start: new Date('2026-09-29T15:00:00Z'),
    });
    expect(fake.rpc).toHaveBeenCalledWith('book_appointment', {
      p_service_id: 's1',
      p_professional_id: 'p1',
      p_starts_at: '2026-09-29T15:00:00.000Z',
    });
    expect(fake.calls).toContainEqual(['from', 'appointments_expanded']);
    expect(fake.calls).toContainEqual(['eq', 'id', 'a1']);
    expect(appointment).toMatchObject({ id: 'a1', serviceName: 'Haircut', status: 'booked' });
  });

  it('book maps the double-booking constraint to slotUnavailable', async () => {
    const { fake, repo } = setup();
    fake.respond({
      error: {
        code: '23P01',
        message: 'conflicting key value violates appointments_no_double_booking',
      },
    });
    await expect(
      repo.book({ serviceId: 's1', professionalId: 'p1', start: new Date() }),
    ).rejects.toMatchObject({ name: 'DomainError', code: 'slotUnavailable' });
  });

  it('book maps the client overlap constraint to clientOverlap', async () => {
    const { fake, repo } = setup();
    fake.respond({ error: { code: '23P01', message: 'violates appointments_no_client_overlap' } });
    await expect(
      repo.book({ serviceId: 's1', professionalId: 'p1', start: new Date() }),
    ).rejects.toMatchObject({ code: 'clientOverlap' });
  });

  it('book maps a network failure to network', async () => {
    const { fake, repo } = setup();
    fake.respond(new TypeError('Network request failed'));
    await expect(
      repo.book({ serviceId: 's1', professionalId: 'p1', start: new Date() }),
    ).rejects.toMatchObject({ code: 'network' });
  });

  it('reschedule calls the RPC with the exact params and returns the expanded row', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: { id: 'a1' } }, { data: expandedRow });
    await repo.reschedule('a1', new Date('2026-09-30T10:00:00Z'));
    expect(fake.rpc).toHaveBeenCalledWith('reschedule_appointment', {
      p_id: 'a1',
      p_new_starts_at: '2026-09-30T10:00:00.000Z',
    });
  });

  it('subscribes to the private availability topic of the professional', async () => {
    const { fake, repo } = setup();
    const onChange = jest.fn();
    const onStatus = jest.fn();
    const off = repo.subscribeToAvailability('p1', onChange, onStatus);
    await new Promise((r) => setImmediate(r));
    expect(fake.channels[0]).toMatchObject({
      topic: 'agendo:availability:p1',
      options: { config: { private: true } },
    });
    fake.channels[0]!.status('SUBSCRIBED');
    expect(onStatus).toHaveBeenLastCalledWith('live');
    fake.channels[0]!.emit('appointment_changed');
    expect(onChange).toHaveBeenCalledTimes(1);
    off();
    expect(fake.removeChannel).toHaveBeenCalledTimes(1);
  });

  it('subscribes to the private availability topic of the professional', async () => {
    const { fake, repo } = setup();
    const onChange = jest.fn();
    const onStatus = jest.fn();
    const off = repo.subscribeToAvailability('p1', onChange, onStatus);
    await new Promise((r) => setImmediate(r));
    expect(fake.channels[0]).toMatchObject({
      topic: 'agendo:availability:p1',
      options: { config: { private: true } },
    });
    fake.channels[0]!.status('SUBSCRIBED');
    expect(onStatus).toHaveBeenLastCalledWith('live');
    fake.channels[0]!.emit('appointment_changed');
    expect(onChange).toHaveBeenCalledTimes(1);
    off();
    expect(fake.removeChannel).toHaveBeenCalledTimes(1);
  });
});
