import type { Unsubscribe } from '@/features/booking/domain/types';

import type { AuthSession } from './auth-session';

export interface AuthRepository {
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<AuthSession>;
  getSession(): Promise<AuthSession | null>;
  onAuthChange(listener: (session: AuthSession | null) => void): Unsubscribe;
  signOut(): Promise<void>;
}
