# Fase 11 · Ajustes, identidad visual y pulido

**Rama:** `feat/fase-11-ajustes-y-pulido`
**Objetivo:** pantalla de Ajustes completa, ícono y splash propios (claro/oscuro), auditoría de modo oscuro y
contraste, y revisión pantalla por pantalla de los estados de carga/vacío/error y de accesibilidad.
Al terminar, la app se ve "de producto", no de prototipo.
**Referencias:** definición §4 (`settings`), §11 (identidad visual), §12.1 (estados), §16 (definición de terminado).
**Requisitos previos:** fase 10 terminada.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Paso 1 · Ajustes completos (`settings/presentation/screens/settings-screen.tsx`)

Secciones (en este orden), cada fila con `testID`:

| Sección | Contenido |
|---|---|
| **Profile** | Nombre editable (RHF + `fullNameSchema`) con botón "Save" (`testID="save-name-button"`) → `repos.profile.updateName` + invalidar `['profile','mine']`; error en línea (§12.1). Email de la sesión (solo lectura). En demo: "Casey Morgan · demo account" sin edición. |
| **Appearance** | Control segmentado **System / Light / Dark** (`testID="theme-system"`, `theme-light`, `theme-dark`) usando `theme-store`. |
| **Reminders** | Estado de la fase 10 (On / Reminders disabled + Open settings / Not available). |
| **Demo** (solo demo) | "Explore as: Client/Admin" (`demo-switch-role`) y "Exit demo" (`demo-exit`). |
| **Account** (solo real) | "Sign out" (`sign-out-button`). |
| **About** | Versión (`expo-constants`), "Times are shown in <business name>'s timezone (<tz>)". |

Tests: guardar nombre llama a `updateName`; nombre inválido muestra error; el control de tema actualiza el store.

## Paso 2 · Ícono y splash

1. Diseña el ícono como **SVG maestro** en `assets/source/icon.svg` (1024×1024): calendario redondeado en teal
   `#0F766E` con un check minimalista en coral `#F97360`, **sin texto** (definición §11). Crea también
   `assets/source/adaptive-foreground.svg` (el mismo motivo dentro de la zona segura central ~66 %, fondo transparente)
   y `assets/source/notification-icon.svg` (silueta **blanca** monocroma, fondo transparente).
2. Exporta PNG con una herramienta de línea de comandos (p. ej. `npx sharp-cli` o `rsvg-convert` de `librsvg`):
   - `assets/images/icon.png` 1024×1024
   - `assets/images/adaptive-icon.png` 1024×1024 (foreground)
   - `assets/images/splash-icon.png` 1024×1024 (motivo sobre transparente)
   - `assets/images/notification-icon.png` 96×96 (blanco)
3. `app.json`:
   - `icon`, `android.adaptiveIcon = { foregroundImage, backgroundColor: "#0B4F4A" }` (teal oscuro).
   - Plugin `expo-splash-screen`: `image`, `imageWidth: 200`, `backgroundColor: "#0F766E"`,
     `dark: { backgroundColor: "#0B1215" }` (revisa las claves de la versión instalada).
   - Plugin `expo-notifications`: `icon: "./assets/images/notification-icon.png"`.
4. Genera un nuevo development build para verlo (`npx expo run:android --device`).

Si no consigues un resultado visual digno (el ícono es lo primero que ve un cliente): **🙋 pide al autor** que lo
revise o aporte los PNG.

## Paso 3 · Auditoría de modo oscuro y contraste

1. Busca colores sueltos: `grep -rnE "#[0-9a-fA-F]{3,8}\b" src app --include=*.tsx` → solo pueden aparecer en
   `src/core/theme/tokens.ts`. Corrige los demás.
2. Contraste AA (≥ 4,5:1 para texto normal) de estas parejas, en claro **y** oscuro: `text/background`,
   `text/surface`, `text-muted/surface`, `on-primary/primary`, `danger/surface`, `accent` (badge "Demo") con su texto.
   Calcúlalo con un script Node temporal (fórmula de luminancia relativa WCAG) en tu carpeta de scratch. Si alguna
   pareja falla, ajusta el token **en `global.css` y `tokens.ts` a la vez** y anota el cambio en la bitácora.
3. Recorre todas las pantallas en Light, Dark y System; también la barra de estado y la tab bar.

## Paso 4 · Auditoría de estados de UI (definición §12.1)

Recorre la tabla §12.1 fila por fila. Para cada pantalla fuerza los tres estados:
- **Carga**: en demo sube temporalmente `latencyMs` a `[2000, 2000]`.
- **Vacío**: con un `MockDb` modificado o filtros (día sin citas, profesional sin servicios).
- **Error**: con `EXPO_PUBLIC_DATA_SOURCE=supabase` y Supabase local parado (`supabase stop`) → `network`.

Rellena en la bitácora una tabla con ✅/❌ por pantalla y estado; corrige todos los ❌.

## Paso 5 · Accesibilidad y detalles

- `accessibilityRole` y `accessibilityLabel` en botones de solo icono (‹ › de la agenda, cerrar hojas), chips de día
  ("Tuesday, October 6, unavailable") y chips de horario ("10:30 AM").
- Área táctil mínima 44×44.
- Textos que no se corten con fuente del sistema grande (prueba con escala de fuente 1,3 en Android).
- Teclado: formularios con `KeyboardAvoidingView` o equivalente; `returnKeyType` adecuado.
- Haptics solo en confirmar reserva/reprogramación.
- Elimina logs de depuración y código muerto (kitchen sink incluido si ya no aporta).

## Paso 6 · Cierre

`00-guia-general.md` §3.3.

---

## Criterios de terminado

- [ ] Ajustes con perfil editable, tema persistido, estado de recordatorios, sección demo y cerrar sesión.
- [ ] Ícono, ícono adaptativo, splash claro/oscuro e ícono de notificación propios.
- [ ] Ningún color hex fuera de `tokens.ts`/`global.css`; contraste AA verificado en ambos modos.
- [ ] Tabla de auditoría de estados (§12.1) en la bitácora, toda en ✅.
- [ ] Accesibilidad básica revisada.
- [ ] lint/typecheck/test en verde; PR mergeado; bitácora actualizada.
