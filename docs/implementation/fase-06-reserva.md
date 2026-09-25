# Fase 06 · Catálogo y flujo de reserva (UI)

**Rama:** `feat/fase-06-reserva`
**Objetivo:** el flujo completo *Services → Choose professional → Choose slot → Confirm → detalle de la cita*,
funcionando en **modo demo**, con horarios que desaparecen en vivo (evento del mock), estados de carga/vacío/error
y manejo del conflicto "Ese horario acaba de ocuparse".
**Referencias:** definición F2, F3 (§3.1), §5.1 flujo B, §5.2 rutas, §8.4, §11 (componentes firma), §12.1.
**Requisitos previos:** fase 05 terminada.

> Todo se prueba en demo. Los repositorios Supabase llegan en la fase 07; como la UI solo usa `useRepositories()`,
> no habrá que tocar pantallas entonces.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Paso 1 · Claves de query (`src/core/query/query-keys.ts`)

Centraliza **todas** las claves (se usan también para invalidar):

```ts
export const queryKeys = {
  business: ['business'] as const,
  services: ['services'] as const,
  service: (id: string) => ['services', id] as const,
  professionals: (serviceId: string) => ['professionals', serviceId] as const,
  professional: (id: string) => ['professional', id] as const,
  workingHours: (professionalId: string) => ['workingHours', professionalId] as const,
  busy: (professionalId: string, date?: LocalDate) =>
    (date ? ['busy', professionalId, date] : ['busy', professionalId]) as readonly unknown[],
  busyAll: ['busy'] as const,
  appointmentsMine: ['appointments', 'mine'] as const,
  appointment: (id: string) => ['appointments', id] as const,
  appointmentsAll: ['appointments'] as const,
  agenda: (date: LocalDate, professionalId?: string) => ['agenda', date, professionalId ?? 'all'] as const,
  agendaAll: ['agenda'] as const,
};
```

`src/core/query/` no importa features: `LocalDate` viene de `@/core/time`.

## Paso 2 · Hooks de datos

Cada hook en `presentation/hooks/` de su feature, usando `useRepositories()` y `queryKeys`.

| Hook | Feature | Detalle |
|---|---|---|
| `useBusiness()` | catalog | `staleTime: Infinity`. Casi todas las pantallas lo necesitan (zona horaria, moneda, reglas). |
| `useServices()`, `useService(id)` | catalog | `useService` usa `initialData` desde la caché de `services` si existe. |
| `useProfessionals(serviceId)`, `useProfessional(id)` | catalog | — |
| `useWorkingHours(professionalId)` | catalog | `staleTime: 5 min`. |
| `useNow(intervalMs = 60_000)` | core (`src/core/time/use-now.ts`) | Devuelve `Date` que se actualiza cada minuto (para la antelación mínima). |
| `useBusyRanges(professionalId, date)` | booking | `from = zonedInstant(date, '00:00', tz)`, `to = zonedInstant(addDaysToLocalDate(date, 1), '00:00', tz)`. `enabled` solo cuando hay `business` y `date`. |
| `useAvailableSlots({ serviceId, professionalId, date })` | booking | **Derivado** (definición §8.4): combina `useService`, `useWorkingHours`, `useBusyRanges`, `useBusiness`, `useNow` y llama a `getAvailableSlots` dentro de `useMemo`. Devuelve `{ slots, isLoading, error, refetch }`. No crea query propia. |
| `useAvailabilitySubscription(professionalId)` | booking | `useEffect` → `repos.booking.subscribeToAvailability(id, () => queryClient.invalidateQueries({ queryKey: queryKeys.busy(id) }), setStatus)`; devuelve `liveStatus`. Limpia al desmontar. |
| `useBookAppointment()` | booking | `useMutation(repos.booking.book)`. `onSuccess`: invalida `appointmentsAll`, `busyAll`, `agendaAll`. |
| `useAppointment(id)` | appointments | Para el detalle básico (Paso 5). |

## Paso 3 · Componentes

