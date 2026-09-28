import type { DomainErrorCode } from '../domain-error';
import { getErrorPresentation } from '../error-messages';

const ALL_CODES: DomainErrorCode[] = [
  'network',
  'unauthorized',
  'forbidden',
  'notFound',
  'conflict',
  'validation',
  'unknown',
  'slotUnavailable',
  'clientOverlap',
  'outsideWorkingHours',
  'bookingWindow',
  'cancellationWindowClosed',
  'invalidCode',
  'codeExpired',
  'rateLimited',
];

describe('getErrorPresentation', () => {
  it.each(ALL_CODES)('has a title and message for %s', (code) => {
    const p = getErrorPresentation(code);
    expect(p.title).not.toBe('');
    expect(p.message).not.toBe('');
  });

  it('suggests choosing another time when the slot was taken', () => {
    expect(getErrorPresentation('slotUnavailable').action).toBe('chooseAnotherTime');
  });
});
