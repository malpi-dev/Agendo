import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

export function useAppointment(id: string) {
  const { appointments } = useRepositories();
  return useQuery({
    queryKey: queryKeys.appointment(id),
    queryFn: () => appointments.getById(id),
  });
}
