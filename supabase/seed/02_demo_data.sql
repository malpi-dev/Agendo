-- Local-only demo data: users, profiles and appointments relative to today (America/Mexico_City).
-- Stable UUIDs are shared with the demo-mode fixtures in the app. Idempotent for users/profiles.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated', u.email, '',
       now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''
from (values
  ('00000000-0000-4000-8000-000000000301', 'client@agendo.dev'),
  ('00000000-0000-4000-8000-000000000302', 'admin@agendo.dev'),
  ('00000000-0000-4000-8000-000000000311', 'alex.rivera@example.com'),
  ('00000000-0000-4000-8000-000000000312', 'priya.shah@example.com'),
  ('00000000-0000-4000-8000-000000000313', 'diego.morales@example.com'),
  ('00000000-0000-4000-8000-000000000314', 'hannah.lee@example.com'),
  ('00000000-0000-4000-8000-000000000315', 'omar.haddad@example.com'),
  ('00000000-0000-4000-8000-000000000316', 'sofia.rossi@example.com'),
  ('00000000-0000-4000-8000-000000000317', 'liam.carter@example.com'),
  ('00000000-0000-4000-8000-000000000318', 'mei.chen@example.com')
) as u(id, email)
on conflict do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u
where u.id::text like '00000000-0000-4000-8000-0000000003%'
on conflict do nothing;

insert into agendo.profiles (id, full_name, role) values
  ('00000000-0000-4000-8000-000000000301', 'Casey Morgan', 'client'),
  ('00000000-0000-4000-8000-000000000302', 'Nora Blake', 'admin'),
  ('00000000-0000-4000-8000-000000000311', 'Alex Rivera', 'client'),
  ('00000000-0000-4000-8000-000000000312', 'Priya Shah', 'client'),
  ('00000000-0000-4000-8000-000000000313', 'Diego Morales', 'client'),
  ('00000000-0000-4000-8000-000000000314', 'Hannah Lee', 'client'),
  ('00000000-0000-4000-8000-000000000315', 'Omar Haddad', 'client'),
  ('00000000-0000-4000-8000-000000000316', 'Sofia Rossi', 'client'),
  ('00000000-0000-4000-8000-000000000317', 'Liam Carter', 'client'),
  ('00000000-0000-4000-8000-000000000318', 'Mei Chen', 'client')
on conflict do nothing;

do $$
declare
  tz constant text := 'America/Mexico_City';
  v_today date := (now() at time zone tz)::date;
  marco constant uuid := '00000000-0000-4000-8000-000000000101';
  lena constant uuid := '00000000-0000-4000-8000-000000000102';
  sam constant uuid := '00000000-0000-4000-8000-000000000103';
  classic constant uuid := '00000000-0000-4000-8000-000000000201';
  fade constant uuid := '00000000-0000-4000-8000-000000000202';
  beard constant uuid := '00000000-0000-4000-8000-000000000203';
  kids constant uuid := '00000000-0000-4000-8000-000000000206';
  casey constant uuid := '00000000-0000-4000-8000-000000000301';
  clients constant uuid[] := array[
    '00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-000000000312',
    '00000000-0000-4000-8000-000000000313', '00000000-0000-4000-8000-000000000314',
    '00000000-0000-4000-8000-000000000315', '00000000-0000-4000-8000-000000000316',
    '00000000-0000-4000-8000-000000000317', '00000000-0000-4000-8000-000000000318'];
  v_d date;
  v_dow int;
  v_seq int := 0;    -- generation order over all fictitious appointments (client rotation)
  v_other int := 0;  -- appointments on days other than today (every 4th is cancelled)
  r record;
  v_dur int;
  v_start timestamptz;
  v_status agendo.appointment_status;
  n int;
  v_step int;
begin
  for v_d in select d::date from generate_series(v_today - 7, v_today + 7, interval '1 day') as d loop
    v_dow := extract(dow from v_d)::int;
    continue when v_dow = 0; -- closed on Sundays

    -- Generation order: today = Marco 10:00, Marco 15:00, Lena 11:00, Lena 16:30, Sam 12:00; otherwise Marco 10:00, Lena 15:00.
    for r in
      select * from (values
        (1, marco, classic, time '10:00', true),
        (2, marco, fade, time '15:00', v_d = v_today),
        (3, lena, fade, time '11:00', v_d = v_today),
        (4, lena, kids, time '16:30', v_d = v_today and v_dow <> 6),
        (5, sam, beard, time '12:00', v_d = v_today and v_dow <> 1),
        (6, lena, fade, time '15:00', v_d <> v_today)
      ) as t(ord, pro, svc, tm, include)
      where include
      order by ord
    loop
      v_seq := v_seq + 1;
      select duration_minutes into v_dur from agendo.services where id = r.svc;
      v_start := (v_d + r.tm) at time zone tz;
      v_status := 'booked';
      if v_d <> v_today then
        v_other := v_other + 1;
        if v_other % 4 = 0 then v_status := 'cancelled'; end if;
      end if;
      insert into agendo.appointments
        (client_id, professional_id, service_id, starts_at, ends_at, status, cancelled_at, reminder_sent_at)
      values
        (clients[((v_seq - 1) % 8) + 1], r.pro, r.svc, v_start, v_start + make_interval(mins => v_dur), v_status,
         case when v_status = 'cancelled' then v_start - interval '1 day' end,
         case when v_start < now() then now() end);
    end loop;
  end loop;

  -- Casey Morgan (demo user): n-th Monday-Friday workday from today, not counting today.
  for r in
    select * from (values
      (1, marco, beard, time '17:00', false),
      (3, lena, classic, time '12:00', false),
      (-1, marco, classic, time '12:00', false),
      (-3, lena, fade, time '17:00', false),
      (-5, marco, kids, time '11:00', true)
    ) as t(n, pro, svc, tm, cancelled)
  loop
    v_step := sign(r.n);
    v_d := v_today;
    n := abs(r.n);
    while n > 0 loop
      v_d := v_d + v_step;
      if extract(dow from v_d)::int between 1 and 5 then n := n - 1; end if;
    end loop;
    select duration_minutes into v_dur from agendo.services where id = r.svc;
    v_start := (v_d + r.tm) at time zone tz;
    v_status := case when r.cancelled then 'cancelled' else 'booked' end;
    insert into agendo.appointments
      (client_id, professional_id, service_id, starts_at, ends_at, status, cancelled_at, reminder_sent_at)
    values
      (casey, r.pro, r.svc, v_start, v_start + make_interval(mins => v_dur), v_status,
       case when r.cancelled then v_start - interval '1 day' end,
       case when v_start < now() then now() end);
  end loop;
end $$;
