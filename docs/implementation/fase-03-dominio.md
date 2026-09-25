# Fase 03 · Dominio

**Rama:** `feat/fase-03-dominio`
**Objetivo:** todos los modelos, las interfaces de repositorio y los casos de uso puros de la app, con tests
exhaustivos. **Sin UI, sin Supabase, sin mocks de datos.** Es el corazón de Agendo: el cálculo de horarios.
**Referencias:** definición §6 completo (§6.1 entidades, §6.2 reglas, §6.3 casos de uso, §6.4 interfaces).
**Requisitos previos:** fase 02 terminada (`@/core/time` y `@/core/errors` existen).

> Regla de oro: todo lo de esta fase vive en carpetas `domain/` y solo importa otros `domain/`, `@/core/time`,
> `@/core/errors`, `date-fns` y `@date-fns/tz`. El lint lo hace cumplir.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Paso 1 · Modelos y tipos

Usa `interface`/`type` de TypeScript (sin clases). Fechas-instante = `Date`; días = `LocalDate`; horas = `LocalTime`.

**`src/features/catalog/domain/`**

```ts
// business.ts
export interface Business {
  id: string;
  name: string;
  timezone: string;            // IANA, e.g. 'America/Mexico_City'
  currency: string;            // ISO 4217, e.g. 'USD'
  slotIntervalMinutes: number; // 15
  minNoticeMinutes: number;    // 60
  maxAdvanceDays: number;      // 30
  cancelLimitHours: number;    // 2
  reminderLeadMinutes: number; // 120
}
// service.ts
export interface Service {
  id: string; name: string; description: string;
  durationMinutes: number; priceCents: number; isActive: boolean; sortOrder: number;
}
// professional.ts
export interface Professional {
  id: string; name: string; bio: string; avatarUrl: string | null; isActive: boolean; serviceIds: string[];
}
// working-hours.ts
export interface WorkingHours {
  professionalId: string; weekday: number; // 0 = Sunday … 6 = Saturday
  startTime: LocalTime; endTime: LocalTime;
}
// catalog-repository.ts
export interface CatalogRepository {
  getBusiness(): Promise<Business>;
  listServices(): Promise<Service[]>;                         // active only, sorted by sortOrder
  getService(id: string): Promise<Service>;                   // throws DomainError('notFound')
  listProfessionals(serviceId: string): Promise<Professional[]>; // active ones offering the service
  getProfessional(id: string): Promise<Professional>;         // throws DomainError('notFound')
  getWorkingHours(professionalId: string): Promise<WorkingHours[]>;
}
```

(`getService` y `getProfessional` se añaden respecto a la definición §6.4 porque las pantallas de reserva y
confirmación reciben IDs por parámetros de ruta; anótalo en la bitácora.)

**`src/features/booking/domain/`**

```ts
// types.ts
export type Unsubscribe = () => void;
// slot.ts
export interface TimeRange { start: Date; end: Date }   // half-open [start, end)
export type BusyRange = TimeRange;                       // no personal data
export type Slot = TimeRange;
// booking-repository.ts
export interface BookInput { serviceId: string; professionalId: string; start: Date }
export interface BookingRepository {
  getBusyRanges(professionalId: string, from: Date, to: Date): Promise<BusyRange[]>;
  book(input: BookInput): Promise<Appointment>;
  reschedule(appointmentId: string, newStart: Date): Promise<Appointment>;
  subscribeToAvailability(professionalId: string, onChange: () => void, onStatus?: (s: LiveStatus) => void): Unsubscribe;
}
export type LiveStatus = 'connecting' | 'live' | 'paused';
```

(`onStatus` permite mostrar "Live updates paused", definición §12.1.)

**`src/features/appointments/domain/`**

```ts
// appointment.ts
export type AppointmentStatus = 'booked' | 'cancelled' | 'completed' | 'no_show';
export interface Appointment {
  id: string; clientId: string; professionalId: string; serviceId: string;
  start: Date; end: Date; status: AppointmentStatus;
  createdAt: Date; cancelledAt: Date | null;
  serviceName: string; professionalName: string; clientName: string | null;
}
// appointments-repository.ts
export interface AppointmentsRepository {
  listMine(): Promise<Appointment[]>;
  getById(id: string): Promise<Appointment>;   // throws DomainError('notFound')
  cancel(id: string): Promise<void>;
}
```

**`src/features/agenda/domain/agenda-repository.ts`**

```ts
export interface AgendaRepository {
  listForDay(date: LocalDate, professionalId?: string): Promise<Appointment[]>; // booked only, business tz day
  subscribe(onChange: () => void, onStatus?: (s: LiveStatus) => void): Unsubscribe;
}
```

(La definición usa `date: Date`; aquí se usa `LocalDate` por la decisión de la bitácora sobre días de calendario.)

**`src/features/auth/domain/`**

