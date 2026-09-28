-- RPCs and triggers. Business errors: SQLSTATE P0001 with message = DomainError code.

create or replace function agendo.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger appointments_set_updated_at before update on agendo.appointments
  for each row execute function agendo.set_updated_at();
create trigger push_tokens_set_updated_at before update on agendo.push_tokens
  for each row execute function agendo.set_updated_at();

-- Blocks role changes made through the API (psql / service role may still change roles).
create or replace function agendo.prevent_role_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') in ('authenticated', 'anon') then
    raise exception using errcode = 'P0001', message = 'forbidden';
  end if;
  return new;
end $$;

create trigger profiles_prevent_role_change before update on agendo.profiles
  for each row execute function agendo.prevent_role_change();

-- Idempotent profile creation for the current user. Never changes an existing role.
create or replace function agendo.ensure_profile(p_full_name text) returns agendo.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile agendo.profiles;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'unauthorized';
  end if;
  insert into agendo.profiles (id, full_name) values (v_uid, trim(p_full_name))
    on conflict (id) do nothing;
  select * into v_profile from agendo.profiles where id = v_uid;
  return v_profile;
end $$;

-- Busy ranges of a professional, without any personal data.
create or replace function agendo.get_busy_ranges(p_professional_id uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.starts_at, a.ends_at
  from agendo.appointments a
  where a.professional_id = p_professional_id
    and a.status = 'booked'
    and a.during && tstzrange(p_from, p_to, '[)')
  order by a.starts_at;
$$;

-- Internal helper (not granted to clients): booking window, working hours and slot alignment.
-- Must give the same result as getAvailableSlots in the app domain layer.
create or replace function agendo.assert_bookable(p_professional_id uuid, p_starts_at timestamptz, p_ends_at timestamptz)
returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  b agendo.business;
  v_local_start timestamp;
  v_local_end timestamp;
begin
  select * into b from agendo.business limit 1;
  v_local_start := p_starts_at at time zone b.timezone;
  v_local_end := p_ends_at at time zone b.timezone;

  -- minimum notice and maximum advance (in business-local days)
  if p_starts_at < now() + make_interval(mins => b.min_notice_minutes)
     or v_local_start::date >= (now() at time zone b.timezone)::date + b.max_advance_days then
    raise exception using errcode = 'P0001', message = 'bookingWindow';
  end if;

  -- fits inside one working block of that weekday and is aligned to the slot interval
  if v_local_end::date <> v_local_start::date or not exists (
    select 1 from agendo.working_hours wh
    where wh.professional_id = p_professional_id
      and wh.weekday = extract(dow from v_local_start)::int
      and wh.start_time <= v_local_start::time
      and v_local_end::time <= wh.end_time
      and (extract(epoch from (v_local_start::time - wh.start_time))::int / 60) % b.slot_interval_minutes = 0
  ) then
    raise exception using errcode = 'P0001', message = 'outsideWorkingHours';
  end if;
end $$;
revoke execute on function agendo.assert_bookable(uuid, timestamptz, timestamptz) from public, anon, authenticated;

create or replace function agendo.book_appointment(p_service_id uuid, p_professional_id uuid, p_starts_at timestamptz)
returns agendo.appointments
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_service agendo.services;
  v_row agendo.appointments;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'unauthorized';
  end if;
  if not exists (select 1 from agendo.profiles where id = v_uid) then
    raise exception using errcode = 'P0001', message = 'forbidden';
  end if;

  select * into v_service from agendo.services where id = p_service_id and is_active;
  if not found then
    raise exception using errcode = 'P0001', message = 'notFound';
  end if;

  if not exists (
    select 1 from agendo.professionals p
    join agendo.professional_services ps on ps.professional_id = p.id
    where p.id = p_professional_id and p.is_active and ps.service_id = p_service_id
  ) then
    raise exception using errcode = 'P0001', message = 'validation';
  end if;

  perform agendo.assert_bookable(
    p_professional_id, p_starts_at, p_starts_at + make_interval(mins => v_service.duration_minutes));

  -- The EXCLUDE constraints resolve races and raise 23P01.
  insert into agendo.appointments (client_id, professional_id, service_id, starts_at, ends_at)
  values (v_uid, p_professional_id, p_service_id, p_starts_at,
          p_starts_at + make_interval(mins => v_service.duration_minutes))
  returning * into v_row;
  return v_row;
end $$;

create or replace function agendo.cancel_appointment(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_apt agendo.appointments;
  v_limit int;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'unauthorized';
  end if;
  select * into v_apt from agendo.appointments where id = p_id for update;
  if not found or (v_apt.client_id <> v_uid and not agendo.is_admin()) then
    raise exception using errcode = 'P0001', message = 'notFound';
  end if;
  if v_apt.status <> 'booked' then
    raise exception using errcode = 'P0001', message = 'validation';
  end if;
  select cancel_limit_hours into v_limit from agendo.business limit 1;
  if v_apt.starts_at - now() < make_interval(hours => v_limit) then
    raise exception using errcode = 'P0001', message = 'cancellationWindowClosed';
  end if;
  update agendo.appointments set status = 'cancelled', cancelled_at = now() where id = p_id;
end $$;

create or replace function agendo.reschedule_appointment(p_id uuid, p_new_starts_at timestamptz)
returns agendo.appointments
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_apt agendo.appointments;
  v_duration int;
  v_limit int;
  v_new_end timestamptz;
  v_row agendo.appointments;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'unauthorized';
  end if;
  select * into v_apt from agendo.appointments where id = p_id for update;
  if not found or v_apt.client_id <> v_uid then
    raise exception using errcode = 'P0001', message = 'notFound';
  end if;
  if v_apt.status <> 'booked' then
    raise exception using errcode = 'P0001', message = 'validation';
  end if;
  select cancel_limit_hours into v_limit from agendo.business limit 1;
  if v_apt.starts_at - now() < make_interval(hours => v_limit) then
    raise exception using errcode = 'P0001', message = 'cancellationWindowClosed';
  end if;

  select duration_minutes into v_duration from agendo.services where id = v_apt.service_id;
  v_new_end := p_new_starts_at + make_interval(mins => v_duration);
  perform agendo.assert_bookable(v_apt.professional_id, p_new_starts_at, v_new_end);

  -- Single atomic update: the EXCLUDE constraint does not clash with the row itself.
  update agendo.appointments
    set starts_at = p_new_starts_at, ends_at = v_new_end, reminder_sent_at = null
    where id = p_id
    returning * into v_row;
  return v_row;
end $$;

-- Realtime Broadcast from the database (payload has no personal data; private channels).
create or replace function agendo.broadcast_appointment_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_payload jsonb := jsonb_build_object('professional_id', new.professional_id, 'appointment_id', new.id);
begin
  perform realtime.send(v_payload, 'appointment_changed', 'agendo:availability:' || new.professional_id::text, true);
  perform realtime.send(v_payload, 'appointment_changed', 'agendo:agenda', true);
  return null;
end $$;

create trigger appointments_broadcast
after insert or update of starts_at, ends_at, status on agendo.appointments
for each row execute function agendo.broadcast_appointment_change();

-- Execute privileges: Postgres grants EXECUTE to PUBLIC by default, so revoke and grant explicitly.
revoke execute on function
  agendo.ensure_profile(text),
  agendo.get_busy_ranges(uuid, timestamptz, timestamptz),
  agendo.book_appointment(uuid, uuid, timestamptz),
  agendo.cancel_appointment(uuid),
  agendo.reschedule_appointment(uuid, timestamptz)
from public, anon;
grant execute on function
  agendo.ensure_profile(text),
  agendo.get_busy_ranges(uuid, timestamptz, timestamptz),
  agendo.book_appointment(uuid, uuid, timestamptz),
  agendo.cancel_appointment(uuid),
  agendo.reschedule_appointment(uuid, timestamptz)
to authenticated;
revoke execute on function
  agendo.set_updated_at(),
  agendo.prevent_role_change(),
  agendo.broadcast_appointment_change()
from public, anon, authenticated;
