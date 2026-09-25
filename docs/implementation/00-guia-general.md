# Agendo — Guía general de implementación

> **Lee este archivo completo antes de empezar cualquier fase.** Después lee `bitacora.md` para saber en qué
> fase vas y, por último, el archivo de la fase que toca (`fase-NN-<nombre>.md`).

## 1. Documentos de referencia (orden de prioridad)

1. `../../../CLAUDE.md` (carpeta del portafolio): reglas globales. **Prevalece** sobre todo lo demás.
2. `../definicion.md`: qué se construye (alcance, modelo, backend, UI). Cada fase cita las secciones (§) que necesita.
3. Archivo de la fase actual: **cómo** se construye, paso a paso.
4. `bitacora.md`: estado, decisiones tomadas durante la implementación y bloqueos.

Si encuentras una contradicción entre documentos, sigue el de mayor prioridad y **anótala en la bitácora**
(sección "Decisiones y desviaciones").

## 2. Idiomas (obligatorio)

| Qué | Idioma |
|---|---|
| Código (nombres de variables, funciones, archivos, tipos), comentarios en el código | **Inglés** |
| Textos de la UI (botones, mensajes, errores visibles) | **Inglés** |
| Mensajes de commit, títulos y descripciones de PR, nombres de rama | **Inglés** |
| `README.md` del repo | **Inglés** |
| Documentos en `docs/` (incluida la bitácora) | **Español** |

## 3. Protocolo de cada fase

Cada fase es **una rama** y termina **integrada en `main`**. Sigue estos pasos siempre, en este orden.

### 3.1 Al empezar la fase

```bash
git status                               # debe estar limpio; si no, ver nota abajo
git checkout main
git pull origin main
git checkout -b feat/fase-NN-<nombre>    # ej.: feat/fase-03-dominio
```

- El nombre de la rama es exactamente el del archivo de la fase sin `.md`, con prefijo `feat/`
  (`fase-01-andamiaje.md` → `feat/fase-01-andamiaje`).
- Si `git status` no está limpio: **no borres nada**. Si los cambios son solo de `docs/`, se commitean como primer
  commit de la rama de la fase (`docs: ...`). Si son de código y no sabes de dónde salen, detente y pregunta al autor.
- Actualiza `bitacora.md`: estado de la fase → `🚧 En progreso`, fecha de inicio, "Fase actual" y barra de progreso
  (ver §5 de esta guía).

### 3.2 Durante la fase

- Haz commits pequeños con **Conventional Commits** en inglés: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `ci:`.
  Ejemplo: `feat(booking): add getAvailableSlots use case`.
- No hagas nada que no pida la fase. Si ves algo útil fuera de alcance, anótalo en la bitácora ("Ideas para el roadmap").
- Pasos marcados con **🙋 Acción del autor** requieren que el humano haga algo (login, crear cuentas, secretos,
  probar en un teléfono…). **Detente, explica exactamente qué debe hacer y espera** su confirmación. No inventes
  credenciales ni te saltes el paso.

### 3.3 Al terminar la fase

1. Ejecuta la verificación completa (a partir de la fase 01 existen estos scripts):
   ```bash
   npm run lint && npm run typecheck && npm test -- --ci
   ```
   Todo debe pasar **sin errores ni warnings**. Si la fase toca la base de datos, además `supabase db reset` y
   `supabase test db` (desde la fase 04).
2. Revisa la **checklist de "Criterios de terminado"** del archivo de la fase. Cada casilla debe cumplirse de verdad.
3. Actualiza `bitacora.md`: estado `✅ Terminada`, fecha de fin, barra de progreso, entrada en el registro con lo
   hecho, decisiones y pendientes. Commit: `docs: update implementation log for phase NN`.
4. Integra en `main` con **squash merge** vía Pull Request:
   ```bash
   git push -u origin feat/fase-NN-<nombre>
   gh pr create --base main --title "feat: phase NN - <short english title>" \
     --body "<resumen en inglés de lo hecho + checklist de la fase>"
   gh pr checks --watch                     # espera a que el CI termine (desde la fase 01)
   gh pr merge --squash --delete-branch
   git checkout main && git pull origin main
   ```
   - Si el CI falla: corrige en la misma rama, `git push`, y vuelve a esperar. **Nunca** hagas merge con CI en rojo.
   - Si `gh` no está autenticado (`gh auth status` falla): **🙋 Acción del autor** → pedir que ejecute `gh auth login`.
   - Solo si el autor lo autoriza explícitamente, alternativa local:
     `git checkout main && git merge --squash feat/fase-NN-<nombre> && git commit -m "feat: phase NN - ..." && git push origin main && git branch -D feat/fase-NN-<nombre>`.
5. No empieces la fase siguiente en la misma rama. Cada fase arranca desde `main` actualizado.

## 4. Reglas técnicas que aplican a todas las fases

