# Agendo — Bitácora de implementación

> Documento vivo. Se actualiza **al empezar** y **al terminar** cada fase (ver `00-guia-general.md` §3 y §5).
> Todo en español; el código y los commits, en inglés.

## Avance

`██████████░░░` 10/13 fases terminadas (77 %)

**Fase actual:** Fase 11 · Ajustes y pulido (⏳, por empezar)
**Última actualización:** 2026-09-29
**Ventana planificada:** semana 1 (28 sep – 4 oct 2026); pulido y release antes del 11 oct.

## Estado por fase

| # | Fase | Rama | Estado | Inicio | Fin |
|---|---|---|---|---|---|
| 01 | Andamiaje | `feat/fase-01-andamiaje` | ✅ Terminada | 2026-09-25 | 2026-09-25 |
| 02 | Core | `feat/fase-02-core` | ✅ Terminada | 2026-09-28 | 2026-09-28 |
| 03 | Dominio | `feat/fase-03-dominio` | ✅ Terminada | 2026-09-28 | 2026-09-28 |
| 04 | Backend local | `feat/fase-04-backend-local` | ✅ Terminada | 2026-09-28 | 2026-09-28 |
| 05 | Modo demo | `feat/fase-05-modo-demo` | ✅ Terminada | 2026-09-28 | 2026-09-28 |
| 06 | Reserva | `feat/fase-06-reserva` | ✅ Terminada | 2026-09-28 | 2026-09-28 |
| 07 | Auth | `feat/fase-07-auth` | ✅ Terminada | 2026-09-28 | 2026-09-28 |
| 08 | Mis citas | `feat/fase-08-mis-citas` | ✅ Terminada | 2026-09-28 | 2026-09-28 |
| 09 | Realtime y agenda | `feat/fase-09-realtime-y-agenda` | ✅ Terminada | 2026-09-28 | 2026-09-28 |
| 10 | Notificaciones | `feat/fase-10-notificaciones` | ✅ Terminada | 2026-09-29 | 2026-09-29 |
| 11 | Ajustes y pulido | `feat/fase-11-ajustes-y-pulido` | ⏳ Pendiente | — | — |
| 12 | E2E y CI | `feat/fase-12-e2e-y-ci` | ⏳ Pendiente | — | — |
| 13 | Lanzamiento | `feat/fase-13-lanzamiento` | ⏳ Pendiente | — | — |

Estados: ⏳ Pendiente · 🚧 En progreso · ✅ Terminada · ⛔ Bloqueada

## Versiones clave instaladas

> Se completa en la fase 01 y se actualiza si cambia algo.

| Paquete / herramienta | Versión |
|---|---|
| Expo SDK | ~57.0.25 |
| React Native | 0.86.3 |
| Expo Router | ~57.0.23 |
| NativeWind / Tailwind | 4.2.7 / 3.4.19 |
| @supabase/supabase-js | 2.117.2 |
| @tanstack/react-query | 5.103.2 |
| zod | 4.6.5 |
| Supabase CLI | 2.118.0 |
| Node | v24.15.0 |

## Registro

> Una entrada por fase terminada (la más reciente arriba). Plantilla:
>
> ### Fase NN · Nombre — AAAA-MM-DD
> - **Hecho:** qué se implementó (breve, en viñetas).
> - **PR:** enlace o número.
> - **Decisiones:** qué se decidió y por qué (también va a la tabla de abajo si cambia la definición).
> - **Pendientes:** lo que quedó para otra fase (con el número de fase destino).

