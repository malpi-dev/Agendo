# Fase 04 · Backend local (Supabase)

**Rama:** `feat/fase-04-backend-local`
**Objetivo:** schema `agendo` completo en Supabase local: tablas, restricciones `EXCLUDE`, RLS comentado, RPCs,
triggers de Realtime, seed con datos de demo y tests pgTAP. Tipos TypeScript generados.
**Referencias:** definición §6.2 (reglas), §7 completo, §12.2 (datos de demo), §13 (tests de BD) ·
`CLAUDE.md` sección "Backend: Supabase" y "Convenciones del proyecto Supabase compartido".
**Requisitos previos:** fase 03 terminada · Docker Desktop abierto · `supabase --version` funciona.

> Todo se hace **en local**. No toques el proyecto remoto en esta fase (eso es la fase 13).
> **Nunca** uses `supabase db push` ni `supabase link` contra el proyecto compartido.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1. Comprueba Docker: `docker info` debe responder. Si no: **🙋 Acción del autor** (abrir Docker Desktop).

## Paso 1 · Inicializar Supabase

```bash
supabase init            # crea supabase/config.toml (responde "no" a generar settings de VS Code/Deno si pregunta)
```

Edita `supabase/config.toml`:

```toml
[api]
schemas = ["public", "graphql_public", "agendo"]
extra_search_path = ["public", "extensions", "agendo"]

[db.seed]
enabled = true
sql_paths = ["./seed/01_catalog.sql", "./seed/02_demo_data.sql"]

[auth]
enable_signup = true

[auth.email]
enable_signup = true
enable_confirmations = true
otp_length = 6
otp_expiry = 3600

# Local-only templates (Mailpit). The remote project keeps its shared template (see CLAUDE.md).
[auth.email.template.confirmation]
subject = "Your verification code"
content_path = "./supabase/templates/otp.html"

[auth.email.template.magic_link]
subject = "Your verification code"
content_path = "./supabase/templates/otp.html"
```

- Respeta los nombres de claves que traiga tu versión de la CLI (si alguna no existe, revisa el `config.toml`
  generado y la documentación de la CLI; anota diferencias en la bitácora).
- `supabase/templates/otp.html`: HTML mínimo, neutro, en inglés: `<h2>Your verification code</h2><p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p><p>It expires in 1 hour. If you didn't request it, ignore this email.</p>`.

```bash
supabase start           # primera vez tarda (descarga imágenes). Anota las URLs y claves que imprime.
```

## Paso 2 · IDs estables (compartidos por el seed y los fixtures del modo demo)

Usa **exactamente** estos UUID (la fase 05 los reutiliza en TypeScript):

| Entidad | UUID |
|---|---|
| Business "Northside Barber Co." | `00000000-0000-4000-8000-000000000001` |
| Marco · Lena · Sam | `…000000000101` · `…000000000102` · `…000000000103` |
| Classic haircut · Skin fade · Beard trim · Haircut + beard · Hot towel shave · Kids cut | `…000000000201` … `…000000000206` (en ese orden) |
| `client@agendo.dev` ("Casey Morgan", usuario demo) | `…000000000301` |
| `admin@agendo.dev` ("Nora Blake", admin) | `…000000000302` |
| Clientes ficticios: Alex Rivera, Priya Shah, Diego Morales, Hannah Lee, Omar Haddad, Sofia Rossi, Liam Carter, Mei Chen | `…000000000311` … `…000000000318` (en ese orden) |

(`…` = `00000000-0000-4000-8000-`. Son UUID v4 válidos para zod.)

## Paso 3 · Migración 1: schema

```bash
supabase migration new agendo_schema
```

Contenido (completa lo marcado con `…`):

