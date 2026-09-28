begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- ---------------------------------------------------------------------------
-- Setup (as postgres): deterministic data, independent of the current time.
-- ---------------------------------------------------------------------------
delete from agendo.appointments;

do $$
declare
  v_today date := (now() at time zone 'America/Mexico_City')::date;
  v_dow int := extract(dow from v_today)::int;
begin
  perform set_config('t.tomorrow', (v_today + 1)::text, true);
  -- next Sunday, always in the future
  perform set_config('t.sunday', (v_today + (7 - v_dow))::text, true);
end $$;

insert into agendo.services (id, name, duration_minutes, price_cents)
values ('00000000-0000-4000-8000-000000000901', 'Test service', 30, 1000);
insert into agendo.professionals (id, name)
values ('00000000-0000-4000-8000-000000000991', 'Test Pro');
insert into agendo.professional_services (professional_id, service_id)
values ('00000000-0000-4000-8000-000000000991', '00000000-0000-4000-8000-000000000901');
insert into agendo.working_hours (professional_id, weekday, start_time, end_time)
select '00000000-0000-4000-8000-000000000991', d, '00:00', '23:45' from generate_series(0, 6) as d;

-- Helper (rolled back with the transaction): tomorrow at HH:MM in business time.
create function public.test_tmr(t time) returns timestamptz language sql as $$
  select (current_setting('t.tomorrow')::date + t) at time zone 'America/Mexico_City'
$$;

-- ---------------------------------------------------------------------------
-- Structure
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from pg_tables where schemaname = 'agendo'
     and tablename in ('business', 'profiles', 'services', 'professionals', 'professional_services',
                       'working_hours', 'appointments', 'push_tokens')),
  8::bigint, 'all 8 tables exist');

select is(
  (select count(*) from pg_tables where schemaname = 'agendo' and not rowsecurity),
  0::bigint, 'RLS is enabled on every agendo table');

-- ---------------------------------------------------------------------------
-- Constraints (as postgres, straight inserts)
-- ---------------------------------------------------------------------------
insert into agendo.appointments (id, client_id, professional_id, service_id, starts_at, ends_at)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000311',
        '00000000-0000-4000-8000-000000000991', '00000000-0000-4000-8000-000000000901',
        public.test_tmr('09:00'), public.test_tmr('09:30'));

select throws_ok(
  $$insert into agendo.appointments (client_id, professional_id, service_id, starts_at, ends_at)
    values ('00000000-0000-4000-8000-000000000312', '00000000-0000-4000-8000-000000000991',
            '00000000-0000-4000-8000-000000000901', public.test_tmr('09:15'), public.test_tmr('09:45'))$$,
  '23P01', null, 'overlapping booked appointments for one professional are rejected');

select lives_ok(
  $$insert into agendo.appointments (client_id, professional_id, service_id, starts_at, ends_at)
    values ('00000000-0000-4000-8000-000000000312', '00000000-0000-4000-8000-000000000991',
            '00000000-0000-4000-8000-000000000901', public.test_tmr('09:30'), public.test_tmr('10:00'))$$,
  'back-to-back appointments are allowed (half-open ranges)');

update agendo.appointments set status = 'cancelled' where id = '00000000-0000-4000-8000-0000000000a1';
select lives_ok(
  $$insert into agendo.appointments (client_id, professional_id, service_id, starts_at, ends_at)
    values ('00000000-0000-4000-8000-000000000313', '00000000-0000-4000-8000-000000000991',
            '00000000-0000-4000-8000-000000000901', public.test_tmr('09:00'), public.test_tmr('09:30'))$$,
  'a cancelled slot can be booked again');

insert into agendo.appointments (client_id, professional_id, service_id, starts_at, ends_at)
values ('00000000-0000-4000-8000-000000000314', '00000000-0000-4000-8000-000000000991',
        '00000000-0000-4000-8000-000000000901', public.test_tmr('14:00'), public.test_tmr('14:30'));
select throws_ok(
  $$insert into agendo.appointments (client_id, professional_id, service_id, starts_at, ends_at)
    values ('00000000-0000-4000-8000-000000000314', '00000000-0000-4000-8000-000000000101',
            '00000000-0000-4000-8000-000000000201', public.test_tmr('14:15'), public.test_tmr('14:45'))$$,
  '23P01', null, 'one client cannot have two overlapping appointments');

-- More setup data used by the RPC tests.
insert into agendo.appointments (client_id, professional_id, service_id, starts_at, ends_at)
values ('00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-000000000991',
        '00000000-0000-4000-8000-000000000901', public.test_tmr('12:00'), public.test_tmr('12:30'));
