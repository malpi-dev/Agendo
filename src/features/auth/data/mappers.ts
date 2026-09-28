import type { Session } from '@supabase/supabase-js';

import type { Database } from '@/core/supabase/database.generated';

import type { AuthSession } from '../domain/auth-session';
import type { Profile } from '../domain/profile';

type ProfileRow = Pick<
  Database['agendo']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'role'
>;

export const toAuthSession = (session: Session | null): AuthSession | null =>
  session ? { userId: session.user.id, email: session.user.email ?? '' } : null;

export const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  fullName: row.full_name,
  role: row.role,
});
