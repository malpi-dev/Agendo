import { queryClient } from '@/core/query';

import { useSessionStore } from '../session-store';

describe('session store', () => {
  beforeEach(() => {
    useSessionStore.getState().exitDemo();
    queryClient.clear();
  });

  it('enters demo with the chosen role and clears the query cache', () => {
    queryClient.setQueryData(['x'], 1);
    useSessionStore.getState().enterDemo('admin');
    const state = useSessionStore.getState();
    expect(state.mode).toBe('demo');
    expect(state.demoRole).toBe('admin');
    expect(state.demoDb?.currentUser.role).toBe('admin');
    expect(queryClient.getQueryData(['x'])).toBeUndefined();
  });

  it('switches role on the same db and clears the cache', () => {
    useSessionStore.getState().enterDemo('client');
    const db = useSessionStore.getState().demoDb;
    queryClient.setQueryData(['x'], 1);
    useSessionStore.getState().setDemoRole('admin');
    expect(useSessionStore.getState().demoDb).toBe(db);
    expect(db?.currentUser.role).toBe('admin');
    expect(queryClient.getQueryData(['x'])).toBeUndefined();
  });

  it('exits demo and drops the db', () => {
    useSessionStore.getState().enterDemo('client');
    useSessionStore.getState().exitDemo();
    const state = useSessionStore.getState();
    expect(state.mode).toBe('supabase');
    expect(state.demoDb).toBeNull();
  });
});
