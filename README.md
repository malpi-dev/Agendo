# Agendo

Appointment booking for barbershops, clinics and studios: pick a professional, a day and a free slot, and watch the schedule update live.

[![CI](https://github.com/malpi-dev/Agendo/actions/workflows/ci.yml/badge.svg)](https://github.com/malpi-dev/Agendo/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/malpi-dev/Agendo?include_prereleases&label=release)](https://github.com/malpi-dev/Agendo/releases)
![Platform: Android](https://img.shields.io/badge/platform-Android-3DDC84)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

<!-- TODO(assets): replace this block with docs/media/demo.gif (15-30 s: booking + a slot disappearing live). -->
<!-- TODO(assets): add 3-4 screenshots (light and dark) from docs/media/. See docs/runbook-lanzamiento.md, "Assets pendientes". -->

> **Demo GIF and screenshots: coming with the first release.**

## Try it

- **Android APK:** [latest GitHub Release](https://github.com/malpi-dev/Agendo/releases/latest) (available from `v1.0.0`).
- Tap **Explore demo** on the sign-up screen to skip account creation. The demo runs entirely on in-memory mock repositories, so it works even if the backend is paused. You can switch between **Client** and **Admin** from Settings.

## Features

- **Auth:** email + 6-digit one-time code (no passwords, no magic links, no deep links), onboarding for the display name.
- **Service catalog:** active services with duration and price formatted in the business currency.
- **Booking:** professional, then day, then an available slot, with a confirmation summary in the business time zone.
- **My appointments:** upcoming and past lists, cancel and atomic reschedule within the allowed window.
- **Push reminders:** one reminder per booked appointment (2 h before by default), tapping it opens the appointment.
- **Admin agenda:** the day's appointments grouped by professional, updated in real time.
- **Live availability:** a slot booked on another device disappears from the list within seconds.
- **Extras:** demo mode, light/dark/system theme, loading/empty/error states on every screen.

## Tech stack

| Area                        | Choice                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------- |
| App                         | Expo SDK 57, React Native 0.86, Expo Router, TypeScript (`strict`)                  |
| Server state / client state | TanStack Query / Zustand                                                            |
| Forms and validation        | React Hook Form + zod                                                               |
| Styling and lists           | NativeWind, FlashList                                                               |
| Backend                     | Supabase: Postgres, Auth (email OTP), Realtime Broadcast, Edge Functions, `pg_cron` |
| Tests                       | Jest + React Native Testing Library, pgTAP (database), Maestro (E2E)                |
| Build and CI                | EAS Build (APK), GitHub Actions, ESLint + Prettier                                  |

## Architecture

Feature-based Clean Architecture in three layers. Dependencies point towards `domain`.

```mermaid
flowchart LR
  P[presentation<br/>screens, components, hooks] --> D[domain<br/>models, repository interfaces, use cases]
  A[data<br/>supabase-* and mock-* repositories] --> D
  P --> C[core<br/>config, theme, errors, DI, Supabase client]
  A --> C
```

```
src/
  core/                  config, Supabase client, theme, typed errors, DI, UI kit
  features/<feature>/
    domain/              pure models + repository interface (framework-free, enforced by ESLint)
    data/                supabase-*-repository and mock-*-repository (+ mappers)
    presentation/        screens, components, hooks
```

- **Interchangeable repositories.** Every repository has a `supabase` and a `mock` implementation behind the same interface. The UI never talks to Supabase directly; `core/di` decides which set to provide. Tests and **demo mode** use the mocks, so the app is fully usable without a backend.
- **Typed errors.** Repositories throw `DomainError` (discriminated union by `code`), never raw SDK errors.
- **Real logic lives in use cases.** `getAvailableSlots` is a pure, heavily tested function (working hours, service duration, busy ranges, slot interval, minimum notice, time zone). The database enforces the same rules in `assert_bookable`, so the client is never the only guard.

## Backend

Agendo uses a **shared Supabase project** (one schema per app): everything lives in the `agendo` schema, and shared resources are prefixed `agendo-` / `agendo:` / `AGENDO_`. Migrations are applied with `psql`, not `supabase db push`, because the migration history is shared between apps.

### Tables (`agendo` schema)

| Table                          | Purpose                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `business`                     | Single row: name, time zone, currency, slot interval, notice/advance/cancel/reminder rules             |
| `profiles`                     | One per user (`client` or `admin`); created via `ensure_profile()`, never by a trigger on `auth.users` |
| `services`                     | Bookable services (duration, price, sort order, active flag)                                           |
| `professionals`                | People who take appointments                                                                           |
| `professional_services`        | Which professional offers which service                                                                |
| `working_hours`                | Weekly blocks per professional (no overlapping blocks per day)                                         |
| `appointments`                 | Bookings, with a generated `during` range and `reminder_sent_at`                                       |
| `push_tokens`                  | Expo push tokens per user                                                                              |
| `appointments_expanded` (view) | Read model joined with names; `security_invoker`, so RLS applies                                       |

### Double booking is impossible

Enforced by Postgres, not by the client (race-proof, even with two phones tapping at the same time):

```sql
alter table agendo.appointments add constraint appointments_no_double_booking
  exclude using gist (professional_id with =, during with &&) where (status = 'booked');
alter table agendo.appointments add constraint appointments_no_client_overlap
  exclude using gist (client_id with =, during with &&) where (status = 'booked');
```

### Row Level Security

RLS is enabled on every table. Every policy is commented in `supabase/migrations/20260928203140_agendo_rls.sql`.

| Policy                                                                             | What it protects                                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `business_read_all`                                                                | Business info is public (also used by the keep-alive ping). No write policies.                                |
| `services_/professionals_/professional_services_/working_hours_read_authenticated` | Catalog is readable by signed-in users only; no writes from the API.                                          |
| `profiles_read_own_or_admin`                                                       | Users see only their own profile; admins see all (client names in the agenda).                                |
| `profiles_update_own`                                                              | Users update only their own row; a column grant limits it to `full_name` and a trigger blocks `role` changes. |
| `appointments_read_own_or_admin`                                                   | Clients see their own appointments; admins see all. Writes go through RPCs only.                              |
| `push_tokens_own`                                                                  | Each user manages only their own tokens.                                                                      |
| `agendo_availability_broadcast_read`                                               | Any signed-in user may receive `agendo:availability:*` events (no personal data).                             |
| `agendo_agenda_broadcast_read`                                                     | Only admins may receive the `agendo:agenda` topic.                                                            |

### RPCs, Realtime and cron

- **RPCs** (`security definer`, explicit `execute` grants): `ensure_profile`, `get_busy_ranges` (busy times without personal data), `book_appointment`, `cancel_appointment`, `reschedule_appointment` (single atomic `UPDATE`), plus the internal `assert_bookable`. Business errors are raised as `P0001` with the `DomainError` code as message.
- **Realtime:** a trigger on `appointments` calls `realtime.send(...)` on private channels `agendo:availability:<professional_id>` and `agendo:agenda`. **Broadcast from the database** is used instead of `postgres_changes` so that payloads carry no personal data and RLS-style authorization is applied per topic (`realtime.messages` policies), avoiding one subscription filter per row.
- **Reminders:** `pg_cron` job `agendo-reminders` (every 5 minutes) calls the Edge Function `agendo-send-reminders` through `pg_net`, authenticated with an `x-cron-secret` header stored in Vault. The function calls `agendo.claim_due_reminders()`, which marks reminders as sent and returns them in one statement, so overlapping runs never send twice, then pushes through the Expo Push API.
- **Edge Function:** `supabase/functions/agendo-send-reminders` (deployed with `--no-verify-jwt`; secrets `AGENDO_EXPO_ACCESS_TOKEN`, `AGENDO_REMINDERS_CRON_SECRET`).

### Shared project notes

- **Keep-alive:** free Supabase projects pause after 7 days of inactivity. `.github/workflows/keep-alive.yml` runs a lightweight read every 3 days (and on demand).
- **GitHub disables scheduled workflows after 60 days without repository activity.** If the keep-alive stops running, push any commit or re-enable it in the _Actions_ tab (or run `gh workflow enable keep-alive.yml`), then trigger it once with `gh workflow run keep-alive.yml`.

## Getting started

Requirements: Node 22+ (developed on 24), npm, Android Studio emulator or a phone. For the backend: Docker and the [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
npm install
cp .env.example .env
```

### Without a backend (mock data)

Set `EXPO_PUBLIC_DATA_SOURCE=mock` in `.env` (or leave the Supabase variables empty). The app starts straight in demo mode.

```bash
npx expo start
```

### With local Supabase

```bash
supabase start
supabase db reset          # migrations + seeds (catalog, demo data, local Vault secrets)
```

Set in `.env` the URL and publishable key printed by `supabase start`, and `EXPO_PUBLIC_DATA_SOURCE=supabase`. The URL depends on the device: Android emulator `http://10.0.2.2:54321` (127.0.0.1 is the emulator itself), iOS simulator `http://127.0.0.1:54321`, physical phone `http://<your Mac LAN IP>:54321`.

Sign-in codes are captured by Mailpit at <http://127.0.0.1:54324>. To test the admin agenda, promote your user locally:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -c "update agendo.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');"
```

### Push notifications need a development build

Expo Go does not include remote push. Provide your Firebase file as `google-services.json` at the repo root (git-ignored) and run:

```bash
npx expo run:android --device
```

The Edge Function can be served locally with `supabase functions serve --env-file supabase/functions/.env` (see `supabase/functions/.env.example`).

## Testing

```bash
npm run lint            # ESLint, zero warnings allowed
npm run typecheck       # tsc --noEmit
npm run format:check    # Prettier
npm test                # Jest + RNTL (domain, repositories, hooks, screens)
supabase test db        # pgTAP: constraints, RLS, RPCs, reminders (needs supabase start)
npm run e2e             # Maestro flows in .maestro/ (needs an emulator with a release build)
```

Maestro runs locally; it does not run in CI because it needs an emulator. Running the flows requires a release build that shows the login screen (`EXPO_PUBLIC_DATA_SOURCE=supabase` with placeholder URL/key, since `mock` skips straight to the demo). CI runs lint, typecheck, format check and unit tests on every PR and push to `main`; tags `v*` trigger the release workflow (check, EAS build, GitHub Release with the APK).

## Roadmap / Future

Out of the MVP on purpose:

- `professional` role with its own agenda and slot blocking
- "Any professional" auto-assignment
- Admin CRUD for services, professionals, hours and time off
- Mark appointments completed / no-show, simple occupancy metrics
- Multi-business with nearby search
- Deposits or prepayment with Stripe
- Email reminders and multiple configurable reminders
- Waitlist when a slot frees up
- "Add to calendar"
- Localization (es/en) and a user-selectable time zone
- Maestro in CI with an emulator; pgTAP in CI

## License

[MIT](LICENSE) © José Malpica