### Fase 10 · Notificaciones — 2026-09-29
- **Hecho:**
  - Dependencias `expo-notifications`, `expo-device` y `expo-dev-client` (`expo install`); plugin `expo-notifications` (color `#0F766E`, canal por defecto `reminders`) en `app.json`; `app.config.ts` que añade `android.googleServicesFile` (`GOOGLE_SERVICES_JSON` o `./google-services.json`); `eas.json` con perfiles `development` / `preview` (APK) / `production`; `google-services.json` en `.gitignore` (`android/` e `ios/` ya lo estaban).
  - Migración `20260929000000_agendo_reminders.sql`: extensiones `pg_cron`/`pg_net`, RPC `agendo.claim_due_reminders()` (atómica, `security definer`, solo `service_role`) y job `agendo-reminders` cada 5 min (recreado por nombre, idempotente) que llama a la Edge Function con los secretos de Vault `agendo_functions_base_url` y `agendo_reminders_cron_secret`. `supabase/seed/03_local_vault.sql` (solo local) añadido a `[db.seed].sql_paths`.
  - pgTAP `supabase/tests/agendo_reminders.test.sql` (10 tests: reclama la cita a 90 min, la segunda llamada no devuelve nada, ignora canceladas / fuera de ventana / ya empezadas, `authenticated` y `anon` no pueden ejecutarla, el job existe). `supabase db reset && supabase test db`: 34 tests en verde.
  - Edge Function `agendo-send-reminders` (`verify_jwt = false`, valida `x-cron-secret`, lotes de 100 a la API de Expo, borra tokens `DeviceNotRegistered`, logs sin datos personales) + `supabase/functions/.env.example`. Probada en local con `supabase functions serve`: 401 sin secreto; con una cita a 75 min y un token falso reclama 1, la API de Expo responde `DeviceNotRegistered`, el token se borra y la segunda llamada devuelve `claimed: 0`.
  - App: `PushTokenRepository` con implementaciones Supabase (`upsert` por `token`) y mock, añadido a `Repositories`; `notifications-service` (canal, permisos, token, recordatorio local demo a los 10 s), store Zustand, `usePushRegistration` (una vez por usuario, no bloquea), `useNotificationObserver` (deep link en frío y en caliente a `/appointments/<id>`, espera a que la app esté visible), `unregisterPushToken` antes de cerrar sesión, recordatorio local tras reservar en modo demo y sección *Reminders* en Ajustes (On / Reminders disabled + Open settings / Not available on this device / carga).
  - Tests: servicio (emulador, denegado, concedido, sin projectId, fallo de token), repos push, hooks (registro único, demo, observador cold/warm), Ajustes y recordatorio demo. 280 tests en verde; lint (max-warnings 0), typecheck y format sin errores.
- **PR:** #11 (squash de `feat/fase-10-notificaciones`).
- **Decisiones:** ver tabla (`getLastNotificationResponse` síncrono, secret key, exclusión de `supabase/functions` de tsc).
- **Pendientes (🙋 autor, no se hicieron por límites de seguridad: sin EAS/remoto):**
  1. `eas login` + `eas init` (escribe `extra.eas.projectId` en `app.json`; sin él `getExpoPushTokenAsync` no puede dar token y la app queda en "Not available") y crear el Expo access token (enhanced push security) para `AGENDO_EXPO_ACCESS_TOKEN` en `supabase/functions/.env` local.
  2. Proyecto Firebase con app Android `com.malpidev.agendo`, `google-services.json` en la raíz (no se commitea) y subir la clave FCM V1 con `eas credentials`.
  3. Development build en un teléfono físico (`npx expo run:android --device` o `eas build -p android --profile development`) y verificación del Paso 6 (F5 CA1–CA6 en dispositivo).
  4. Fase 13 (remoto): `supabase secrets set AGENDO_EXPO_ACCESS_TOKEN=… AGENDO_REMINDERS_CRON_SECRET=…`, desplegar `agendo-send-reminders`, crear los secretos de Vault `agendo_functions_base_url` / `agendo_reminders_cron_secret` (valor aleatorio, el mismo que el secreto de la función), aplicar la migración con `psql "$SUPABASE_DB_URL" -f …` y subir `GOOGLE_SERVICES_JSON` como variable de archivo en EAS.
  - En local, la Edge Function ya funciona; para que `pg_cron` la alcance desde el contenedor hace falta `supabase functions serve --env-file supabase/functions/.env` mientras se prueba.
  - Nombre real de la variable de la secret key en Edge Functions: `SUPABASE_SECRET_KEYS` (diccionario JSON, clave `default`), con `SUPABASE_SERVICE_ROLE_KEY` como respaldo.

