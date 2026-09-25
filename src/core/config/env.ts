import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url().optional(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_DATA_SOURCE: z.enum(['supabase', 'mock']).default('supabase'),
});

// Expo only inlines EXPO_PUBLIC_* when accessed statically, so list them explicitly.
const parsed = schema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
  EXPO_PUBLIC_DATA_SOURCE: process.env.EXPO_PUBLIC_DATA_SOURCE || undefined,
});

export const env = parsed.success ? parsed.data : { EXPO_PUBLIC_DATA_SOURCE: 'mock' as const };
export const isSupabaseConfigured = Boolean(
  env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
