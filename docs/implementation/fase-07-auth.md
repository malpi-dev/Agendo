# Fase 07 · Auth (email + código OTP) y repositorios Supabase

**Rama:** `feat/fase-07-auth`
**Objetivo:** inicio de sesión real con email + código de 6 dígitos, onboarding con `ensure_profile`, sesión
persistente y guards completos; implementaciones **Supabase** de todos los repositorios de lectura/escritura
(catálogo, reserva, citas y agenda; el Realtime llega en la fase 09). Al terminar, el mismo flujo de la fase 06
funciona contra Supabase local.
**Referencias:** definición F1 (§3.1), §5.1 flujo A, §6.4, §6.5, §7.4, §8.3, §8.4 · `CLAUDE.md` "Convenciones del
proyecto Supabase compartido" (puntos 1 y 2).
**Requisitos previos:** fase 06 terminada · Supabase local levantado (`supabase start`) · `.env` apuntando a local
(`http://10.0.2.2:54321` en emulador).

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1. En `supabase/config.toml` sube el límite local de correos para poder probar:
`[auth.rate_limit] email_sent = 100` (solo afecta a local).

## Paso 1 · Utilidad común para repos Supabase (`src/core/supabase/run.ts`)

```ts
// Executes a supabase-js call and converts BOTH returned errors and thrown errors into DomainError.
export async function run<T>(op: () => PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let result: { data: T; error: unknown };
  try {
    result = await op();
  } catch (e) {
    throw mapSupabaseError(e);
  }
  if (result.error) throw mapSupabaseError(result.error);
  return result.data;
}
```

Todos los repos `supabase-*` usan `run(...)`. **Ningún** error crudo sale de `data/`.

## Paso 2 · Repositorios de auth

**`auth/data/supabase-auth-repository.ts`** (`createSupabaseAuthRepository(client)`):

| Método | Implementación |
|---|---|
| `sendCode(email)` | `client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` |
| `verifyCode(email, code)` | `client.auth.verifyOtp({ email, token: code, type: 'email' })` → `{ userId, email }` |
| `getSession()` | `client.auth.getSession()` → `AuthSession \| null` |
| `onAuthChange(listener)` | `client.auth.onAuthStateChange((_event, session) => listener(toAuthSession(session)))` → devuelve `() => data.subscription.unsubscribe()` |
| `signOut()` | `client.auth.signOut()` |

**`auth/data/supabase-profile-repository.ts`**:
- `getMine()`: usuario de la sesión → `from('profiles').select('id, full_name, role').eq('id', userId).maybeSingle()` → `Profile | null`.
- `ensureMine(fullName)`: `client.rpc('ensure_profile', { p_full_name: fullName })`.
- `updateName(fullName)`: `update({ full_name }).eq('id', userId).select().single()`.

**Mocks** (`mock-auth-repository.ts`, `mock-profile-repository.ts`) para tests: código válido `'123456'`;
`'000000'` → `invalidCode`; email `ratelimited@test.dev` → `rateLimited`. El perfil empieza en `null` hasta `ensureMine`.

Añade `auth: AuthRepository` y `profile: ProfileRepository` a `Repositories`. En `createMockRepositories`, usa los
mocks (en modo demo no se muestran pantallas de auth, pero el tipo debe estar completo).

## Paso 3 · Repositorios Supabase de datos

Mappers **solo** donde el formato difiere (snake_case → camelCase, timestamps → `Date`). Ponlos en
`data/mappers.ts` de cada feature. Usa los tipos de `database.generated.ts` para las filas.

