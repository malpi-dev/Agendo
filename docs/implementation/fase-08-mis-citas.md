# Fase 08 · Mis citas: lista, detalle, cancelar y reprogramar

**Rama:** `feat/fase-08-mis-citas`
**Objetivo:** pestaña *Appointments* con secciones "Upcoming" y "Past & cancelled", detalle completo con
**Cancel** y **Reschedule** (con la ventana de 2 h aplicada en la UI y en la BD) y reprogramación atómica que
reutiliza la pantalla de horarios. Funciona en demo y contra Supabase local.
**Referencias:** definición F4 (§3.1), §5.1 flujo C, §6.3 (`canModifyAppointment`), §7.3 (RPCs), §11 (tarjeta de cita), §12.1.
**Requisitos previos:** fase 07 terminada (los repos Supabase de citas ya existen).

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Paso 1 · Hooks (`appointments/presentation/hooks/`)

| Hook | Detalle |
|---|---|
| `useMyAppointments()` | `useQuery(queryKeys.appointmentsMine, repos.appointments.listMine)` + `splitAppointments(data, now)` en `useMemo` (con `useNow`). Devuelve `{ upcoming, past, … }`. |
| `useAppointment(id)` | Ya existe (fase 06); se reutiliza. |
| `useCancelAppointment()` | `useMutation(repos.appointments.cancel)`. `onSuccess`: invalida `appointmentsAll`, `busyAll`, `agendaAll`. |
| `useRescheduleAppointment()` (en `booking`) | `useMutation(({ id, newStart }) => repos.booking.reschedule(id, newStart))`, mismas invalidaciones. |
| `useModifyDecision(appointment)` | `canModifyAppointment({ appointment, business, now })` con `useBusiness` + `useNow`. |

## Paso 2 · Componentes

- `AppointmentCard` (`appointments/presentation/components/`): barra vertical de color a la izquierda según estado
  (`booked` futura → `primary`; pasada → `text-muted`; `cancelled` → `danger`), servicio, profesional, fecha y hora
  (zona del negocio), `Badge` de estado ("Upcoming", "Completed" para pasadas `booked`, "Cancelled").
  `testID="appointment-card-<id>"`.
- `ModifyNotice`: texto explicativo cuando no se puede modificar:
  `windowClosed` → "Changes are allowed up to <cancelLimitHours> hours before the appointment.";
  `alreadyStarted` → "This appointment has already started."; `notBooked` → "This appointment was cancelled."

## Paso 3 · Pantalla *My appointments* (`app/(app)/(tabs)/appointments.tsx`)

- `FlashList` con cabeceras de sección ("Upcoming", "Past & cancelled") como elementos de tipo cabecera
  (`getItemType`). Tocar tarjeta → `/appointments/<id>`.
- Carga: skeleton de lista. Vacío total: `EmptyState` "No appointments yet" + botón "Book now" (`testID="book-now-button"`)
  → tab Home. Si solo falta una sección, muestra un texto corto en esa sección ("Nothing upcoming").
- Error: `ErrorState` + Retry. Pull-to-refresh.

## Paso 4 · Detalle completo (`app/(app)/appointments/[id].tsx`)

Amplía la versión de la fase 06 (`testID="appointment-detail"` en el contenedor):

- Botones **"Reschedule"** (`testID="reschedule-appointment-button"`, variante `secondary`) y **"Cancel appointment"**
  (`testID="cancel-appointment-button"`, variante `danger`), solo si el estado es `booked` y la cita es futura.
- Si `useModifyDecision` devuelve `allowed: false`, ambos botones **deshabilitados** + `ModifyNotice` (F4 CA5).
- **Cancelar:** `Alert.alert('Cancel appointment?', 'This frees the time for other clients.', [{ text: 'Keep', style: 'cancel' }, { text: 'Cancel appointment', style: 'destructive', onPress }])`.
  Éxito → toast "Appointment cancelled"; el detalle se refresca y muestra el estado "Cancelled" (F4 CA3).
  Error `cancellationWindowClosed` → toast con el mensaje de `getErrorPresentation` y refresco.
- **Reprogramar:** `router.push({ pathname: '/book/[serviceId]/[professionalId]', params: { serviceId, professionalId, rescheduleId: id } })`.
- `notFound` → `EmptyState` "This appointment no longer exists" con botón "Back to appointments".

## Paso 5 · Modo reprogramar en el flujo de reserva

- *Choose slot* con `rescheduleId`: título "Reschedule"; banner arriba "Current: <fecha y hora actual>"
  (usa `useAppointment(rescheduleId)`). El resto igual (mismo servicio y profesional, F4 CA4).
- *Confirm* con `rescheduleId`: muestra **"Before → After"** (fecha/hora antigua tachada o atenuada y la nueva
  destacada); botón "Confirm new time" (mismo `testID="confirm-booking-button"`).
  - Éxito → toast "Rescheduled", `router.dismissAll()` y `router.push('/appointments/<id>')` (mismo id).
  - `slotUnavailable` → mismo manejo que al reservar (volver a la lista refrescada).
  - `cancellationWindowClosed` → mensaje en línea y botón "Back to appointment".
- La reprogramación es **atómica** gracias a la RPC `reschedule_appointment` (un solo `update`): nunca queda
  cancelada sin nueva hora. No implementes "cancelar + reservar" en el cliente.

## Paso 6 · Tests

- Vista de *My appointments*: secciones y orden correctos con datos de `buildDemoAppointments`; vacío muestra "Book now".
- Vista de detalle: cita a 1 h → botones deshabilitados + aviso; a 3 días → habilitados; cancelada → sin botones.
- Cancelar llama al repo y, tras éxito, muestra estado cancelado (mock).
- Confirm en modo reprogramar: muestra "Before → After" y llama a `reschedule` (no a `book`).

## Paso 7 · Verificación manual

En demo y contra Supabase local:
1. Casey ve 2 próximas y 3 pasadas (demo).
2. Cancela una próxima (≥ 2 h) → queda "Cancelled"; en *Choose slot* de ese profesional/día el hueco vuelve a estar libre.
3. Reprograma otra → aparece la nueva hora con el mismo id; el hueco antiguo queda libre.
4. Crea (por `psql` en local o reservando en demo con `now` cercano) una cita que empiece en < 2 h → botones deshabilitados con el motivo.
5. Contra Supabase: intenta cancelar por RPC desde `psql` como otro usuario → `notFound` (la BD también protege).

## Paso 8 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] F4 CA1–CA5 cumplidos en demo y contra Supabase local.
- [ ] Reprogramación reutiliza *Choose slot* / *Confirm* y usa solo la RPC atómica.
- [ ] Botones deshabilitados con motivo fuera de la ventana; la BD también lo rechaza.
- [ ] Cancelar/reprogramar invalidan `appointments`, `busy` y `agenda`.
- [ ] Estados de carga, vacío y error en *My appointments* y detalle.
- [ ] Tests de vistas en verde.
- [ ] lint/typecheck/test en verde; PR mergeado; bitácora actualizada.
