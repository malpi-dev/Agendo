# Fase 12 · E2E con Maestro y workflows de release y keep-alive

**Rama:** `feat/fase-12-e2e-y-ci`
**Objetivo:** flujos de Maestro (obligatorio `book-appointment.yaml`, recomendado `admin-agenda.yaml`) pasando
en modo demo; workflow `release.yml` que construye el APK con EAS al crear un tag `v*` y lo publica en GitHub
Releases; workflow `keep-alive.yml` para que el proyecto Supabase compartido no se pause.
**Referencias:** definición §13 (E2E), §14 (CI/CD), §7.6 (keep-alive), §15 (secretos de GitHub) · `CLAUDE.md` "Común".
**Requisitos previos:** fase 11 terminada · emulador Android · Java 17+ (para Maestro).

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Paso 1 · Instalar Maestro

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
maestro --version
```

(Si falta Java: **🙋 Acción del autor** o `brew install openjdk@17` si el autor lo permite.) Anota la versión en la bitácora.

## Paso 2 · Build para E2E

Los flujos usan el **modo demo** (deterministas, sin backend). Construye una variante release local e instálala en el
emulador:

```bash
npx expo run:android --variant release
```

(La plantilla de prebuild firma la variante release con la clave de debug; es suficiente para E2E local.)
Comprueba que la app abre sin Metro.

## Paso 3 · Flujos

`.maestro/book-appointment.yaml` (obligatorio):

```yaml
appId: com.malpidev.agendo
name: Book and cancel an appointment (demo)
---
- launchApp:
    clearState: true
- tapOn:
    id: "explore-demo-button"
- tapOn:
    id: "demo-role-client"
- assertVisible:
    id: "demo-badge"
- tapOn:
    id: "service-card-00000000-0000-4000-8000-000000000201"   # Classic haircut
- tapOn:
    id: "professional-row-00000000-0000-4000-8000-000000000101"   # Marco
- tapOn:
    id: "day-chip-2"                                             # third enabled day: always ≥ 2 days ahead
- extendedWaitUntil:
    visible:
      id: "slot-chip-.*"
    timeout: 10000
- tapOn:
    id: "slot-chip-.*"
    index: 3                                                     # the demo simulation takes the first slot
- tapOn:
    id: "confirm-booking-button"
- extendedWaitUntil:
    visible:
      id: "appointment-detail"
    timeout: 10000
- tapOn:
    id: "cancel-appointment-button"
- tapOn: "Cancel appointment"                                    # native alert button
- assertVisible: "Cancelled"
- tapOn: "Appointments"                                          # tab
- assertVisible: "Classic haircut"
```

`.maestro/admin-agenda.yaml` (recomendado; recortable según la definición §17):

```yaml
appId: com.malpidev.agendo
name: Admin sees the day's agenda (demo)
---
- launchApp:
    clearState: true
- tapOn:
    id: "explore-demo-button"
- tapOn:
    id: "demo-role-admin"
- tapOn: "Agenda"
- runFlow:
    when:
      visible: "No appointments for this day"                  # e.g. on Sundays the shop is closed
    commands:
      - tapOn:
          id: "agenda-next-day"
- assertVisible:
    id: "agenda-group-00000000-0000-4000-8000-000000000101"   # Marco
```

- Ajusta textos/IDs a los reales de la app si difieren (no cambies la app para acomodar el test salvo que falte un `testID`).
- Si un paso es inestable por animaciones, usa `extendedWaitUntil` en lugar de `sleep`.

```bash
maestro test .maestro/
```

Ejecútalo **3 veces seguidas**: debe pasar las 3. Graba evidencia opcional: `maestro record .maestro/book-appointment.yaml`.

Scripts en `package.json`: `"e2e": "maestro test .maestro/"`.

## Paso 4 · Variables de entorno en EAS (para el APK de release)

El APK `preview` necesita las `EXPO_PUBLIC_*` del proyecto **remoto** (se crean en la fase 13). Deja preparado el
mecanismo ahora y documentado en el README de la fase 13:

```bash
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "<remote url>" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "<sb_publishable_…>" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_DATA_SOURCE --value "supabase" --visibility plaintext
eas env:create --environment preview --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret
```

(Verifica la sintaxis con `eas env:create --help`.) Los valores remotos los aporta el autor en la fase 13
(**🙋**); en esta fase basta con que `GOOGLE_SERVICES_JSON` exista si ya tienes el archivo.

## Paso 5 · `.github/workflows/release.yml`

```yaml
name: Release
on:
  push:
    tags: ['v*']
permissions:
  contents: write
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --ci
  build-and-release:
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Build APK on EAS
        run: eas build -p android --profile preview --non-interactive --wait --json > build.json
      - name: Download APK
        run: curl -fsSL -o "agendo-${GITHUB_REF_NAME}.apk" "$(jq -r '.[0].artifacts.buildUrl' build.json)"
      - name: Create GitHub Release
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh release create "$GITHUB_REF_NAME" "agendo-${GITHUB_REF_NAME}.apk" --title "Agendo $GITHUB_REF_NAME" --generate-notes
```

- Secreto de GitHub `EXPO_TOKEN`: **🙋 Acción del autor** → crear un access token en expo.dev y
  `gh secret set EXPO_TOKEN` (el autor pega el valor; no lo escribas tú en ningún archivo).
- Verifica con `actionlint` si está disponible (`brew install actionlint` con permiso del autor) o revisa con cuidado la sintaxis YAML.
- **No** crees ningún tag en esta fase; la primera ejecución real es en la fase 13.

## Paso 6 · `.github/workflows/keep-alive.yml`

```yaml
name: Supabase keep-alive
on:
  schedule:
    - cron: '0 12 */3 * *'
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Lightweight read on agendo.business
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
        run: |
          curl -fsS "$SUPABASE_URL/rest/v1/business?select=id&limit=1" \
            -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
            -H "Accept-Profile: agendo"
```

- Falla de forma visible si el proyecto está pausado o si el schema no está expuesto.
- Los secretos `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` se configuran en la fase 13 (**🙋**).
- Anota en el README (fase 13) que GitHub desactiva los workflows programados tras 60 días sin actividad en el repo.
- Este keep-alive vive en el repo de Agendo y sirve para las 4 apps (`CLAUDE.md`).

## Paso 7 · Cierre

`00-guia-general.md` §3.3. En el PR menciona que `release.yml` y `keep-alive.yml` se validarán en la fase 13.

---

## Criterios de terminado

- [ ] Maestro instalado; `book-appointment.yaml` pasa 3 veces seguidas sobre la build release en modo demo.
- [ ] `admin-agenda.yaml` pasa (o se documenta en la bitácora por qué se recortó).
- [ ] `release.yml` con check + build EAS + GitHub Release con el APK adjunto.
- [ ] `keep-alive.yml` con cron cada 3 días y `workflow_dispatch`.
- [ ] Secreto `EXPO_TOKEN` configurado por el autor; mecanismo de variables EAS documentado.
- [ ] lint/typecheck/test en verde; PR mergeado; bitácora actualizada.