### Fase 09 · Realtime y agenda — 2026-09-28
- **Hecho:**
  - Prototipo del Paso 1 (script temporal fuera del repo, Supabase local): con `admin@agendo.dev` (OTP vía `generateLink`), `realtime.setAuth()` + canal privado `agendo:availability:<id de Marco>` y `agendo:agenda` reciben `appointment_changed` al cancelar/reactivar una cita por `psql`, en milisegundos (< 3 s). Sin necesidad de plan B (`busy_slots`).
  - `core/supabase/subscribe-broadcast.ts`: helper compartido (canal privado → `setAuth` → `subscribe`; `live`/`paused`; `onChange` extra al re-suscribirse; `removeChannel` al salir, incluso si se sale antes de que resuelva `setAuth`). Usado por `SupabaseBookingRepository.subscribeToAvailability` y `SupabaseAgendaRepository.subscribe`. Verificado el helper real contra Supabase local: `live` en ~16 ms, evento recibido en el acto y 0 canales tras el unsubscribe.
  - `listProfessionals(serviceId?)` en interfaz, mock y Supabase; `queryKeys.professionals` usa `'all'` sin id.
  - Pestaña *Agenda* (admin): cabecera con `‹` / fecha larga / `›` / Today, `LiveIndicator`, chips de filtro por profesional, grupos por profesional con filas (rango horario, cliente, servicio), skeleton, vacío "No appointments for this day", error con Retry y pull-to-refresh; los clientes se redirigen a `/`. `useAgenda` + `useAgendaSubscription` (invalida `agenda`).
  - Tests: helper de broadcast, suscripciones de ambos repos Supabase (con `channel`/`removeChannel`/`setAuth` añadidos a `fake-supabase`), `listProfessionals()` sin id (mock y Supabase) y pantalla de agenda (redirección, agrupación/orden, filtro, navegación de días, vacío, error, refresco por suscripción). 251 tests en verde; lint (max-warnings 0), typecheck y format sin errores.
- **PR:** #10 (squash de `feat/fase-09-realtime-y-agenda`).
- **Decisiones:** ver tabla (nombre del canal y helper compartido).
- **Pendientes:** verificación manual del Paso 6 en dispositivo/emulador (dos sesiones, *Choose slot* y *Agenda* en vivo, corte de red y reconexión, sin canales huérfanos en Studio) — la hace el autor; en modo demo la agenda refleja las reservas del mismo demo (cambiar de rol en Ajustes).

### Fase 08 · Mis citas — 2026-09-28
- **Hecho:**
  - Hooks: `useMyAppointments` (lista + `splitAppointments` con `useNow`), `useCancelAppointment`, `useModifyDecision` y `useRescheduleAppointment` (en `booking`); cancelar/reprogramar invalidan `appointments`, `busy` y `agenda` (y `appointments` también al fallar, por si la ventana se cerró).
  - Componentes `AppointmentCard` (barra de color + badge Upcoming/Completed/Cancelled) y `ModifyNotice`.
  - Pestaña *Appointments*: `FlashList` con cabeceras de sección, nota corta por sección vacía, vacío total con "Book now", skeleton, error con Retry y pull-to-refresh.
  - Detalle: botones Reschedule / Cancel appointment (deshabilitados con motivo fuera de la ventana; ocultos si está cancelada o pasada), confirmación con `Alert`, toast, estado `notFound` con "Back to appointments".
  - Reprogramar reutiliza *Choose slot* (título "Reschedule" + banner "Current: …") y *Confirm* (Before → After, "Confirm new time", `reschedule` atómico; `slotUnavailable` vuelve a la lista; `cancellationWindowClosed` muestra mensaje y "Back to appointment").
  - Tests: pantalla de citas (orden/secciones, vacío, sección vacía, error), detalle (dentro/fuera de ventana, cancelada, cancelar con Alert, notFound) y confirm en modo reprogramar. 241 tests en verde; lint (max-warnings 0), typecheck y format sin errores.
- **PR:** #9 (squash de `feat/fase-08-mis-citas`).
- **Decisiones:** ver tabla (mock de FlashList en Jest).
- **Pendientes:** verificación manual del Paso 7 (demo y Supabase local, incl. cancelar por RPC como otro usuario) — la hace el autor; en *Choose slot* al reprogramar, el horario actual de la propia cita aparece ocupado (la RPC sí lo permite); Realtime y agenda (fase 09).

