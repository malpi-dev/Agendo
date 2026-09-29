import { createContext, useContext, type ReactNode } from 'react';

import type { AgendoSupabaseClient } from '@/core/supabase/client';
import { MockAgendaRepository } from '@/features/agenda/data/mock-agenda-repository';
import { SupabaseAgendaRepository } from '@/features/agenda/data/supabase-agenda-repository';
import type { AgendaRepository } from '@/features/agenda/domain/agenda-repository';
import { MockAuthRepository } from '@/features/auth/data/mock-auth-repository';
import { MockProfileRepository } from '@/features/auth/data/mock-profile-repository';
import { SupabaseAuthRepository } from '@/features/auth/data/supabase-auth-repository';
import { SupabaseProfileRepository } from '@/features/auth/data/supabase-profile-repository';
import type { AuthRepository } from '@/features/auth/domain/auth-repository';
import type { ProfileRepository } from '@/features/auth/domain/profile-repository';
import { MockAppointmentsRepository } from '@/features/appointments/data/mock-appointments-repository';
import { SupabaseAppointmentsRepository } from '@/features/appointments/data/supabase-appointments-repository';
import type { AppointmentsRepository } from '@/features/appointments/domain/appointments-repository';
import { MockBookingRepository } from '@/features/booking/data/mock-booking-repository';
import { SupabaseBookingRepository } from '@/features/booking/data/supabase-booking-repository';
import type { BookingRepository } from '@/features/booking/domain/booking-repository';
import { MockCatalogRepository } from '@/features/catalog/data/mock-catalog-repository';
import { SupabaseCatalogRepository } from '@/features/catalog/data/supabase-catalog-repository';
import type { CatalogRepository } from '@/features/catalog/domain/catalog-repository';
import { MockPushTokenRepository } from '@/features/notifications/data/mock-push-token-repository';
import { SupabasePushTokenRepository } from '@/features/notifications/data/supabase-push-token-repository';
import type { PushTokenRepository } from '@/features/notifications/domain/push-token-repository';
import type { MockDb } from '@/features/demo/data/mock-db';

// Composition root: the only place in core/ that imports from features/*/data.
export interface Repositories {
  catalog: CatalogRepository;
  booking: BookingRepository;
  appointments: AppointmentsRepository;
  agenda: AgendaRepository;
  auth: AuthRepository;
  profile: ProfileRepository;
  pushTokens: PushTokenRepository;
}

export function createMockRepositories(db: MockDb): Repositories {
  return {
    catalog: new MockCatalogRepository(db),
    booking: new MockBookingRepository(db),
    appointments: new MockAppointmentsRepository(db),
    agenda: new MockAgendaRepository(db),
    // Demo mode never shows auth screens; these keep the type complete and serve tests.
    auth: new MockAuthRepository(),
    profile: new MockProfileRepository(
      { id: db.currentUser.id, fullName: db.currentUser.fullName, role: db.currentUser.role },
      db.currentUser.id,
    ),
    pushTokens: new MockPushTokenRepository(),
  };
}

export function createSupabaseRepositories(client: AgendoSupabaseClient): Repositories {
  const catalog = new SupabaseCatalogRepository(client);
  return {
    catalog,
    booking: new SupabaseBookingRepository(client),
    appointments: new SupabaseAppointmentsRepository(client),
    agenda: new SupabaseAgendaRepository(client, catalog),
    auth: new SupabaseAuthRepository(client),
    profile: new SupabaseProfileRepository(client),
    pushTokens: new SupabasePushTokenRepository(client),
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

/** For code that also runs when there are no repositories (not configured, signed out). */
export function useRepositoriesOrNull(): Repositories | null {
  return useContext(RepositoryContext);
}
