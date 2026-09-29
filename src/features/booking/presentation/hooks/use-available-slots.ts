import { useMemo } from 'react';

import type { LocalDate } from '@/core/time';
import { useNow } from '@/core/time/use-now';
import { useAppointment } from '@/features/appointments/presentation/hooks/use-appointment';
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
  /** Set while rescheduling so the appointment's current time is offered as free. */
  rescheduleId?: string | undefined;
}

/** Derived from the other queries (no query of its own): the domain use case does the work. */
export function useAvailableSlots({ serviceId, professionalId, date, rescheduleId }: Input) {
  const business = useBusiness();
  const service = useService(serviceId);
  const workingHours = useWorkingHours(professionalId);
  const busy = useBusyRanges(professionalId, date);
  const current = useAppointment(rescheduleId);
  const now = useNow();

  const slots = useMemo<Slot[]>(() => {
    if (!date || !business.data || !service.data || !workingHours.data || !busy.data) return [];
    const own = current.data?.professionalId === professionalId ? current.data : undefined;
    return getAvailableSlots({
      date,
      service: service.data,
      workingHours: workingHours.data,
      busyRanges: busy.data,
      ignoreRange: own,
      business: business.data,
      now,
    });
  }, [
    date,
    professionalId,
    business.data,
    service.data,
    workingHours.data,
    busy.data,
    current.data,
    now,
  ]);

  const queries = [business, service, workingHours, busy];
  // While rescheduling, wait for the current appointment so its slot does not flash as busy.
  const waitingForCurrent = rescheduleId !== undefined && current.isPending;
  return {
    slots,
    isLoading: waitingForCurrent || queries.some((q) => q.isPending),
    error: queries.find((q) => q.error)?.error ?? null,
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
  };
}
