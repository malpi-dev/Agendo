# Fase 05 · Modo demo, repositorios mock y navegación

**Rama:** `feat/fase-05-modo-demo`
**Objetivo:** base de datos en memoria con los mismos datos del seed, repositorios mock fieles (validan las mismas
reglas y emiten eventos "Realtime"), contenedor de repositorios, store de sesión, rutas protegidas y tabs.
Al terminar: *Sign in* → **Explore demo** → elegir *Client* o *Admin* → tabs navegables (con pantallas provisionales)
y badge "Demo"; Ajustes permite cambiar de rol y salir del demo.
**Referencias:** definición §2 (roles y demo), §5.1 flujo E, §5.2 rutas, §8.3, §12.2 · `CLAUDE.md` reglas 4 y 5.
**Requisitos previos:** fase 04 terminada (IDs estables y algoritmo del seed definidos).

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Paso 1 · Fixtures (`src/features/demo/data/fixtures.ts`)

- Constantes con los **mismos UUID** de la fase 04 §2: `DEMO_BUSINESS_ID`, `PROFESSIONAL_IDS.{marco,lena,sam}`,
  `SERVICE_IDS.{classicHaircut,skinFade,beardTrim,haircutBeard,hotTowelShave,kidsCut}`, `DEMO_USER_ID`
  (Casey Morgan, `…301`), `ADMIN_USER_ID` (`…302`), `FAKE_CLIENTS` (los 8, con id y nombre).
- `demoBusiness`, `demoServices`, `demoProfessionals` (con `serviceIds`), `demoWorkingHours`: **idénticos** a
  `01_catalog.sql` (mismos nombres, duraciones, precios, bios, horarios; Sam sin lunes).
- `buildDemoAppointments(now: Date): Appointment[]`: implementa **exactamente** el algoritmo de la fase 04 §6
  (paso 3) usando `@/core/time` (`toLocalDate`, `addDaysToLocalDate`, `weekdayOf`, `zonedInstant`). Rellena
  `serviceName`, `professionalName` y `clientName`. IDs de cita deterministas (p. ej. `demo-appt-001`, …).

**Tests** (`fixtures.test.ts`, con `now` fijo, p. ej. un martes a las 08:00 locales):
- hoy tiene 5 citas; un sábado como "hoy" tiene 4 (sin Lena 16:30); un lunes, 4 (sin Sam);
- ninguna cita se solapa con otra `booked` del mismo profesional ni del mismo cliente (reusa `rangesOverlap`);
- Casey tiene 2 próximas y 3 pasadas (1 cancelada) según `splitAppointments`;
- todas las citas `booked` caen dentro del horario laboral (compruébalo con `getAvailableSlots` y `busyRanges = []`,
  con un `now` anterior a todas; o con una comprobación directa de bloques).

## Paso 2 · Base de datos en memoria (`src/features/demo/data/mock-db.ts`)

```ts
export type MockEvent = { type: 'appointmentChanged'; professionalId: string };

export interface MockDbOptions {
  now?: () => Date;                    // injectable clock (tests)
  latencyMs?: [number, number];        // default [200, 400]; tests use [0, 0]
  simulateConcurrentBooking?: boolean; // default true; tests may disable
}

export class MockDb {
  business: Business; services: Service[]; professionals: Professional[]; workingHours: WorkingHours[];
  appointments: Appointment[];
  currentUser: { id: string; fullName: string; role: UserRole; email: string };
  constructor(options?: MockDbOptions);        // builds everything from fixtures with buildDemoAppointments(now())
  now(): Date;
  delay(): Promise<void>;                      // random latency within latencyMs
  on(listener: (e: MockEvent) => void): () => void;
  emit(e: MockEvent): void;
  // state used by the realtime simulation
  lastBusyQuery: { professionalId: string; from: Date; to: Date } | null;
  concurrentBookingSimulated: boolean;
}
```

