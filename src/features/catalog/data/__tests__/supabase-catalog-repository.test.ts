import { createFakeSupabase } from '@/test/fake-supabase';

import { SupabaseCatalogRepository } from '../supabase-catalog-repository';

const businessRow = {
  id: 'b1',
  name: 'Studio',
  timezone: 'America/Mexico_City',
  currency: 'USD',
  slot_interval_minutes: 30,
  min_notice_minutes: 60,
  max_advance_days: 30,
  cancel_limit_hours: 2,
  reminder_lead_minutes: 60,
};
const serviceRow = {
  id: 's1',
  name: 'Haircut',
  description: 'Classic',
  duration_minutes: 30,
  price_cents: 2000,
  is_active: true,
  sort_order: 1,
};
const professionalRow = (id: string, serviceIds: string[]) => ({
  id,
  name: `Pro ${id}`,
  bio: 'Bio',
  avatar_url: null,
  is_active: true,
  professional_services: serviceIds.map((service_id) => ({ service_id })),
});

function setup() {
  const fake = createFakeSupabase();
  return { fake, repo: new SupabaseCatalogRepository(fake.client) };
}

describe('SupabaseCatalogRepository', () => {
  it('maps the business row to camelCase', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: businessRow });
    await expect(repo.getBusiness()).resolves.toEqual({
      id: 'b1',
      name: 'Studio',
      timezone: 'America/Mexico_City',
      currency: 'USD',
      slotIntervalMinutes: 30,
      minNoticeMinutes: 60,
      maxAdvanceDays: 30,
      cancelLimitHours: 2,
      reminderLeadMinutes: 60,
    });
    expect(fake.calls[0]).toEqual(['from', 'business']);
  });

  it('lists active services ordered by sort_order', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [serviceRow] });
    const services = await repo.listServices();
    expect(services[0]).toMatchObject({ durationMinutes: 30, priceCents: 2000, sortOrder: 1 });
    expect(fake.calls).toContainEqual(['eq', 'is_active', true]);
    expect(fake.calls).toContainEqual(['order', 'sort_order']);
  });

  it('throws notFound when the service does not exist', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: null });
    await expect(repo.getService('nope')).rejects.toMatchObject({ code: 'notFound' });
  });

  it('throws notFound when the professional does not exist', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: null });
    await expect(repo.getProfessional('nope')).rejects.toMatchObject({ code: 'notFound' });
  });

  it('keeps only the professionals that offer the service and maps serviceIds', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [professionalRow('p1', ['s1', 's2']), professionalRow('p2', ['s2'])] });
    const list = await repo.listProfessionals('s1');
    expect(list.map((p) => p.id)).toEqual(['p1']);
    expect(list[0]?.serviceIds).toEqual(['s1', 's2']);
  });

  it('lists all active professionals when no service is given', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: [professionalRow('p1', ['s1']), professionalRow('p2', ['s2'])] });
    const list = await repo.listProfessionals();
    expect(list.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('maps working hours ordered by weekday and start time', async () => {
    const { fake, repo } = setup();
    fake.respond({
      data: [
        {
          id: 'w1',
          professional_id: 'p1',
          weekday: 1,
          start_time: '09:00:00',
          end_time: '13:00:00',
        },
      ],
    });
    await expect(repo.getWorkingHours('p1')).resolves.toEqual([
      { professionalId: 'p1', weekday: 1, startTime: '09:00:00', endTime: '13:00:00' },
    ]);
    expect(fake.calls).toContainEqual(['eq', 'professional_id', 'p1']);
    expect(fake.calls).toContainEqual(['order', 'weekday']);
    expect(fake.calls).toContainEqual(['order', 'start_time']);
  });

  it('maps a network failure to DomainError(network)', async () => {
    const { fake, repo } = setup();
    fake.respond(new TypeError('Network request failed'));
    await expect(repo.listServices()).rejects.toMatchObject({
      name: 'DomainError',
      code: 'network',
    });
  });
});
