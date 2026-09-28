import { useQuery } from '@tanstack/react-query';

import { useRepositoriesOrNull } from '@/core/di';
import { queryKeys } from '@/core/query';
import { useSessionStore } from '@/core/session';

import { useAuthStore } from '../auth-store';

/** The signed-in user's profile; `null` data = no profile yet (onboarding). Supabase mode only. */
export function useMyProfile() {
  const repositories = useRepositoriesOrNull();
  const mode = useSessionStore((s) => s.mode);
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: queryKeys.profileMine,
    queryFn: () => {
      if (!repositories) throw new Error('Repositories not available');
      return repositories.profile.getMine();
    },
    enabled: repositories !== null && status === 'signedIn' && mode === 'supabase',
  });
}
