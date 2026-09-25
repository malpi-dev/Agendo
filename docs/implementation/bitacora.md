# Agendo — Bitácora de implementación

> Documento vivo. Se actualiza **al empezar** y **al terminar** cada fase (ver `00-guia-general.md` §3 y §5).
> Todo en español; el código y los commits, en inglés.

## Avance

`▒░░░░░░░░░░░░` 0/13 fases terminadas (0 %)

**Fase actual:** Fase 01 · Andamiaje (🚧 en progreso)
**Última actualización:** 2026-09-25
**Ventana planificada:** semana 1 (28 sep – 4 oct 2026); pulido y release antes del 11 oct.

## Estado por fase

| # | Fase | Rama | Estado | Inicio | Fin |
|---|---|---|---|---|---|
| 01 | Andamiaje | `feat/fase-01-andamiaje` | 🚧 En progreso | 2026-09-25 | — |
| 02 | Core | `feat/fase-02-core` | ⏳ Pendiente | — | — |
| 03 | Dominio | `feat/fase-03-dominio` | ⏳ Pendiente | — | — |
| 04 | Backend local | `feat/fase-04-backend-local` | ⏳ Pendiente | — | — |
| 05 | Modo demo | `feat/fase-05-modo-demo` | ⏳ Pendiente | — | — |
| 06 | Reserva | `feat/fase-06-reserva` | ⏳ Pendiente | — | — |
| 07 | Auth | `feat/fase-07-auth` | ⏳ Pendiente | — | — |
| 08 | Mis citas | `feat/fase-08-mis-citas` | ⏳ Pendiente | — | — |
| 09 | Realtime y agenda | `feat/fase-09-realtime-y-agenda` | ⏳ Pendiente | — | — |
| 10 | Notificaciones | `feat/fase-10-notificaciones` | ⏳ Pendiente | — | — |
| 11 | Ajustes y pulido | `feat/fase-11-ajustes-y-pulido` | ⏳ Pendiente | — | — |
| 12 | E2E y CI | `feat/fase-12-e2e-y-ci` | ⏳ Pendiente | — | — |
| 13 | Lanzamiento | `feat/fase-13-lanzamiento` | ⏳ Pendiente | — | — |

Estados: ⏳ Pendiente · 🚧 En progreso · ✅ Terminada · ⛔ Bloqueada

## Versiones clave instaladas

> Se completa en la fase 01 y se actualiza si cambia algo.

| Paquete / herramienta | Versión |
|---|---|
| Expo SDK | — |
| React Native | — |
| Expo Router | — |
| NativeWind / Tailwind | — |
| @supabase/supabase-js | — |
| @tanstack/react-query | — |
| zod | — |
| Supabase CLI | — |
| Node | — |

## Registro

> Una entrada por fase terminada (la más reciente arriba). Plantilla:
>
> ### Fase NN · Nombre — AAAA-MM-DD
> - **Hecho:** qué se implementó (breve, en viñetas).
> - **PR:** enlace o número.
> - **Decisiones:** qué se decidió y por qué (también va a la tabla de abajo si cambia la definición).
> - **Pendientes:** lo que quedó para otra fase (con el número de fase destino).

_Sin entradas todavía._

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

## Bloqueos

_Ninguno._

## Ideas para el roadmap (fuera del MVP)

_Anotar aquí; luego pasan a la sección "Roadmap" del README._