-- Casey has an appointment starting in 1 hour (with Sam), inside the cancellation window.
insert into agendo.appointments (id, client_id, professional_id, service_id, starts_at, ends_at)
values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000301',
        '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000201',
        now() + interval '1 hour', now() + interval '90 minutes');

-- ---------------------------------------------------------------------------
-- RLS as Casey (client)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated"}';

select is(
  (select count(*) from agendo.appointments where client_id <> auth.uid()),
  0::bigint, 'a client sees no appointments of other clients');

select throws_ok(
  $$update agendo.profiles set role = 'admin' where id = auth.uid()$$,
  '42501', null, 'a client cannot escalate their role');

select throws_ok(
  $$insert into agendo.profiles (id, full_name) values (gen_random_uuid(), 'Intruder')$$,
  '42501', null, 'clients cannot insert profiles directly');

select throws_ok(
  $$insert into agendo.appointments (client_id, professional_id, service_id, starts_at, ends_at)
    values (auth.uid(), '00000000-0000-4000-8000-000000000991', '00000000-0000-4000-8000-000000000901',
            public.test_tmr('16:00'), public.test_tmr('16:30'))$$,
  '42501', null, 'clients cannot insert appointments directly');

select is(
  (select count(*) from agendo.get_busy_ranges(
     '00000000-0000-4000-8000-000000000991', public.test_tmr('00:00'), public.test_tmr('23:59'))),
  4::bigint, 'busy ranges expose other clients'' bookings (times only)');

-- ---------------------------------------------------------------------------
-- book_appointment
-- ---------------------------------------------------------------------------
select lives_ok(
  $$select agendo.book_appointment('00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000991', public.test_tmr('10:00'))$$,
  'book_appointment succeeds at a valid time');

select is(
  (select client_id from agendo.appointments
     where professional_id = '00000000-0000-4000-8000-000000000991' and starts_at = public.test_tmr('10:00')),
  '00000000-0000-4000-8000-000000000301'::uuid, 'the booking belongs to the caller');

select throws_ok(
  format($f$select agendo.book_appointment('00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000101', %L::timestamptz)$f$,
    (current_setting('t.sunday')::date + time '10:00') at time zone 'America/Mexico_City'),
  'P0001', 'outsideWorkingHours', 'booking on a closed day is rejected');

select throws_ok(
  $$select agendo.book_appointment('00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000991', now() + interval '30 minutes')$$,
  'P0001', 'bookingWindow', 'booking inside the minimum notice is rejected');

select throws_ok(
  $$select agendo.book_appointment('00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000991', public.test_tmr('10:07'))$$,
  'P0001', 'outsideWorkingHours', 'booking off the slot grid is rejected');

select throws_ok(
  $$select agendo.cancel_appointment('00000000-0000-4000-8000-0000000000b1')$$,
  'P0001', 'cancellationWindowClosed', 'cancelling inside the window is rejected');

-- ---------------------------------------------------------------------------
-- ensure_profile
-- ---------------------------------------------------------------------------
select is(
  (select role::text from agendo.ensure_profile('Someone Else')),
  'client', 'ensure_profile never changes the role');

select is(
  (select full_name from agendo.ensure_profile('Someone Else')),
  'Casey Morgan', 'ensure_profile is idempotent (keeps the existing profile)');

-- ---------------------------------------------------------------------------
-- reschedule_appointment
-- ---------------------------------------------------------------------------
do $$
begin
  perform set_config('t.casey_apt', (select id::text from agendo.appointments
    where client_id = '00000000-0000-4000-8000-000000000301'
      and professional_id = '00000000-0000-4000-8000-000000000991'), true);
end $$;

select throws_ok(
  $$select agendo.reschedule_appointment(current_setting('t.casey_apt')::uuid, public.test_tmr('12:00'))$$,
  '23P01', null, 'rescheduling into an occupied slot is rejected');

select lives_ok(
  $$select agendo.reschedule_appointment(current_setting('t.casey_apt')::uuid, public.test_tmr('11:00'))$$,
  'rescheduling into a free slot succeeds');

select is(
  (select starts_at from agendo.appointments where id = current_setting('t.casey_apt')::uuid),
  public.test_tmr('11:00'), 'the appointment moved and kept its id');

-- ---------------------------------------------------------------------------
-- RLS as Nora (admin)
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-000000000302","role":"authenticated"}';

select cmp_ok(
  (select count(*) from agendo.appointments where client_id <> auth.uid()),
  '>', 0::bigint, 'an admin sees other clients'' appointments');

select is(
  (select count(*) from agendo.profiles), 10::bigint, 'an admin sees all profiles');

reset role;
select * from finish();
rollback;
