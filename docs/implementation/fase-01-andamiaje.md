# Fase 01 · Andamiaje

**Rama:** `feat/fase-01-andamiaje`
**Objetivo:** proyecto Expo funcionando en Android (Expo Go) con TypeScript strict, NativeWind, ESLint + Prettier,
Jest, la estructura de carpetas de la arquitectura y el CI de GitHub Actions en verde.
**Referencias:** definición §8.2, §9, §10, §14, §15 · `CLAUDE.md` (Stack, Seguridad).
**Requisitos previos:** Node ≥ 20, npm, `gh` autenticado, un emulador Android o teléfono con Expo Go.

> Esta fase no contiene lógica de negocio. Al terminarla, la app debe abrir una pantalla vacía con el texto
> "Agendo" usando una clase de NativeWind, y `lint`, `typecheck` y `test` deben pasar.

---

## Paso 0 · Inicio de fase

Sigue `00-guia-general.md` §3.1. Además:

- El repo ya existe (`origin = git@github.com:malpi-dev/Agendo.git`, rama `main` con solo `docs/`).
- Si hay cambios sin commitear en `docs/`, commitéalos como primer commit de la rama:
  `git add docs && git commit -m "docs: add product definition and implementation plan"`.
- En `../CLAUDE.md` y `../README.md` (carpeta del portafolio, **no** es un repo) cambia el estado de Agendo a `🚧 En progreso`.

## Paso 1 · Crear el proyecto Expo

`create-expo-app` no funciona bien sobre una carpeta que ya tiene `.git` y `docs/`. Se genera en una carpeta temporal
hermana y se copia:

```bash
cd ..                                            # carpeta MobilePorfolio
npx create-expo-app@latest agendo-scaffold --template default --no-install
cd agendo-scaffold
rm -rf .git                                      # por si la CLI creó un repo
cd ../Agendo
rsync -a --exclude node_modules --exclude .git ../agendo-scaffold/ ./
rm -rf ../agendo-scaffold
npm install
npm run reset-project                            # responde "n" si pregunta si mover a app-example (queremos borrarlo)
rm -rf app-example
```

- Si `reset-project` pregunta, elige la opción que **no** conserva el ejemplo. Después borra el script
  `scripts/reset-project.js` y la entrada `"reset-project"` de `package.json`.
- Borra los assets de ejemplo que no se usen (se mantienen `assets/images/icon.png`, `adaptive-icon.png`,
  `splash-icon.png`, `favicon.png` hasta la fase 11).
- Verifica que `app/` solo contiene `_layout.tsx` e `index.tsx`.

## Paso 2 · Configurar `app.json`

Edita (manteniendo lo que ya trae la plantilla, como los plugins de `expo-router` y `expo-splash-screen`):

```jsonc
{
  "expo": {
    "name": "Agendo",
    "slug": "agendo",
    "scheme": "agendo",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "ios": { "bundleIdentifier": "com.malpidev.agendo", "supportsTablet": false },
    "android": { "package": "com.malpidev.agendo" /* + adaptiveIcon/edgeToEdge que traiga la plantilla */ },
    "experiments": { "typedRoutes": true }
  }
}
```

Quita la configuración de `web` salvo lo mínimo que exija la plantilla (web no se soporta, definición §3.2).

## Paso 3 · Dependencias de runtime

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage \
  @tanstack/react-query zustand zod react-hook-form @hookform/resolvers \
  @shopify/flash-list date-fns @date-fns/tz \
  expo-constants expo-linking expo-splash-screen expo-font @expo-google-fonts/manrope \
  expo-haptics @react-native-community/netinfo
```

- **No** instales todavía `expo-notifications`, `expo-device` ni `expo-dev-client` (fase 10; ver bitácora).
- Revisa la guía oficial vigente de Supabase para React Native/Expo: si sigue indicando `react-native-url-polyfill`,
  instálalo y anótalo en la bitácora.

## Paso 4 · TypeScript strict

En `tsconfig.json` (conserva el `extends` de Expo):

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts", "nativewind-env.d.ts"]
}
```

- **Atención:** la plantilla suele traer `"@/*": ["./*"]`. Cámbialo a `./src/*` y corrige los imports que rompa
  (tras `reset-project` casi no quedan).
- Script en `package.json`: `"typecheck": "tsc --noEmit"`.

## Paso 5 · NativeWind

Sigue la **guía oficial de instalación para Expo de la versión estable vigente de NativeWind** (la versión de Tailwind
compatible depende de ella; respeta la que indique). Resultado esperado:

