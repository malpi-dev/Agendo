# Agendo — Documento de definición

| Campo | Valor |
|---|---|
| **Tagline** | Book appointments in seconds — live availability, zero double bookings. |
| **Stack** | React Native · Expo (SDK estable más reciente) · Expo Router · TypeScript strict · Supabase |
| **Plataforma** | Android (objetivo principal) · iOS si es posible |
| **Estado** | 📋 Planificado |
| **Versión del doc** | 1.0 |
| **Fecha** | 2026-09-25 |
| **Repo** | `agendo` (GitHub, se crea al empezar) |
| **Bundle id / package** | `com.malpidev.agendo` *(propuesta)* |

> Este documento define **qué** se construye y qué no. Es la base para el plan de implementación.
> Las reglas generales (arquitectura, stack, backend, seguridad, convenciones) viven en
> `../CLAUDE.md` (carpeta del portafolio) y **prevalecen** sobre este documento si hubiera contradicción.

---

## 1. Resumen del producto

**Qué es.** Agendo es una app móvil de reservas de citas para un negocio de servicios con varios
profesionales: una barbería, una clínica pequeña o un estudio (tatuajes, uñas, fisioterapia…). El cliente
elige un servicio, un profesional, un día y un horario libre, y reserva en pocos toques. El administrador del
negocio ve la agenda del día de todo el equipo, actualizada en vivo.

**Problema que resuelve.** Muchos negocios pequeños gestionan citas por WhatsApp o por teléfono: hay idas y
vueltas para encontrar hueco, reservas duplicadas y clientes que olvidan la cita. Agendo muestra solo los
horarios realmente disponibles, impide que dos personas reserven el mismo hueco y envía un recordatorio.

**Para quién.**
- *Usuario final:* clientes del negocio que quieren reservar sin llamar.
- *Negocio:* el dueño o recepcionista que necesita ver de un vistazo quién viene hoy.
- *Portafolio:* clientes freelance que buscan una app de reservas, turnos o agenda (un pedido muy frecuente).

**Qué demuestra a un cliente freelance** (los "Destaca" del CLAUDE.md):

| Demostración | Cómo se ve en la app |
|---|---|
| **Horarios en tiempo real** (Supabase Realtime) | Si otra persona reserva un hueco mientras miras la pantalla de horarios, ese hueco desaparece sin recargar. La agenda del admin se actualiza sola. |
| **Integridad en la base de datos** | Restricción `EXCLUDE` sobre rangos `tstzrange` en Postgres: aunque dos peticiones lleguen a la vez, solo una reserva gana; la otra recibe un error claro ("Ese horario acaba de ocuparse"). |
| Lógica de negocio real y testeada | Cálculo de horarios disponibles (horario laboral, duración del servicio, citas ocupadas, antelación mínima) como caso de uso puro con tests unitarios. |
| Arquitectura limpia y modo demo | Repositorios `supabase` / `mock` intercambiables; botón *Explore demo* para probar sin cuenta. |
| Producto completo | Auth sin contraseña, push, modo oscuro, estados de carga/vacío/error, CI, APK descargable. |

---

## 2. Usuarios y roles

Los roles viven en `agendo.profiles.role`. En el MVP hay **un único negocio** (ver §17) y **dos roles**.

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| `client` | Cualquier persona que inicia sesión (rol por defecto) | Ver catálogo de servicios y profesionales · reservar · ver sus citas · cancelar/reprogramar dentro de la ventana permitida · recibir recordatorio push · editar su nombre · cambiar tema · cerrar sesión |
| `admin` | Dueño o recepcionista del negocio | Todo lo de `client` + pestaña **Agenda**: ver las citas del día de todos los profesionales (con navegación a otros días y filtro por profesional), en vivo |

Notas:
- Los **profesionales son datos** (tabla `professionals`), no usuarios con login en el MVP. Que un profesional
  inicie sesión y vea solo su agenda queda para el roadmap.
- El rol `admin` **no se puede autoasignar**: se asigna por SQL (seed o manualmente en remoto).
- **Modo demo:** quien usa *Explore demo* elige entrar como *Client* o *Admin* y puede alternar el rol desde
  Ajustes (solo en demo), para que el revisor vea ambas experiencias.

---

## 3. Alcance del MVP

### 3.1 Incluye

Cada feature tiene criterios de aceptación (CA) verificables. Todo lo que no esté aquí queda fuera.

**F1 · Auth (email + código OTP)**
Inicio de sesión sin contraseña: el usuario escribe su email, recibe un **código de 6 dígitos** y al introducirlo queda con sesión iniciada
(convención común del proyecto Supabase compartido, ver `CLAUDE.md`).
- CA1: El formulario valida el email con zod y muestra el error en línea si es inválido.
- CA2: Tras enviar, se muestra la pantalla "Enter code" con opción de reenviar (deshabilitada 60 s).
- CA3: Un código válido inicia sesión; uno incorrecto o caducado muestra un error legible (`invalidCode` / `codeExpired`) sin salir de la pantalla.
- CA4: En el primer inicio de sesión se pide el nombre (onboarding) y la app llama a la RPC `agendo.ensure_profile(full_name)`, que crea el perfil con rol `client`.
- CA5: La sesión persiste al cerrar y reabrir la app; "Cerrar sesión" la elimina y vuelve al login.

**F2 · Catálogo de servicios**
Lista de servicios activos del negocio con nombre, duración y precio.
- CA1: Se muestran solo servicios con `is_active = true`, ordenados por `sort_order`.
- CA2: Cada tarjeta muestra nombre, duración (p. ej. "45 min") y precio formateado con la moneda del negocio.
- CA3: Tocar un servicio inicia el flujo de reserva con ese servicio preseleccionado.
- CA4: Tiene estados de carga (skeleton), vacío ("Aún no hay servicios") y error con "Reintentar".

**F3 · Reserva: profesional → día → horario disponible**
- CA1: Tras elegir servicio, se listan solo los profesionales que lo ofrecen (`professional_services`), más la opción "Cualquier profesional" *(opcional, ver §17; si no entra, se omite sin afectar el resto)*.
- CA2: El selector de día muestra desde hoy hasta `max_advance_days` (30 por defecto); los días sin horario laboral aparecen deshabilitados.
- CA3: Los horarios se calculan con el caso de uso `getAvailableSlots` (§6): respetan horario laboral, duración del servicio, citas ocupadas, intervalo de 15 min y antelación mínima.
- CA4: Si otra persona reserva un horario visible, este desaparece de la lista en ≤ 3 s sin acción del usuario (Realtime).
- CA5: La pantalla de confirmación resume servicio, profesional, fecha, hora (zona horaria del negocio) y precio; "Confirmar" crea la cita.
- CA6: Si el hueco se ocupó justo antes de confirmar, se muestra "Ese horario acaba de ocuparse" y se vuelve a la lista de horarios refrescada (no se crea nada).
- CA7: Un cliente no puede tener dos citas propias solapadas (error `ClientOverlapError`).

**F4 · Mis citas (cancelar / reprogramar)**
- CA1: Dos secciones: "Próximas" (orden ascendente) y "Pasadas/canceladas" (descendente).
- CA2: El detalle muestra servicio, profesional, fecha/hora y estado.
- CA3: "Cancelar" pide confirmación y cambia el estado a `cancelled`; el hueco vuelve a estar disponible para otros en vivo.
- CA4: "Reprogramar" reutiliza la pantalla de día/horario con el mismo servicio y profesional; al confirmar, la cita cambia de horario de forma **atómica** (nunca queda cancelada sin nueva hora).
- CA5: Cancelar/reprogramar solo se permite hasta `cancel_limit_hours` (2 h por defecto) antes del inicio; fuera de la ventana los botones se deshabilitan con el motivo, y la BD también lo rechaza.

