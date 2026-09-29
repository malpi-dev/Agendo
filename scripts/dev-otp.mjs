// DEV ONLY. Prints a 6-digit login code for an email without sending any email.
// Uses the Supabase secret key (bypasses RLS): never import this from the app, never run it in CI.
// Usage: npm run dev:otp -- someone@example.com
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!email || !email.includes('@')) {
  console.error('Usage: npm run dev:otp -- <email>');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.scripts.example to .env.scripts.',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  // An existing user is fine; anything else is a real failure.
  if (createError && createError.code !== 'email_exists') {
    throw createError;
  }

  const { data, error } = await supabase.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;

  console.log(`Code for ${email}: ${data.properties.email_otp}`);
}

main().catch((error) => {
  console.error(`dev-otp failed: ${error.message ?? error}`);
  process.exit(1);
});