### Fase 07 · Auth y repositorios Supabase — 2026-09-28
- **Hecho:**
  - `core/supabase/run.ts` (`run()` convierte errores devueltos y lanzados en `DomainError`) y `getCurrentUserId`.
  - Repos Supabase de catálogo, reserva, citas y agenda (con mappers donde el formato difiere); `subscribeToAvailability`/`subscribe` provisionales (`paused`) hasta la fase 09. Repos `auth` y `profile` (Supabase + mock) añadidos a `Repositories`; `createSupabaseRepositories(client)`.
  - Auth: `useAuthStore`, `useAuthBootstrap`, `useMyProfile`, `useCurrentUser` completo, guards definitivos (`(auth)`, `onboarding`, `(app)`) con splash retenido hasta resolver sesión y perfil, pantalla de error con Retry si falla el perfil.
  - Pantallas Sign in (RHF + zod), Enter code (`OtpInput`, autoenvío, reenvío con cuenta atrás de 60 s), Onboarding (`ensure_profile`) y Sign out en Settings. Componente `TextField` en `core/ui`.
  - `unauthorized` global: `setUnauthorizedHandler` en `query-client.ts` (QueryCache/MutationCache) cierra sesión y muestra toast.
  - `supabase/config.toml`: `[auth.rate_limit] email_sent = 100` (solo local).
  - Tests: cliente falso encadenable (`src/test/fake-supabase.ts`), repos Supabase y mocks, store, handler de `unauthorized` y pantallas de auth. 230 tests en verde; lint (max-warnings 0), typecheck y format sin errores.
  - Verificación contra Supabase local (script temporal, no commiteado): OTP real vía Mailpit, código inválido, `ensure_profile`, catálogo, reserva, conflicto `slotUnavailable`, reprogramar, cancelar y `unauthorized` tras sign out: todo correcto.
- **PR:** #7 (squash de `feat/fase-07-auth`).
- **Decisiones:** ver tabla (`run()` tipado, onboarding con `setQueryData`, agenda cachea la zona horaria).
- **Pendientes:** verificación manual en el emulador (Paso 9: flujo completo con `.env` en `supabase`, persistencia de sesión al reiniciar, conflicto con `psql`, `client@agendo.dev` sin onboarding) — la hace el autor; Realtime (fase 09); cancelar/reprogramar en UI (fase 08).

### Fase 06 · Reserva — 2026-09-28
- **Hecho:**
  - `queryKeys` centralizadas y hooks de datos (catálogo, horarios, ocupados, `useAvailableSlots` derivado, suscripción de disponibilidad, `useBookAppointment`, `useAppointment`, `useNow`).
  - Componentes: `ServiceCard`, `Avatar`, `ProfessionalRow`, `DayStrip`, `SlotChip`, `SlotGrid` (salida animada), `LiveIndicator`, `BookingSummary`.
  - Pantallas: Services, Choose professional, Choose slot, Confirm booking (conflicto `slotUnavailable` -> vuelve a la lista refrescada) y detalle básico de cita, con estados de carga, vacío y error.
  - `renderWithProviders` y tests de hooks y vistas. 174 tests en verde; lint y typecheck sin errores ni warnings.
  - Verificación manual en Android (Paso 7): pendiente de que el autor la haga en el emulador; la lógica está cubierta por tests.
- **PR:** #6 (squash de `feat/fase-06-reserva`).
- **Decisiones:** ver tabla (resolver de eslint, mock de Reanimated, `useNow`, tono `warning`).
- **Pendientes:** verificación manual en Android (autor); cancelar/reprogramar en el detalle (fase 08); Realtime real (fase 09).

### Fase 05 · Modo demo — 2026-09-28
- **Hecho:**
  - Fixtures idénticos al seed (verificado contra la BD), `MockDb` con reloj inyectable, latencia y eventos.
  - 4 repositorios mock (catalog, booking, appointments, agenda) con las mismas reglas y `DomainError` que la BD; simulación de reserva concurrente a los 5 s.
  - `RepositoryProvider`/`useRepositories`, `useSessionStore` (`enterDemo`/`setDemoRole`/`exitDemo`, limpian la caché) y `useCurrentUser`.
  - Rutas con `Stack.Protected` (`(auth)` / `(app)`), tabs con iconos, badge "Demo", Agenda oculta y protegida para clientes.
  - Pantallas: Sign in + selector de rol, Home (lista servicios), Appointments/Agenda provisionales, Settings mínimo. 154 tests en verde.
  - Verificado en Android (Expo Go): Explore demo → Client/Admin → tabs, cambio de rol y salida del demo.
