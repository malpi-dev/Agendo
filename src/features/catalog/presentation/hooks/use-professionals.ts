import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

export function useProfessionals(serviceId: string) {
  const { catalog } = useRepositories();
  return useQuery({
    queryKey: queryKeys.professionals(serviceId),
    queryFn: () => catalog.listProfessionals(serviceId),
  });
}

export function useProfessional(id: string) {
  const { catalog } = useRepositories();
  return useQuery({
    queryKey: queryKeys.professional(id),
    queryFn: () => catalog.getProfessional(id),
  });
}
