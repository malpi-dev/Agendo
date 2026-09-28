import { useSessionStore } from '@/core/session';
import { DEMO_USER_ID, DEMO_USER_NAME } from '@/features/demo/data/fixtures';

import type { UserRole } from '../../domain/profile';

export interface CurrentUser {
  id: string;
  fullName: string;
  role: UserRole;
}

/** Demo: Casey Morgan with the selected role. Supabase mode is completed in phase 07. */
export function useCurrentUser(): CurrentUser | null {
  const mode = useSessionStore((s) => s.mode);
  const demoRole = useSessionStore((s) => s.demoRole);
  if (mode === 'demo') return { id: DEMO_USER_ID, fullName: DEMO_USER_NAME, role: demoRole };
  return null;
}
