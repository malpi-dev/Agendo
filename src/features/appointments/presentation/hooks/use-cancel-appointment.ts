import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';

export function useCancelAppointment() {
  const { appointments } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => appointments.cancel(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.appointmentsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.busyAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.agendaAll }),
      ]);
    },
    // The window may have closed meanwhile: refresh so the detail shows the real state.
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.appointmentsAll }),
  });
}