```ts
// auth-session.ts
export interface AuthSession { userId: string; email: string }
// profile.ts
export type UserRole = 'client' | 'admin';
export interface Profile { id: string; fullName: string; role: UserRole }
// auth-repository.ts
export interface AuthRepository {
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<AuthSession>;
  getSession(): Promise<AuthSession | null>;
  onAuthChange(listener: (session: AuthSession | null) => void): Unsubscribe;
  signOut(): Promise<void>;
}
// profile-repository.ts
export interface ProfileRepository {
  getMine(): Promise<Profile | null>;          // null = no profile yet -> onboarding
  ensureMine(fullName: string): Promise<Profile>; // RPC ensure_profile
  updateName(fullName: string): Promise<Profile>;
}
// validation.ts  (zod is a pure library, allowed in domain)
export const emailSchema = z.email();           // z.string().email() on zod 3
export const otpSchema = z.string().regex(/^\d{6}$/);
export const fullNameSchema = z.string().trim().min(2).max(80);
```

**`src/features/notifications/domain/push-token-repository.ts`**

```ts
export type PushPlatform = 'android' | 'ios';
export interface PushTokenRepository {
  register(token: string, platform: PushPlatform): Promise<void>; // upsert
  remove(token: string): Promise<void>;
}
```

Si el lint se queja de que `zod` no es "puro", no lo es para la regla: la regla solo prohíbe las librerías listadas
en la fase 01; `zod` está permitido.

## Paso 2 · Casos de uso

Todas son **funciones puras**: reciben `now` como parámetro, nunca llaman a `new Date()` sin argumentos ni a `Date.now()`.

### 2.1 `booking/domain/ranges.ts`

`rangesOverlap(a: TimeRange, b: TimeRange): boolean` → `a.start < b.end && b.start < a.end` (semiabierto, regla 9).

### 2.2 `booking/domain/get-available-slots.ts`

```ts
export interface GetAvailableSlotsInput {
  date: LocalDate;
  service: Pick<Service, 'durationMinutes'>;
  workingHours: WorkingHours[];       // of ONE professional
  busyRanges: BusyRange[];
  business: Business;
  now: Date;
}
export function getAvailableSlots(input: GetAvailableSlotsInput): Slot[];
```

Algoritmo (debe coincidir con la validación de la RPC `book_appointment` de la fase 04):

1. `today = toLocalDate(now, business.timezone)`. Si `date < today` o `date >= addDaysToLocalDate(today, business.maxAdvanceDays)` → `[]`.
2. `blocks` = `workingHours` con `weekday === weekdayOf(date)`, ordenados por `startTime`. Si no hay → `[]`.
3. `earliest = now + business.minNoticeMinutes` (en milisegundos).
4. Para cada bloque: `blockStart = zonedInstant(date, startTime, tz)`, `blockEnd = zonedInstant(date, endTime, tz)`.
   Desde `t = blockStart`, mientras `t + duración <= blockEnd`, avanzando `slotIntervalMinutes`:
   - descarta si `t < earliest`;
   - descarta si `rangesOverlap({ start: t, end: t + duración }, busy)` para algún `busy`;
   - si no, añade `{ start: t, end: t + duración }`.
5. Devuelve ordenado por `start`.

### 2.3 `booking/domain/get-bookable-days.ts`

```ts
export interface BookableDay { date: LocalDate; isDisabled: boolean }
export function getBookableDays(input: { now: Date; business: Business; workingHours: WorkingHours[] }): BookableDay[];
```

Devuelve `maxAdvanceDays` días desde hoy (zona del negocio) incluido. `isDisabled = true` si el profesional no tiene
bloques ese día de la semana.

### 2.4 `appointments/domain/can-modify-appointment.ts`

```ts
export type ModifyDecision =
  | { allowed: true }
  | { allowed: false; reason: 'notBooked' | 'alreadyStarted' | 'windowClosed' };
export function canModifyAppointment(input: {
  appointment: Pick<Appointment, 'status' | 'start'>; business: Business; now: Date;
}): ModifyDecision;
```

Orden: `status !== 'booked'` → `notBooked`; `start <= now` → `alreadyStarted`;
`start - now < cancelLimitHours h` → `windowClosed`; si no → `allowed`. Justo en el límite (= 2 h) **sí** se permite.

### 2.5 `appointments/domain/split-appointments.ts`

```ts
export function splitAppointments(appointments: Appointment[], now: Date): { upcoming: Appointment[]; past: Appointment[] };
```

`upcoming` = `status === 'booked'` y `end > now`, orden ascendente por `start`. `past` = el resto (pasadas y
canceladas), orden descendente por `start`. (Definición F4 CA1.)

### 2.6 `agenda/domain/group-agenda-by-professional.ts`

```ts
export interface AgendaGroup { professionalId: string; professionalName: string; appointments: Appointment[] }
export function groupAgendaByProfessional(appointments: Appointment[]): AgendaGroup[];
```

Solo citas `booked`; grupos ordenados por `professionalName` (`localeCompare`), citas de cada grupo por `start`
ascendente; sin grupos vacíos.

