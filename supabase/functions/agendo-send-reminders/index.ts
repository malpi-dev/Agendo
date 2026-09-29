// Sends push reminders for appointments that are about to start. Invoked by the `agendo-reminders`
// pg_cron job every 5 minutes (verify_jwt = false; authenticated with the x-cron-secret header).
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

interface ClaimedReminder {
  appointment_id: string;
  client_id: string;
  starts_at: string;
  service_name: string;
  professional_name: string;
  timezone: string;
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: 'reminders';
  data: { appointmentId: string };
}

interface PushTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Secret key injected by Supabase (new dictionary first, legacy service_role as fallback). */
function getSecretKey(): string {
  const dictionary = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (dictionary) {
    const key = (JSON.parse(dictionary) as Record<string, string>)['default'];
    if (key) return key;
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  );
}

async function sendBatch(messages: PushMessage[]): Promise<PushTicket[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const accessToken = Deno.env.get('AGENDO_EXPO_ACCESS_TOKEN');
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });
  if (!response.ok) throw new Error(`Expo push API responded ${response.status}`);
  const payload = (await response.json()) as { data?: PushTicket[] };
  return payload.data ?? [];
}

Deno.serve(async (req) => {
  const expected = Deno.env.get('AGENDO_REMINDERS_CRON_SECRET');
  if (!expected || req.headers.get('x-cron-secret') !== expected) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, getSecretKey(), {
    db: { schema: 'agendo' },
    auth: { persistSession: false },
  });

  const { data: claimedRows, error: claimError } = await supabase.rpc('claim_due_reminders');
  if (claimError) {
    console.error('claim_due_reminders failed', claimError.code);
    return json({ error: 'claim_failed' }, 500);
  }
  const claimed = (claimedRows ?? []) as ClaimedReminder[];
  if (claimed.length === 0) return json({ claimed: 0, sent: 0, removedTokens: 0 });

  const clientIds = [...new Set(claimed.map((r) => r.client_id))];
  const { data: tokenRows, error: tokensError } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', clientIds);
  if (tokensError) {
    console.error('reading push_tokens failed', tokensError.code);
    return json({ error: 'tokens_failed' }, 500);
  }

  const tokensByUser = new Map<string, string[]>();
  for (const row of tokenRows ?? []) {
    tokensByUser.set(row.user_id, [...(tokensByUser.get(row.user_id) ?? []), row.token]);
  }

  const messages: PushMessage[] = claimed.flatMap((r) =>
    (tokensByUser.get(r.client_id) ?? []).map((token) => ({
      to: token,
      title: `Reminder: ${r.service_name}`,
      body: `${formatTime(r.starts_at, r.timezone)} with ${r.professional_name}`,
      sound: 'default' as const,
      channelId: 'reminders' as const,
      data: { appointmentId: r.appointment_id },
    })),
  );

  let sent = 0;
  const deadTokens: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const tickets = await sendBatch(batch);
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok') sent += 1;
        else if (ticket.details?.error === 'DeviceNotRegistered') {
          const token = batch[index]?.to;
          if (token) deadTokens.push(token);
        } else console.error('push ticket error', ticket.details?.error ?? 'unknown');
      });
    } catch (e) {
      console.error('push batch failed', e instanceof Error ? e.message : 'unknown');
    }
  }

  if (deadTokens.length > 0) {
    const { error } = await supabase.from('push_tokens').delete().in('token', deadTokens);
    if (error) console.error('removing dead tokens failed', error.code);
  }

  return json({ claimed: claimed.length, sent, removedTokens: deadTokens.length });
});