- **PR:** ver historial de `main` (squash de `feat/fase-05-modo-demo`).
- **Decisiones:** ver tabla (iconos, comparación con el seed, simulación concurrente).
- **Pendientes:** repos `supabase-*`, auth y perfil (fase 07); reemplazo de pantallas provisionales (fases 06, 08, 09, 11).

### Fase 04 · Backend local — 2026-09-28
- **Hecho:**
  - Supabase local inicializado (`config.toml`: schema `agendo` expuesto, confirmaciones de email activas, OTP de 6 dígitos, plantilla local `otp.html`).
  - 3 migraciones (`agendo_schema`, `agendo_rls`, `agendo_rpc`): 8 tablas, `EXCLUDE` de doble reserva y de solape del cliente, RLS con políticas comentadas, RPCs (`book_appointment`, `cancel_appointment`, `reschedule_appointment`, `get_busy_ranges`, `ensure_profile`), triggers y Broadcast de Realtime.
  - Seed dividido: `01_catalog.sql` (también remoto) y `02_demo_data.sql` (solo local): 33 citas (26 `booked`, 7 `cancelled`) con los UUID estables.
  - pgTAP: 24 tests en verde (`supabase db reset && supabase test db`).
  - Tipos generados (`database.generated.ts`, script `db:types`) y `getSupabaseClient()` tipado con el schema `agendo`.
  - Verificado por API: `signInWithOtp` a `client@agendo.dev` llega a Mailpit con código de 6 dígitos, `verify` devuelve sesión, Casey ve solo sus 5 citas y `anon` no puede ejecutar `book_appointment`.
- **PR:** ver historial de `main` (squash de `feat/fase-04-backend-local`).
- **Decisiones:** ver tabla.
- **Pendientes:** la fase 05 debe replicar en TypeScript el algoritmo del seed (ver decisión sobre el orden de generación).

### Fase 03 · Dominio — 2026-09-28
- **Hecho:**
  - Modelos e interfaces de repositorio en `domain/` de catalog, booking, appointments, agenda, auth y notifications.
  - Casos de uso puros: `rangesOverlap`, `getAvailableSlots`, `getBookableDays`, `canModifyAppointment`, `splitAppointments`, `groupAgendaByProfessional`; validaciones zod de auth.
  - Tests: los 16 casos de `getAvailableSlots` y el resto; cobertura de líneas 100 % en `domain/` con `TZ=UTC`.
  - `jest.config.js`: `testMatch` explícito para que `test-fixtures.ts` no se trate como suite.
- **PR:** ver historial de `main` (squash de `feat/fase-03-dominio`).
- **Decisiones:** ver tabla (métodos añadidos a las interfaces y `listForDay(LocalDate)`).
- **Pendientes:** ninguno.

### Fase 02 · Core — 2026-09-28
- **Hecho:**
  - Errores de dominio (`DomainError`, `mapSupabaseError`, `getErrorPresentation`) con tests por cada fila de la tabla.
  - `core/time/zoned.ts` + `formatPrice` con tests (TZ=UTC).
  - Tema `system | light | dark` persistido, tokens hex verificados contra `global.css`, `ThemeGate`.
  - Componentes UI base (`AppText`, `Screen`, `Button`, `Card`, `Skeleton`, `EmptyState`, `ErrorState`, `Badge`, `Toast`) con tests de `Button` y `ErrorState`.
  - Cliente Supabase (schema `agendo`), `QueryClient` con reintentos solo `network`/`unknown`, NetInfo y focus manager.
  - Layout raíz con Manrope y splash retenido; kitchen sink temporal en `src/app/index.tsx`, revisado en claro y oscuro (necesitó `--clear` por caché de Metro).
- **PR:** ver historial de `main` (squash de `feat/fase-02-core`).
- **Decisiones:** ver tabla (RNTL 14 asíncrono, `jest.setup.js`, `node` en tsconfig types).
- **Pendientes:** manejo global de `unauthorized` en Query (fase 07); tipar el cliente con los tipos de BD (fase 04).