- El usuario demo es siempre Casey (`DEMO_USER_ID`); su `role` cambia con el selector de rol.
- Sin dependencias de React. Vive en `demo/data` porque es infraestructura de datos.

## Paso 3 · Repositorios mock

Un archivo por repositorio, en la carpeta `data/` de su feature, implementando la interfaz de la fase 03.
Todos llaman a `await db.delay()` al principio, devuelven **copias** (no referencias internas) y **lanzan
`DomainError`** con los mismos códigos que la BD.

| Archivo | Comportamiento clave |
|---|---|
| `catalog/data/mock-catalog-repository.ts` | Servicios activos ordenados; profesionales activos que ofrecen el servicio; `getService`/`getProfessional` → `notFound` si no existe. |
| `booking/data/mock-booking-repository.ts` | Ver detalle abajo. |
| `appointments/data/mock-appointments-repository.ts` | `listMine` = citas de `currentUser.id`; `getById` → `notFound` si no existe o no es suya (salvo rol admin); `cancel` usa `canModifyAppointment` (`notBooked` → `validation`, resto → `cancellationWindowClosed`), cambia estado, `cancelledAt = now` y `emit`. |
| `agenda/data/mock-agenda-repository.ts` | Si `currentUser.role !== 'admin'` → `forbidden`. `listForDay(date, professionalId?)`: citas `booked` cuyo `start` cae en ese `LocalDate` (zona del negocio). `subscribe`: escucha **todos** los eventos de `db.on`; `onStatus('live')` al suscribirse. |

**`mock-booking-repository.ts`** (debe comportarse como las RPCs de la fase 04):

- `getBusyRanges(professionalId, from, to)`: citas `booked` de ese profesional que solapan `[from, to)`, solo
  `{ start, end }`. Guarda `db.lastBusyQuery`.
- `book({ serviceId, professionalId, start })`, en este orden:
  1. servicio/profesional inexistente o inactivo → `notFound`; el profesional no ofrece el servicio → `validation`;
  2. `end = start + duración`;
  3. `start < now + minNotice` o día fuera de `maxAdvanceDays` → `bookingWindow`;
  4. `start` no aparece en `getAvailableSlots({ date: toLocalDate(start), busyRanges: [], … })` → `outsideWorkingHours`;
  5. solapa una cita `booked` del profesional → `slotUnavailable`;
  6. solapa una cita `booked` de `currentUser` → `clientOverlap`;
  7. crea la cita (`status: 'booked'`, id `demo-appt-<n>`), `emit({ type: 'appointmentChanged', professionalId })`, la devuelve.
- `reschedule(id, newStart)`: dueño (si no → `notFound`), `canModifyAppointment` sobre la hora actual, mismas
  validaciones 3–6 para la nueva hora **excluyendo la propia cita** de los solapes; actualiza en el sitio y `emit`.
- `subscribeToAvailability(professionalId, onChange, onStatus)`: `onStatus?.('live')`; escucha `db.on` y llama a
  `onChange` solo para ese `professionalId`. **Simulación de reserva concurrente** (definición §12.2): si
  `db.simulateConcurrentBooking && !db.concurrentBookingSimulated`, programa un `setTimeout` de 5 s que:
  toma `db.lastBusyQuery` (si es de este profesional), calcula los huecos libres de ese día para el servicio más corto
  que ofrece el profesional, reserva **el primero** para un cliente ficticio (sin pasar por `currentUser`) y emite el
  evento. Marca `concurrentBookingSimulated = true`. El `Unsubscribe` devuelto cancela el timeout y el listener.

**Tests** (`__tests__` de cada `data/`, con `new MockDb({ latencyMs: [0, 0], now: () => FIXED_NOW, simulateConcurrentBooking: false })`):
- booking: reserva válida; doble reserva → `slotUnavailable`; solape propio → `clientOverlap`; fuera de horario;
  antelación; reprogramar a hueco libre conserva el id; reprogramar a ocupado → `slotUnavailable` y la cita queda igual;
  `getBusyRanges` excluye canceladas; `subscribeToAvailability` recibe evento al reservar y no tras `unsubscribe`;
  simulación con `jest.useFakeTimers()` y `simulateConcurrentBooking: true` (tras 5 s hay un hueco menos y se llamó a `onChange`).
