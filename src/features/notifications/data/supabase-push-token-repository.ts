import type { AgendoSupabaseClient } from '@/core/supabase/client';
import { getCurrentUserId } from '@/core/supabase/current-user-id';
import { run } from '@/core/supabase/run';

import type { PushPlatform, PushTokenRepository } from '../domain/push-token-repository';

export class SupabasePushTokenRepository implements PushTokenRepository {
  constructor(private readonly client: AgendoSupabaseClient) {}

  /** Upsert by token: a device that changes account moves its token to the new user. */
  async register(token: string, platform: PushPlatform): Promise<void> {
    const userId = await getCurrentUserId(this.client);
    await run(() =>
      this.client
        .from('push_tokens')
        .upsert(
          { user_id: userId, token, platform, updated_at: new Date().toISOString() },
          { onConflict: 'token' },
        ),
    );
  }

  async remove(token: string): Promise<void> {
    await run(() => this.client.from('push_tokens').delete().eq('token', token));
  }
}