En `presentation/components/` de su feature. Colores solo por tokens; `testID` en cada elemento interactivo.

| Componente | Feature | Detalle |
|---|---|---|
| `ServiceCard` | catalog | Nombre, descripción (1 línea), "45 min" y precio (`formatPrice`). `testID="service-card-<id>"`. |
| `Avatar` | core/ui | Iniciales sobre `bg-primary/15` si `avatarUrl` es nulo; `Image` si no. |
| `ProfessionalRow` | catalog | Avatar + nombre + bio. `testID="professional-row-<id>"`. |
| `DayStrip` | booking | Lista horizontal de `BookableDay` (usa `formatDayChip`). Seleccionado `bg-primary`; deshabilitado atenuado y no pulsable. `testID`: días habilitados `day-chip-<k>` donde `k` es su posición **entre los habilitados** (0 = primero); deshabilitados `day-chip-disabled-<YYYY-MM-DD>`. (Maestro usará `day-chip-2`: siempre un día laborable a ≥ 2 días vista.) Hace scroll al seleccionado. |
| `SlotChip` | booking | Hora con `formatTime` (números tabulares). Estados: disponible / seleccionado. `testID="slot-chip-<HH>-<mm>"` (hora local del negocio, 24 h). |
| `SlotGrid` | booking | Cuadrícula (3–4 columnas). Cada chip envuelto en `Animated.View` de Reanimated con `entering={FadeIn}` y `exiting={FadeOut.duration(400)}` → al desaparecer un hueco por un evento Realtime se anima la salida (componente firma §11). Usa como `key` el ISO del `start`. |
| `LiveIndicator` | booking | Punto verde + "Live" si `liveStatus === 'live'`; aviso `warning` "Live updates paused" si `'paused'`. `testID="live-indicator"`. |
| `BookingSummary` | booking | Filas: servicio, profesional, fecha (`formatLongDate`), hora, duración, precio. Nota inferior: "Times are shown in the business timezone (<tz>)". |

## Paso 4 · Pantallas

Patrón recomendado para poder testear: **pantalla contenedora** (lee parámetros y hooks) + **vista presentacional**
(recibe datos y callbacks por props). Los tests de componentes se hacen sobre la vista.

### 4.1 Services — `app/(app)/(tabs)/index.tsx` → `catalog/presentation/screens/services-screen.tsx`

- Título "Book an appointment" + nombre del negocio.
- `FlashList` de `ServiceCard`. Tocar → `router.push({ pathname: '/book/[serviceId]', params: { serviceId } })`.
- Carga: 4 `Skeleton` con forma de tarjeta. Vacío: `EmptyState` "No services available yet". Error: `ErrorState` + Retry.
  Pull-to-refresh (`refreshing` + `onRefresh = refetch`).

### 4.2 Choose professional — `app/(app)/book/[serviceId]/index.tsx`

- Cabecera nativa con título "Choose a professional" y botón atrás (configura el `Stack` de `(app)/_layout.tsx`
  con `headerShown: true` para las rutas `book/*` y `appointments/*`, con colores del tema).
- Resumen del servicio arriba (nombre · duración · precio).
- Lista de `ProfessionalRow`. Tocar → `/book/[serviceId]/[professionalId]`.
- Estados: skeleton de 3 filas; vacío "No one offers this service right now"; error + Retry.

### 4.3 Choose slot — `app/(app)/book/[serviceId]/[professionalId].tsx`

- Parámetros: `serviceId`, `professionalId`, opcional `rescheduleId` (se usa en la fase 08; aquí solo se propaga).
- Estado local `selectedDate: LocalDate` = primer día no deshabilitado de `getBookableDays`.
- `DayStrip` arriba, `LiveIndicator`, `SlotGrid` debajo.
- `useAvailabilitySubscription(professionalId)` activo mientras la pantalla está montada.
- Tocar un chip → `router.push({ pathname: '/book/confirm', params: { serviceId, professionalId, start: slot.start.toISOString(), rescheduleId } })`.
- Estados: skeleton de 8 chips; vacío "No free times this day — try another day" con botón
  "Next available day" (`testID="next-day-button"`) que selecciona el siguiente día habilitado; error + Retry.