| Archivo | Métodos |
|---|---|
| `catalog/data/supabase-catalog-repository.ts` | `getBusiness`: `from('business').select('*').single()`. `listServices`: `eq('is_active', true).order('sort_order')`. `getService`/`getProfessional`: `.maybeSingle()` y `null` → `DomainError('notFound')`. `listProfessionals(serviceId)`: `from('professionals').select('*, professional_services(service_id)').eq('is_active', true)`, mapea `serviceIds` y filtra en TS los que incluyen `serviceId`. `getWorkingHours`: `eq('professional_id', id).order('weekday').order('start_time')`. |
| `booking/data/supabase-booking-repository.ts` | `getBusyRanges`: `rpc('get_busy_ranges', { p_professional_id, p_from: from.toISOString(), p_to: to.toISOString() })`. `book`: `rpc('book_appointment', { p_service_id, p_professional_id, p_starts_at })` y luego lee la fila expandida de `appointments_expanded` por `id`. `reschedule`: `rpc('reschedule_appointment', { p_id, p_new_starts_at })` + lectura expandida. `subscribeToAvailability`: **provisional** hasta la fase 09 → llama `onStatus?.('paused')` y devuelve `() => {}`. |
| `appointments/data/supabase-appointments-repository.ts` | `listMine`: `from('appointments_expanded').select('*').eq('client_id', userId).order('starts_at')`. `getById`: `.eq('id', id).maybeSingle()` → `notFound` si `null`. `cancel`: `rpc('cancel_appointment', { p_id })`. |
| `agenda/data/supabase-agenda-repository.ts` | `listForDay(date, professionalId?)`: rango `[zonedInstant(date,'00:00',tz), zonedInstant(date+1,'00:00',tz))` → `from('appointments_expanded').select('*').eq('status','booked').gte('starts_at', from).lt('starts_at', to)` (+ `eq('professional_id')` si hay filtro). Necesita la zona del negocio: recíbela del catálogo (`getBusiness`) o cachea el negocio en el repo. `subscribe`: provisional hasta la fase 09 (igual que arriba). |

`createSupabaseRepositories(client)` en `core/di/repositories.tsx` construye todos.

**Tests** (`__tests__` en cada `data/`): usa un **cliente falso encadenable**. Patrón sugerido en `src/test/fake-supabase.ts`:
un `Proxy` donde cualquier método (`from`, `select`, `eq`, `order`, …) devuelve el mismo proxy, que además es
*thenable* y resuelve a `{ data, error }` configurados por el test; `rpc` y `auth.*` como `jest.fn()`. Comprueba:
mapeo de filas (fechas como `Date`, camelCase), `null` → `notFound`, `{ code: '23P01', message: '…appointments_no_double_booking…' }`
→ `slotUnavailable`, una excepción `TypeError('Network request failed')` → `network`, y los parámetros exactos de
cada `rpc`.

## Paso 4 · Estado de auth y bootstrap

`src/features/auth/presentation/auth-store.ts` (Zustand, sin persistir; la sesión la persiste supabase-js):

```ts
interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  session: AuthSession | null;
  setSession(session: AuthSession | null): void;
}
```

`useAuthBootstrap()` (se llama una vez en `app/_layout.tsx`):
- Si `!isSupabaseConfigured` → `status = 'signedOut'` y listo.
- Si no: `getSession()` → `setSession`; suscribe `onAuthChange` → `setSession`. Limpia al desmontar.

`useMyProfile()` → `useQuery({ queryKey: ['profile', 'mine'], queryFn: repos.profile.getMine, enabled: status === 'signedIn' && mode === 'supabase' })`.

`useCurrentUser()` (de la fase 05) ahora, en modo supabase, devuelve `{ id, fullName, role }` del perfil (o `null`).

**Repositorios en modo supabase:** en el layout raíz, si `mode === 'supabase' && isSupabaseConfigured` →
`createSupabaseRepositories(getSupabaseClient())` (memorizado). El layout **siempre** provee un objeto de repos cuando
hay rutas que lo usan.

## Paso 5 · Guards definitivos (`app/_layout.tsx`)

| Grupo / ruta | `guard` |
|---|---|
| `(auth)` | `!isDemo && authStatus === 'signedOut'` |
| `onboarding` | `!isDemo && authStatus === 'signedIn' && profileLoaded && profile === null` |
| `(app)` | `isDemo \|\| (authStatus === 'signedIn' && profile !== null)` |

Mientras `authStatus === 'loading'` o el perfil está cargando, **no** ocultes el splash (`SplashScreen.hideAsync()`
solo cuando todo esté resuelto). Si la carga del perfil falla (`network`), muestra una pantalla de error con Retry en
lugar de dejar la app en blanco.

## Paso 6 · Pantallas de auth

Formularios con **React Hook Form + zod** (`zodResolver`) usando los esquemas de `auth/domain/validation.ts`.

**Sign in** (`(auth)/sign-in.tsx`, completa la pantalla de la fase 05):
- Campo email (`testID="email-input"`, `keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete="email"`).
- Botón "Send code" (`testID="send-code-button"`, con `loading`). Error de validación en línea (F1 CA1).
- Éxito → `router.push({ pathname: '/verify', params: { email } })`.
- Errores: `rateLimited` → "Too many attempts. Please wait a moment and try again."; `network` → mensaje de conexión.
- "Explore demo" sigue debajo, separado con un divisor "or".
- Si `!isSupabaseConfigured`, oculta el formulario y deja solo el aviso + Explore demo.

