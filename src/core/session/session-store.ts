import { create } from 'zustand';

import { env } from '@/core/config/env';
import { queryClient } from '@/core/query';
import { MockDb } from '@/features/demo/data/mock-db';
import type { UserRole } from '@/features/auth/domain/profile';

interface SessionState {
  mode: 'supabase' | 'demo';
  demoRole: UserRole;
  demoDb: MockDb | null;
  enterDemo: (role: UserRole) => void;
  setDemoRole: (role: UserRole) => void;
  exitDemo: () => void;
}

const startsInDemo = env.EXPO_PUBLIC_DATA_SOURCE === 'mock';

/** Not persisted on purpose: the demo resets when the app closes. */
export const useSessionStore = create<SessionState>((set, get) => ({
  mode: startsInDemo ? 'demo' : 'supabase',
  demoRole: 'client',
  demoDb: startsInDemo ? new MockDb() : null,

  enterDemo: (role) => {
    const demoDb = new MockDb();
    demoDb.currentUser.role = role;
    queryClient.clear(); // never mix caches between data sources
    set({ mode: 'demo', demoRole: role, demoDb });
  },

  setDemoRole: (role) => {
    const { demoDb } = get();
    if (demoDb) demoDb.currentUser.role = role;
    queryClient.clear();
    set({ demoRole: role });
  },

  exitDemo: () => {
    queryClient.clear();
    set({ mode: 'supabase', demoDb: null, demoRole: 'client' });
  },
}));
