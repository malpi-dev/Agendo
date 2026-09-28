import { DomainError } from '@/core/errors';
import type { AgendoSupabaseClient } from '@/core/supabase/client';
import { getCurrentUserId } from '@/core/supabase/current-user-id';
import { run } from '@/core/supabase/run';

import type { Profile } from '../domain/profile';
import type { ProfileRepository } from '../domain/profile-repository';
import { toProfile } from './mappers';

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: AgendoSupabaseClient) {}

  async getMine(): Promise<Profile | null> {
    const userId = await getCurrentUserId(this.client);
    const row = await run(() =>
      this.client.from('profiles').select('id, full_name, role').eq('id', userId).maybeSingle(),
    );
    return row ? toProfile(row) : null;
  }

  /** The only way a profile is created (`agendo.ensure_profile`, idempotent, lowest-privilege role). */
  async ensureMine(fullName: string): Promise<Profile> {
    const row = await run(() => this.client.rpc('ensure_profile', { p_full_name: fullName }));
    return toProfile(row);
  }

  async updateName(fullName: string): Promise<Profile> {
    const userId = await getCurrentUserId(this.client);
    const row = await run(() =>
      this.client
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', userId)
        .select()
        .single(),
    );
    if (!row) throw new DomainError('notFound', 'Profile not found');
    return toProfile(row);
  }
}
