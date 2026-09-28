import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';
import { useNow } from '@/core/time/use-now';

import { splitAppointments } from '../../domain/split-appointments';

export function useMyAppointments() {
  const { appointments } = useRepositories();
  const now = useNow();
  const query = useQuery({
    queryKey: queryKeys.appointmentsMine,
    queryFn: () => appointments.listMine(),
  });
  const { upcoming, past } = useMemo(
    () => splitAppointments(query.data ?? [], now),
    [query.data, now],
  );
  return { ...query, upcoming, past };
}