**F5 · Recordatorio por push**
- CA1: Tras iniciar sesión, la app pide permiso de notificaciones y registra el Expo push token en `agendo.push_tokens`.
- CA2: Cada cita `booked` recibe **un** recordatorio `reminder_lead_minutes` antes (120 min por defecto), enviado por la Edge Function `agendo-send-reminders`.
- CA3: Nunca se envía dos veces el mismo recordatorio (`reminder_sent_at`), ni para citas canceladas.
- CA4: Tocar la notificación abre el detalle de la cita.
- CA5: Si el usuario deniega permisos, la app funciona igual y Ajustes muestra "Recordatorios desactivados".
- CA6: En modo demo se programa una **notificación local** simulada (sin backend) para enseñar el flujo.

**F6 · Agenda del día (rol admin)**
- CA1: La pestaña "Agenda" solo aparece para `admin`; un `client` que fuerce la ruta es redirigido.
- CA2: Muestra las citas `booked` del día seleccionado agrupadas por profesional y ordenadas por hora, con nombre del cliente y servicio.
- CA3: Permite ir al día anterior/siguiente y filtrar por profesional.
- CA4: Una reserva, cancelación o reprogramación hecha desde otro dispositivo aparece en ≤ 3 s sin recargar.
- CA5: Es de solo lectura en el MVP (marcar asistencia/no-show queda fuera).

**Transversales (también MVP):** modo demo (*Explore demo*), ajustes con tema claro/oscuro/sistema,
estados de carga/vacío/error en cada pantalla, deep link desde la notificación, manejo de errores tipados.

### 3.2 Fuera del MVP

| No se hace | Por qué |
|---|---|
| Multi-negocio (marketplace de barberías) | Multiplica RLS, onboarding y UI; un negocio basta para demostrar el valor. |
| Login con contraseña, magic link, Google o Apple | Convención común: email + código OTP. El magic link exige deep links de auth; OAuth, consolas externas. |
| Pagos o depósitos al reservar | Los pagos se demuestran en Vitrina. |
| Panel admin para crear/editar servicios, profesionales u horarios | Los datos vienen del seed; un CRUD no aporta al "Destaca". |
| Login de profesionales y su propia agenda | Requiere un tercer rol y más políticas RLS. |
| Días libres, vacaciones y festivos (`time_off`) | Útil pero no imprescindible; se cubre con `working_hours`. |
| Marcar asistencia / no-show / completada desde la app | La agenda del MVP es de solo lectura. |
| Lista de espera, citas recurrentes, reservas en grupo | Lógica compleja fuera del objetivo de 1 semana. |
| Recordatorios por email/SMS/WhatsApp | Push basta; SMS/WhatsApp requieren proveedores de pago. |
| Sincronización con Google Calendar / iCal | Integración externa con OAuth. |
| Reseñas y valoraciones | No forma parte del flujo de reserva. |
| Internacionalización (varios idiomas) | UI solo en inglés (mercado internacional). |
| Modo offline con cola de reservas | Una reserva necesita confirmación del servidor por definición. |
| Web (Expo web) | El objetivo es móvil; no se prueba ni se soporta. |

### 3.3 Futuro / Roadmap

- Rol `professional` con agenda propia y bloqueo de huecos.
- CRUD admin de servicios, profesionales, horarios y `time_off`.
- Marcar citas como completadas / no-show y métricas simples (ocupación, cancelaciones).
- Multi-negocio con búsqueda de negocios cercanos.
- Depósito o pago por adelantado con Stripe.
- Recordatorio adicional por email; varios recordatorios configurables.
- Lista de espera: aviso cuando se libera un hueco.
- "Añadir al calendario" del dispositivo.
- Localización (es/en) y selector de zona horaria del usuario.

---

## 4. Módulos / features

| Feature (`src/features/…`) | Descripción | Pantallas | ¿MVP? |
|---|---|---|---|
| `auth` | Email + código OTP, sesión, onboarding de nombre (`ensure_profile`), cierre de sesión | Sign in, Enter code, Onboarding | Sí |
| `demo` *(transversal)* | *Explore demo*: selector de rol, activa repos mock, badge "Demo" | Modal de rol (dentro de Sign in) | Sí |
| `catalog` | Servicios y profesionales del negocio | Services (home), Choose professional | Sí |
| `booking` | Días, horarios disponibles, confirmación, reprogramación; suscripción Realtime a disponibilidad | Choose slot, Confirm booking | Sí |
| `appointments` | Mis citas, detalle, cancelar/reprogramar | My appointments, Appointment detail | Sí |
| `notifications` | Permisos, registro de push token, notificación local en demo, deep link desde la notificación | (sin pantalla propia; sección en Settings) | Sí |
| `agenda` | Agenda del día para admin, en vivo | Agenda | Sí |
| `settings` *(transversal)* | Perfil (nombre), tema claro/oscuro/sistema, estado de notificaciones, cambio de rol en demo, cerrar sesión, versión | Settings | Sí |
| `business` *(dentro de `core`)* | Configuración del negocio (nombre, zona horaria, reglas) | — | Sí |
| `admin-catalog` | CRUD de servicios/profesionales/horarios | — | No |
| `staff` | Login y agenda del profesional | — | No |

---

## 5. Flujos de usuario y navegación

### 5.1 Flujos principales

**A. Primer inicio de sesión (cliente)**
1. Abre la app → *Sign in* (email + botón "Send code" + botón "Explore demo").
2. Escribe email → "Send code" → *Enter code* (campo de 6 dígitos; reenviar en 60 s).
3. Introduce el código del correo → `verifyOtp` → sesión activa.
4. No existe perfil → *Onboarding*: nombre completo → RPC `ensure_profile` crea `profiles` (`role = 'client'`).
5. Se pide permiso de notificaciones → se registra el token → *Services* (tab Home).

**B. Reservar**
1. *Services* → toca "Classic haircut · 30 min · $20".
2. *Choose professional* → lista de profesionales que lo ofrecen → elige "Marco".
3. *Choose slot* → tira horizontal de días (hoy + 30) → elige día → cuadrícula de horarios libres (Realtime activo).
4. Toca "10:30" → *Confirm booking* (resumen) → "Confirm".
5. Éxito → toast "Booked!" → *Appointment detail* de la nueva cita. La lista de *My appointments* se invalida.
   - Variante conflicto: la BD responde `SlotUnavailable` → aviso → vuelve a *Choose slot* con horarios refrescados.

**C. Cancelar / reprogramar**
1. Tab *Appointments* → toca una próxima cita → *Appointment detail*.
2. "Cancel" → diálogo de confirmación → estado `cancelled`.
3. "Reschedule" → *Choose slot* en modo `reschedule` (mismo servicio y profesional) → elige hora → *Confirm* muestra "antes → después" → "Confirm" → RPC atómica.

**D. Admin revisa el día**
1. Inicia sesión con cuenta admin → aparece la tab *Agenda*.
2. *Agenda* → hoy, agrupado por profesional → navega con ‹ › o filtra por profesional.
3. Una reserva nueva desde otro teléfono aparece en la lista sin recargar.

**E. Explore demo**
1. *Sign in* → "Explore demo" → hoja "Explore as: Client / Admin".
2. Se activan los repositorios mock con datos de ejemplo; aparece un badge "Demo" en la cabecera.
3. Todo el flujo funciona en memoria. En *Choose slot*, el mock simula una reserva concurrente de "otro usuario"
   unos segundos después de abrir la pantalla para mostrar el efecto Realtime *(decisión propia)*.
4. Ajustes → "Switch role (demo)" y "Exit demo" (vuelve a *Sign in* y borra el estado mock).

### 5.2 Mapa de rutas (Expo Router)

Se usan grupos y rutas protegidas (`Stack.Protected` con `guard`) en el layout raíz según `session`, `profile` y `isDemo`.

