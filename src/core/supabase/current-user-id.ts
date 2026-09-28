import { DomainError } from '@/core/errors';

import type { AgendoSupabaseClient } from './client';
import { run } from './run';

/** Id of the signed-in user (read from the persisted session, no network round trip). */
export async function getCurrentUserId(client: AgendoSupabaseClient): Promise<string> {
  const { session } = await run(() => client.auth.getSession());
  if (!session) throw new DomainError('unauthorized', 'Not signed in');
  return session.user.id;
}
