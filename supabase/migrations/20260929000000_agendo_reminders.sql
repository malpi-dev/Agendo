-- Reminders: due appointments are claimed atomically, then pg_cron calls the Edge Function every 5 minutes.
-- pg_cron / pg_net are project-wide extensions; creating them is a no-op if already present.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Marks due reminders as sent and returns them in ONE statement, so overlapping runs never double-send.
create or replace function agendo.claim_due_reminders()
returns table (appointment_id uuid, client_id uuid, starts_at timestamptz,
               service_name text, professional_name text, timezone text)
language sql volatile security definer set search_path = '' as $$
  with b as (select timezone, reminder_lead_minutes from agendo.business limit 1),
  due as (
    update agendo.appointments a
       set reminder_sent_at = now()
      from b
     where a.status = 'booked'
       and a.reminder_sent_at is null
       and a.starts_at > now()
       and a.starts_at <= now() + make_interval(mins => b.reminder_lead_minutes)
    returning a.id, a.client_id, a.starts_at, a.service_id, a.professional_id
  )
  select d.id, d.client_id, d.starts_at, s.name, p.name, (select timezone from b)
  from due d
  join agendo.services s on s.id = d.service_id
  join agendo.professionals p on p.id = d.professional_id;
$$;
-- Only the Edge Function (service_role) may claim reminders.
revoke execute on function agendo.claim_due_reminders() from public, anon, authenticated;
grant execute on function agendo.claim_due_reminders() to service_role;

-- Idempotent (re)creation of the job, always by name (never unschedule in bulk).
select cron.unschedule('agendo-reminders') where exists (select 1 from cron.job where jobname = 'agendo-reminders');
select cron.schedule('agendo-reminders', '*/5 * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'agendo_functions_base_url')
           || '/functions/v1/agendo-send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'agendo_reminders_cron_secret')
    ),
    body := '{}'::jsonb
  );
$job$);