```sql
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
create unique index business_single_row on agendo.business ((true));

create table agendo.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  role agendo.user_role not null default 'client',
  created_at timestamptz not null default now()
);

create table agendo.services ( … id, name, description text not null default '', duration_minutes int check (between 5 and 480),
  price_cents int check (>= 0), is_active bool default true, sort_order int default 0 … );
create table agendo.professionals ( … id, name, bio text not null default '', avatar_url text, is_active bool default true … );
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

-- Expanded read model; security_invoker = true so RLS of the caller applies.
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
```

## Paso 4 · Migración 2: RLS

```bash
supabase migration new agendo_rls
```

Reglas: RLS en **las 8 tablas**; **cada política lleva un comentario `--` encima** que diga qué protege (en inglés,
como el resto del SQL). Usa `(select auth.uid())` (con `select`, mejor rendimiento).

```sql
create or replace function agendo.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from agendo.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke execute on function agendo.is_admin() from public, anon;
grant execute on function agendo.is_admin() to authenticated;

alter table agendo.business enable row level security;
-- … enable RLS on profiles, services, professionals, professional_services, working_hours, appointments, push_tokens

-- Business info is public (also used by the keep-alive ping with the publishable key). No write policies.
create policy business_read_all on agendo.business for select to anon, authenticated using (true);

-- Catalog is visible to signed-in users only. No write policies: data comes from migrations/seed.
create policy services_read_authenticated on agendo.services for select to authenticated using (true);
-- … same for professionals, professional_services, working_hours

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
```

Anota en la bitácora que esta migración toca `realtime.messages` (fuera del schema `agendo`) con nombres prefijados,
como exige la convención del proyecto compartido.

## Paso 5 · Migración 3: RPCs y triggers

```bash
supabase migration new agendo_rpc
```

Reglas para **todas** las funciones: `set search_path = ''`, nombres totalmente calificados (`agendo.x`,
`pg_catalog.now()` no hace falta, `now()` está bien), y después de crearlas:
`revoke execute on function … from public, anon;` + `grant execute on function … to authenticated;`
(Postgres da `EXECUTE` a `PUBLIC` por defecto). Los errores de negocio se lanzan así:

```sql
raise exception using errcode = 'P0001', message = 'outsideWorkingHours';
```

con `message` = uno de: `unauthorized`, `forbidden`, `notFound`, `validation`, `outsideWorkingHours`,
`bookingWindow`, `cancellationWindowClosed` (coinciden con `BUSINESS_ERROR_CODES` de la fase 02).

| Función | Implementación |
|---|---|
| `agendo.set_updated_at()` | Trigger `before update` en `appointments` y `push_tokens`: `new.updated_at = now()`. |
| `agendo.prevent_role_change()` | Trigger `before update` en `profiles`: si `new.role is distinct from old.role` y `coalesce(auth.role(), '') in ('authenticated','anon')` → `forbidden`. (Desde `psql`/service role sí se permite.) |
| `agendo.ensure_profile(p_full_name text) returns agendo.profiles` | `security definer`. Sin `auth.uid()` → `unauthorized`. `insert … (id, full_name) values (auth.uid(), trim(p_full_name)) on conflict (id) do nothing;` y devuelve la fila. Idempotente; nunca cambia el rol. |
| `agendo.get_busy_ranges(p_professional_id uuid, p_from timestamptz, p_to timestamptz) returns table (starts_at timestamptz, ends_at timestamptz)` | `security definer`, `stable`, `language sql`. Solo citas `booked` con `during && tstzrange(p_from, p_to, '[)')`. **Solo esas dos columnas.** |
| `agendo.assert_bookable(p_professional_id uuid, p_starts_at timestamptz, p_ends_at timestamptz)` | Helper interno (**sin** `grant` a `authenticated`). Ver pseudocódigo abajo. |
| `agendo.book_appointment(p_service_id uuid, p_professional_id uuid, p_starts_at timestamptz) returns agendo.appointments` | `security definer`. Sin sesión → `unauthorized`; sin perfil → `forbidden`; servicio inexistente/inactivo → `notFound`; profesional inactivo o no ofrece el servicio → `validation`. `ends_at = p_starts_at + duración`. Llama a `assert_bookable`. Inserta con `client_id = auth.uid()`. El `EXCLUDE` resuelve la carrera (propaga `23P01`). Devuelve la fila. |
| `agendo.cancel_appointment(p_id uuid) returns void` | `security definer`. `select … for update`. No existe o no es del usuario (y no es admin) → `notFound`. `status <> 'booked'` → `validation`. `starts_at - now() < cancel_limit_hours` → `cancellationWindowClosed`. `update set status = 'cancelled', cancelled_at = now()`. |
| `agendo.reschedule_appointment(p_id uuid, p_new_starts_at timestamptz) returns agendo.appointments` | `security definer`. Igual que cancelar para propiedad (solo el dueño), estado y ventana (sobre la hora **actual**). Calcula el nuevo `ends_at` con la duración del servicio; `assert_bookable` sobre la nueva hora; **un único** `update … set starts_at, ends_at, reminder_sent_at = null` (atómico; el `EXCLUDE` no choca consigo misma). Devuelve la fila. |
| `agendo.broadcast_appointment_change()` | Trigger `after insert or update of starts_at, ends_at, status` en `appointments`, `security definer`. Ver código abajo. |

