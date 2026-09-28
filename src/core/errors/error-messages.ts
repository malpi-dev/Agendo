import type { DomainErrorCode } from './domain-error';

export type ErrorAction = 'retry' | 'chooseAnotherTime' | 'signInAgain' | 'none';

export interface ErrorPresentation {
  title: string;
  message: string;
  action: ErrorAction;
}

const PRESENTATIONS: Record<DomainErrorCode, ErrorPresentation> = {
  network: {
    title: "You're offline",
    message: 'Check your connection and try again.',
    action: 'retry',
  },
  unauthorized: {
    title: 'Session expired',
    message: 'Please sign in again to continue.',
    action: 'signInAgain',
  },
  forbidden: {
    title: 'Not allowed',
    message: "You don't have permission to do that.",
    action: 'none',
  },
  notFound: {
    title: 'Not found',
    message: "We couldn't find what you were looking for.",
    action: 'none',
  },
  conflict: {
    title: 'Something changed',
    message: 'The data was modified elsewhere. Please refresh and try again.',
    action: 'retry',
  },
  validation: {
    title: 'Invalid information',
    message: 'Please review the data you entered and try again.',
    action: 'none',
  },
  unknown: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    action: 'retry',
  },
  slotUnavailable: {
    title: 'That time was just taken',
    message: 'Please choose another time.',
    action: 'chooseAnotherTime',
  },
  clientOverlap: {
    title: 'Overlapping appointment',
    message: 'You already have an appointment at that time.',
    action: 'chooseAnotherTime',
  },
  outsideWorkingHours: {
    title: 'Outside working hours',
    message: 'That time is outside the professional’s working hours.',
    action: 'chooseAnotherTime',
  },
  bookingWindow: {
    title: 'Date not available',
    message: 'Appointments can only be booked within the allowed booking window.',
    action: 'chooseAnotherTime',
  },
  cancellationWindowClosed: {
    title: 'Too late to change',
    message: 'Appointments can only be changed up to 2 hours before they start.',
    action: 'none',
  },
  invalidCode: {
    title: 'Invalid code',
    message: 'The code is invalid or has expired.',
    action: 'none',
  },
  codeExpired: {
    title: 'Code expired',
    message: 'Request a new code and try again.',
    action: 'none',
  },
  rateLimited: {
    title: 'Too many attempts',
    message: 'Please wait a moment before trying again.',
    action: 'none',
  },
};

export const getErrorPresentation = (code: DomainErrorCode): ErrorPresentation =>
  PRESENTATIONS[code];
