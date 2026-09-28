import { createFakeSupabase } from '@/test/fake-supabase';

import { SupabaseProfileRepository } from '../supabase-profile-repository';

const row = { id: 'u1', full_name: 'Casey', role: 'client', created_at: '2026-09-28T00:00:00Z' };

function setup() {
  const fake = createFakeSupabase();
  fake.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'u1' } } },
    error: null,
  });
  return { fake, repo: new SupabaseProfileRepository(fake.client) };
}

describe('SupabaseProfileRepository', () => {
  it('getMine returns the mapped profile', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: row });
    await expect(repo.getMine()).resolves.toEqual({ id: 'u1', fullName: 'Casey', role: 'client' });
    expect(fake.calls).toContainEqual(['from', 'profiles']);
    expect(fake.calls).toContainEqual(['eq', 'id', 'u1']);
  });

  it('getMine returns null when the user has no profile yet', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: null });
    await expect(repo.getMine()).resolves.toBeNull();
  });

  it('ensureMine goes through the ensure_profile RPC', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: row });
    await expect(repo.ensureMine('Casey')).resolves.toMatchObject({ fullName: 'Casey' });
    expect(fake.rpc).toHaveBeenCalledWith('ensure_profile', { p_full_name: 'Casey' });
  });

  it('updateName updates only full_name of my row', async () => {
    const { fake, repo } = setup();
    fake.respond({ data: { ...row, full_name: 'New Name' } });
    await expect(repo.updateName('New Name')).resolves.toMatchObject({ fullName: 'New Name' });
    expect(fake.calls).toContainEqual(['update', { full_name: 'New Name' }]);
    expect(fake.calls).toContainEqual(['eq', 'id', 'u1']);
  });
});
