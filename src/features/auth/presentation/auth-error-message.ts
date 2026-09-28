import { getErrorPresentation, toDomainError } from '@/core/errors';

/** Inline message for auth forms. */
export function authErrorMessage(error: unknown): string {
  const { code } = toDomainError(error);
  if (code === 'rateLimited') return 'Too many attempts. Please wait a moment and try again.';
  if (code === 'invalidCode' || code === 'codeExpired') {
    return 'The code is invalid or has expired';
  }
  return getErrorPresentation(code).message;
}