- Paquetes: `nativewind`, `react-native-reanimated`, `react-native-safe-area-context` (con `npx expo install`),
  `tailwindcss` y `prettier-plugin-tailwindcss` como devDependencies.
- `global.css` con las directivas de Tailwind, importado en `app/_layout.tsx`.
- `tailwind.config.js` con `content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}']`, el preset de NativeWind y
  `darkMode: 'class'` (o el mecanismo equivalente que indique la guía de la versión instalada).
- `babel.config.js` y `metro.config.js` (`withNativeWind(config, { input: './global.css' })`) según la guía.
- `nativewind-env.d.ts` con la referencia de tipos.
- **Tokens de color** (definición §11) — defínelos ya como variables CSS para que el modo oscuro funcione solo:

  ```css
  /* global.css (después de las directivas de Tailwind) */
  :root {
    --color-primary: 15 118 110;        /* #0F766E */
    --color-on-primary: 255 255 255;
    --color-accent: 249 115 96;         /* #F97360 */
    --color-background: 247 248 246;
    --color-surface: 255 255 255;
    --color-surface-muted: 238 242 240;
    --color-text: 17 24 39;
    --color-text-muted: 107 114 128;
    --color-border: 226 232 228;
    --color-success: 22 163 74;
    --color-warning: 217 119 6;
    --color-danger: 220 38 38;
  }
  .dark:root {
    --color-primary: 45 212 191;        /* #2DD4BF */
    --color-on-primary: 4 47 46;
    --color-accent: 251 138 122;
    --color-background: 11 18 21;
    --color-surface: 19 28 32;
    --color-surface-muted: 27 38 43;
    --color-text: 230 237 234;
    --color-text-muted: 148 163 160;
    --color-border: 36 50 58;
    --color-success: 74 222 128;
    --color-warning: 251 191 36;
    --color-danger: 248 113 113;
  }
  ```

  y en `tailwind.config.js` → `theme.extend.colors`: `primary: 'rgb(var(--color-primary) / <alpha-value>)'`, igual para
  `on-primary`, `accent`, `background`, `surface`, `surface-muted`, `text`, `text-muted`, `border`, `success`,
  `warning`, `danger`. **Si la versión de NativeWind instalada usa otra sintaxis para variables o dark mode**
  (p. ej. Tailwind v4 con `@theme`), adapta siguiendo su guía y anótalo en la bitácora. Lo importante es:
  clases semánticas (`bg-surface`, `text-text-muted`…) que cambian solas entre claro y oscuro.
- Fuente: `fontFamily: { sans: ['Manrope_400Regular'], semibold: ['Manrope_600SemiBold'], bold: ['Manrope_700Bold'] }`
  (la carga de fuentes se hace en la fase 02).

Prueba: en `app/index.tsx` muestra `<Text className="text-2xl text-primary">Agendo</Text>` sobre `bg-background`.

## Paso 6 · ESLint + Prettier

```bash
npx expo lint                                   # genera eslint.config.js (flat config) con eslint-config-expo
npx expo install --dev prettier eslint-config-prettier
```

`.prettierrc`:

```json
{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100, "plugins": ["prettier-plugin-tailwindcss"] }
```

`.prettierignore`: `node_modules`, `.expo`, `android`, `ios`, `dist`, `coverage`, `supabase/.temp`, `*.generated.ts`.

`eslint.config.js` (flat config): extiende el de Expo, añade `eslint-config-prettier` al final y esta regla de
arquitectura:

```js
{
  files: ['src/features/*/domain/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['**/data/**', '**/presentation/**'], message: 'domain must not import data or presentation.' },
        { group: ['react', 'react-native', 'react-native-*', 'expo', 'expo-*', '@expo/*'], message: 'domain must be framework-free.' },
        { group: ['@supabase/*', '@tanstack/*', 'zustand', 'nativewind'], message: 'domain must not depend on backend/state/UI libraries.' },
        { group: ['@/core/*', '!@/core/errors', '!@/core/errors/*', '!@/core/time', '!@/core/time/*'], message: 'domain may only import @/core/errors and @/core/time from core.' },
      ],
    }],
  },
},
```

Añade también `ignores: ['supabase/functions/**', '.expo/**', 'android/**', 'ios/**', 'coverage/**']`
(las Edge Functions son Deno y se validan aparte).

Scripts: `"lint": "expo lint --max-warnings 0"`, `"format": "prettier --write ."`, `"format:check": "prettier --check ."`.
Ejecuta `npm run format` una vez y deja el lint limpio.

