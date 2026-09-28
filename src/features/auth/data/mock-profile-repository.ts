import { DomainError } from '@/core/errors';

import type { Profile } from '../domain/profile';
import type { ProfileRepository } from '../domain/profile-repository';

/** Starts without a profile (onboarding) until `ensureMine` is called. */
export class MockProfileRepository implements ProfileRepository {
  constructor(
    private profile: Profile | null = null,
    private readonly userId = 'mock-user',
  ) {}

  async getMine(): Promise<Profile | null> {
    return this.profile;
  }

  async ensureMine(fullName: string): Promise<Profile> {
    this.profile ??= { id: this.userId, fullName, role: 'client' };
    return this.profile;
  }

  async updateName(fullName: string): Promise<Profile> {
    if (!this.profile) throw new DomainError('notFound');
    this.profile = { ...this.profile, fullName };
    return this.profile;
  }
}