### Fase 01 · Andamiaje — 2026-09-25
- **Hecho:**
  - Proyecto Expo (SDK 57) generado y copiado sobre el repo; `app-example`/plantilla de ejemplo eliminados.
  - `app.json` configurado (nombre, slug, scheme, bundle ids `com.malpidev.agendo`, `userInterfaceStyle: automatic`).
  - Dependencias de runtime instaladas (Supabase, TanStack Query, Zustand, zod, React Hook Form, FlashList, date-fns/tz, fuentes, haptics, NetInfo) más `react-native-url-polyfill`.
  - TypeScript strict (`noUncheckedIndexedAccess`, `noImplicitOverride`), alias `@/*` → `src/*`.
  - NativeWind 4 + Tailwind 3 con tokens de color en variables CSS (`:root` / `.dark:root`) y fuente Manrope.
  - ESLint flat config (`eslint-config-expo` + `eslint-config-prettier`) con la regla de arquitectura para `domain/`; Prettier con `prettier-plugin-tailwindcss`.
  - Jest + jest-expo + Testing Library configurados; test de humo en verde.
  - Estructura de carpetas `src/core/*` y `src/features/<feature>/{domain,data,presentation}` creada.
  - `.env.example`, `src/core/config/env.ts` (validación con zod, no lanza si faltan variables) y `.gitignore` actualizado.
  - CI de GitHub Actions (`lint` + `typecheck` + `format:check` + `test`).
  - Verificado en Android (emulador Pixel_10_Pro, Expo Go): texto "Agendo" en `text-primary` sobre `bg-background`, con cambio correcto a la paleta oscura al activar el modo oscuro del sistema.
- **PR:** pendiente de crear (ver §3.3 de la guía general).
- **Decisiones:** ver tabla de abajo (plantilla nueva de Expo, NativeWind/Tailwind, CSS de Prettier).
- **Pendientes:** ninguno para esta fase; fase 02 continúa con core (errores, tiempo, tema, cliente Supabase, DI).

_Entradas anteriores: ninguna._

## Decisiones y desviaciones respecto a la definición

