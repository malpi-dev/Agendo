import { BUSINESS_ERROR_CODES, DomainError, isDomainError } from './domain-error';

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  status?: unknown;
  name?: unknown;
}

const NETWORK_PATTERN = /network request failed|failed to fetch|fetch failed|timeout/i;

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

export function mapSupabaseError(error: unknown): DomainError {
  if (isDomainError(error)) return error;

  const e: ErrorLike = typeof error === 'object' && error !== null ? error : {};
  const code = asString(e.code);
  const message = asString(e.message);
  const details = asString(e.details);
  const name = asString(e.name);
  const status = typeof e.status === 'number' ? e.status : undefined;

  if (code === '23P01') {
    const overlap =
      message.includes('appointments_no_client_overlap') ||
      details.includes('appointments_no_client_overlap');
    return new DomainError(overlap ? 'clientOverlap' : 'slotUnavailable', message, error);
  }
  if (code === 'P0001') {
    const business = BUSINESS_ERROR_CODES.find((c) => c === message);
    if (business) return new DomainError(business, message, error);
  }
  if (code === 'PGRST116') return new DomainError('notFound', message, error);
  if (code === '42501') return new DomainError('forbidden', message, error);
  if (code === 'PGRST301' || status === 401) return new DomainError('unauthorized', message, error);
  if (code === '23514' || code === '22P02') return new DomainError('validation', message, error);
  if (code === 'otp_expired') {
    return new DomainError('invalidCode', 'The code is invalid or has expired', error);
  }
  if ((code.startsWith('over_') && code.includes('rate_limit')) || status === 429) {
    return new DomainError('rateLimited', message, error);
  }
  if (name === 'AuthSessionMissingError') return new DomainError('unauthorized', message, error);
  if (NETWORK_PATTERN.test(message)) return new DomainError('network', message, error);

  return new DomainError('unknown', message || undefined, error);
}