Pseudocódigo de `assert_bookable` (debe dar el mismo resultado que `getAvailableSlots` de la fase 03):

```sql
declare
  b agendo.business;
  v_local_start timestamp;
  v_local_end timestamp;
begin
  select * into b from agendo.business limit 1;
  v_local_start := p_starts_at at time zone b.timezone;
  v_local_end   := p_ends_at   at time zone b.timezone;

  -- rule 6: minimum notice and maximum advance (in business-local days)
  if p_starts_at < now() + make_interval(mins => b.min_notice_minutes)
     or v_local_start::date >= (now() at time zone b.timezone)::date + b.max_advance_days then
    raise exception using errcode = 'P0001', message = 'bookingWindow';
  end if;

  -- rules 4 and 5: fits inside one working block of that weekday and is aligned to the slot interval
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
end;
```

Trigger de Realtime (Broadcast desde la BD, payload sin datos personales):

```sql
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
```

(El cuarto argumento `true` = canal privado. Verifica la firma de `realtime.send` en tu versión local con
`\df realtime.send` en `psql`; si difiere, adapta y anótalo.)

Ejecuta `supabase db reset` después de cada migración para detectar errores pronto.

## Paso 6 · Seed

Crea `supabase/seed/01_catalog.sql` (se aplicará también en remoto) y `supabase/seed/02_demo_data.sql` (solo local).
Todos los `insert` con los IDs del Paso 2 y `on conflict do nothing` para poder reejecutarlos.

**`01_catalog.sql`** — negocio, profesionales, servicios, relaciones y horarios:

| Servicio | Duración | Precio (cents) | sort_order | Lo ofrecen |
|---|---|---|---|---|
| Classic haircut | 30 | 2000 | 1 | Marco, Lena |
| Skin fade | 45 | 2800 | 2 | Marco, Lena |
| Beard trim | 20 | 1200 | 3 | Marco, Sam |
| Haircut + beard | 60 | 3500 | 4 | Marco, Sam |
| Hot towel shave | 30 | 2200 | 5 | Sam |
| Kids cut | 25 | 1500 | 6 | Marco, Lena |

- Negocio: "Northside Barber Co.", `America/Mexico_City`, `USD`, reglas por defecto.
- Bios cortas en inglés (Marco: cuts and beards; Lena: color and cuts; Sam: beard and shaves). `avatar_url` nulo.
- Descripción corta de cada servicio en inglés.
- Horarios: lunes a viernes (1–5) `09:00–13:00` y `14:00–19:00`; sábado (6) `10:00–16:00`; domingo cerrado.
  **Sam no trabaja los lunes.**

**`02_demo_data.sql`** — usuarios, perfiles y citas:

