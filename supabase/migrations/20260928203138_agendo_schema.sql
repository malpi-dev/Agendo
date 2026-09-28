-- Agendo schema: tables, constraints, indexes and grants. Only touches the "agendo" schema.
create schema if not exists agendo;
create extension if not exists btree_gist with schema extensions;

create type agendo.user_role as enum ('client', 'admin');
create type agendo.appointment_status as enum ('booked', 'cancelled', 'completed', 'no_show');

create table agendo.business (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null,
  currency char(3) not null,
  slot_interval_minutes int not null default 15 check (slot_interval_minutes > 0),
  min_notice_minutes int not null default 60 check (min_notice_minutes >= 0),
  max_advance_days int not null default 30 check (max_advance_days > 0),
  cancel_limit_hours int not null default 2 check (cancel_limit_hours >= 0),
  reminder_lead_minutes int not null default 120 check (reminder_lead_minutes > 0)
);
-- Exactly one business row.
create unique index business_single_row on agendo.business ((true));

create table agendo.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  role agendo.user_role not null default 'client',
  created_at timestamptz not null default now()
);

create table agendo.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  duration_minutes int not null check (duration_minutes between 5 and 480),
  price_cents int not null check (price_cents >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table agendo.professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text not null default '',
  avatar_url text,
  is_active boolean not null default true
);

create table agendo.professional_services (
  professional_id uuid not null references agendo.professionals (id) on delete cascade,
  service_id uuid not null references agendo.services (id) on delete cascade,
  primary key (professional_id, service_id)
);

create table agendo.working_hours (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references agendo.professionals (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  -- blocks of the same professional and weekday must not overlap
  constraint working_hours_no_overlap exclude using gist (
    professional_id with =,
    weekday with =,
    tsrange('2000-01-01'::date + start_time, '2000-01-01'::date + end_time) with &&
  )
);

create table agendo.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references agendo.profiles (id) on delete cascade,
  professional_id uuid not null references agendo.professionals (id),
  service_id uuid not null references agendo.services (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  during tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  status agendo.appointment_status not null default 'booked',
  reminder_sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Core guarantee: a professional can never have two overlapping booked appointments (race-proof).
alter table agendo.appointments add constraint appointments_no_double_booking
  exclude using gist (professional_id with =, during with &&) where (status = 'booked');
-- A client can never have two overlapping booked appointments.
alter table agendo.appointments add constraint appointments_no_client_overlap
  exclude using gist (client_id with =, during with &&) where (status = 'booked');

create index appointments_professional_starts_idx on agendo.appointments (professional_id, starts_at);
create index appointments_client_starts_idx on agendo.appointments (client_id, starts_at);
create index appointments_pending_reminders_idx on agendo.appointments (starts_at)
  where status = 'booked' and reminder_sent_at is null;

create table agendo.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references agendo.profiles (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);

-- Expanded read model; security_invoker = true so the RLS of the caller applies.
create view agendo.appointments_expanded with (security_invoker = true) as
select a.id, a.client_id, a.professional_id, a.service_id, a.starts_at, a.ends_at, a.status,
       a.created_at, a.cancelled_at,
       s.name as service_name, p.name as professional_name, pr.full_name as client_name
from agendo.appointments a
join agendo.services s on s.id = a.service_id
join agendo.professionals p on p.id = a.professional_id
left join agendo.profiles pr on pr.id = a.client_id;

-- Grants: custom schemas get nothing by default. Minimum privileges; RLS does the row filtering.
grant usage on schema agendo to anon, authenticated, service_role;
grant select on agendo.business to anon, authenticated;
grant select on agendo.services, agendo.professionals, agendo.professional_services, agendo.working_hours to authenticated;
grant select on agendo.profiles to authenticated;
grant update (full_name) on agendo.profiles to authenticated;
grant select on agendo.appointments, agendo.appointments_expanded to authenticated;
grant select, insert, update, delete on agendo.push_tokens to authenticated;
grant all on all tables in schema agendo to service_role;
grant usage on all sequences in schema agendo to service_role;