| Ruta (archivo en `app/`) | Pantalla | Acceso |
|---|---|---|
| `_layout.tsx` | Providers (QueryClient, tema, repos) + Stack raíz con guards | — |
| `(auth)/sign-in.tsx` | Sign in + Explore demo | Sin sesión |
| `(auth)/verify.tsx` | Enter code (OTP de 6 dígitos) | Sin sesión |
| `onboarding.tsx` | Nombre completo | Sesión sin perfil |
| `(app)/(tabs)/_layout.tsx` | Tabs: Home · Appointments · Agenda (admin) · Settings | Sesión o demo |
| `(app)/(tabs)/index.tsx` | Services | Sesión o demo |
| `(app)/(tabs)/appointments.tsx` | My appointments | Sesión o demo |
| `(app)/(tabs)/agenda.tsx` | Agenda del día | Solo `admin` |
| `(app)/(tabs)/settings.tsx` | Settings | Sesión o demo |
| `(app)/book/[serviceId]/index.tsx` | Choose professional | Sesión o demo |
| `(app)/book/[serviceId]/[professionalId].tsx` | Choose slot (`?rescheduleId=` opcional) | Sesión o demo |
| `(app)/book/confirm.tsx` | Confirm booking / reschedule (parámetros por query) | Sesión o demo |
| `(app)/appointments/[id].tsx` | Appointment detail | Dueño de la cita o admin |

Deep links: esquema `agendo://`, usado solo para `agendo://appointments/<id>` (al tocar la notificación). La auth no usa deep links.

---

## 6. Modelo de dominio

Modelos puros en `src/features/<feature>/domain/`, sin imports de Supabase ni de React. Fechas como `Date`
(instantes UTC); los cálculos por día se hacen en la **zona horaria del negocio**.

### 6.1 Entidades

| Entidad | Campos clave | Notas |
|---|---|---|
| `Business` | `id`, `name`, `timezone` (IANA), `currency` (ISO 4217), `slotIntervalMinutes` (15), `minNoticeMinutes` (60), `maxAdvanceDays` (30), `cancelLimitHours` (2), `reminderLeadMinutes` (120) | Una sola fila en el MVP. |
| `Profile` | `id` (= `auth.users.id`), `fullName`, `role: 'client' \| 'admin'` | Email viene de la sesión. |
| `Service` | `id`, `name`, `description`, `durationMinutes`, `priceCents`, `isActive`, `sortOrder` | Precio en centavos (entero). |
| `Professional` | `id`, `name`, `bio`, `avatarUrl?`, `isActive`, `serviceIds[]` | `avatarUrl` nulo → avatar con iniciales. |
| `WorkingHours` | `professionalId`, `weekday` (0 = domingo … 6), `startTime`, `endTime` | Varios bloques por día (p. ej. mañana y tarde). |
| `BusyRange` | `start`, `end` | Hueco ocupado **sin datos personales** (lo que un cliente puede saber de citas ajenas). |
| `Slot` | `start`, `end` | Resultado de `getAvailableSlots`. |
| `Appointment` | `id`, `clientId`, `professionalId`, `serviceId`, `start`, `end`, `status: 'booked' \| 'cancelled'`, `createdAt`, `cancelledAt?` + vista expandida (`serviceName`, `professionalName`, `clientName?`) | `completed`/`no_show` existen en el enum pero no se usan en el MVP. |

Relaciones: `Professional` N—M `Service` · `Professional` 1—N `WorkingHours` · `Appointment` N—1 `Profile`, `Professional`, `Service`.

### 6.2 Reglas de negocio

1. Un profesional no puede tener dos citas `booked` que se solapen (**garantizado por `EXCLUDE`**).
2. Un cliente no puede tener dos citas `booked` propias que se solapen (segundo `EXCLUDE`).
3. `end = start + service.durationMinutes`; lo calcula la BD, no el cliente.
4. La cita debe caber completa dentro de un bloque de `working_hours` del profesional ese día (zona del negocio).
5. `start` alineado al `slotIntervalMinutes` (múltiplo de 15 min desde el inicio del bloque).
6. `start ≥ now + minNoticeMinutes` y `start < hoy + maxAdvanceDays`.
7. El profesional debe ofrecer el servicio y ambos deben estar activos.
8. Cancelar/reprogramar solo si `start − now ≥ cancelLimitHours` y la cita está `booked` y es del usuario.
9. Rangos semiabiertos `[start, end)`: una cita que termina a las 10:30 no choca con otra que empieza a las 10:30.

Las reglas 1–8 se aplican en la BD (constraints + RPCs). Las 4–6 se replican en el cliente solo para **mostrar** huecos válidos.

### 6.3 Casos de uso (solo donde hay lógica real)

| Caso de uso | Lógica | Tests |
|---|---|---|
| `getAvailableSlots({ date, service, workingHours, busyRanges, business, now })` | Genera candidatos cada `slotIntervalMinutes` dentro de cada bloque laboral, descarta los que no caben, los que solapan `busyRanges` y los que violan antelación mínima/máxima; maneja zona horaria y cambios de horario (DST). Función pura. | Sí, exhaustivos (bordes, solapes, DST, día sin horario, rango semiabierto). |
| `getBookableDays({ from, business, workingHours })` | Lista de días seleccionables y cuáles están deshabilitados (sin horario). | Sí |
| `canModifyAppointment({ appointment, business, now })` | Devuelve `{ allowed, reason }` para habilitar Cancelar/Reprogramar. | Sí |
| `groupAgendaByProfessional(appointments)` | Agrupa y ordena la agenda del admin. | Sí |

**No** se crean casos de uso para listar servicios, listar citas, cancelar o reservar: son llamadas directas al repositorio.

### 6.4 Interfaces de repositorio

```ts
// catalog/domain
interface CatalogRepository {
  getBusiness(): Promise<Business>;
  listServices(): Promise<Service[]>;
  listProfessionals(serviceId: string): Promise<Professional[]>;
  getWorkingHours(professionalId: string): Promise<WorkingHours[]>;
}
// booking/domain
interface BookingRepository {
  getBusyRanges(professionalId: string, from: Date, to: Date): Promise<BusyRange[]>;
  book(input: { serviceId: string; professionalId: string; start: Date }): Promise<Appointment>;
  reschedule(appointmentId: string, newStart: Date): Promise<Appointment>;
  subscribeToAvailability(professionalId: string, onChange: () => void): Unsubscribe;
}
// appointments/domain
interface AppointmentsRepository {
  listMine(): Promise<Appointment[]>;
  getById(id: string): Promise<Appointment>;
  cancel(id: string): Promise<void>;
}
// agenda/domain
interface AgendaRepository {
  listForDay(date: Date, professionalId?: string): Promise<Appointment[]>;
  subscribe(onChange: () => void): Unsubscribe;
}
// auth/domain: AuthRepository (sendCode(email), verifyCode(email, code), getSession, onAuthChange, signOut)
// auth/domain: ProfileRepository (getMine, ensureMine(fullName) → RPC ensure_profile, updateName)
// Todos los métodos lanzan DomainError tipado si fallan (convención del CLAUDE.md, regla 6).
// notifications/domain: PushTokenRepository (register(token, platform), remove(token))
```

### 6.5 Errores de dominio tipados

`src/core/errors/` define `DomainError` como unión discriminada por `code`. Los repositorios **lanzan** `DomainError`
(no devuelven `Result`): TanStack Query lo expone tipado en `error` sin adaptadores.

| `code` | Cuándo | Origen típico |
|---|---|---|
| `slotUnavailable` | El hueco ya está ocupado | SQLSTATE `23P01` (EXCLUDE) sobre el profesional |
| `clientOverlap` | El cliente ya tiene otra cita a esa hora | `23P01` sobre el constraint de cliente |
| `outsideWorkingHours` | No cabe en el horario laboral | RPC `raise` con código propio |
| `bookingWindow` | Viola antelación mínima o máxima | RPC |
| `cancellationWindowClosed` | Fuera de `cancelLimitHours` | RPC |
| `notFound` | Cita/servicio inexistente o sin permiso de lectura | PostgREST `PGRST116` / RPC |
| `unauthorized` | Sin sesión o sesión expirada | 401 / JWT |
| `forbidden` | Rol insuficiente | RLS / RPC |
| `validation` | Datos de entrada inválidos | zod / RPC |
| `invalidCode` / `codeExpired` | Código OTP incorrecto o caducado | `verifyOtp` |
| `network` | Sin conexión / timeout | fetch |
| `unknown` | Cualquier otro | — |