1. `auth.users` para los 10 usuarios del Paso 2. Inserta las columnas que GoTrue necesita para que el login por OTP
   funcione con un usuario existente: `instance_id = '00000000-0000-0000-0000-000000000000'`, `id`, `aud = 'authenticated'`,
   `role = 'authenticated'`, `email`, `encrypted_password = ''`, `email_confirmed_at = now()`, `created_at`, `updated_at`,
   `raw_app_meta_data = '{"provider":"email","providers":["email"]}'`, `raw_user_meta_data = '{}'`, y los tokens de
   texto vacíos (`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change` = `''`).
   Inserta también la fila correspondiente en `auth.identities` (`provider = 'email'`, `provider_id = id::text`,
   `identity_data = jsonb_build_object('sub', id::text, 'email', email)`, fechas). Revisa las columnas reales con
   `\d auth.identities` en `psql` si algo falla.
2. `agendo.profiles` para los 10 (Nora Blake con `role = 'admin'`; el resto `client`).
3. Citas con fechas **relativas a hoy** en la zona `America/Mexico_City`, dentro de un único bloque `do $$ … $$`
   (no crees funciones `pg_temp`). Algoritmo (la fase 05 lo replica en TypeScript, **debe ser idéntico**):

   - `today` = fecha local de hoy. Para cada día `d` de `today − 7` a `today + 7`, **saltando domingos**:
     - Si `d = today`: Marco 10:00 Classic haircut · Marco 15:00 Skin fade · Lena 11:00 Skin fade ·
       Lena 16:30 Kids cut (**no** si es sábado) · Sam 12:00 Beard trim (**no** si es lunes).
     - Si `d ≠ today`: Marco 10:00 Classic haircut · Lena 15:00 Skin fade.
     - Cliente: los 8 ficticios en rotación (Alex, Priya, Diego, …) en el orden en que se generan las citas.
     - Estado: de las citas de días `≠ today`, **una de cada cuatro** (la 4.ª, 8.ª, …, contando en orden de
       generación) queda `cancelled` con `cancelled_at = starts_at - interval '1 day'`; el resto `booked`.
   - Citas de Casey Morgan (usuario demo), usando "n-ésimo día laborable lunes–viernes" desde hoy (sin contar hoy):
     +1 → Marco 17:00 Beard trim · +3 → Lena 12:00 Classic haircut · −1 → Marco 12:00 Classic haircut ·
     −3 → Lena 17:00 Skin fade · −5 → Marco 11:00 Kids cut (`cancelled`). Todas las demás `booked`.
   - `starts_at = (d + time) at time zone 'America/Mexico_City'`; `ends_at = starts_at + duración del servicio`.
   - Deja `reminder_sent_at = now()` en las citas pasadas para que el cron de la fase 10 no las procese.

   Si hoy es domingo, "hoy" no tiene citas (el negocio cierra): es correcto.

Comprueba: `supabase db reset` sin errores y, en Studio (`http://127.0.0.1:54323`), ~30–40 citas en `agendo.appointments`.

## Paso 7 · Tests pgTAP