- appointments: `listMine` solo de Casey; cancelar fuera de ventana → `cancellationWindowClosed`; cancelar emite evento.
- agenda: `forbidden` para cliente; `listForDay` agrupa por día local correcto; filtra por profesional.

## Paso 4 · Contenedor de repositorios (`src/core/di/repositories.tsx`)

```ts
export interface Repositories {
  catalog: CatalogRepository;
  booking: BookingRepository;
  appointments: AppointmentsRepository;
  agenda: AgendaRepository;
  // auth + profile are added in phase 07, pushTokens in phase 10
}
export function createMockRepositories(db: MockDb): Repositories;
export function RepositoryProvider(props: { repositories: Repositories | null; children: ReactNode }): JSX.Element;
export function useRepositories(): Repositories; // throws a clear Error if used outside a provider / with null
```

`core/di` puede importar de `features/*/data` (es la raíz de composición); es el **único** sitio de `core` que lo hace.

## Paso 5 · Store de sesión (`src/core/session/session-store.ts`)

Zustand, **sin persistir** (el demo se reinicia al cerrar la app):

```ts
interface SessionState {
  mode: 'supabase' | 'demo';
  demoRole: UserRole;
  demoDb: MockDb | null;
  enterDemo(role: UserRole): void;   // new MockDb(), sets role on db.currentUser, mode = 'demo'
  setDemoRole(role: UserRole): void; // updates demoRole and db.currentUser.role
  exitDemo(): void;                  // demoDb = null, mode = 'supabase'
}
```

- Al entrar o salir del demo y al cambiar de rol: `queryClient.clear()` (no mezclar cachés). Hazlo en las acciones o
  en un hook `useDemoActions()` en `demo/presentation`.
- Si `env.EXPO_PUBLIC_DATA_SOURCE === 'mock'`, el estado inicial ya es `mode: 'demo'` con rol `client`.
- Hook `useCurrentUser()` en `auth/presentation/hooks/`: en demo devuelve `{ id, fullName: 'Casey Morgan', role: demoRole }`;
  en modo supabase devuelve `null` por ahora (la fase 07 lo completa con el perfil real).

Nota: añade `src/core/session` a la estructura (no estaba en la fase 01).

## Paso 6 · Rutas y guards (Expo Router)

Estructura de `app/` (rutas finas que reexportan pantallas de `src/features/*/presentation/screens/`):

```
app/
├── _layout.tsx                 # providers + Stack con Stack.Protected
├── (auth)/_layout.tsx          # Stack sin header
├── (auth)/sign-in.tsx
└── (app)/
    ├── _layout.tsx             # Stack (pantallas de reserva y detalle se añaden en la fase 06)
    └── (tabs)/
        ├── _layout.tsx         # Tabs: index (Home), appointments, agenda, settings
        ├── index.tsx
        ├── appointments.tsx
        ├── agenda.tsx
        └── settings.tsx
```

`app/_layout.tsx` (esquema; revisa la API de `Stack.Protected` de tu versión de Expo Router):

```tsx
const mode = useSessionStore((s) => s.mode);
const isDemo = mode === 'demo';
const repositories = useMemo(() => (isDemo && demoDb ? createMockRepositories(demoDb) : null), [isDemo, demoDb]);

<RepositoryProvider repositories={repositories}>
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={!isDemo /* phase 07: && !session */}>
      <Stack.Screen name="(auth)" />
    </Stack.Protected>
    <Stack.Protected guard={isDemo /* phase 07: || (session && profile) */}>
      <Stack.Screen name="(app)" />
    </Stack.Protected>
  </Stack>
</RepositoryProvider>
```

