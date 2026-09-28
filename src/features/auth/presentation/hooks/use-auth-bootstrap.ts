import { useEffect } from 'react';

import { queryClient } from '@/core/query';

import type { AuthRepository } from '../../domain/auth-repository';
import { useAuthStore } from '../auth-store';

/**
 * Mirrors the persisted Supabase session into the auth store. Call once in the root layout.
 * `auth = null` means there is no backend to talk to (demo or not configured): signed out.
 */
export function useAuthBootstrap(auth: AuthRepository | null): void {
  useEffect(() => {
    const { setSession } = useAuthStore.getState();
    if (!auth) {
      setSession(null);
      return;
    }

    let active = true;
    const apply = (session: Parameters<typeof setSession>[0]) => {
      if (!active) return;
      const wasSignedIn = useAuthStore.getState().status === 'signedIn';
      setSession(session);
      if (!session && wasSignedIn) queryClient.clear(); // never keep another user's data
    };

    const unsubscribe = auth.onAuthChange(apply);
    auth
      .getSession()
      .then(apply)
      .catch(() => apply(null));

    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);
}
