-- Row Level Security for every table of the agendo schema.
create or replace function agendo.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from agendo.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke execute on function agendo.is_admin() from public, anon;
grant execute on function agendo.is_admin() to authenticated;

alter table agendo.business enable row level security;
alter table agendo.profiles enable row level security;
alter table agendo.services enable row level security;
alter table agendo.professionals enable row level security;
alter table agendo.professional_services enable row level security;
alter table agendo.working_hours enable row level security;
alter table agendo.appointments enable row level security;
alter table agendo.push_tokens enable row level security;

-- Business info is public (also used by the keep-alive ping with the publishable key). No write policies.
create policy business_read_all on agendo.business for select to anon, authenticated using (true);

-- Catalog is visible to signed-in users only. No write policies: data comes from migrations/seed.
create policy services_read_authenticated on agendo.services for select to authenticated using (true);
-- Same rule for professionals.
create policy professionals_read_authenticated on agendo.professionals for select to authenticated using (true);
-- Same rule for the professional <-> service relation.
create policy professional_services_read_authenticated on agendo.professional_services for select to authenticated using (true);
-- Same rule for working hours.
create policy working_hours_read_authenticated on agendo.working_hours for select to authenticated using (true);

-- A user sees only their own profile; admins see all (needed for client names in the agenda).
create policy profiles_read_own_or_admin on agendo.profiles for select to authenticated
  using (id = (select auth.uid()) or (select agendo.is_admin()));
-- A user may update only their own profile (column grant limits it to full_name; a trigger blocks role changes).
create policy profiles_update_own on agendo.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- No insert policy on purpose: profiles are created only through agendo.ensure_profile().

-- Clients see only their own appointments; admins see all. No insert/update/delete policies: changes go through RPCs.
create policy appointments_read_own_or_admin on agendo.appointments for select to authenticated
  using (client_id = (select auth.uid()) or (select agendo.is_admin()));

-- Each user manages only their own push tokens.
create policy push_tokens_own on agendo.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Realtime (global "realtime" schema, shared by all apps): policy names are prefixed with agendo_
-- and only match agendo:* topics.
-- Any signed-in user may receive availability events (payload has no personal data).
create policy agendo_availability_broadcast_read on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and (select realtime.topic()) like 'agendo:availability:%');
-- Only admins may receive agenda events.
create policy agendo_agenda_broadcast_read on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and (select realtime.topic()) = 'agendo:agenda' and (select agendo.is_admin()));