| Fecha | Fase | Decisión / desviación | Motivo |
|---|---|---|---|
| 2026-09-25 | Plan | El seed se divide en `supabase/seed/01_catalog.sql`, `02_demo_data.sql` y `03_local_vault.sql` (vía `[db.seed].sql_paths`) en lugar de un único `seed.sql`. | En remoto solo se aplica el catálogo (definición §7.6); así no hay que copiar SQL a mano. |
| 2026-09-25 | Plan | `expo-notifications`, `expo-device` y `expo-dev-client` se instalan en la fase 10, no en la 01. | Hasta la fase 10 se trabaja en Expo Go (más rápido); esos paquetes solo se necesitan para push. |
| 2026-09-25 | Plan | El modelo `Business` vive en `src/features/catalog/domain/` (no en `core`). | Lo devuelve `CatalogRepository`; evita que `domain` dependa de `core` más allá de errores y tiempo. |
| 2026-09-25 | Plan | No se crea `bookingDraftStore`: la selección del flujo de reserva viaja en los parámetros de ruta. | Menos estado global; los parámetros sobreviven a la navegación. |
| 2026-09-25 | Plan | Nuevo código de error `rateLimited` (envío de OTP). GoTrue devuelve `otp_expired` tanto para código incorrecto como caducado: se mapea a `invalidCode` con el mensaje "The code is invalid or has expired". | La API no distingue ambos casos. |
| 2026-09-25 | Plan | Los recordatorios se "reclaman" con la RPC `agendo.claim_due_reminders()` (marca `reminder_sent_at` y devuelve los datos en una sola sentencia). | Evita envíos duplicados si dos ejecuciones del cron se solapan (F5 CA3). |
| 2026-09-25 | Plan | Los días de calendario se representan como `LocalDate` (`'YYYY-MM-DD'` en la zona del negocio). | Evita errores de zona horaria del dispositivo. |
| 2026-09-25 | 01 | La plantilla actual de `create-expo-app` (SDK 57) coloca el router en `src/app/` (no en `app/` raíz). Se mantiene esa convención (Expo Router la soporta de forma nativa) en vez de moverlo a `app/` raíz como sugería el archivo de fase. | Es la estructura oficial vigente de `create-expo-app`; moverla sería pelear contra la CLI sin beneficio real. |
| 2026-09-25 | 01 | `react-native-url-polyfill` sí sigue siendo necesario con `@supabase/supabase-js` 2.117.2 (confirmado en `SupabaseClient.ts` del paquete instalado). | La guía de fase pedía verificarlo antes de instalar. |
| 2026-09-29 | 10 | Se usa `Notifications.getLastNotificationResponse()` / `clearLastNotificationResponse()` (síncronos) en vez de `getLastNotificationResponseAsync`. | La versión Async está deprecada en `expo-notifications` de SDK 57. |
| 2026-09-29 | 10 | La Edge Function lee la secret key de `SUPABASE_SECRET_KEYS.default` (con `SUPABASE_SERVICE_ROLE_KEY` de respaldo). | Es el nombre vigente en la documentación de Supabase. |
| 2026-09-29 | 10 | `supabase/functions` se excluye de `tsc` (`tsconfig.json`) y de ESLint. | Es código Deno (imports `npm:`), no compilable con la config de React Native. |
| 2026-09-29 | 10 | `eas.json` se escribió a mano y no se ejecutó `eas init`/`eas build:configure`. | No se crean cuentas ni proyectos EAS sin el autor; `extra.eas.projectId` queda pendiente. |
| 2026-09-29 | 10 | En modo demo el permiso de notificaciones y el estado de Ajustes se evalúan como notificación local (también en emulador). | El push remoto solo existe en dispositivo físico, pero la notificación local de la demo funciona en cualquier sitio. |
| 2026-09-28 | 09 | El canal de disponibilidad es `agendo:availability:<professional_id>` (el que ya crean el trigger y la política de la fase 04), no `agendo:slots:<professional_id>` como sugiere el `CLAUDE.md` de la carpeta contenedora. | Cambiarlo exige modificar migraciones ya aplicadas; el patrón `agendo:<tema>:<id>` de la convención se cumple igual. Pendiente que el autor decida si actualiza el `CLAUDE.md` o renombra el canal. |
| 2026-09-28 | 09 | La lógica de suscripción vive en un helper `subscribeToBroadcast` en `core/supabase/` en vez de duplicarse en los dos repositorios. | Ambos repos usan el mismo protocolo (canal privado + `setAuth` + re-suscripción); una sola implementación y un solo test. |
| 2026-09-28 | 08 | `jest.setup.js` mockea `@shopify/flash-list` con `src/test/flash-list-mock.tsx` (renderiza todas las filas) en vez de usar `@shopify/flash-list/jestSetup`. | El `jestSetup` incluido en 2.0.2 referencia `RecyclerView`, que el paquete ya no exporta, y rompe el render. |
| 2026-09-28 | 07 | `run()` infiere el tipo de `data` de la rama con `error: null` de la respuesta de supabase-js (no `{ data: T }` genérico); `signOut` se envuelve porque no devuelve `data`. | La firma del archivo de fase no compilaba con las uniones de `getSession`/`verifyOtp` ni con las listas `T[] \| null`. |
| 2026-09-28 | 07 | El onboarding guarda el perfil devuelto por `ensure_profile` con `setQueryData(['profile','mine'])` en vez de invalidar. | Evita un refetch y el guard pasa a `(app)` de inmediato. |
| 2026-09-28 | 07 | `SupabaseAgendaRepository(client, catalog)` cachea la zona horaria del negocio (sin cachear fallos). | Necesaria para calcular el rango del día. |
| 2026-09-28 | 07 | `.env` local sigue con `EXPO_PUBLIC_DATA_SOURCE=mock`; para probar contra Supabase hay que cambiarlo a `supabase` y reiniciar Metro con `--clear`. | Las variables `EXPO_PUBLIC_*` se incrustan al compilar; no se toca `.env` (no versionado). |
| 2026-09-28 | 06 | `eslint.config.js` fija el resolver de TypeScript (`import/resolver: typescript`) para el alias `@/`. | `expo lint` fallaba con `import/no-unresolved` en rutas nuevas aunque `eslint` directo y `tsc` las resolvían. |
| 2026-09-28 | 06 | Reanimated se mockea a mano en `jest.setup.js` (View + animaciones no-op) y `gcTime: Infinity` también en mutaciones del `QueryClient` de test. | Reanimated 4/Worklets no inicializa bajo Jest (incluso con su mock oficial); el GC de mutaciones dejaba el proceso de Jest sin salir. |
| 2026-09-28 | 06 | `useNow` vive en `core/time/use-now.ts` y no se exporta desde `core/time/index.ts`. Se añadió `toLocalTime` a `zoned.ts`. | Mantener React fuera de lo que importa `domain/`; los ids de chips usan la hora 24 h del negocio. |
| 2026-09-28 | 06 | Tono `warning` añadido al Toast. | El conflicto "That time was just taken" usa toast de advertencia. |
| 2026-09-28 | 05 | Se instala `@expo/vector-icons` (15.1.1) con `expo install` para los iconos de las tabs (Ionicons). | No venía en la plantilla SDK 57 y la fase pide Ionicons. |
| 2026-09-28 | 05 | Los fixtures de `buildDemoAppointments` se compararon contra el seed real de la BD (33 citas): idénticos en profesional, servicio, cliente, hora y estado. | Garantiza que demo y remoto muestren lo mismo. |
| 2026-09-28 | 05 | La simulación de reserva concurrente marca `concurrentBookingSimulated` cuando se dispara (no al suscribirse) y solo si la última consulta de ocupados es de ese profesional. | Así, salir de la pantalla antes de 5 s no gasta la demostración. |
| 2026-09-28 | 04 | Las políticas de `agendo_availability_broadcast_read` y `agendo_agenda_broadcast_read` tocan `realtime.messages` (fuera del schema `agendo`), con nombres prefijados `agendo_` y limitadas a topics `agendo:*`. | Realtime Broadcast con canales privados; exigido por la convención del proyecto compartido. |
| 2026-09-28 | 04 | `realtime.send(payload, event, topic, private)` funciona con la firma indicada en la CLI 2.118.0; sin cambios. `project_id` local = `agendo` (minúsculas). | Verificado: los triggers generan 2 mensajes por cita. |
| 2026-09-28 | 04 | Orden de generación del seed (rotación de clientes y "1 de cada 4 cancelada"): días ascendentes; hoy = Marco 10:00, Marco 15:00, Lena 11:00, Lena 16:30, Sam 12:00; otros días = Marco 10:00, Lena 15:00. La rotación de clientes cuenta todas las citas ficticias; la cancelación cuenta solo las de días ≠ hoy. | El archivo de fase no fijaba si el contador de cancelación era global; así queda determinista para replicarlo en la fase 05. |
| 2026-09-28 | 04 | `supabase/tests/agendo.test.sql` tiene 24 tests (mínimo pedido: 18). Borra las citas del seed dentro de su transacción y usa una función auxiliar en `public` (se revierte) porque `pg_temp` no es accesible desde el rol `authenticated`. | Tests deterministas e independientes de la hora de ejecución. |
| 2026-09-28 | 04 | `supabase/templates` se excluye de Prettier. | El HTML de la plantilla de email debe quedar tal cual. |
| 2026-09-28 | 03 | Se añaden a las interfaces `CatalogRepository.getService`/`getProfessional` (las pantallas reciben IDs por ruta), el callback `onStatus` en las suscripciones ("Live updates paused") y `AgendaRepository.listForDay(date: LocalDate)` en vez de `Date`. `LiveStatus` y `Unsubscribe` viven en `booking/domain/types.ts` y `auth`/`agenda` lo importan. | La definición §6.4 no los incluía; `LocalDate` sigue la decisión de días de calendario. |
| 2026-09-28 | 02 | RNTL 14: `render` y `fireEvent` son asíncronos (`await`). Se añade `jest.setup.js` con el mock oficial de AsyncStorage y `"node"` a `types` de tsconfig (el test de tokens lee `global.css`). | Requisitos de las versiones instaladas; el test de tokens garantiza que hex y CSS no divergen. |
| 2026-09-25 | 01 | `docs/` se excluye de Prettier (`.prettierignore`). | Un `npm run format` inicial reformateaba las tablas Markdown de los documentos de planificación sin necesidad; esos documentos no son código y no deben depender del formateador de JS/TS. |
| 2026-09-25 | 01 | `tsconfig.json` añade `"types": ["jest"]` y `nativewind-env.d.ts` añade `declare module '*.css';`. | Sin ellos `tsc --noEmit` fallaba: los globals de Jest no se resolvían solos y TypeScript no sabe tipar el import de `global.css` mediante el alias `@/`. |

## Bloqueos

_Ninguno._

## Ideas para el roadmap (fuera del MVP)

_Anotar aquí; luego pasan a la sección "Roadmap" del README._