Los repos `supabase_*` traducen errores del SDK con un mapper único (`mapSupabaseError`). La UI nunca ve un error crudo.

---

## 7. Backend: uso de Supabase

### 7.1 Schema `agendo` y tablas

Extensión requerida: `btree_gist` (para combinar `=` y `&&` en el `EXCLUDE`). Se crea en el schema `extensions`.

Enums: `agendo.user_role ('client','admin')`, `agendo.appointment_status ('booked','cancelled','completed','no_show')`.

| Tabla | Columnas clave | Constraints |
|---|---|---|
| `business` | `id uuid pk`, `name text`, `timezone text`, `currency char(3)`, `slot_interval_minutes int default 15`, `min_notice_minutes int default 60`, `max_advance_days int default 30`, `cancel_limit_hours int default 2`, `reminder_lead_minutes int default 120` | checks > 0; una sola fila (índice único sobre `(true)`) |
| `profiles` | `id uuid pk references auth.users on delete cascade`, `full_name text not null`, `role user_role not null default 'client'`, `created_at` | `char_length(full_name) between 2 and 80` |
| `services` | `id uuid pk`, `name`, `description`, `duration_minutes int`, `price_cents int`, `is_active bool`, `sort_order int` | `duration_minutes between 5 and 480`, `price_cents >= 0` |
| `professionals` | `id uuid pk`, `name`, `bio`, `avatar_url`, `is_active bool` | — |
| `professional_services` | `professional_id fk`, `service_id fk` | pk compuesta |
| `working_hours` | `id`, `professional_id fk`, `weekday smallint`, `start_time time`, `end_time time` | `weekday between 0 and 6`, `end_time > start_time`; `EXCLUDE` para que los bloques del mismo día no se solapen |
| `appointments` | `id uuid pk`, `client_id fk profiles`, `professional_id fk`, `service_id fk`, `starts_at timestamptz`, `ends_at timestamptz`, `during tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored`, `status appointment_status default 'booked'`, `reminder_sent_at timestamptz`, `cancelled_at timestamptz`, `created_at`, `updated_at` | `ends_at > starts_at`; **EXCLUDE** (abajo) |
| `push_tokens` | `id`, `user_id fk profiles`, `token text unique`, `platform text`, `updated_at` | `platform in ('android','ios')` |

**Restricción anti doble reserva (el corazón de la app):**

```sql
alter table agendo.appointments
  add constraint appointments_no_double_booking
  exclude using gist (professional_id with =, during with &&)
  where (status = 'booked');

alter table agendo.appointments
  add constraint appointments_no_client_overlap
  exclude using gist (client_id with =, during with &&)
  where (status = 'booked');
```

Las citas canceladas no bloquean el hueco (cláusula `where`). Índices: `(professional_id, starts_at)`, `(client_id, starts_at)`, y parcial `(starts_at) where status = 'booked' and reminder_sent_at is null` para el job de recordatorios.

Vista `agendo.appointments_expanded` (`security_invoker = true`, respeta RLS): une servicio, profesional y nombre del cliente para *My appointments* y *Agenda*.

### 7.2 RLS

RLS activado en **todas** las tablas; cada política va comentada en la migración. Helper `agendo.is_admin()` (`security definer`, `stable`, `search_path = ''`) que lee el rol de `auth.uid()`.

| Tabla | Política | Qué protege |
|---|---|---|
| `business` | `select` para `anon` y `authenticated` | Info pública del negocio; permite el ping de keep-alive con la publishable key. Sin escritura. |
| `services`, `professionals`, `professional_services`, `working_hours` | `select` para `authenticated` | El catálogo solo lo ve quien inició sesión. Sin políticas de escritura (solo migraciones/seed). |
| `profiles` | `select` propio (`id = auth.uid()`) o `is_admin()` | Un cliente no ve datos de otros clientes; el admin ve nombres para la agenda. |
| `profiles` | **Sin** política de `insert`: el perfil solo se crea con la RPC `ensure_profile()` | Nadie puede crearse un perfil ajeno ni autoasignarse `admin`. |
| `profiles` | `update` propio + trigger que bloquea cambios de `role` | Solo se edita el nombre. |
| `appointments` | `select` si `client_id = auth.uid()` o `is_admin()` | Un cliente solo ve sus citas. **Sin** políticas de insert/update/delete: todo cambio pasa por RPCs. |
| `push_tokens` | `select/insert/update/delete` si `user_id = auth.uid()` | Cada usuario gestiona solo sus tokens; la Edge Function los lee con la secret key. |
| `realtime.messages` | `select` para `authenticated` en topics `agendo:availability:%`; topic `agendo:agenda` solo si `is_admin()` | Solo usuarios con sesión reciben eventos de disponibilidad; la agenda solo el admin. |

Además: `grant usage on schema agendo` a `anon, authenticated, service_role` y grants por tabla mínimos (los schemas propios no los traen por defecto).

### 7.3 Lógica en BD

| Objeto | Tipo | Qué hace |
|---|---|---|
| `appointments_no_double_booking`, `appointments_no_client_overlap` | EXCLUDE | Reglas 1 y 2, a prueba de concurrencia. |
| `set_updated_at` | Trigger | Mantiene `updated_at`. |
| `ensure_profile(p_full_name)` | RPC `security definer`, idempotente | Crea `profiles` para `auth.uid()` con `role = 'client'` si no existe; si existe, lo devuelve sin cambios. Único camino para crear perfiles (convención del proyecto compartido). |
| `prevent_role_change` | Trigger `before update` en `profiles` | Rechaza cambios de `role` salvo desde `service_role`/SQL directo. |
| `get_busy_ranges(p_professional_id, p_from, p_to)` | RPC `security definer` | Devuelve solo `(starts_at, ends_at)` de citas `booked`, **sin** cliente ni servicio. Permite calcular huecos sin exponer datos ajenos. |
| `book_appointment(p_service_id, p_professional_id, p_starts_at)` | RPC `security definer` | Valida sesión, perfil, reglas 3–7; calcula `ends_at`; inserta con `client_id = auth.uid()`. El EXCLUDE resuelve la carrera. Devuelve la cita. |
| `cancel_appointment(p_id)` | RPC `security definer` | Valida propiedad (o admin) y regla 8; pone `status = 'cancelled'`, `cancelled_at = now()`. |
| `reschedule_appointment(p_id, p_new_starts_at)` | RPC `security definer` | Valida regla 8 sobre la hora actual y 4–7 sobre la nueva; hace un `update` de `starts_at/ends_at` en una sola sentencia (atómico); resetea `reminder_sent_at`. |
| `broadcast_appointment_change` | Trigger `after insert/update` en `appointments` | Llama a `realtime.send(...)` con payload mínimo `{ professional_id, date }` al topic `agendo:availability:<professional_id>` y al topic `agendo:agenda`. |
| Job `pg_cron` `agendo-reminders` | `pg_cron` + `pg_net` | Cada 5 min invoca la Edge Function `agendo-send-reminders` con un secreto compartido guardado en Vault. Se crea en su migración y se elimina solo por nombre (`cron.unschedule('agendo-reminders')`). |

Todas las RPC: `set search_path = ''`, nombres calificados, `grant execute` solo a `authenticated`. Errores de negocio con `raise exception using errcode = 'P0001', message = '<code>'` (p. ej. `outsideWorkingHours`) para que el mapper los traduzca 1:1 a `DomainError`.

### 7.4 Auth, perfiles y roles

