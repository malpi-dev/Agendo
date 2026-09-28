import { MockAuthRepository } from '../mock-auth-repository';
import { MockProfileRepository } from '../mock-profile-repository';

describe('MockAuthRepository', () => {
  it('accepts 123456, rejects 000000 and rate limits the special email', async () => {
    const auth = new MockAuthRepository();
    await expect(auth.verifyCode('a@b.dev', '000000')).rejects.toMatchObject({
      code: 'invalidCode',
    });
    await expect(auth.sendCode('ratelimited@test.dev')).rejects.toMatchObject({
      code: 'rateLimited',
    });
    await expect(auth.verifyCode('a@b.dev', '123456')).resolves.toMatchObject({ email: 'a@b.dev' });
  });

  it('notifies listeners on sign in and sign out', async () => {
    const auth = new MockAuthRepository();
    const listener = jest.fn();
    auth.onAuthChange(listener);
    await auth.verifyCode('a@b.dev', '123456');
    await auth.signOut();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(null);
    await expect(auth.getSession()).resolves.toBeNull();
  });
});

describe('MockProfileRepository', () => {
  it('starts without a profile until ensureMine', async () => {
    const profile = new MockProfileRepository();
    await expect(profile.getMine()).resolves.toBeNull();
    await profile.ensureMine('Casey');
    await expect(profile.getMine()).resolves.toMatchObject({ fullName: 'Casey', role: 'client' });
  });
});
