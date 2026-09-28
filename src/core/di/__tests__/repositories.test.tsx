import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { MockDb } from '@/features/demo/data/mock-db';

import { createMockRepositories, RepositoryProvider, useRepositories } from '../repositories';

describe('useRepositories', () => {
  it('throws a clear error outside a provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderHook(() => useRepositories())).rejects.toThrow(/RepositoryProvider/);
  });

  it('returns the provided repositories', async () => {
    const repositories = createMockRepositories(new MockDb({ latencyMs: [0, 0] }));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RepositoryProvider repositories={repositories}>{children}</RepositoryProvider>
    );
    const { result } = await renderHook(() => useRepositories(), { wrapper });
    expect(result.current).toBe(repositories);
  });
});
