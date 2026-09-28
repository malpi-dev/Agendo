import { useAuthStore } from '../auth-store';

describe('auth store', () => {
  beforeEach(() => useAuthStore.setState({ status: 'loading', session: null }));

  it('moves from loading to signedOut / signedIn', () => {
    useAuthStore.getState().setSession(null);
    expect(useAuthStore.getState().status).toBe('signedOut');
    useAuthStore.getState().setSession({ userId: 'u1', email: 'a@b.dev' });
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn' });
  });

  it('ignores an identical session (token refresh)', () => {
    const listener = jest.fn();
    useAuthStore.getState().setSession({ userId: 'u1', email: 'a@b.dev' });
    const unsubscribe = useAuthStore.subscribe(listener);
    useAuthStore.getState().setSession({ userId: 'u1', email: 'a@b.dev' });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
