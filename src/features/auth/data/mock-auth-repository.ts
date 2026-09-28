import { DomainError } from '@/core/errors';
import type { Unsubscribe } from '@/features/booking/domain/types';

import type { AuthRepository } from '../domain/auth-repository';
import type { AuthSession } from '../domain/auth-session';

export const MOCK_VALID_CODE = '123456';
export const MOCK_INVALID_CODE = '000000';
export const MOCK_RATE_LIMITED_EMAIL = 'ratelimited@test.dev';

/** Test double: '123456' signs in, '000000' is invalid, ratelimited@test.dev is rate limited. */
export class MockAuthRepository implements AuthRepository {
  private session: AuthSession | null = null;
  private readonly listeners = new Set<(session: AuthSession | null) => void>();

  async sendCode(email: string): Promise<void> {
    if (email === MOCK_RATE_LIMITED_EMAIL) throw new DomainError('rateLimited');
  }

  async verifyCode(email: string, code: string): Promise<AuthSession> {
    if (code !== MOCK_VALID_CODE) throw new DomainError('invalidCode');
    const session = { userId: `mock-${email}`, email };
    this.emit(session);
    return session;
  }

  async getSession(): Promise<AuthSession | null> {
    return this.session;
  }

  onAuthChange(listener: (session: AuthSession | null) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async signOut(): Promise<void> {
    this.emit(null);
  }

  private emit(session: AuthSession | null): void {
    this.session = session;
    this.listeners.forEach((l) => l(session));
  }
}