Borra el `app/index.tsx` del kitchen sink de la fase 02 (mueve el kitchen sink a
`src/core/ui/__dev__/kitchen-sink-screen.tsx` si quieres conservarlo, sin ruta).

**Tabs** (`(app)/(tabs)/_layout.tsx`): iconos de `@expo/vector-icons` (Ionicons), colores de `useThemeColors()`,
etiquetas "Home", "Appointments", "Agenda", "Settings". La tab Agenda usa `href: null` si
`useCurrentUser()?.role !== 'admin'`. En la cabecera, si es demo, un `Badge` "Demo" (tono `accent`, `testID="demo-badge"`).

**Protección de Agenda (F6 CA1):** además de ocultar la tab, la pantalla de agenda hace `<Redirect href="/" />` si el
usuario no es admin.

## Paso 7 · Pantallas de esta fase

- **Sign in** (`auth/presentation/screens/sign-in-screen.tsx`): logo/nombre "Agendo", tagline
  *"Book appointments in seconds — live availability, zero double bookings."*, un espacio reservado para el
  formulario de email (fase 07) y el botón secundario **"Explore demo"** (`testID="explore-demo-button"`).
  Si `!isSupabaseConfigured`, muestra un aviso: "Backend not configured — you can still explore the demo."
- **Selector de rol** (`demo/presentation/components/demo-role-sheet.tsx`): `Modal` con "Explore as" y dos opciones
  grandes: **Client** ("Book and manage appointments", `testID="demo-role-client"`) y **Admin** ("See today's agenda
  for the whole team", `testID="demo-role-admin"`). Al elegir → `enterDemo(role)`; el guard lleva a las tabs.
- **Home, Appointments, Agenda**: pantallas provisionales con `Screen` + título (la fase 06/08/09 las reemplaza).
  La de Home puede ya listar los servicios con `useRepositories().catalog.listServices()` para comprobar el cableado.
- **Settings** (`settings/presentation/screens/settings-screen.tsx`), versión mínima: si demo, sección "Demo" con
  "Switch role (demo)" (alterna client/admin; `testID="demo-switch-role"`) y "Exit demo" (`testID="demo-exit"`),
  que llama a `exitDemo()` y vuelve a *Sign in*. Muestra la versión de la app (`expo-constants`).

## Paso 8 · Verificación manual

`npx expo start --go --android` con `.env` vacío o `EXPO_PUBLIC_DATA_SOURCE=supabase` sin claves:

1. *Sign in* muestra el aviso de backend no configurado y "Explore demo".
2. Demo como Client: 3 tabs (sin Agenda), badge "Demo", Home lista 6 servicios.
3. Settings → Switch role → aparece la tab Agenda. Exit demo → vuelve a *Sign in*.
4. Con `EXPO_PUBLIC_DATA_SOURCE=mock` la app arranca directamente en las tabs.

## Paso 9 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] Fixtures idénticos al seed (IDs, catálogo, horarios) y `buildDemoAppointments` con el mismo algoritmo, testeado.
- [ ] `MockDb` con reloj inyectable, latencia configurable y emisor de eventos.
- [ ] 4 repositorios mock que validan las mismas reglas que la BD y lanzan los mismos `DomainError`, con tests.
- [ ] Simulación de reserva concurrente a los 5 s, una vez por sesión demo, testeada con timers falsos.
- [ ] `RepositoryProvider` + `useRepositories`; `useSessionStore` con `enterDemo`/`exitDemo`/`setDemoRole` que limpian la caché.
- [ ] Guards con `Stack.Protected`; tab Agenda oculta y protegida para clientes.
- [ ] Explore demo → selector de rol → tabs con badge "Demo"; Settings cambia rol y sale del demo.
- [ ] Funciona con `.env` vacío.
- [ ] lint/typecheck/test en verde; PR mergeado; bitácora actualizada.
