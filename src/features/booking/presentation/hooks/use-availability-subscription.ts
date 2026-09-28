import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

import type { LiveStatus } from '../../domain/types';

/** Refetches busy ranges whenever someone books/changes an appointment of this professional. */
export function useAvailabilitySubscription(professionalId: string): LiveStatus {
  const { booking } = useRepositories();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>('connecting');

  useEffect(() => {
    const unsubscribe = booking.subscribeToAvailability(
      professionalId,
      () => void queryClient.invalidateQueries({ queryKey: queryKeys.busy(professionalId) }),
      setStatus,
    );
    return unsubscribe;
  }, [booking, professionalId, queryClient]);

  return status;
}