## Paso 3 · Tests (prioridad máxima)

Crea `src/features/booking/domain/__tests__/test-fixtures.ts` (solo para tests) con un `business` base
(`America/Mexico_City`, intervalo 15, antelación 60, máx. 30 días, cancelación 2 h) y un helper
`at(date, time, tz = 'America/Mexico_City') => zonedInstant(...)` para escribir los casos legibles.

**`get-available-slots.test.ts`** — como mínimo estos casos (usa un jueves, p. ej. `2026-10-01`, y `now` = el
día anterior a mediodía salvo que el caso diga otra cosa). **Ojo:** el `weekday` de los bloques de `workingHours`
debe coincidir con el día de la fecha probada (`2026-10-01` es jueves = 4; `2026-03-09` es lunes = 1;
`2026-03-06` es viernes = 5):

| # | Caso | Esperado |
|---|---|---|
| 1 | Bloque 09:00–10:00, servicio 30 min | 09:00, 09:15, 09:30 |
| 2 | Servicio 90 min en bloque de 60 | `[]` |
| 3 | Bloques 09:00–13:00 y 14:00–19:00, servicio 60 min | Último de la mañana 12:00; primero de la tarde 14:00; ninguno cruza el almuerzo |
| 4 | Ocupado 09:20–09:40, bloque 09:00–10:30, 30 min | Faltan 09:00, 09:15, 09:30; aparecen 09:45, 10:00 |
| 5 | Semiabierto: ocupado 09:00–09:30 | 09:30 disponible |
| 6 | Semiabierto: ocupado 09:30–10:00, servicio 30 min | 09:00 disponible (termina justo a las 09:30) |
| 7 | Antelación: `now` = 08:30 del mismo día | primer horario 09:30 |
| 8 | `now` posterior al fin del bloque | `[]` |
| 9 | `date` en el pasado | `[]` |
| 10 | `date` = hoy + 30 | `[]`; hoy + 29 → con horarios |
| 11 | Día de la semana sin bloques | `[]` |
| 12 | Ocupados de otro día | no afectan |
| 13 | DST: `business.timezone = 'America/New_York'`, `date = '2026-03-09'`, bloque 09:00–10:00 | primer slot = `2026-03-09T13:00:00.000Z` |
| 14 | DST: mismo negocio, `date = '2026-03-06'` | primer slot = `2026-03-06T14:00:00.000Z` |
| 15 | Resultado ordenado aunque `workingHours` venga desordenado | orden ascendente |
| 16 | Bloque con `startTime` `'09:00:00'` (formato Postgres) | funciona igual que `'09:00'` |

**`get-bookable-days.test.ts`**: devuelve 30 días; el primero es "hoy" en la zona del negocio (usa
`now = 2026-10-02T03:00:00Z`, que en México aún es `2026-10-01`); domingos deshabilitados si no hay bloques;
un profesional sin horarios → todos deshabilitados.

**`can-modify-appointment.test.ts`**: cancelada → `notBooked`; ya empezó → `alreadyStarted`; faltan 1 h 59 min →
`windowClosed`; faltan exactamente 2 h → `allowed`; faltan 3 días → `allowed`.

**`split-appointments.test.ts`** y **`group-agenda-by-professional.test.ts`**: orden, filtrado de canceladas,
cita en curso (empezó pero no terminó) cuenta como próxima, grupos sin vacíos.

**`validation.test.ts`**: emails válidos/ inválidos, OTP de 6 dígitos (rechaza 5, 7 y letras), nombre con espacios
recortados y límites 2/80.

Ejecuta `npx jest --coverage src/features` y comprueba que los archivos de `domain/` tienen cobertura de líneas ≥ 95 %.

## Paso 4 · Comprobación de arquitectura

Busca imports prohibidos: `grep -rn "from 'react\|from '@supabase\|from 'expo\|/data/\|/presentation/" src/features/*/domain`
no debe devolver nada. `npm run lint` debe pasar.

## Paso 5 · Cierre

`00-guia-general.md` §3.3. En la bitácora anota los métodos añadidos a las interfaces (`getService`,
`getProfessional`, `onStatus`) y el cambio de `listForDay(LocalDate)`.

---

## Criterios de terminado

- [ ] Modelos e interfaces de repositorio de todas las features creados en sus carpetas `domain/`.
- [ ] `getAvailableSlots`, `getBookableDays`, `canModifyAppointment`, `splitAppointments`, `groupAgendaByProfessional` y `rangesOverlap` implementados como funciones puras (reciben `now`).
- [ ] Los 16 casos de `getAvailableSlots` y el resto de tests pasan con `TZ=UTC`.
- [ ] Cobertura de `domain/` ≥ 95 % de líneas.
- [ ] Ningún archivo de `domain/` importa React, Expo, Supabase, TanStack, Zustand, `data/` ni `presentation/`.
- [ ] lint/typecheck/test en verde; PR mergeado; bitácora actualizada con las desviaciones.
