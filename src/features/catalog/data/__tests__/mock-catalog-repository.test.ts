import { DomainError } from '@/core/errors';
import { makeDb } from '@/features/demo/data/__tests__/test-db';
import { PROFESSIONAL_IDS, SERVICE_IDS } from '@/features/demo/data/fixtures';

import { MockCatalogRepository } from '../mock-catalog-repository';

describe('MockCatalogRepository', () => {
  const repo = () => new MockCatalogRepository(makeDb());

  it('lists the 6 active services sorted', async () => {
    const services = await repo().listServices();
    expect(services.map((s) => s.sortOrder)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('lists only professionals that offer the service', async () => {
    const pros = await repo().listProfessionals(SERVICE_IDS.hotTowelShave);
    expect(pros.map((p) => p.name)).toEqual(['Sam']);
  });

  it('lists every active professional when no service is given', async () => {
    const pros = await repo().listProfessionals();
    expect(pros.map((p) => p.name)).toEqual(['Marco', 'Lena', 'Sam']);
  });

  it('throws notFound for unknown ids', async () => {
    await expect(repo().getService('nope')).rejects.toMatchObject({ code: 'notFound' });
    await expect(repo().getProfessional('nope')).rejects.toBeInstanceOf(DomainError);
  });

  it('returns copies, not internal references', async () => {
    const r = repo();
    const [first] = await r.listServices();
    if (first) first.name = 'Hacked';
    expect((await r.listServices())[0]?.name).toBe('Classic haircut');
  });

  it('gives Sam no Monday hours', async () => {
    const hours = await repo().getWorkingHours(PROFESSIONAL_IDS.sam);
    expect(hours.some((h) => h.weekday === 1)).toBe(false);
    expect(hours.some((h) => h.weekday === 6)).toBe(true);
  });
});
