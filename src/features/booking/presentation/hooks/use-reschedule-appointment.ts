import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

export function useRescheduleAppointment() {
  const { booking } = useRepositories();
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.appointmentsAll }),
      queryClient.invalidateQueries({ queryKey: queryKeys.busyAll }),
      queryClient.invalidateQueries({ queryKey: queryKeys.agendaAll }),
    ]);
  return useMutation({
    mutationFn: ({ id, newStart }: { id: string; newStart: Date }) =>
      booking.reschedule(id, newStart),
    onSuccess: invalidate,
    // The window may have closed meanwhile: refresh so the detail shows the real state.
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.appointmentsAll }),
  });
}
