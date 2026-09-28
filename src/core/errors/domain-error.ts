export type DomainErrorCode =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'validation'
  | 'unknown'
  | 'slotUnavailable'
  | 'clientOverlap'
  | 'outsideWorkingHours'
  | 'bookingWindow'
  | 'cancellationWindowClosed'
  | 'invalidCode'
  | 'codeExpired'
  | 'rateLimited';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  override readonly cause?: unknown;

  constructor(code: DomainErrorCode, message?: string, cause?: unknown) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
    this.cause = cause;
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError;

export const toDomainError = (e: unknown): DomainError =>
  isDomainError(e) ? e : new DomainError('unknown', e instanceof Error ? e.message : undefined, e);

/** Codes that RPCs raise via `raise exception '<code>'` (SQLSTATE P0001). */
export const BUSINESS_ERROR_CODES = [
  'slotUnavailable',
  'clientOverlap',
  'outsideWorkingHours',
  'bookingWindow',
  'cancellationWindowClosed',
  'notFound',
  'forbidden',
  'unauthorized',
  'validation',
] as const satisfies readonly DomainErrorCode[];
