import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useRepositories } from '@/core/di';
import { queryKeys } from '@/core/query';
import type { LocalDate } from '@/core/time';

import { groupAgendaByProfessional } from '../../domain/group-agenda-by-professional';

export function useAgenda(date: LocalDate, professionalId?: string) {
  const { agenda } = useRepositories();
  const query = useQuery({
    queryKey: queryKeys.agenda(date, professionalId),
    queryFn: () => agenda.listForDay(date, professionalId),
  });
  const groups = useMemo(() => groupAgendaByProfessional(query.data ?? []), [query.data]);
  return { ...query, groups };
}
