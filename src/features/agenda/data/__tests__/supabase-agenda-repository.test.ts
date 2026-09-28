import type { CatalogRepository } from '@/features/catalog/domain/catalog-repository';
import { createFakeSupabase } from '@/test/fake-supabase';

import { SupabaseAgendaRepository } from '../supabase-agenda-repository';

const row = {
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
  const getBusiness = jest.fn().mockResolvedValue({ timezone: 'America/Mexico_City' });
  const catalog = { getBusiness } as unknown as CatalogRepository;
  return { fake, getBusiness, repo: new SupabaseAgendaRepository(fake.client, catalog) };
}

describe('SupabaseAgendaRepository', () => {
  it('queries booked appointments in the business-timezone day range', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [row] });
    const result = await repo.listForDay('2026-09-29');
    // Mexico City is UTC-6 all year (no DST since 2022): local midnight = 06:00Z.
    expect(fake.calls).toContainEqual(['eq', 'status', 'booked']);
    expect(fake.calls).toContainEqual(['gte', 'starts_at', '2026-09-29T06:00:00.000Z']);
    expect(fake.calls).toContainEqual(['lt', 'starts_at', '2026-09-30T06:00:00.000Z']);
    expect(fake.calls.some((c) => c[0] === 'eq' && c[1] === 'professional_id')).toBe(false);
    expect(result[0]).toMatchObject({ id: 'a1', start: new Date('2026-09-29T15:00:00Z') });
  });

  it('filters by professional when given', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [] });
    await repo.listForDay('2026-09-29', 'p1');
    expect(fake.calls).toContainEqual(['eq', 'professional_id', 'p1']);
  });

  it('fetches the business timezone only once', async () => {
    const { fake, getBusiness, repo } = setup();
    fake.respond({ data: [] });
    await repo.listForDay('2026-09-29');
    await repo.listForDay('2026-09-30');
    expect(getBusiness).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed business lookup', async () => {
    const { fake, getBusiness, repo } = setup();
    getBusiness.mockRejectedValueOnce(new Error('boom'));
    fake.respond({ data: [] });
    await expect(repo.listForDay('2026-09-29')).rejects.toThrow('boom');
    await expect(repo.listForDay('2026-09-29')).resolves.toEqual([]);
  });

  it('subscribe is provisional (paused, no-op)', () => {
    const { repo } = setup();
    const onStatus = jest.fn();
    repo.subscribe(jest.fn(), onStatus)();
    expect(onStatus).toHaveBeenCalledWith('paused');
  });
});
