import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';
import type { LiveStatus } from '@/features/booking/domain/types';

/** Refetches the agenda whenever any appointment changes (admin only). */
export function useAgendaSubscription(): LiveStatus {
  const { agenda } = useRepositories();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>('connecting');

  useEffect(() => {
    return agenda.subscribe(
      () => void queryClient.invalidateQueries({ queryKey: queryKeys.agendaAll }),
      setStatus,
    );
  }, [agenda, queryClient]);

  return status;
}
