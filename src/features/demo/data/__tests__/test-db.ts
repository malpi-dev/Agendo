import { at } from '@/features/booking/domain/__tests__/test-fixtures';

import { MockDb, type MockDbOptions } from '../mock-db';

/** Tuesday 2026-09-29, 08:00 in Mexico City. */
export const FIXED_NOW = at('2026-09-29', '08:00');

export const makeDb = (options: MockDbOptions = {}) =>
  new MockDb({
    latencyMs: [0, 0],
    now: () => FIXED_NOW,
    simulateConcurrentBooking: false,
    ...options,
  });
