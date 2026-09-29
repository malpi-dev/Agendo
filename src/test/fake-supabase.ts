import type { AgendoSupabaseClient } from '@/core/supabase/client';

interface Result {
  data: unknown;
  error: unknown;
}

export interface FakeChannel {
  topic: string;
  options: unknown;
  /** Broadcast listeners registered with `channel.on('broadcast', { event }, cb)`. */
  listeners: { event: string; callback: () => void }[];
  subscribe: jest.Mock;
  /** Simulates a broadcast message. */
  emit: (event: string) => void;
  /** Simulates the channel status callback given to `subscribe`. */
  status: (status: string) => void;
}

export interface FakeSupabase {
  client: AgendoSupabaseClient;
  /** Every chained call on a query builder, in order: ['from', 'appointments'], ['eq', 'id', '1']… */
  calls: unknown[][];
  /**
   * Sets the results returned by successive awaited calls (queries or rpc). The last one repeats.
   * An Error makes the call reject (e.g. TypeError('Network request failed')).
   */
  respond: (...results: (Partial<Result> | Error)[]) => void;
  rpc: jest.Mock;
  /** Realtime: channels created with `client.channel()`, in order. */
  channels: FakeChannel[];
  removeChannel: jest.Mock;
  setAuth: jest.Mock;
  auth: {
    signInWithOtp: jest.Mock;
    verifyOtp: jest.Mock;
    getSession: jest.Mock;
    getUser: jest.Mock;
    signOut: jest.Mock;
    onAuthStateChange: jest.Mock;
  };
}

/**
 * Chainable fake of the supabase-js client. Any method on a query builder returns the same
 * (thenable) proxy, which resolves to the configured `{ data, error }`.
 * `rpc` and `auth.*` are jest mocks; `rpc` resolves to the configured result by default.
 */
export function createFakeSupabase(): FakeSupabase {
  const calls: unknown[][] = [];
  let queue: (Result | Error)[] = [{ data: null, error: null }];

  const settle = (): Promise<Result> => {
    const next = (queue.length > 1 ? queue.shift() : queue[0]) as Result | Error;
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  };

  const builder: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (onFulfilled: (r: Result) => unknown, onRejected: (e: unknown) => unknown) =>
            settle().then(onFulfilled, onRejected);
        }
        return (...args: unknown[]) => {
          calls.push([String(prop), ...args]);
          return builder;
        };
      },
    },
  );

  const rpc = jest.fn((...args: unknown[]) => {
    calls.push(['rpc', ...args]);
    return settle();
  });

  const auth = {
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  };

  const channels: FakeChannel[] = [];
  const removeChannel = jest.fn(() => Promise.resolve('ok'));
  const setAuth = jest.fn(() => Promise.resolve());
  const channel = (topic: string, options?: unknown) => {
    let statusCallback: ((status: string) => void) | undefined;
    const fake: FakeChannel = {
      topic,
      options,
      listeners: [],
      subscribe: jest.fn((cb: (status: string) => void) => {
        statusCallback = cb;
        return fake;
      }),
      emit: (event) => fake.listeners.filter((l) => l.event === event).forEach((l) => l.callback()),
      status: (status) => statusCallback?.(status),
    };
    const api = {
      on: (_type: string, filter: { event: string }, callback: () => void) => {
        fake.listeners.push({ event: filter.event, callback });
        return api;
      },
      subscribe: fake.subscribe,
    };
    channels.push(fake);
    return api;
  };

  const client = {
    channel,
    removeChannel,
    realtime: { setAuth },
    from: (table: string) => {
      calls.push(['from', table]);
      return builder;
    },
    rpc,
    auth,
  } as unknown as AgendoSupabaseClient;

  return {
    client,
    calls,
    respond: (...results) => {
      queue = results.map((r) => (r instanceof Error ? r : { data: null, error: null, ...r }));
    },
    rpc,
    channels,
    removeChannel,
    setAuth,
    auth,
  };
}
