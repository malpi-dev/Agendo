import { DomainError } from '@/core/errors';
import type { AgendoSupabaseClient } from '@/core/supabase/client';
import { run } from '@/core/supabase/run';
import type { Unsubscribe } from '@/features/booking/domain/types';

import type { AuthRepository } from '../domain/auth-repository';
import type { AuthSession } from '../domain/auth-session';
import { toAuthSession } from './mappers';

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: AgendoSupabaseClient) {}

  async sendCode(email: string): Promise<void> {
    await run(() => this.client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }));
  }

  async verifyCode(email: string, code: string): Promise<AuthSession> {
    const data = await run(() => this.client.auth.verifyOtp({ email, token: code, type: 'email' }));
    const session = toAuthSession(data.session);
    if (!session) throw new DomainError('unknown', 'Verification returned no session');
    return session;
  }

  async getSession(): Promise<AuthSession | null> {
    const data = await run(() => this.client.auth.getSession());
    return toAuthSession(data.session);
  }

  onAuthChange(listener: (session: AuthSession | null) => void): Unsubscribe {
    const { data } = this.client.auth.onAuthStateChange((_event, session) =>
      listener(toAuthSession(session)),
    );
    return () => data.subscription.unsubscribe();
  }

  async signOut(): Promise<void> {
    await run(async () => ({ data: null, error: (await this.client.auth.signOut()).error }));
  }
}