- **Método (convención común de las 4 apps):** `signInWithOtp({ email, options: { shouldCreateUser: true } })` y luego
  `verifyOtp({ email, token, type: 'email' })` con el código de 6 dígitos. Sin magic link ni contraseñas, así que no
  hay Redirect URLs ni deep links de auth.
- **Configuración compartida** (una sola para el proyecto): "Confirm email" activado; plantilla de email genérica con
  `{{ .Token }}`; SMTP propio en remoto (el SMTP por defecto tiene un límite muy bajo). Ver `CLAUDE.md`.
- **Sesión** persistida con `@react-native-async-storage/async-storage`; `autoRefreshToken` controlado con `AppState`.
- **Perfil:** `auth.users` es compartido entre apps del portafolio, así que **no** se usa un trigger sobre
  `auth.users`: tras el onboarding la app llama a `agendo.ensure_profile(full_name)` (crea el perfil con rol `client`).
- **Admin:** en local, el seed crea `admin@agendo.dev` con `role = 'admin'`. En remoto se promueve con
  `update agendo.profiles set role = 'admin' where id = '<uuid>'` vía `psql`.
- Emails en local: Supabase local los captura en su bandeja web (Inbucket/Mailpit), sin envío real.

### 7.5 Realtime, Storage y Edge Functions

| Servicio | ¿Se usa? | Detalle |
|---|---|---|
| **Realtime — Broadcast desde BD** | Sí | Canales privados `agendo:availability:<professional_id>` (pantalla *Choose slot*) y `agendo:agenda` (admin), con el prefijo de la app porque los topics son globales al proyecto. Se usa Broadcast y no `postgres_changes` porque RLS impide que un cliente vea citas ajenas, y aun así debe enterarse de que un hueco se ocupó. El payload no lleva datos personales; al recibirlo, la app invalida la query correspondiente. |
| **Storage** | No | Avatares de profesionales como URLs estáticas del seed o iniciales. Subir imágenes queda fuera. |
| **Edge Function `agendo-send-reminders`** | Sí | Justificada por secretos: necesita la **secret key** para leer citas y tokens de todos los usuarios, y el `AGENDO_EXPO_ACCESS_TOKEN` para la API de Expo Push. Busca citas `booked` con `starts_at` entre `now` y `now + reminder_lead_minutes` y `reminder_sent_at is null`, envía por lotes a `https://exp.host/--/api/v2/push/send`, marca `reminder_sent_at` y borra tokens `DeviceNotRegistered`. Se despliega con `--no-verify-jwt` y valida el header `x-cron-secret`. |
| Otras Edge Functions | No | Reservar/cancelar no requieren secretos: van por RPC. |

### 7.6 Migraciones, seed y entornos

- **Migraciones** en `supabase/migrations/` (creadas con `supabase migration new <nombre>`), tocando **solo** el schema `agendo`:
  1. `..._agendo_schema.sql` — schema, extensiones, enums, tablas, constraints, índices, grants.
  2. `..._agendo_rls.sql` — `is_admin()`, RLS y políticas comentadas (incluye `realtime.messages`).
  3. `..._agendo_rpc.sql` — RPCs y triggers.
  4. `..._agendo_reminders_cron.sql` — job `pg_cron` `agendo-reminders` + lectura de secretos desde Vault.
- **Local:** `supabase start` (Docker) + `supabase db reset` aplica migraciones y `supabase/seed.sql`. En `supabase/config.toml` se agrega `agendo` a `[api].schemas` y `extra_search_path`.
- **Remoto (proyecto compartido):** `psql "$SUPABASE_DB_URL" -f supabase/migrations/<archivo>.sql` en orden.
  **Nunca `supabase db push`** (historial de migraciones compartido entre repos). Exponer `agendo` en *API settings*.
  Edge Function: `supabase functions deploy agendo-send-reminders --no-verify-jwt` y `supabase secrets set AGENDO_...` (los secretos son globales al proyecto: siempre con prefijo `AGENDO_`).
- **`seed.sql`** (datos realistas): negocio "Northside Barber Co." (zona horaria propuesta, ver §17), 3 profesionales,
  6 servicios (15–60 min, precios variados), horarios lun–sáb con pausa de almuerzo, ~25 citas en los últimos 7 y
  próximos 7 días (fechas relativas a `now()` para que la demo nunca esté vacía), usuarios locales
  `client@agendo.dev` y `admin@agendo.dev`. En remoto se aplica solo la parte de catálogo (sin `auth.users`).
- **Keep-alive:** vive en este repo (`.github/workflows/keep-alive.yml`), cron cada 3 días. Hace un `GET` a
  `${SUPABASE_URL}/rest/v1/business?select=id&limit=1` con headers `apikey` y `Accept-Profile: agendo`.

---

## 8. Arquitectura

### 8.1 Capas y reglas de dependencia

- `domain` → modelos, interfaces de repositorio, casos de uso puros (`getAvailableSlots`…). No importa nada de `data`, React, Expo ni Supabase.
- `data` → `supabase_*_repository.ts` y `mock_*_repository.ts` implementan las interfaces. Mappers solo donde el formato difiere (snake_case → camelCase y `tstzrange`/timestamps → `Date`, es decir, en `appointments` y `business`).
- `presentation` → pantallas, componentes y hooks de TanStack Query. Solo conoce interfaces de `domain` y obtiene las implementaciones del contenedor de repos.
- `core` → cliente Supabase, contenedor de repos, tema, errores (`DomainError`), utilidades de fecha/zona horaria.
- Las carpetas de `app/` (Expo Router) son **finas**: solo reexportan la pantalla de `src/features/*/presentation/screens`.
- Se hace cumplir con ESLint (`no-restricted-imports` en `**/domain/**`).

### 8.2 Árbol de archivos (ejemplo, no exhaustivo)

```
Agendo/
├── app/                                  # Expo Router (rutas finas)
│   ├── _layout.tsx
│   ├── onboarding.tsx
│   ├── (auth)/sign-in.tsx · verify.tsx
│   └── (app)/
│       ├── (tabs)/_layout.tsx · index.tsx · appointments.tsx · agenda.tsx · settings.tsx
│       ├── book/[serviceId]/index.tsx · [professionalId].tsx
│       ├── book/confirm.tsx
│       └── appointments/[id].tsx
├── src/
│   ├── core/
│   │   ├── config/env.ts                 # lee y valida EXPO_PUBLIC_* con zod
│   │   ├── supabase/client.ts            # createClient + .schema('agendo')
│   │   ├── di/repositories.tsx           # RepositoryProvider (supabase | mock)
│   │   ├── errors/{domain-error.ts,result.ts,map-supabase-error.ts}
│   │   ├── theme/{tokens.ts,theme-store.ts}
│   │   ├── time/zoned.ts                 # helpers de zona horaria
│   │   └── ui/                           # Button, Card, Skeleton, EmptyState, ErrorState, Toast
│   └── features/
│       ├── auth/{domain,data,presentation}
│       ├── demo/{data/mock-db.ts,data/fixtures.ts,presentation}
│       ├── catalog/{domain,data,presentation}
│       ├── booking/
│       │   ├── domain/{slot.ts,booking-repository.ts,get-available-slots.ts,get-bookable-days.ts}
│       │   ├── data/{supabase-booking-repository.ts,mock-booking-repository.ts}
│       │   └── presentation/{screens,components,hooks/use-available-slots.ts}
│       ├── appointments/{domain,data,presentation}
│       ├── agenda/{domain,data,presentation}
│       ├── notifications/{domain,data,presentation}
│       └── settings/presentation
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── seed.sql
│   ├── tests/                            # pgTAP (EXCLUDE y RLS)
│   └── functions/agendo-send-reminders/index.ts
├── .maestro/{book-appointment.yaml,admin-agenda.yaml}
├── .github/workflows/{ci.yml,release.yml,keep-alive.yml}
├── docs/definicion.md
├── assets/{icon.png,adaptive-icon.png,splash-icon.png}
├── app.json · eas.json · tailwind.config.js · global.css · babel.config.js · metro.config.js
├── jest.config.js · eslint.config.js · .prettierrc · tsconfig.json
└── .env.example · README.md · CLAUDE.md (solo si el repo necesita reglas propias)
```

