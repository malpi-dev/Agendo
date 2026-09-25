# Fase 10 · Notificaciones push (recordatorios)

**Rama:** `feat/fase-10-notificaciones`
**Objetivo:** development build con EAS, registro del Expo push token, RPC que "reclama" recordatorios pendientes,
Edge Function `agendo-send-reminders` invocada por `pg_cron` cada 5 min, deep link desde la notificación al
detalle de la cita y notificación local simulada en modo demo.
**Referencias:** definición F5 (§3.1), §7.3 (job `agendo-reminders`), §7.5 (Edge Function), §15 (secretos),
§17 (riesgo de push en Expo Go) · `CLAUDE.md` puntos 3 y 4 de las convenciones del proyecto compartido.
**Requisitos previos:** fase 09 terminada · **un teléfono Android físico** (el push remoto no funciona en emulador
ni en Expo Go) · cuenta de Expo.

> Esta fase tiene varias **🙋 acciones del autor** (cuentas, credenciales, teléfono). Agrúpalas y pídeselas al
> principio para no quedarte bloqueado a mitad.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1. Pide al autor, de una vez (**🙋**):
1. `eas login` (cuenta de Expo) y crear un **Expo access token** con "enhanced push security" para `AGENDO_EXPO_ACCESS_TOKEN`
   (se guardará solo en `supabase/functions/.env` local y, en la fase 13, en los secretos remotos).
2. Proyecto de **Firebase** con app Android `com.malpidev.agendo`, descargar `google-services.json` a la raíz del repo
   y subir la clave de cuenta de servicio **FCM V1** con `eas credentials` (Android → Push Notifications).
3. Teléfono Android con depuración USB (o capacidad de instalar un APK).

## Paso 1 · Dependencias y configuración

```bash
npx expo install expo-notifications expo-device expo-dev-client
```

- `app.json` → plugin `expo-notifications` con `icon` (se crea en la fase 11; de momento el ícono por defecto) y
  `color: "#0F766E"`.
- `google-services.json` **no se commitea**: añádelo a `.gitignore`. Crea `app.config.ts` que parte de `app.json`
  y define `android.googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'`
  (en EAS se subirá como variable de tipo archivo `GOOGLE_SERVICES_JSON` en la fase 12/13).
- `eas init` (escribe `extra.eas.projectId`) y `eas build:configure` → `eas.json`:

  ```json
  {
    "cli": { "appVersionSource": "local" },
    "build": {
      "development": { "developmentClient": true, "distribution": "internal", "environment": "development" },
      "preview": { "distribution": "internal", "android": { "buildType": "apk" }, "environment": "preview" },
      "production": { "environment": "production" }
    }
  }
  ```
- Añade `android/` e `ios/` a `.gitignore` (se generan con prebuild; el proyecto usa CNG).
- Development build en el teléfono: `npx expo run:android --device` (compila en local, hay Android SDK) **o**
  `eas build -p android --profile development` e instalar el APK. A partir de aquí se trabaja con
  `npx expo start --dev-client` (ya no `--go`).

## Paso 2 · Base de datos: migración 4

```bash
supabase migration new agendo_reminders
```

```sql
-- Reminders: claim due appointments atomically, then pg_cron calls the Edge Function every 5 minutes.
create extension if not exists pg_cron with schema pg_catalog;   -- project-wide extension; no-op if present
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
```

- Secretos de Vault **prefijados** `agendo_` (Vault es global al proyecto). En local, crea
  `supabase/seed/03_local_vault.sql` y añádelo a `[db.seed].sql_paths`:
  ```sql
  select vault.create_secret('http://host.docker.internal:54321', 'agendo_functions_base_url');
  select vault.create_secret('local-dev-cron-secret', 'agendo_reminders_cron_secret');
  ```
  (valor local no sensible; en remoto se crean a mano en la fase 13 con un secreto aleatorio).
- pgTAP: añade tests de `claim_due_reminders` (reclama una cita a 90 min; una segunda llamada no devuelve nada;
  ignora canceladas y las que empiezan en > 120 min; `authenticated` no puede ejecutarla).

## Paso 3 · Edge Function `agendo-send-reminders`

```bash
supabase functions new agendo-send-reminders
```

`supabase/config.toml`: `[functions.agendo-send-reminders] verify_jwt = false`.
`supabase/functions/.env.example` (commiteado) y `supabase/functions/.env` (ignorado):
`AGENDO_EXPO_ACCESS_TOKEN=`, `AGENDO_REMINDERS_CRON_SECRET=local-dev-cron-secret`.

`index.ts` (Deno, TypeScript, en inglés):

1. `Deno.serve(async (req) => …)`. Si `req.headers.get('x-cron-secret') !== Deno.env.get('AGENDO_REMINDERS_CRON_SECRET')` → `401`.
2. Cliente con la secret key que inyecta Supabase (revisa en la documentación actual el nombre de la variable:
   `SUPABASE_SERVICE_ROLE_KEY` o la nueva de secret keys) y `db: { schema: 'agendo' }`.
3. `rpc('claim_due_reminders')` → filas. Si no hay, responde `{ claimed: 0, sent: 0 }`.
4. Lee `push_tokens` de los `client_id` reclamados.
5. Construye un mensaje por token: `{ to, title: 'Reminder: <service>', body: '<h:mm AM> with <professional>',
   sound: 'default', channelId: 'reminders', data: { appointmentId } }`. Hora con
   `Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })`.