## Paso 7 · Jest

```bash
npx expo install --dev jest jest-expo @types/jest @testing-library/react-native
```

`jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  globalSetup: './jest.global-setup.js',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/supabase/', '/.maestro/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/flash-list|nativewind|react-native-css-interop)',
  ],
};
```

`jest.global-setup.js`:

```js
module.exports = async () => {
  process.env.TZ = 'UTC'; // domain logic must never depend on the machine timezone
};
```

Scripts: `"test": "jest"`, `"test:watch": "jest --watch"`.

Crea un test de humo `src/core/__tests__/smoke.test.ts` (`expect(1 + 1).toBe(2)`) para que la suite no esté vacía;
se borra en la fase 02 cuando haya tests reales.

## Paso 8 · Estructura de carpetas

Crea (con un `.gitkeep` en las vacías):

```
src/core/{config,supabase,di,errors,theme,time,ui,query}
src/features/{auth,catalog,booking,appointments,agenda,notifications}/{domain,data,presentation}
src/features/demo/{data,presentation}
src/features/settings/presentation
.maestro/
.github/workflows/
```

## Paso 9 · Variables de entorno

- `.env.example` con el contenido exacto de la definición §15 (comentarios en inglés).
- `.gitignore`: añade `.env`, `.env.local`, `.env.*.local`, `supabase/functions/.env`, `supabase/.temp`, `coverage/`,
  `*.apk`, `*.aab`. Verifica que `.env.example` **no** queda ignorado.
- `src/core/config/env.ts`:

  ```ts
  import { z } from 'zod';

  const schema = z.object({
    EXPO_PUBLIC_SUPABASE_URL: z.url().optional(),
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    EXPO_PUBLIC_DATA_SOURCE: z.enum(['supabase', 'mock']).default('supabase'),
  });

  // Expo only inlines EXPO_PUBLIC_* when accessed statically, so list them explicitly.
  const parsed = schema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
    EXPO_PUBLIC_DATA_SOURCE: process.env.EXPO_PUBLIC_DATA_SOURCE || undefined,
  });

  export const env = parsed.success ? parsed.data : { EXPO_PUBLIC_DATA_SOURCE: 'mock' as const };
  export const isSupabaseConfigured = Boolean(env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  ```

  (Si la versión de zod instalada es 3.x, usa `z.string().url()` en lugar de `z.url()`.) Nunca lanza: si faltan
  variables, la app arrancará solo con *Explore demo* (definición §15).
- Crea tu `.env` local copiando `.env.example` con `EXPO_PUBLIC_DATA_SOURCE=mock` (no se commitea).

## Paso 10 · CI (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run format:check
      - run: npm test -- --ci
```

(Usa las versiones mayores más recientes de las actions si hay otras disponibles.)

## Paso 11 · Probar en Android

```bash
npx expo start --go --android      # --go fuerza Expo Go
```

- Debe verse "Agendo" en teal sobre fondo claro. Cambia el tema del emulador a oscuro: el texto y el fondo deben
  cambiar (si el modo oscuro de NativeWind necesita configuración extra para seguir al sistema, hazla ahora).
- Si no hay emulador ni teléfono disponible: **🙋 Acción del autor** → pedir que lo abra y confirme.
- Opcional para verificar tú mismo: `adb exec-out screencap -p > /tmp/agendo-shot.png` y revisa la imagen.

## Paso 12 · Bitácora y cierre

- Rellena la tabla "Versiones clave instaladas" de `bitacora.md` (lee `package.json` y `supabase --version`, `node -v`).
- Cierra la fase según `00-guia-general.md` §3.3. El CI del PR debe pasar.

---

## Criterios de terminado

- [ ] `app.json` con nombre, slug, scheme, package `com.malpidev.agendo` y `userInterfaceStyle: automatic`.
- [ ] `npm run lint`, `npm run typecheck`, `npm run format:check` y `npm test -- --ci` pasan sin warnings.
- [ ] Alias `@/` apunta a `src/` y funciona en TS, Metro y Jest.
- [ ] Una clase de NativeWind con color semántico se ve en Android y cambia con el modo oscuro del sistema.
- [ ] La regla `no-restricted-imports` de `domain/` existe (compruébalo creando temporalmente un import prohibido; bórralo después).
- [ ] Estructura de carpetas creada; `.env.example` commiteado y `.env` ignorado.
- [ ] CI en verde en el PR; PR mergeado con squash; bitácora actualizada (versiones incluidas).