**Enter code** (`(auth)/verify.tsx`):
- Texto "We sent a 6-digit code to <email>".
- Un `TextInput` (`testID="otp-input"`, `keyboardType="number-pad"`, `maxLength={6}`, `textContentType="oneTimeCode"`,
  `autoComplete="one-time-code"`), con los 6 dígitos mostrados en casillas (componente `OtpInput` en `auth/presentation/components`).
- Se envía automáticamente al completar 6 dígitos y también con el botón "Verify" (`testID="verify-button"`).
- "Resend code" deshabilitado 60 s con cuenta atrás visible (F1 CA2) (`testID="resend-button"`).
- `invalidCode`/`codeExpired` → mensaje en línea "The code is invalid or has expired", se queda en la pantalla (F1 CA3).
- Éxito → nada que navegar a mano: el cambio de sesión dispara los guards (onboarding o tabs).

**Onboarding** (`app/onboarding.tsx` → `auth/presentation/screens/onboarding-screen.tsx`):
- "What's your name?" + campo nombre (`testID="full-name-input"`) + "Continue" (`testID="onboarding-continue"`).
- `repos.profile.ensureMine(fullName)` → `invalidateQueries(['profile','mine'])` → los guards llevan a tabs (F1 CA4).
- (Pedir permiso de notificaciones: fase 10.)

**Settings:** si no es demo, botón "Sign out" (`testID="sign-out-button"`) → `repos.auth.signOut()` +
`queryClient.clear()` (F1 CA5). Muestra el email de la sesión.

## Paso 7 · Manejo global de `unauthorized`

En `query-client.ts`, usa `QueryCache`/`MutationCache` con `onError`: si `toDomainError(error).code === 'unauthorized'`
y el modo es `supabase`, cierra sesión (`repos.auth.signOut()` o directamente `getSupabaseClient().auth.signOut()`
desde una función registrada por el layout) y muestra el toast "Your session expired. Please sign in again."
Evita importar features desde `core/query`: registra un callback (`setUnauthorizedHandler(fn)`).

## Paso 8 · Tests

- Vista de *Sign in*: email inválido → error en línea y no llama `sendCode`; válido → llama `sendCode` con el email.
- Vista de *Enter code*: 6 dígitos disparan `verifyCode`; `invalidCode` muestra el mensaje; el botón de reenviar
  está deshabilitado al inicio y se habilita a los 60 s (timers falsos).
- Onboarding: nombre de 1 carácter → error; válido → `ensureMine` llamado.
- Repos Supabase (Paso 3).

## Paso 9 · Verificación manual contra Supabase local

1. `supabase start` y `.env` con URL local (`10.0.2.2` en emulador) + publishable key local; `EXPO_PUBLIC_DATA_SOURCE=supabase`.
2. Reinicia Metro con `npx expo start --go --android --clear` (las variables `EXPO_PUBLIC_*` se incrustan al compilar).
3. Sign in con un email **nuevo** (p. ej. `new.user@agendo.dev`) → código en Mailpit (`http://127.0.0.1:54324`) →
   onboarding → tabs. Cierra la app y ábrela: sigue la sesión.
4. Reserva una cita en Supabase local; compruébala en Studio (`agendo.appointments`).
5. Conflicto real: con la pantalla de confirmación abierta, inserta desde `psql` una cita solapada para ese
   profesional/hora (como `postgres`); pulsa Confirm → "That time was just taken".
6. Sign out → vuelve a *Sign in*. Inicia con `client@agendo.dev` (perfil existente → tabs directamente, sin onboarding).
7. Explore demo sigue funcionando igual.

## Paso 10 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] F1 CA1–CA5 cumplidos contra Supabase local.
- [ ] `ensure_profile` es el único camino de creación de perfil; usuario existente no pasa por onboarding.
- [ ] Guards de `(auth)`, `onboarding` y `(app)` correctos; el splash no deja ver pantallas intermedias.
- [ ] Repos Supabase de catálogo, reserva, citas y agenda implementados con `run()` y mappers; ningún error crudo escapa.
- [ ] Tests de repos Supabase con cliente falso (mapeo, errores, parámetros de RPC) y de las vistas de auth.
- [ ] `unauthorized` global cierra sesión.
- [ ] Flujo de reserva completo funcionando contra Supabase local, incluido el conflicto.
- [ ] lint/typecheck/test en verde; PR mergeado; bitácora actualizada.
