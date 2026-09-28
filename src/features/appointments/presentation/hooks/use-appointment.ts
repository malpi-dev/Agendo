import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

/** Pass `undefined` to keep the query disabled (e.g. when not rescheduling). */
export function useAppointment(id: string | undefined) {
  const { appointments } = useRepositories();
  return useQuery({
    queryKey: queryKeys.appointment(id ?? ''),
    queryFn: () => appointments.getById(id ?? ''),
    enabled: id !== undefined,
  });
}
