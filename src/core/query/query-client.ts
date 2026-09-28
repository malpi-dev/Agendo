import { QueryClient } from '@tanstack/react-query';

import { toDomainError, type DomainError } from '@/core/errors';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: DomainError;
  }
}

const RETRYABLE = ['network', 'unknown'];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) =>
        failureCount < 2 && RETRYABLE.includes(toDomainError(error).code),
    },
  },
});
