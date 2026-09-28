import type { Profile } from './profile';

export interface ProfileRepository {
  /** null = no profile yet, go to onboarding. */
  getMine(): Promise<Profile | null>;
  ensureMine(fullName: string): Promise<Profile>;
  updateName(fullName: string): Promise<Profile>;
}
