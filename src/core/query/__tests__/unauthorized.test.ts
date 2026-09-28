import { DomainError } from '@/core/errors';

import { queryClient, setUnauthorizedHandler } from '../query-client';

describe('global unauthorized handling', () => {
  beforeAll(() => {
    // No GC timers: they would keep the Jest process alive.
    queryClient.setDefaultOptions({
      queries: { gcTime: Infinity, retry: false },
      mutations: { gcTime: Infinity },
    });
  });

  afterEach(() => {
    setUnauthorizedHandler(null);
    queryClient.clear();
  });

  it('calls the handler when a query fails with unauthorized', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    await queryClient
      .fetchQuery({
        queryKey: ['x'],
        queryFn: () => Promise.reject(new DomainError('unauthorized')),
        retry: false,
      })
      .catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls the handler when a mutation fails with unauthorized', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    await queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: () => Promise.reject(new DomainError('unauthorized')) })
      .execute(undefined)
      .catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores other errors', async () => {
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    await queryClient
      .fetchQuery({
        queryKey: ['y'],
        queryFn: () => Promise.reject(new DomainError('notFound')),
        retry: false,
      })
      .catch(() => undefined);
    expect(handler).not.toHaveBeenCalled();
  });
});