6. Envía en lotes de 100 a `https://exp.host/--/api/v2/push/send` con `Authorization: Bearer <AGENDO_EXPO_ACCESS_TOKEN>`.
7. Recorre los tickets: los de `details.error === 'DeviceNotRegistered'` → borra ese token.
8. Responde `{ claimed, sent, removedTokens }`. Registra errores con `console.error` (sin datos personales).

Prueba local:

```bash
supabase functions serve --env-file supabase/functions/.env
curl -i -X POST http://127.0.0.1:54321/functions/v1/agendo-send-reminders -H "x-cron-secret: local-dev-cron-secret"
```

## Paso 4 · App: permisos, token y deep link (`src/features/notifications/`)

- `data/supabase-push-token-repository.ts`: `register` = `upsert({ user_id, token, platform, updated_at }, { onConflict: 'token' })`;
  `remove` = `delete().eq('token', token)`. `data/mock-push-token-repository.ts` en memoria. Añade `pushTokens` a `Repositories`.
- `presentation/notifications-service.ts`:
  - `configureNotifications()`: `setNotificationHandler` (mostrar alerta y sonido en primer plano) y canal Android
    `reminders` (importancia alta).
  - `registerForPushAsync(): Promise<{ status: 'granted' | 'denied' | 'unavailable'; token?: string }>`:
    `Device.isDevice` falso → `unavailable`; pide permisos; `getExpoPushTokenAsync({ projectId })` con el
    `projectId` de `expo-constants`.
  - `scheduleDemoReminder(appointment)`: notificación **local** a los 10 s: "Reminder: <service>" /
    "<hora> with <professional> (demo)", `data: { appointmentId }` (F5 CA6).
- `presentation/notifications-store.ts` (Zustand): `permission: 'unknown' | 'granted' | 'denied' | 'unavailable'`, `token?`.
- `usePushRegistration()` en `(app)/_layout.tsx`: una vez por sesión con usuario real y perfil → `registerForPushAsync()`
  y, si hay token, `repos.pushTokens.register(token, 'android')` (F5 CA1). Nunca bloquea la UI; si falla, solo
  guarda el estado.
- **Sign out**: antes de `auth.signOut()`, `repos.pushTokens.remove(token)` si existe.
- **Deep link (F5 CA4)**: `useNotificationObserver()` en el layout raíz: `getLastNotificationResponseAsync()` (arranque
  en frío) + `addNotificationResponseReceivedListener`; si `data.appointmentId` existe y hay sesión o demo →
  `router.push('/appointments/<id>')`. Esquema `agendo://appointments/<id>` también válido vía `expo-linking`.
- **Demo:** tras reservar con éxito en modo demo, pide permiso si hace falta y llama a `scheduleDemoReminder`.
- **Settings (F5 CA5):** sección "Reminders": "On" si `granted`; "Reminders disabled" + botón "Open settings"
  (`Linking.openSettings()`) si `denied`; "Not available on this device" si `unavailable`.

## Paso 5 · Tests

- `notifications-service` con `expo-notifications` y `expo-device` mockeados: `unavailable` en emulador, `denied`,
  `granted` con token.
- `usePushRegistration` registra el token una sola vez.
- Repos de push (Supabase con cliente falso; mock).
- Observador: con una respuesta con `appointmentId` navega al detalle (router mockeado).

## Paso 6 · Verificación en el teléfono (🙋 con el autor)

1. Development build instalado; inicia sesión contra Supabase local (en el teléfono la URL es la IP LAN del Mac).
2. Acepta permisos → hay fila en `agendo.push_tokens`.
3. Reserva una cita que empiece en ~75 min (antelación mínima 60). En ≤ 5 min (cron) — o llamando a la función con
   `curl` — llega "Reminder: …". Tócala → abre el detalle de esa cita (F5 CA2, CA4).
4. Vuelve a invocar la función: **no** llega un segundo recordatorio (F5 CA3). Cancela otra cita en ventana y
   comprueba que no recibe recordatorio.
5. Deniega permisos (desde ajustes del sistema) → la app funciona y Settings muestra "Reminders disabled".
6. Demo: reserva → a los 10 s llega la notificación local; al tocarla abre el detalle.
7. Comprueba el job: `select jobname, schedule from cron.job where jobname = 'agendo-reminders';` y
   `select * from cron.job_run_details order by start_time desc limit 5;`.

## Paso 7 · Cierre

`00-guia-general.md` §3.3 (incluye `supabase db reset && supabase test db`). En la bitácora anota: projectId de EAS,
cómo se instaló el dev build y el nombre real de la variable de la secret key en Edge Functions.

---

## Criterios de terminado

- [ ] F5 CA1–CA6 cumplidos en un teléfono Android con development build.
- [ ] `claim_due_reminders` atómica, solo ejecutable por `service_role`, con tests pgTAP.
- [ ] Job `agendo-reminders` creado por migración, idempotente y eliminado solo por nombre; secretos de Vault prefijados `agendo_`.
- [ ] Edge Function valida `x-cron-secret`, envía por lotes, limpia `DeviceNotRegistered`; secretos solo en `.env` ignorado.
- [ ] `google-services.json`, `android/`, `ios/` y `supabase/functions/.env` fuera del repo.
- [ ] Deep link desde la notificación (frío y caliente) al detalle.
- [ ] lint/typecheck/test en verde; PR mergeado; bitácora actualizada.
