import { mapSupabaseError } from '@/core/errors';

/** The `data` of the successful (`error: null`) member of a supabase-js response union. */
type Success<R> = R extends { error: null; data: infer D } ? D : never;

/** Executes a supabase-js call and converts BOTH returned errors and thrown errors into DomainError. */
export async function run<R extends { error: unknown }>(
  op: () => PromiseLike<R>,
): Promise<Success<R>> {
  let result: R;
  try {
    result = await op();
  } catch (e) {
    throw mapSupabaseError(e);
  }
  if (result.error) throw mapSupabaseError(result.error);
  return (result as { data?: unknown }).data as Success<R>;
}