### 8.3 Repositorios intercambiables y modo demo

- `src/core/di/repositories.tsx` define `Repositories` (un objeto con todas las interfaces) y dos fábricas:
  `createSupabaseRepositories(client)` y `createMockRepositories(mockDb)`.
- Un `RepositoryProvider` (React Context) expone el objeto; los hooks hacen `useRepositories().booking`.
- La elección depende de `useSessionStore().mode: 'supabase' | 'demo'` (Zustand). *Explore demo* cambia a `demo`,
  crea un `mockDb` en memoria desde `fixtures.ts` (mismas entidades que el seed, fechas relativas a hoy) y hace
  `queryClient.clear()` para no mezclar cachés. "Exit demo" revierte.
- Los mocks simulan latencia (200–400 ms), errores de dominio reales (el mock de `book` también rechaza solapes) y
  eventos Realtime mediante un emisor interno. Así el modo demo es fiel y los mismos mocks sirven para los tests.
- El modo demo **no** necesita red: funciona con el backend pausado o sin `.env`.
- `EXPO_PUBLIC_DATA_SOURCE=mock` permite arrancar siempre en mock (desarrollo de UI sin Supabase).

### 8.4 Estado y manejo de errores

| Tipo de estado | Herramienta | Ejemplos |
|---|---|---|
| Datos del servidor | **TanStack Query** | `['services']`, `['professionals', serviceId]`, `['busy', professionalId, day]`, `['appointments','mine']`, `['agenda', day, professionalId]` |
| Estado del cliente | **Zustand** | `sessionStore` (modo, rol demo), `themeStore` (persistido con AsyncStorage), `bookingDraftStore` (servicio/profesional/hora elegidos) |
| Formularios | **React Hook Form + zod** | Email, código OTP, nombre |

- Los horarios disponibles son **derivados**: `useAvailableSlots` combina `['busy', …]` + working hours + `getAvailableSlots` (con `select`/`useMemo`), no se cachean aparte.
- Realtime: `useAvailabilitySubscription(professionalId)` llama a `invalidateQueries(['busy', professionalId])` al recibir un evento. Reservar, cancelar y reprogramar invalidan `['appointments']`, `['busy']` y `['agenda']`.
- Los repos **lanzan** `DomainError` (nunca errores crudos del SDK); TanStack Query lo expone tipado en `error`, sin adaptadores.
- Un componente `ErrorState` traduce cada `code` a un mensaje amigable + acción ("Retry", "Choose another time", "Sign in again"). `unauthorized` provoca cierre de sesión global.
- `onlineManager` de TanStack Query + `@react-native-community/netinfo` para pausar reintentos sin red.

---

## 9. Stack y dependencias principales

Las versiones las fija `npx expo install` según el SDK estable más reciente.

| Paquete | Para qué |
|---|---|
| `expo`, `expo-router` | Framework y navegación por archivos |
| `typescript` (strict) | Tipado |
| `@supabase/supabase-js` | Cliente de Supabase (auth, RPC, Realtime) |
| `@react-native-async-storage/async-storage` | Persistir sesión y tema |
| `@tanstack/react-query` | Estado del servidor, caché, reintentos |
| `zustand` | Estado del cliente |
| `zod`, `react-hook-form`, `@hookform/resolvers` | Formularios y validación (también de env) |
| `nativewind`, `tailwindcss`, `react-native-reanimated`, `react-native-safe-area-context` | Estilos (NativeWind) |
| `@shopify/flash-list` | Listas (servicios, citas, agenda, horarios) |
| `date-fns`, `@date-fns/tz` | Fechas y zona horaria del negocio |
| `expo-notifications`, `expo-device`, `expo-constants` | Push token, permisos, notificación local en demo |
| `expo-linking` | Deep link desde la notificación al detalle de la cita |
| `expo-splash-screen`, `expo-font`, `@expo-google-fonts/manrope` | Splash y tipografía |
| `expo-haptics` | Feedback al confirmar reserva |
| `@react-native-community/netinfo` | Estado de red para TanStack Query |
| `expo-dev-client` | Development build (push no funciona en Expo Go) |
| **Dev:** `jest`, `jest-expo`, `@testing-library/react-native`, `@types/jest` | Tests unitarios y de componentes |
| **Dev:** `eslint`, `eslint-config-expo`, `prettier`, `eslint-config-prettier`, `prettier-plugin-tailwindcss` | Lint y formato |
| **Herramientas:** `supabase` CLI, `eas-cli`, Maestro CLI, `psql` | Backend local, builds, E2E, migraciones remotas |

---

## 10. Andamiaje inicial desde la CLI

> **El repositorio git lo inicializa el autor manualmente.** Estos pasos no ejecutan `git init`.
> Los comandos se ejecutan dentro de la carpeta existente `Agendo/`.

**1. Crear el proyecto (Expo Router + TypeScript).** Se usa la plantilla `default` de `create-expo-app`, que ya
incluye Expo Router, TypeScript y la estructura `app/`; es la base oficial recomendada y evita configurar el
router a mano. `docs/` ya existe: si la CLI se queja de que la carpeta no está vacía, mover `docs/` temporalmente.

```bash
cd Agendo
npx create-expo-app@latest . --template default
npm run reset-project          # mueve el ejemplo a app-example/ y deja app/ limpio
rm -rf app-example
```

Después, en `app.json`: `name: "Agendo"`, `slug: "agendo"` (minúsculas, como el repo), `scheme: "agendo"`,
`android.package` y `ios.bundleIdentifier` = `com.malpidev.agendo` *(propuesta)*, `userInterfaceStyle: "automatic"`.

**2. Dependencias de runtime.**

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage \
  @tanstack/react-query zustand zod react-hook-form @hookform/resolvers \
  @shopify/flash-list date-fns @date-fns/tz \
  expo-notifications expo-device expo-constants expo-linking \
  expo-splash-screen expo-font @expo-google-fonts/manrope expo-haptics \
  @react-native-community/netinfo expo-dev-client
