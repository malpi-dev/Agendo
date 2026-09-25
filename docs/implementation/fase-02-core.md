# Fase 02 · Core

**Rama:** `feat/fase-02-core`
**Objetivo:** construir `src/core/`: errores de dominio y su mapper, utilidades de fecha/zona horaria, tema
(claro/oscuro/sistema) con fuentes, componentes UI base, cliente de Supabase y los providers del layout raíz.
**Referencias:** definición §6.5, §8.1, §8.4, §11, §12.1 · `CLAUDE.md` regla 6 de arquitectura.
**Requisitos previos:** fase 01 terminada.

> Al terminar, la app muestra una pantalla temporal de "catálogo de componentes" (kitchen sink) en claro y oscuro,
> y existen tests de `zoned.ts`, `mapSupabaseError` y de los componentes `Button` y `ErrorState`.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1. Borra el test de humo `src/core/__tests__/smoke.test.ts` cuando existan los tests reales.

## Paso 1 · Errores de dominio (`src/core/errors/`)

### 1.1 `domain-error.ts`

```ts
export type DomainErrorCode =
  | 'network' | 'unauthorized' | 'forbidden' | 'notFound' | 'conflict' | 'validation' | 'unknown'
  | 'slotUnavailable' | 'clientOverlap' | 'outsideWorkingHours' | 'bookingWindow' | 'cancellationWindowClosed'
  | 'invalidCode' | 'codeExpired' | 'rateLimited';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  override readonly cause?: unknown;

  constructor(code: DomainErrorCode, message?: string, cause?: unknown) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
    this.cause = cause;
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError;

export const toDomainError = (e: unknown): DomainError =>
  isDomainError(e) ? e : new DomainError('unknown', e instanceof Error ? e.message : undefined, e);
```

Exporta también `BUSINESS_ERROR_CODES` (array `as const` con `slotUnavailable`, `clientOverlap`,
`outsideWorkingHours`, `bookingWindow`, `cancellationWindowClosed`, `notFound`, `forbidden`, `unauthorized`,
`validation`), que usa el mapper para reconocer los `raise exception` de las RPCs.

### 1.2 `map-supabase-error.ts`

Firma: `export function mapSupabaseError(error: unknown): DomainError`. No importes tipos de supabase-js en la
lógica: trata la entrada como objeto con propiedades opcionales (`code`, `message`, `details`, `status`, `name`).
Reglas, **en este orden**:

| Entrada | Resultado |
|---|---|
| Ya es `DomainError` | se devuelve tal cual |
| `code === '23P01'` y (`message` o `details`) contiene `appointments_no_client_overlap` | `clientOverlap` |
| `code === '23P01'` (cualquier otro) | `slotUnavailable` |
| `code === 'P0001'` y `message` ∈ `BUSINESS_ERROR_CODES` | ese código |
| `code === 'PGRST116'` | `notFound` |
| `code === '42501'` | `forbidden` |
| `code === 'PGRST301'` o `status === 401` | `unauthorized` |
| `code === '23514'` o `code === '22P02'` | `validation` |
| Error de auth con `code === 'otp_expired'` | `invalidCode` (mensaje "The code is invalid or has expired") |
| Error de auth con `code` que empieza por `over_` y contiene `rate_limit`, o `status === 429` | `rateLimited` |
| `name === 'AuthSessionMissingError'` | `unauthorized` |
| `message` contiene `Network request failed`, `Failed to fetch`, `fetch failed` o `timeout` (sin distinguir mayúsculas) | `network` |
| Cualquier otra cosa | `unknown` (conserva el error original en `cause`) |

### 1.3 `error-messages.ts`

`getErrorPresentation(code: DomainErrorCode): { title: string; message: string; action: 'retry' | 'chooseAnotherTime' | 'signInAgain' | 'none' }`
con textos en inglés. Ejemplos: `slotUnavailable` → "That time was just taken" / "Please choose another time." /
`chooseAnotherTime`; `network` → "You're offline" / "Check your connection and try again." / `retry`;
`cancellationWindowClosed` → "Too late to change" / "Appointments can only be changed up to 2 hours before they start." / `none`.
Cubre **todos** los códigos (usa un `Record<DomainErrorCode, …>` para que TS obligue a completarlo).

### 1.4 Tests

`src/core/errors/__tests__/map-supabase-error.test.ts`: un caso por fila de la tabla 1.2 (incluidos los dos
`23P01`). `error-messages.test.ts`: todos los códigos tienen título y mensaje no vacíos.

## Paso 2 · Tiempo y zona horaria (`src/core/time/zoned.ts`)

Usa `@date-fns/tz` (`TZDate`, `tz`) y `date-fns`. **Nunca** uses `new Date(y, m, d)` (zona del dispositivo).

