import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

export function useWorkingHours(professionalId: string) {
  const { catalog } = useRepositories();
  return useQuery({
    queryKey: queryKeys.workingHours(professionalId),
    queryFn: () => catalog.getWorkingHours(professionalId),
    staleTime: 5 * 60_000,
  });
}
