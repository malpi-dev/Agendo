import { create } from 'zustand';

import type { AuthSession } from '../domain/auth-session';

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
}

/** Not persisted: supabase-js persists the session; this mirrors it for the guards. */
export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  session: null,
  setSession: (session) => {
    const current = get();
    if (
      current.status === (session ? 'signedIn' : 'signedOut') &&
      current.session?.userId === session?.userId &&
      current.session?.email === session?.email
    ) {
      return; // token refreshes re-emit the same session
    }
    set({ status: session ? 'signedIn' : 'signedOut', session });
  },
}));
