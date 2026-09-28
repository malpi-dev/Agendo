import { DomainError } from '@/core/errors';

import { run } from '../run';

describe('run', () => {
  it('returns data on success', async () => {
    await expect(run(async () => ({ data: [1, 2], error: null }))).resolves.toEqual([1, 2]);
  });

  it('converts a returned error into DomainError', async () => {
    const op = async () => ({ data: null, error: { code: 'PGRST301', message: 'jwt expired' } });
    await expect(run(op)).rejects.toMatchObject({ name: 'DomainError', code: 'unauthorized' });
  });

  it('converts a thrown error into DomainError', async () => {
    const op = async (): Promise<{ data: null; error: null }> => {
      throw new TypeError('Network request failed');
    };
    const error = await run(op).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'network' });
  });
});
