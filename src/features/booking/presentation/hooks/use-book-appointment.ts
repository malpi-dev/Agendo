import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

import type { BookInput } from '../../domain/booking-repository';

export function useBookAppointment() {
  const { booking } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BookInput) => booking.book(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.appointmentsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.busyAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.agendaAll }),
      ]);
    },
  });
}
