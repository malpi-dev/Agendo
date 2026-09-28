import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render,
  renderHook,
  type RenderHookOptions,
  type RenderOptions,
} from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { createMockRepositories, RepositoryProvider, type Repositories } from '@/core/di';
import { makeDb } from '@/features/demo/data/__tests__/test-db';
import type { MockDb } from '@/features/demo/data/mock-db';

interface ProviderOptions {
  /** Replace individual repositories (e.g. to force errors). */
  repositories?: Partial<Repositories>;
  db?: MockDb;
}

function createWrapper({ repositories, db = makeDb() }: ProviderOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const merged: Repositories = { ...createMockRepositories(db), ...repositories };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repositories={merged}>{children}</RepositoryProvider>
    </QueryClientProvider>
  );
  return { Wrapper, queryClient, db, repositories: merged };
}

export async function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { repositories, db, ...renderOptions } = options;
  const ctx = createWrapper({ repositories, db });
  const result = await render(ui, { wrapper: ctx.Wrapper, ...renderOptions });
  return { ...result, queryClient: ctx.queryClient, db: ctx.db, repositories: ctx.repositories };
}

export async function renderHookWithProviders<Result, Props>(
  hook: (props: Props) => Result,
  options: ProviderOptions & Omit<RenderHookOptions<Props>, 'wrapper'> = {},
) {
  const { repositories, db, ...hookOptions } = options;
  const ctx = createWrapper({ repositories, db });
  const result = await renderHook(hook, { wrapper: ctx.Wrapper, ...hookOptions });
  return { ...result, queryClient: ctx.queryClient, db: ctx.db, repositories: ctx.repositories };
}
