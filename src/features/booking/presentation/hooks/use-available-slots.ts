import { useMemo } from 'react';

import type { LocalDate } from '@/core/time';
import { useNow } from '@/core/time/use-now';
import { useBusiness } from '@/features/catalog/presentation/hooks/use-business';
import { useService } from '@/features/catalog/presentation/hooks/use-services';
import { useWorkingHours } from '@/features/catalog/presentation/hooks/use-working-hours';

import { getAvailableSlots } from '../../domain/get-available-slots';
import type { Slot } from '../../domain/slot';
import { useBusyRanges } from './use-busy-ranges';

interface Input {
  serviceId: string;
  professionalId: string;
  date: LocalDate | null;
}

/** Derived from the other queries (no query of its own): the domain use case does the work. */
export function useAvailableSlots({ serviceId, professionalId, date }: Input) {
  const business = useBusiness();
  const service = useService(serviceId);
  const workingHours = useWorkingHours(professionalId);
  const busy = useBusyRanges(professionalId, date);
  const now = useNow();

  const slots = useMemo<Slot[]>(() => {
    if (!date || !business.data || !service.data || !workingHours.data || !busy.data) return [];
    return getAvailableSlots({
      date,
      service: service.data,
      workingHours: workingHours.data,
      busyRanges: busy.data,
      business: business.data,
      now,
    });
  }, [date, business.data, service.data, workingHours.data, busy.data, now]);

  const queries = [business, service, workingHours, busy];
  return {
    slots,
    isLoading: queries.some((q) => q.isPending),
    error: queries.find((q) => q.error)?.error ?? null,
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
  };
}
