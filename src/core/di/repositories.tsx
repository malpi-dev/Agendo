import { createContext, useContext, type ReactNode } from 'react';

import { MockAgendaRepository } from '@/features/agenda/data/mock-agenda-repository';
import type { AgendaRepository } from '@/features/agenda/domain/agenda-repository';
import { MockAppointmentsRepository } from '@/features/appointments/data/mock-appointments-repository';
import type { AppointmentsRepository } from '@/features/appointments/domain/appointments-repository';
import { MockBookingRepository } from '@/features/booking/data/mock-booking-repository';
import type { BookingRepository } from '@/features/booking/domain/booking-repository';
import { MockCatalogRepository } from '@/features/catalog/data/mock-catalog-repository';
import type { CatalogRepository } from '@/features/catalog/domain/catalog-repository';
import type { MockDb } from '@/features/demo/data/mock-db';

// Composition root: the only place in core/ that imports from features/*/data.
// Auth + profile repositories are added in phase 07, push tokens in phase 10.
export interface Repositories {
  catalog: CatalogRepository;
  booking: BookingRepository;
  appointments: AppointmentsRepository;
  agenda: AgendaRepository;
}

export function createMockRepositories(db: MockDb): Repositories {
  return {
    catalog: new MockCatalogRepository(db),
    booking: new MockBookingRepository(db),
    appointments: new MockAppointmentsRepository(db),
    agenda: new MockAgendaRepository(db),
  };
}

const RepositoryContext = createContext<Repositories | null>(null);

export function RepositoryProvider({
  repositories,
  children,
}: {
  repositories: Repositories | null;
  children: ReactNode;
}) {
  return <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>;
}

export function useRepositories(): Repositories {
  const repositories = useContext(RepositoryContext);
  if (!repositories) {
    throw new Error('useRepositories must be used inside a RepositoryProvider with repositories');
  }
  return repositories;
}
