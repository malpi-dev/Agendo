begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Setup (as postgres): deterministic data relative to now().
delete from agendo.appointments;
insert into agendo.services (id, name, duration_minutes, price_cents)
values ('00000000-0000-4000-8000-000000000901', 'Test service', 30, 1000);
insert into agendo.professionals (id, name)
values ('00000000-0000-4000-8000-000000000991', 'Test Pro');

-- Business reminder lead is 120 minutes by default.
select is((select reminder_lead_minutes from agendo.business limit 1), 120, 'default reminder lead is 120 minutes');

insert into agendo.appointments (id, client_id, professional_id, service_id, starts_at, ends_at, status)
values
  -- due: starts in 90 minutes
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000311',
   '00000000-0000-4000-8000-000000000991', '00000000-0000-4000-8000-000000000901',
   now() + interval '90 minutes', now() + interval '120 minutes', 'booked'),
  -- cancelled, inside the window
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000312',
   '00000000-0000-4000-8000-000000000991', '00000000-0000-4000-8000-000000000901',
   now() + interval '60 minutes', now() + interval '90 minutes', 'cancelled'),
  -- outside the window (starts in 150 minutes)
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000313',
   '00000000-0000-4000-8000-000000000991', '00000000-0000-4000-8000-000000000901',
   now() + interval '150 minutes', now() + interval '180 minutes', 'booked'),
  -- already started
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-000000000314',
   '00000000-0000-4000-8000-000000000991', '00000000-0000-4000-8000-000000000901',
   now() - interval '10 minutes', now() + interval '20 minutes', 'booked');

create temp table first_claim on commit drop as select * from agendo.claim_due_reminders();

select is((select count(*) from first_claim), 1::bigint, 'exactly one due appointment is claimed');
select is((select appointment_id from first_claim), '00000000-0000-4000-8000-0000000000b1'::uuid,
          'the claimed appointment is the one starting in 90 minutes');
select is((select service_name || '/' || professional_name || '/' || timezone from first_claim),
          'Test service/Test Pro/America/Mexico_City', 'the claim returns names and business timezone');
select isnt((select reminder_sent_at from agendo.appointments where id = '00000000-0000-4000-8000-0000000000b1'),
            null, 'claiming marks reminder_sent_at');
select is((select count(*) from agendo.claim_due_reminders()), 0::bigint,
          'a second call claims nothing (no double send)');
select is((select count(*) from agendo.appointments where reminder_sent_at is not null), 1::bigint,
          'cancelled, out-of-window and started appointments are left untouched');

-- Privileges: only service_role may run the function.
set local role authenticated;
select throws_ok($$select * from agendo.claim_due_reminders()$$, '42501', null,
                 'authenticated cannot execute claim_due_reminders');
reset role;
set local role anon;
select throws_ok($$select * from agendo.claim_due_reminders()$$, '42501', null,
                 'anon cannot execute claim_due_reminders');
reset role;

select is((select schedule from cron.job where jobname = 'agendo-reminders'), '*/5 * * * *',
          'the agendo-reminders job runs every 5 minutes');

select * from finish();
rollback;
