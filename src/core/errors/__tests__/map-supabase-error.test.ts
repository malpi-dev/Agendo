import { DomainError } from '../domain-error';
import { mapSupabaseError } from '../map-supabase-error';

describe('mapSupabaseError', () => {
  it('returns DomainError as is', () => {
    const original = new DomainError('forbidden');
    expect(mapSupabaseError(original)).toBe(original);
  });

  it('maps exclusion violation on client overlap constraint (message)', () => {
    const e = { code: '23P01', message: 'violates appointments_no_client_overlap' };
    expect(mapSupabaseError(e).code).toBe('clientOverlap');
  });

  it('maps exclusion violation on client overlap constraint (details)', () => {
    const e = { code: '23P01', message: 'conflict', details: 'appointments_no_client_overlap' };
    expect(mapSupabaseError(e).code).toBe('clientOverlap');
  });

  it('maps any other exclusion violation to slotUnavailable', () => {
    expect(mapSupabaseError({ code: '23P01', message: 'x' }).code).toBe('slotUnavailable');
  });

  it('maps business exceptions raised by RPCs', () => {
    expect(mapSupabaseError({ code: 'P0001', message: 'bookingWindow' }).code).toBe(
      'bookingWindow',
    );
  });

  it('ignores P0001 with an unknown message', () => {
    expect(mapSupabaseError({ code: 'P0001', message: 'boom' }).code).toBe('unknown');
  });

  it('maps PGRST116 to notFound', () => {
    expect(mapSupabaseError({ code: 'PGRST116' }).code).toBe('notFound');
  });

  it('maps 42501 to forbidden', () => {
    expect(mapSupabaseError({ code: '42501' }).code).toBe('forbidden');
  });

  it('maps PGRST301 and HTTP 401 to unauthorized', () => {
    expect(mapSupabaseError({ code: 'PGRST301' }).code).toBe('unauthorized');
    expect(mapSupabaseError({ status: 401 }).code).toBe('unauthorized');
  });

  it('maps check and invalid-text errors to validation', () => {
    expect(mapSupabaseError({ code: '23514' }).code).toBe('validation');
    expect(mapSupabaseError({ code: '22P02' }).code).toBe('validation');
  });

  it('maps otp_expired to invalidCode with a friendly message', () => {
    const result = mapSupabaseError({ code: 'otp_expired', message: 'Token has expired' });
    expect(result.code).toBe('invalidCode');
    expect(result.message).toBe('The code is invalid or has expired');
  });

  it('maps rate limit errors to rateLimited', () => {
    expect(mapSupabaseError({ code: 'over_email_send_rate_limit' }).code).toBe('rateLimited');
    expect(mapSupabaseError({ status: 429 }).code).toBe('rateLimited');
  });

  it('maps AuthSessionMissingError to unauthorized', () => {
    expect(mapSupabaseError({ name: 'AuthSessionMissingError' }).code).toBe('unauthorized');
  });

  it.each(['Network request failed', 'Failed to fetch', 'fetch failed', 'Request TIMEOUT'])(
    'maps "%s" to network',
    (message) => {
      expect(mapSupabaseError(new Error(message)).code).toBe('network');
    },
  );

  it('falls back to unknown preserving the cause', () => {
    const original = { code: 'XX000', message: 'weird' };
    const result = mapSupabaseError(original);
    expect(result.code).toBe('unknown');
    expect(result.cause).toBe(original);
  });

  it('handles non-object input', () => {
    expect(mapSupabaseError('nope').code).toBe('unknown');
    expect(mapSupabaseError(null).code).toBe('unknown');
  });
});
