import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

import type { Service } from '../../domain/service';

export function useServices() {
  const { catalog } = useRepositories();
  return useQuery({ queryKey: queryKeys.services, queryFn: () => catalog.listServices() });
}

export function useService(id: string) {
  const { catalog } = useRepositories();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.service(id),
    queryFn: () => catalog.getService(id),
    initialData: () =>
      queryClient.getQueryData<Service[]>(queryKeys.services)?.find((s) => s.id === id),
  });
}