### 4.4 Confirm booking — `app/(app)/book/confirm.tsx`

- Parámetros: `serviceId`, `professionalId`, `start` (ISO), `rescheduleId?`. Valida con zod; si son inválidos,
  `ErrorState` con `validation`.
- `BookingSummary` + botón **"Confirm booking"** (`testID="confirm-booking-button"`, con `loading`).
- Éxito: `Haptics.notificationAsync(Success)`, `showToast('Booked!', 'success')`, `router.dismissAll()` y
  `router.push('/appointments/<id>')` (verifica que la combinación deja la pila como *Tabs → Detalle*).
- Error `slotUnavailable`: `showToast('That time was just taken. Please choose another.', 'warning')`, invalida
  `queryKeys.busy(professionalId)` y `router.back()` (vuelve a la lista refrescada; **no** se crea nada).
- Error `clientOverlap`: mensaje en línea "You already have an appointment at that time."
- Otros errores: mensaje en línea con `getErrorPresentation` y el botón vuelve a estar activo.
- (Modo reprogramar "antes → después": fase 08.)

### 4.5 Appointment detail básico — `app/(app)/appointments/[id].tsx`

Versión de solo lectura (la fase 08 añade cancelar/reprogramar): servicio, profesional, fecha y hora (zona del
negocio), `Badge` con el estado. Skeleton al cargar; `notFound` → "This appointment no longer exists".

## Paso 5 · Utilidades de test

`src/test/render-with-providers.tsx`: renderiza con un `QueryClient` nuevo (`retry: false`, `gcTime: Infinity`) y
`RepositoryProvider` con `createMockRepositories(new MockDb({ latencyMs: [0, 0], now: () => FIXED_NOW, simulateConcurrentBooking: false }))`.
Permite sobrescribir repositorios concretos para forzar errores.

## Paso 6 · Tests

- `use-available-slots` (con `renderHook`): con el mock devuelve los mismos huecos que `getAvailableSlots` directo;
  tras reservar un hueco vía repo + invalidación, ese hueco deja de aparecer.
- `SlotGrid` / vista de *Choose slot*: renderiza los chips; al cambiar `slots` sin uno, ese chip deja de estar
  (con `waitFor`); estado vacío muestra "Next available day".
- Vista de *Confirm*: con un repo `book` que lanza `DomainError('slotUnavailable')` → llama al callback de conflicto
  (o comprueba `router.back` mockeado); con éxito → llama al callback de éxito con la cita.
- `ServiceCard`: formatea precio y duración.

## Paso 7 · Verificación manual (demo)

1. Explore demo → Client → Home → "Classic haircut" → "Marco" → día de mañana.
2. Espera ~5 s en *Choose slot*: **el primer horario desaparece con animación** (simulación concurrente).
3. Elige otro horario → Confirm → toast "Booked!" → detalle de la cita.
4. Vuelve a reservar el mismo horario (misma persona): debe dar el error de solape de cliente.
5. Modo oscuro: todas las pantallas nuevas se leen bien.

Si no puedes ver el emulador: **🙋 Acción del autor**.

## Paso 8 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] F2 CA1–CA4 y F3 CA1–CA3, CA5–CA7 cumplidos en modo demo (CA4 con la simulación del mock; con Supabase en la fase 09).
- [ ] Horarios mostrados siempre en la zona del negocio; los días sin horario, deshabilitados.
- [ ] Conflicto `slotUnavailable` → vuelve a la lista refrescada sin crear nada.
- [ ] Animación de salida del chip al llegar un evento.
- [ ] Estados de carga, vacío y error en *Services*, *Choose professional*, *Choose slot*, *Confirm* y detalle.
- [ ] `queryKeys` centralizadas; reservar invalida `appointments`, `busy` y `agenda`.
- [ ] Tests de hooks y vistas en verde.
- [ ] lint/typecheck/test en verde; PR mergeado; bitácora actualizada.