```

(Si la guía oficial vigente de Supabase para Expo lo sigue indicando, añadir `react-native-url-polyfill`.)

**3. TypeScript strict.** En `tsconfig.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`, alias
`"@/*": ["./src/*"]`. Script `"typecheck": "tsc --noEmit"`.

**4. NativeWind.** Seguir la guía oficial de la versión estable vigente de NativeWind:

```bash
npx expo install nativewind react-native-reanimated react-native-safe-area-context
npx expo install --dev tailwindcss prettier-plugin-tailwindcss
npx tailwindcss init
```

Crear `global.css`, configurar `tailwind.config.js` (content `app/**`, `src/**`, preset de NativeWind,
`darkMode: 'class'` y tokens de §11), `babel.config.js`, `metro.config.js` (`withNativeWind`) y `nativewind-env.d.ts`.
(La versión de Tailwind compatible depende de la versión de NativeWind; respetar la que indique su guía.)

**5. ESLint + Prettier.**

```bash
npx expo lint                              # genera eslint.config.js con eslint-config-expo
npx expo install --dev prettier eslint-config-prettier
```

Añadir `.prettierrc` (con `prettier-plugin-tailwindcss`), regla `no-restricted-imports` para `domain/` y scripts
`"lint": "expo lint"`, `"format": "prettier --write ."`.

**6. Jest.**

```bash
npx expo install --dev jest jest-expo @types/jest @testing-library/react-native
```

`jest.config.js` con `preset: 'jest-expo'` y alias `@/`. Script `"test": "jest"`.

**7. Estructura de carpetas.** Crear `src/core/*` y `src/features/*/{domain,data,presentation}` según §8.2,
`.maestro/`, `.github/workflows/`, `.env.example` y añadir `.env` y `.env.local` a `.gitignore`.

**8. Supabase local.**

```bash
supabase init                              # crea supabase/ y config.toml
supabase start                             # Docker: Postgres, Auth, Realtime, Studio, bandeja de emails
supabase migration new agendo_schema       # repetir para rls, rpc, reminders_cron
supabase db reset                          # aplica migraciones + seed.sql
supabase functions new agendo-send-reminders
```

En `config.toml`: añadir `agendo` a `[api].schemas` y `[functions.agendo-send-reminders] verify_jwt = false`.

**9. EAS.**

```bash
npm install -g eas-cli
eas login
eas init                                   # crea el proyecto EAS y escribe el projectId (necesario para push)
eas build:configure                        # crea eas.json
```

`eas.json` con perfiles `development` (`developmentClient: true`), `preview` (Android `buildType: "apk"`,
`distribution: "internal"`) y `production`. Para push en Android: credenciales FCM (`google-services.json`) vía `eas credentials`.

---

## 11. Identidad visual

**Concepto:** calma y confianza (salud/bienestar) con un toque cálido de "cita personal". Evitar el azul genérico.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `primary` | `#0F766E` (teal 700) | `#2DD4BF` (teal 400) | Botones, horario seleccionado, tab activa |
| `on-primary` | `#FFFFFF` | `#042F2E` | Texto sobre primary |
| `accent` | `#F97360` (coral) | `#FB8A7A` | Badges, "Demo", destacados |
| `background` | `#F7F8F6` | `#0B1215` | Fondo |
| `surface` | `#FFFFFF` | `#131C20` | Tarjetas, hojas |
| `surface-muted` | `#EEF2F0` | `#1B262B` | Horario no disponible, skeletons |
| `text` | `#111827` | `#E6EDEA` | Texto principal |
| `text-muted` | `#6B7280` | `#94A3A0` | Secundario |
| `border` | `#E2E8E4` | `#24323A` | Separadores |
| `success` / `warning` / `danger` | `#16A34A` / `#D97706` / `#DC2626` | `#4ADE80` / `#FBBF24` / `#F87171` | Estados (reservada, ventana cerrada, cancelada) |

- **Tipografía:** Manrope (400, 600, 700) vía `@expo-google-fonts/manrope`; números tabulares en horarios.
- **Ícono:** calendario redondeado en teal con un check/tijera minimalista en coral; fondo adaptativo teal oscuro. Sin texto.
- **Splash:** fondo `#0F766E` (claro) / `#0B1215` (oscuro) con el ícono centrado (`expo-splash-screen` con variante `dark`).
- **Modo oscuro obligatorio:** tema `system | light | dark` en Ajustes, persistido; NativeWind `dark:` + tokens. Contraste AA verificado en ambos modos.
- **Componentes firma:** chip de horario (disponible / seleccionado / desapareciendo con animación de salida al llegar un evento Realtime), tira de días horizontal, tarjeta de cita con barra de color por estado.

---

## 12. Estados de UI y datos de demo

### 12.1 Estados por pantalla

| Pantalla | Carga | Vacío | Error |
|---|---|---|---|
| Sign in / Enter code | Botón con spinner, deshabilitado | — | Mensaje en línea (email inválido, código incorrecto o caducado, rate limit, sin red) |
| Onboarding | Botón con spinner | — | Error en línea + reintentar |
| Services | Skeleton de 4 tarjetas | "No services available yet" | ErrorState + Retry |
| Choose professional | Skeleton de avatares | "No one offers this service right now" | ErrorState + Retry |
| Choose slot | Skeleton de chips | "No free times this day — try another day" (+ sugerencia del siguiente día con huecos) | ErrorState + Retry; aviso "Live updates paused" si Realtime se desconecta |
| Confirm booking | Botón con spinner | — | `slotUnavailable` → volver a horarios; otros → mensaje + Retry |
| My appointments | Skeleton de lista | "No appointments yet" + CTA "Book now" | ErrorState + Retry; pull-to-refresh |
| Appointment detail | Skeleton | — | `notFound` → "This appointment no longer exists"; cancelar fuera de ventana → motivo |
| Agenda (admin) | Skeleton por profesional | "No appointments for this day" | ErrorState + Retry |
| Settings | — | — | Error al guardar nombre en línea |

### 12.2 Datos de demo

`src/features/demo/data/fixtures.ts` y `supabase/seed.sql` comparten el mismo contenido (mismos nombres, IDs estables):
- **Negocio:** Northside Barber Co. · moneda USD · reglas por defecto de §6.1.
- **Profesionales (3):** Marco (cortes y barba), Lena (color y cortes), Sam (barba y afeitado), cada uno con bio corta.
- **Servicios (6):** Classic haircut 30 min $20 · Skin fade 45 min $28 · Beard trim 20 min $12 · Haircut + beard 60 min $35 · Hot towel shave 30 min $22 · Kids cut 25 min $15.
- **Horarios:** lun–vie 9:00–13:00 y 14:00–19:00; sáb 10:00–16:00; domingo cerrado. Sam no trabaja los lunes.
- **Citas:** ~25 repartidas en ±7 días relativas a hoy, con clientes ficticios ("Alex Rivera", "Priya Shah"…), algunas canceladas; el usuario demo tiene 2 próximas y 3 pasadas; hoy siempre hay 4–6 citas para que la agenda admin luzca llena.
- **Simulación Realtime (solo mock):** una reserva de "otro cliente" en un hueco visible ~5 s después de abrir *Choose slot* (una vez por sesión).

---

## 13. Estrategia de testing

| Nivel | Qué | Herramienta |
|---|---|---|
| **Dominio (prioridad máxima)** | `getAvailableSlots` (bordes de bloque, servicio más largo que el hueco, solapes parciales, rango semiabierto, antelación mínima/máxima, día sin horario, DST de la zona del negocio), `getBookableDays`, `canModifyAppointment`, `groupAgendaByProfessional` | Jest |
| **Repositorios** | Mocks: rechazan solapes, respetan ventana de cancelación, emiten eventos. `mapSupabaseError`: `23P01`→`slotUnavailable`/`clientOverlap`, `P0001`+mensaje→`code`, red→`network`. Repos Supabase con el cliente simulado (respuestas y errores fijos). | Jest |
| **Componentes clave** | Sign in (validación zod), SlotGrid (render de estados y desaparición al invalidar), Confirm (flujo de conflicto), AppointmentDetail (botones deshabilitados fuera de ventana), EmptyState/ErrorState | React Native Testing Library + repos mock |
| **Base de datos** *(recomendado, local)* | EXCLUDE rechaza doble reserva y permite reservar un hueco cancelado; RLS: cliente no ve citas ajenas, no puede autoasignarse admin; `get_busy_ranges` no expone datos personales | pgTAP con `supabase test db` |
| **E2E** | `book-appointment.yaml` (obligatorio): Explore demo → Client → servicio → profesional → día → horario → Confirm → aparece en Appointments → Cancel. `admin-agenda.yaml` (opcional): Explore demo → Admin → Agenda muestra citas de hoy. | Maestro (sobre APK `preview`, en modo demo para que sea determinista) |

Se usan `testID` estables en elementos que tocan los flujos de Maestro. El reloj se inyecta (`now`) en los casos de uso para tests deterministas.

---

## 14. CI/CD y entrega

| Workflow | Disparador | Pasos |
|---|---|---|
| `ci.yml` | `pull_request` y `push` a `main` | `npm ci` → `npm run lint` → `npm run typecheck` → `npm test -- --ci` |
| `release.yml` | tag `v*` | CI completo → `expo/expo-github-action` con `EXPO_TOKEN` → `eas build -p android --profile preview --non-interactive --wait` → descargar el APK → crear GitHub Release con el APK adjunto y notas |
| `keep-alive.yml` | `schedule: cron '0 12 */3 * *'` + `workflow_dispatch` | `curl` de solo lectura a `business` (ver §7.6). Falla visible si el proyecto está pausado. |

