import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from '@/core/config/env';

import type { Database } from './database.generated';

function createAgendoClient(url: string, key: string) {
  return createClient<Database, 'agendo'>(url, key, {
    db: { schema: 'agendo' },
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export type AgendoSupabaseClient = ReturnType<typeof createAgendoClient>;

let client: AgendoSupabaseClient | null = null;

export function getSupabaseClient(): AgendoSupabaseClient {
  if (client) return client;

  const { EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = env;
  if (!url || !key) throw new Error('Supabase is not configured');

  const created = createAgendoClient(url, key);

  AppState.addEventListener('change', (state) => {
    if (state === 'active') void created.auth.startAutoRefresh();
    else void created.auth.stopAutoRefresh();
  });

  client = created;
  return created;
}
