import { createFakeSupabase } from '@/test/fake-supabase';

import { SupabaseAuthRepository } from '../supabase-auth-repository';

const supabaseSession = { user: { id: 'u1', email: 'a@b.dev' } };

function setup() {
  const fake = createFakeSupabase();
  return { fake, repo: new SupabaseAuthRepository(fake.client) };
}

describe('SupabaseAuthRepository', () => {
  it('sendCode requests an OTP and allows creating users', async () => {
    const { fake, repo } = setup();
    fake.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await repo.sendCode('a@b.dev');
    expect(fake.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.dev',
      options: { shouldCreateUser: true },
    });
  });

  it('sendCode maps a rate limit error', async () => {
    const { fake, repo } = setup();
    fake.auth.signInWithOtp.mockResolvedValue({
      data: {},
      error: { code: 'over_email_send_rate_limit', message: 'rate limit', status: 429 },
    });
    await expect(repo.sendCode('a@b.dev')).rejects.toMatchObject({ code: 'rateLimited' });
  });

  it('sendCode maps a thrown network error', async () => {
    const { fake, repo } = setup();
    fake.auth.signInWithOtp.mockRejectedValue(new TypeError('Network request failed'));
    await expect(repo.sendCode('a@b.dev')).rejects.toMatchObject({ code: 'network' });
  });

  it('verifyCode verifies an email OTP and returns the session', async () => {
    const { fake, repo } = setup();
    fake.auth.verifyOtp.mockResolvedValue({
      data: { session: supabaseSession, user: supabaseSession.user },
      error: null,
    });
    await expect(repo.verifyCode('a@b.dev', '123456')).resolves.toEqual({
      userId: 'u1',
      email: 'a@b.dev',
    });
    expect(fake.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'a@b.dev',
      token: '123456',
      type: 'email',
    });
  });

  it('verifyCode maps an invalid or expired code', async () => {
    const { fake, repo } = setup();
    fake.auth.verifyOtp.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: 'otp_expired', message: 'Token has expired or is invalid', status: 403 },
    });
    await expect(repo.verifyCode('a@b.dev', '000000')).rejects.toMatchObject({
      code: 'invalidCode',
    });
  });

  it('getSession returns null when signed out', async () => {
    const { fake, repo } = setup();
    fake.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(repo.getSession()).resolves.toBeNull();
  });

  it('getSession maps the session', async () => {
    const { fake, repo } = setup();
    fake.auth.getSession.mockResolvedValue({ data: { session: supabaseSession }, error: null });
    await expect(repo.getSession()).resolves.toEqual({ userId: 'u1', email: 'a@b.dev' });
  });

  it('onAuthChange maps sessions and unsubscribes', () => {
    const { fake, repo } = setup();
    const unsubscribe = jest.fn();
    let callback: (event: string, session: unknown) => void = () => undefined;
    fake.auth.onAuthStateChange.mockImplementation((cb: typeof callback) => {
      callback = cb;
      return { data: { subscription: { unsubscribe } } };
    });
    const listener = jest.fn();
    const stop = repo.onAuthChange(listener);
    callback('SIGNED_IN', supabaseSession);
    callback('SIGNED_OUT', null);
    expect(listener).toHaveBeenNthCalledWith(1, { userId: 'u1', email: 'a@b.dev' });
    expect(listener).toHaveBeenNthCalledWith(2, null);
    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('signOut delegates to supabase and maps errors', async () => {
    const { fake, repo } = setup();
    fake.auth.signOut.mockResolvedValue({ error: null });
    await repo.signOut();
    expect(fake.auth.signOut).toHaveBeenCalled();
    fake.auth.signOut.mockResolvedValue({ error: { message: 'Network request failed' } });
    await expect(repo.signOut()).rejects.toMatchObject({ code: 'network' });
  });
});