```ts
export type LocalDate = string; // 'YYYY-MM-DD' in the business timezone
export type LocalTime = string; // 'HH:MM' (also accepts 'HH:MM:SS' from Postgres)

export function toLocalDate(instant: Date, timeZone: string): LocalDate;
export function zonedInstant(date: LocalDate, time: LocalTime, timeZone: string): Date;
export function addDaysToLocalDate(date: LocalDate, days: number): LocalDate;   // pure calendar math, no tz
export function weekdayOf(date: LocalDate): number;                              // 0 = Sunday … 6 = Saturday
export function localTimeToMinutes(time: LocalTime): number;                    // '09:30' -> 570
export function formatTime(instant: Date, timeZone: string): string;            // '10:30 AM'
export function formatLongDate(instant: Date, timeZone: string): string;        // 'Tuesday, Oct 6'
export function formatDayChip(date: LocalDate): { weekday: string; day: string; month: string }; // Tue / 6 / Oct
export function compareLocalDate(a: LocalDate, b: LocalDate): number;           // <0, 0, >0
```

- `addDaysToLocalDate` y `weekdayOf` trabajan con `Date.UTC(y, m - 1, d)` y `getUTCDay()` → independientes de zona.
- `zonedInstant` construye `new TZDate(y, m - 1, d, h, min, timeZone)` y devuelve `new Date(tzDate.getTime())`.
- Exporta también `formatPrice(cents: number, currency: string): string` con `Intl.NumberFormat('en-US', { style: 'currency', currency })`
  (aquí o en `src/core/format/`; es pura).

**Tests obligatorios** (`src/core/time/__tests__/zoned.test.ts`):

| Caso | Esperado |
|---|---|
| `zonedInstant('2026-10-01', '10:00', 'America/Mexico_City')` | `2026-10-01T16:00:00.000Z` (UTC−6, México no tiene horario de verano desde 2022) |
| `zonedInstant('2026-03-07', '09:00', 'America/New_York')` | `2026-03-07T14:00:00.000Z` (EST) |
| `zonedInstant('2026-03-09', '09:00', 'America/New_York')` | `2026-03-09T13:00:00.000Z` (EDT, tras el cambio del 8 de marzo) |
| `zonedInstant('2026-11-02', '09:00', 'America/New_York')` | `2026-11-02T14:00:00.000Z` (tras el cambio del 1 de noviembre) |
| `toLocalDate(new Date('2026-10-02T05:30:00Z'), 'America/Mexico_City')` | `'2026-10-01'` (aún es día 1 en México) |
| `addDaysToLocalDate('2026-12-31', 1)` / `('2026-03-01', -1)` | `'2027-01-01'` / `'2026-02-28'` |
| `weekdayOf('2026-09-27')` | `0` (domingo) |
| `localTimeToMinutes('09:30:00')` | `570` |
| `formatTime(new Date('2026-10-01T16:30:00Z'), 'America/Mexico_City')` | `'10:30 AM'` |
| `formatPrice(2000, 'USD')` | `'$20.00'` |

## Paso 3 · Tema y fuentes (`src/core/theme/`)

- `theme-store.ts` (Zustand + `persist` con `createJSONStorage(() => AsyncStorage)`, clave `agendo-theme`):
  `{ preference: 'system' | 'light' | 'dark'; setPreference(p) }`.
- `use-apply-theme.ts`: hook que lee la preferencia y la aplica a NativeWind (API de la versión instalada,
  normalmente `colorScheme.set(preference)` o `useColorScheme().setColorScheme`). Devuelve el esquema efectivo
  (`'light' | 'dark'`).
- `tokens.ts`: los mismos colores de la definición §11 en hex, `{ light: {...}, dark: {...} }`, para los sitios que
  necesitan un color crudo (iconos de la tab bar, `ActivityIndicator`, `StatusBar`, `RefreshControl`).
  Hook `useThemeColors()` que devuelve el objeto del esquema efectivo. **Los valores deben coincidir** con `global.css`.
- Fuentes: en `app/_layout.tsx` carga `Manrope_400Regular`, `Manrope_600SemiBold`, `Manrope_700Bold` con `useFonts`
  de `@expo-google-fonts/manrope`; mantén el splash con `SplashScreen.preventAutoHideAsync()` hasta que carguen.

## Paso 4 · Componentes UI base (`src/core/ui/`)

Un archivo por componente, todos con `className` de NativeWind, colores **solo** de tokens semánticos y soporte de
`testID`. Exporta todo desde `src/core/ui/index.ts`.

