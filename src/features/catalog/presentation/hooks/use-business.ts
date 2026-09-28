import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

/** Timezone, currency and booking rules: needed by almost every screen. */
export function useBusiness() {
  const { catalog } = useRepositories();
  return useQuery({
    queryKey: queryKeys.business,
    queryFn: () => catalog.getBusiness(),
    staleTime: Infinity,
  });
}
