import { DomainError } from '@/core/errors';
import { createFakeSupabase } from '@/test/fake-supabase';

import { MockPushTokenRepository } from '../mock-push-token-repository';
import { SupabasePushTokenRepository } from '../supabase-push-token-repository';

describe('SupabasePushTokenRepository', () => {
  function setup() {
    const fake = createFakeSupabase();
    fake.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    });
    return { fake, repo: new SupabasePushTokenRepository(fake.client) };
  }

  it('register upserts the token for the signed-in user, conflicting on token', async () => {
    const { fake, repo } = setup();
    await repo.register('ExponentPushToken[abc]', 'android');
    expect(fake.calls[0]).toEqual(['from', 'push_tokens']);
    const upsert = fake.calls.find((c) => c[0] === 'upsert');
    expect(upsert?.[1]).toMatchObject({
      user_id: 'u1',
      token: 'ExponentPushToken[abc]',
      platform: 'android',
    });
    expect(upsert?.[2]).toEqual({ onConflict: 'token' });
  });

  it('remove deletes by token', async () => {
    const { fake, repo } = setup();
    await repo.remove('ExponentPushToken[abc]');
    expect(fake.calls).toEqual([
      ['from', 'push_tokens'],
      ['delete'],
      ['eq', 'token', 'ExponentPushToken[abc]'],
    ]);
  });

  it('maps backend failures to DomainError', async () => {
    const { fake, repo } = setup();
    fake.respond(new TypeError('Network request failed'));
    await expect(repo.remove('t')).rejects.toBeInstanceOf(DomainError);
    await expect(repo.remove('t')).rejects.toMatchObject({ code: 'network' });
  });

  it('register fails with unauthorized when there is no session', async () => {
    const { fake, repo } = setup();
    fake.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(repo.register('t', 'android')).rejects.toMatchObject({ code: 'unauthorized' });
  });
});

describe('MockPushTokenRepository', () => {
  it('stores and removes tokens in memory, upserting duplicates', async () => {
    const repo = new MockPushTokenRepository();
    await repo.register('t1', 'android');
    await repo.register('t1', 'ios');
    expect([...repo.tokens]).toEqual([['t1', 'ios']]);
    await repo.remove('t1');
    expect(repo.tokens.size).toBe(0);
  });
});