- **EAS Build:** `development` para desarrollo diario (development build, necesario por push), `preview` = APK de demo con internal distribution, `production` reservado.
- **Maestro** se ejecuta localmente antes de cada release (en CI queda como mejora futura por el coste de emulador).
- **pgTAP** se ejecuta localmente con `supabase test db` (no en CI en el MVP).
- **Versionado:** `v0.x` durante el desarrollo; `v1.0.0` = MVP listo con demo pública. `version` de `app.json` sincronizada con el tag.
- **Ramas:** `main` siempre funcional, `feat/<nombre>`, squash merge, Conventional Commits.

---

## 15. Variables de entorno

**`.env.example` (app, commiteado; `.env` nunca):**

```dotenv
# URL del proyecto Supabase compartido (local: http://127.0.0.1:54321 o la IP LAN para dispositivo físico)
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
# Publishable key (sb_publishable_…). NUNCA la secret key en el cliente.
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
# Fuente de datos al arrancar: "supabase" (por defecto) o "mock" (fuerza modo demo, útil sin backend)
EXPO_PUBLIC_DATA_SOURCE=supabase
```

`src/core/config/env.ts` valida estas variables con zod al arrancar; si faltan las de Supabase, la app arranca
igualmente y solo ofrece *Explore demo* (con aviso).

**Secretos de la Edge Function** (`supabase/functions/.env` en local, `supabase secrets set` en remoto; documentados en `supabase/functions/.env.example`):

| Variable | Descripción |
|---|---|
| `AGENDO_EXPO_ACCESS_TOKEN` | Token de Expo para la API de push (seguridad de push mejorada). |
| `AGENDO_REMINDERS_CRON_SECRET` | Secreto compartido que `pg_cron` envía en `x-cron-secret`. También se guarda en Vault. |
| URL y secret key de Supabase | Las inyecta Supabase automáticamente en el entorno de la función; no se definen a mano. |

Los secretos de Edge Functions son **globales al proyecto compartido**, por eso llevan el prefijo `AGENDO_`.

**Secretos de GitHub Actions:** `EXPO_TOKEN` (EAS en CI), `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` (keep-alive).
`SUPABASE_DB_URL` solo en la máquina del autor para `psql` (no en CI).

---

## 16. Definición de terminado

Para pasar a ✅ **MVP listo**:
- [ ] F1–F6 cumplen todos sus criterios de aceptación en Android (e iOS si es posible).
- [ ] La doble reserva es imposible: probado con dos dispositivos reservando el mismo hueco y con test pgTAP/mock.
- [ ] Los horarios desaparecen en vivo en *Choose slot* y la agenda admin se actualiza sola.
- [ ] Llega el recordatorio push de una cita real (development/preview build) y abre el detalle.
- [ ] Modo demo completo sin backend (cliente y admin), incluso con `.env` vacío.
- [ ] Estados de carga, vacío y error en cada pantalla de §12.1.
- [ ] Tests unitarios de dominio y repositorios en verde + flujo `book-appointment.yaml` de Maestro pasando.
- [ ] RLS activo y comentado en todas las tablas del schema `agendo`.
- [ ] CI en verde; sin warnings de ESLint; `tsc --noEmit` sin errores.
- [ ] Modo oscuro correcto en todas las pantallas; ícono y splash propios.
- [ ] README completo según la plantilla del CLAUDE.md (en inglés), con esquema de tablas, políticas RLS y Edge Function.

Para 🚀 **Publicado:** APK `v1.0.0` en GitHub Releases + GIF de demo (reserva + hueco desapareciendo en vivo) + repo público + tabla del CLAUDE.md/README del portafolio actualizada.

---

## 17. Riesgos, supuestos y decisiones abiertas

**Riesgos**

| Riesgo | Mitigación |
|---|---|
| Push no funciona en Expo Go (Android) | Usar development build (`expo-dev-client`) desde el día 1; en demo, notificación local. |
| Emails de OTP en desarrollo | Bandeja local de Supabase (Inbucket/Mailpit); `EXPO_PUBLIC_DATA_SOURCE=mock` para avanzar en UI. |
| Límite de emails del SMTP por defecto de Supabase en remoto | SMTP propio (p. ej. Resend free), decidido para todo el proyecto compartido; el revisor usa *Explore demo*. |
| Zonas horarias y DST en el cálculo de huecos | Todo en la zona del negocio con `@date-fns/tz`; tests específicos de DST. |
| Broadcast desde BD / políticas en `realtime.messages` (menos documentado que `postgres_changes`) | Prototiparlo primero. Plan B: tabla sin PII `busy_slots` mantenida por trigger y `postgres_changes` sobre ella. |
| Proyecto Supabase pausado al revisar la demo | Keep-alive + modo demo sin backend. |
| Semana ajustada (6 features + infraestructura) | Orden de §18; "Cualquier profesional" y el flujo Maestro de admin son recortables. |

**Supuestos**
- Un solo negocio por instancia; los profesionales no inician sesión.
- La UI está en inglés; las horas se muestran siempre en la zona horaria del negocio.
- Precios solo informativos (no hay pago).

**Decisiones propias que no venían del CLAUDE.md (a revisar)**
1. ~~Magic link + OTP~~ → **resuelto:** email + código OTP, convención común de las 4 apps (se actualizó el alcance en `CLAUDE.md`).
2. Dos roles (`client`, `admin`); profesionales como datos, no usuarios.
3. Reservar/cancelar/reprogramar solo por RPCs `security definer` (sin políticas de escritura directas en `appointments`).
4. Disponibilidad vía RPC `get_busy_ranges` (sin PII) + cálculo en el caso de uso del cliente; la BD revalida al reservar.
5. Realtime con **Broadcast desde BD** en lugar de `postgres_changes`.
6. Segundo `EXCLUDE` para que un cliente no se solape consigo mismo.
7. Recordatorio único a 120 min, enviado por `pg_cron` → Edge Function cada 5 min.
8. Perfil creado en el onboarding con la RPC `ensure_profile()` (convención común; no trigger en `auth.users`, que es compartido).
9. Modo demo con selector de rol y simulación de una reserva concurrente.
10. Tests pgTAP locales (no exigidos por el CLAUDE.md).
11. Tipografía Manrope, paleta teal/coral, datos de demo de barbería.

**Decisiones abiertas**
- Zona horaria del negocio demo en el seed (propuesta: `America/Mexico_City`) y moneda (USD vs. local).
- ¿Incluir "Cualquier profesional" (asignación automática del primero libre) o dejarlo para el roadmap?
- Confirmar el bundle id `com.malpidev.agendo`.
- ¿Soportar iOS en el MVP (requiere cuenta de Apple Developer para push)?

---

## 18. Calendario

**Semana asignada:** Semana 1 (28 sep – 4 oct 2026), en paralelo con Centavo. Pulido, demo y release después del 11 oct.

Orden sugerido de construcción (alto nivel, de lo que desbloquea a lo que pule):
1. **Andamiaje** (§10) + `core` (errores `DomainError`, tema, contenedor de repos) + CI de lint/test.
2. **Dominio de booking:** modelos + `getAvailableSlots` con sus tests (el corazón, sin UI ni backend).
3. **Migraciones + seed** en local: tablas, EXCLUDE, RLS, RPCs; tests pgTAP.
4. **Modo demo y mocks** + catálogo y flujo de reserva completo en mock (UI navegable sin backend).
5. **Auth** (email + código OTP, onboarding con `ensure_profile`) y repositorios Supabase de catálogo/booking.
6. **Mis citas:** cancelar y reprogramar.
7. **Realtime** en *Choose slot* y agenda admin.
8. **Push:** registro de token, Edge Function, cron; notificación local en demo.
9. **Estados de UI, modo oscuro, ícono/splash**, flujo Maestro, keep-alive y workflow de release.
10. Aplicar migraciones al proyecto remoto con `psql`, build `preview`, README y tag `v1.0.0` (o `v0.9` si falta pulido).