`supabase/tests/agendo.test.sql` (`supabase test db` ejecuta los archivos de `supabase/tests/`):

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);   -- adjust to the real number of tests
-- … tests …
select * from finish();
rollback;
```

Para ejecutar como un usuario autenticado:

```sql
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated"}';
-- … queries as Casey …
reset role;
```

Prepara datos propios dentro del test (un profesional de prueba con bloques `00:00–23:45` los 7 días y un servicio
de 30 min) para no depender de la hora actual. Hora válida de referencia:
`((now() at time zone 'America/Mexico_City')::date + 1 + time '10:00') at time zone 'America/Mexico_City'`.

Casos mínimos:

1. Las 8 tablas existen (`has_table`).
2. Ninguna tabla de `agendo` tiene RLS desactivado (`pg_tables.rowsecurity`).
3. Dos citas `booked` solapadas del mismo profesional → `throws_ok(…, '23P01')`.
4. Citas contiguas `[10:00,10:30)` y `[10:30,11:00)` → `lives_ok`.
5. Tras cancelar una, se puede reservar ese hueco → `lives_ok`.
6. Mismo cliente, dos profesionales, horas solapadas → `23P01` (constraint de cliente).
7. Como Casey: `select count(*) from agendo.appointments where client_id <> auth.uid()` = 0.
8. Como Nora (admin): ve citas de otros clientes (> 0).
9. Como Casey: `update agendo.profiles set role = 'admin'` → falla.
10. Como Casey: `insert into agendo.profiles …` → falla (`42501`).
11. Como Casey: `insert into agendo.appointments …` → falla (`42501`).
12. Como Casey: `get_busy_ranges` del profesional de prueba devuelve la cita de otro cliente (solo `starts_at`, `ends_at`).
13. Como Casey: `book_appointment` en la hora de referencia → `lives_ok` y la fila tiene `client_id` de Casey.
14. `book_appointment` fuera de horario del profesional real (p. ej. Marco un domingo) → `P0001` `outsideWorkingHours`.
15. `book_appointment` dentro de 30 min → `P0001` `bookingWindow`.
16. `book_appointment` a una hora no alineada (10:07) → `outsideWorkingHours`.
17. `cancel_appointment` de una cita que empieza en 1 hora → `cancellationWindowClosed`.
18. `ensure_profile` dos veces → misma fila, rol `client`.
19. `reschedule_appointment` a un hueco ocupado → `23P01`; a uno libre → cambia `starts_at` y conserva el `id`.

```bash
supabase db reset && supabase test db
```

## Paso 8 · Tipos generados

```bash
supabase gen types typescript --local --schema agendo > src/core/supabase/database.generated.ts
```

- Script en `package.json`: `"db:types": "supabase gen types typescript --local --schema agendo > src/core/supabase/database.generated.ts"`.
- Añade `src/core/supabase/database.generated.ts` a los `ignores` de ESLint (Prettier ya ignora `*.generated.ts`).
- Tipa el cliente: `createClient<Database>(…)` y el tipo de retorno de `getSupabaseClient()` con el schema `agendo`
  (revisa los genéricos de la versión instalada de supabase-js).
- Commitea el archivo generado (el CI no tiene Docker).

## Paso 9 · `.env` local

`supabase status` muestra la URL (`http://127.0.0.1:54321`) y la publishable key local. Actualiza tu `.env`
(no commiteado) con esos valores. En un **emulador Android**, `127.0.0.1` es el propio emulador: usa
`http://10.0.2.2:54321`; en un teléfono físico, la IP LAN del Mac. Documenta esto en `.env.example` (comentario).

## Paso 10 · Cierre

`00-guia-general.md` §3.3, incluyendo `supabase db reset && supabase test db`.

---

## Criterios de terminado

- [ ] 3 migraciones (`agendo_schema`, `agendo_rls`, `agendo_rpc`) que solo tocan `agendo` (y `realtime.messages` con políticas prefijadas).
- [ ] RLS activo en las 8 tablas; cada política con comentario; sin políticas de escritura en `appointments` ni de insert en `profiles`.
- [ ] Todas las funciones con `search_path = ''`, `execute` revocado a `public`/`anon` y concedido solo a `authenticated` (salvo `assert_bookable`).
- [ ] Seed dividido en `01_catalog.sql` y `02_demo_data.sql` con los IDs estables y el algoritmo de citas exacto.
- [ ] `supabase db reset` y `supabase test db` pasan (≥ 18 tests).
- [ ] Tipos generados en `database.generated.ts` y cliente tipado.
- [ ] Login OTP local probado a mano: `signInWithOtp` a `client@agendo.dev` llega a Mailpit (`http://127.0.0.1:54324`) con un código de 6 dígitos (puedes probarlo con `curl` a `/auth/v1/otp` o esperar a la fase 07; anótalo).
- [ ] lint/typecheck/test en verde; PR mergeado; bitácora actualizada.
