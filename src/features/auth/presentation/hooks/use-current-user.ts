import { useSessionStore } from '@/core/session';
import { DEMO_USER_ID, DEMO_USER_NAME } from '@/features/demo/data/fixtures';

import type { UserRole } from '../../domain/profile';
import { useMyProfile } from './use-my-profile';

export interface CurrentUser {
  id: string;
  fullName: string;
  role: UserRole;
}

/** Demo: Casey Morgan with the selected role. Supabase: the signed-in user's profile. */
export function useCurrentUser(): CurrentUser | null {
  const mode = useSessionStore((s) => s.mode);
  const demoRole = useSessionStore((s) => s.demoRole);
  const { data: profile } = useMyProfile();
  if (mode === 'demo') return { id: DEMO_USER_ID, fullName: DEMO_USER_NAME, role: demoRole };
  return profile ?? null;
}