- **Arquitectura** (definición §8): `src/core/` + `src/features/<feature>/{domain,data,presentation}`.
  - `domain/` no importa nada de `data/`, `presentation/`, React, React Native, Expo, Supabase, TanStack Query ni Zustand.
    Puede importar otros `domain/`, `@/core/errors`, `@/core/time` y librerías puras (`date-fns`, `@date-fns/tz`).
  - La UI **nunca** llama a Supabase: siempre `useRepositories().<repo>`.
  - Cada repositorio tiene implementación `supabase-*` y `mock-*`.
  - Los repositorios **lanzan** `DomainError`; nunca dejan escapar errores crudos del SDK.
- Las carpetas de `app/` (Expo Router) solo reexportan pantallas: `export { default } from '@/features/x/presentation/screens/y-screen';`
- **Nombres de archivo** en `kebab-case` (`get-available-slots.ts`, `slot-chip.tsx`). Componentes y tipos en `PascalCase`,
  funciones y variables en `camelCase`.
- **TypeScript strict**: prohibido `any` (usa `unknown` y estrecha), prohibido `@ts-ignore`. `// eslint-disable` solo con
  justificación en la misma línea.
- **Fechas:** los instantes son `Date` (UTC). Los días "de calendario" son strings `YYYY-MM-DD` en la **zona del negocio**
  (tipo `LocalDate`). Nunca uses la zona horaria del dispositivo para cálculos de negocio; usa `@/core/time`.
- **Dependencias:** instala siempre con `npx expo install <pkg>` (fija versiones compatibles con el SDK). No añadas
  librerías que no estén en la definición §9 sin anotarlo en la bitácora y justificarlo.
- **No adivines APIs.** Si dudas de la firma de una librería (NativeWind, Expo Router, supabase-js…), revisa los tipos en
  `node_modules/<pkg>` o la documentación oficial de la versión instalada. Anota en la bitácora las versiones clave.
- **`testID`** estables (kebab-case) en todo elemento que usen los tests o Maestro: botones, chips, filas de listas.
- **Secretos:** nunca commitees `.env`, `.env.local`, `supabase/functions/.env` ni claves. La secret key de Supabase
  (`sb_secret_…`) jamás va en el cliente.
- **Estados de UI:** toda pantalla que carga datos tiene estado de carga (skeleton), vacío y error con "Retry" (definición §12.1).
- **Modo oscuro:** todo color sale de los tokens del tema (definición §11); nada de colores hex sueltos en componentes.

## 5. Cómo actualizar la barra de progreso

La barra tiene **un bloque por fase** (13 en total):

- `█` = fase terminada · `▒` = fase en progreso · `░` = fase pendiente.
- Formato: `` `█████▒░░░░░░░` 5/13 fases terminadas (38 %) `` — el porcentaje es `terminadas / 13 × 100`, redondeado al entero.
- Ejemplo con la fase 06 en progreso y 5 terminadas: `` `█████▒░░░░░░░` 5/13 (38 %) ``.

## 6. Cuando algo no sale

1. Lee el error completo. Busca la causa, no el parche.
2. Si una instrucción de la fase no funciona con la versión instalada de una librería, adapta siguiendo la
   documentación oficial y **anota la desviación** en la bitácora.
3. Si tras 2–3 intentos razonables sigues bloqueado, anota el bloqueo en la bitácora ("Bloqueos") y pregunta al autor.
4. Nunca uses `--no-verify`, `git push --force` a `main`, ni desactives reglas de lint o tests para "pasar".

## 7. Mapa de fases

| # | Archivo | Objetivo |
|---|---|---|
| 01 | `fase-01-andamiaje.md` | Proyecto Expo, dependencias, TS strict, NativeWind, ESLint/Prettier, Jest, estructura, CI |
| 02 | `fase-02-core.md` | Errores de dominio, tiempo/zona horaria, tema, UI base, cliente Supabase, contenedor de repos, providers |
| 03 | `fase-03-dominio.md` | Modelos, interfaces de repositorio y casos de uso puros con tests exhaustivos |
| 04 | `fase-04-backend-local.md` | Supabase local: migraciones (schema, RLS, RPCs), seed, pgTAP, tipos generados |
| 05 | `fase-05-modo-demo.md` | Fixtures, mock DB, repos mock, Explore demo, guards de navegación, tabs |
| 06 | `fase-06-reserva.md` | Catálogo y flujo de reserva completo (UI) funcionando en modo demo |
| 07 | `fase-07-auth.md` | Auth con OTP, onboarding, sesión y repositorios Supabase de catálogo y reserva |
| 08 | `fase-08-mis-citas.md` | Mis citas, detalle, cancelar y reprogramar |
| 09 | `fase-09-realtime-y-agenda.md` | Realtime con Broadcast y agenda del admin |
| 10 | `fase-10-notificaciones.md` | Push: token, Edge Function, pg_cron, deep link, notificación local en demo |
| 11 | `fase-11-ajustes-y-pulido.md` | Ajustes, modo oscuro, ícono/splash, auditoría de estados de UI |
| 12 | `fase-12-e2e-y-ci.md` | Maestro, workflows de release y keep-alive |
| 13 | `fase-13-lanzamiento.md` | Supabase remoto, build preview, README, tag `v1.0.0` |
