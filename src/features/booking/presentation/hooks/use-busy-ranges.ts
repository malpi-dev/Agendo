import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';
import { addDaysToLocalDate, zonedInstant, type LocalDate } from '@/core/time';
import { useBusiness } from '@/features/catalog/presentation/hooks/use-business';

export function useBusyRanges(professionalId: string, date: LocalDate | null) {
  const { booking } = useRepositories();
  const business = useBusiness();
  const timezone = business.data?.timezone;

  return useQuery({
    queryKey: queryKeys.busy(professionalId, date ?? undefined),
    queryFn: () => {
      if (!timezone || !date) return [];
      return booking.getBusyRanges(
        professionalId,
        zonedInstant(date, '00:00', timezone),
        zonedInstant(addDaysToLocalDate(date, 1), '00:00', timezone),
      );
    },
    enabled: Boolean(timezone && date),
  });
}