| Componente | Props clave | Notas |
|---|---|---|
| `AppText` | `variant: 'title' \| 'subtitle' \| 'body' \| 'caption' \| 'label'`, `tone?: 'default' \| 'muted' \| 'danger' \| 'primary'` | Aplica Manrope; usa `font-bold` etc. según variante. Opción `tabular` para `fontVariant: ['tabular-nums']` (horarios). |
| `Screen` | `children`, `scroll?: boolean`, `edges?` | `SafeAreaView` + `bg-background` + padding horizontal estándar. |
| `Button` | `title`, `onPress`, `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger'`, `loading?`, `disabled?`, `testID?` | Con `loading` muestra `ActivityIndicator` y queda deshabilitado. `accessibilityRole="button"` y `accessibilityState`. |
| `Card` | `children`, `onPress?` | `bg-surface`, borde `border-border`, esquinas redondeadas. |
| `Skeleton` | `className` (tamaño) | Bloque `bg-surface-muted` con opacidad animada (Reanimated `withRepeat`). |
| `EmptyState` | `title`, `message?`, `actionLabel?`, `onAction?`, `testID?` | Centrado. |
| `ErrorState` | `error: unknown`, `onRetry?`, `testID?` | Convierte con `toDomainError`, usa `getErrorPresentation`; muestra el botón "Retry" solo si `action === 'retry'` y hay `onRetry`. |
| `Badge` | `label`, `tone: 'accent' \| 'success' \| 'warning' \| 'danger' \| 'muted'` | Se usará para "Demo" y estados de cita. |
| `Toast` | — | `toast-store.ts` (Zustand: `show({ message, tone })`, autocierre 2,5 s) + `ToastHost` montado en el layout raíz. Función `showToast(message, tone?)` exportada. |

**Tests (RNTL):** `Button` (llama `onPress`; no lo llama con `loading`/`disabled`), `ErrorState` (muestra el título
correcto para `new DomainError('network')` y el botón Retry llama `onRetry`; para `slotUnavailable` no muestra Retry).

## Paso 5 · Cliente de Supabase (`src/core/supabase/client.ts`)

```ts
import 'react-native-url-polyfill/auto'; // only if the official guide still requires it (see phase 01)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { env, isSupabaseConfigured } from '@/core/config/env';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  if (!client) {
    client = createClient(env.EXPO_PUBLIC_SUPABASE_URL!, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      db: { schema: 'agendo' },
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}
```

- En la fase 04 se generan los tipos de la BD y se tipa el cliente (`SupabaseClient<Database, 'agendo'>`); por ahora
  sin tipos genéricos. Evita el `!` si puedes estrechar el tipo de `env` (el lint puede prohibir non-null assertions).
- **Nadie fuera de `src/core/supabase` y `src/features/*/data/supabase-*` importa este archivo.**

## Paso 6 · TanStack Query (`src/core/query/`)

- `query-client.ts`:
  - `retry: (failureCount, error) => failureCount < 2 && ['network', 'unknown'].includes(toDomainError(error).code)`.
  - `staleTime: 30_000` por defecto.
  - Tipado global del error:
    ```ts
    declare module '@tanstack/react-query' {
      interface Register { defaultError: DomainError }
    }
    ```
- `online-manager.ts`: conecta `onlineManager.setEventListener` con `@react-native-community/netinfo`
  y `focusManager` con `AppState` (patrón de la documentación de TanStack Query para React Native).
- El manejo global de `unauthorized` (cerrar sesión) se añade en la fase 07.

## Paso 7 · Layout raíz y kitchen sink

`app/_layout.tsx`:

```tsx
// order matters: global.css import first
<GestureHandlerRootView style={{ flex: 1 }}>   {/* only if the template already uses gesture-handler */}
  <QueryClientProvider client={queryClient}>
    <ThemeGate>                                  {/* applies theme + StatusBar style */}
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
    </ThemeGate>
  </QueryClientProvider>
</GestureHandlerRootView>
```

`app/index.tsx` (temporal, se reemplaza en la fase 05): muestra cada componente del Paso 4 (botones en sus variantes
y estados, Card, Skeleton, EmptyState, ErrorState con `network`, Badge "Demo") y tres botones para cambiar el tema
(`system` / `light` / `dark`). Sirve para revisar el diseño en ambos modos.

## Paso 8 · Verificación visual

`npx expo start --go --android`. Revisa el kitchen sink en claro y en oscuro (con los botones del tema y con el tema
del sistema). Cierra y abre la app: la preferencia de tema se conserva. Si no puedes ver el emulador:
**🙋 Acción del autor** para que lo confirme (o usa `adb exec-out screencap -p`).

## Paso 9 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] `DomainError`, `mapSupabaseError` y `getErrorPresentation` implementados y testeados (todas las filas de la tabla 1.2).
- [ ] `zoned.ts` y `formatPrice` con todos los tests de la tabla del Paso 2 en verde, con `TZ=UTC`.
- [ ] Tema `system | light | dark` persistido y aplicado; tokens hex coinciden con `global.css`.
- [ ] Manrope cargada; el splash no se oculta antes de que carguen las fuentes.
- [ ] Componentes UI base con tests de `Button` y `ErrorState`.
- [ ] `getSupabaseClient()` creado con schema `agendo`, AsyncStorage y `detectSessionInUrl: false`; solo lo importa `core/supabase`.
- [ ] `QueryClient` con reintentos solo para `network`/`unknown`, `onlineManager` con NetInfo y `defaultError: DomainError`.
- [ ] Kitchen sink revisado en claro y oscuro.
- [ ] lint/typecheck/test en verde; PR mergeado; bitácora actualizada.
