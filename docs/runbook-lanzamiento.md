# Runbook de lanzamiento (pasos remotos de la fase 13)

> Todo lo de este documento es **externo y/o irreversible** y lo ejecuta el autor. Nada de esto se ha hecho.
> Nunca pegues claves en archivos commiteados, PRs ni la bitácora. Las variables van en tu shell.
> Origen: `docs/implementation/fase-13-lanzamiento.md` (pasos 0-9).

## Estado

| Paso | Qué | Estado |
|---|---|---|
| 0 | Credenciales en tu shell | Pendiente |
| 1 | Migraciones + catálogo en remoto | Pendiente |
| 2 | Exponer schema `agendo` (dashboard) | Pendiente |
| 3 | Vault, Edge Function y cron | Pendiente |
| 4 | Secretos de GitHub, keep-alive, variables EAS | Pendiente |
| 5 | Usuarios de prueba y admin (`npm run dev:otp`) | Pendiente |
| 6 | APK `preview` + prueba de humo | Pendiente |
| 7 | Capturas y GIF para el README | Pendiente |
| 8 | Versión, tag y Release | Pendiente |
| 9 | Repo público (ver nota) y tablas del portafolio | Pendiente |

> **Nota:** al preparar esta fase, `gh repo view` ya reportaba el repo `malpi-dev/Agendo` como **PÚBLICO**. Revisa
> que sea intencionado antes de publicar nada más (el historial se comprobó: no hay claves reales).

## Paso 0 · Credenciales (en tu shell)

```bash
export SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres'
supabase login
```

Ten a mano: `project-ref`, URL del proyecto, publishable key (`sb_publishable_...`), token de Expo
(expo.dev, Access tokens) y, solo para el paso 5, la secret key (`sb_secret_...`).

## Paso 1 · Migraciones y catálogo en remoto

```bash
psql "$SUPABASE_DB_URL" -c "select 1 from pg_namespace where nspname = 'agendo';"   # debe devolver 0 filas
./scripts/apply-remote.sh      # comprueba que no existe el schema, pide escribir 'apply', aplica en orden
```

- Nunca `supabase db push`; nunca `02_demo_data.sql` ni `03_local_vault.sql` en remoto.
- Si el schema ya existe, el script se detiene: averigua qué se aplicó antes de seguir.
- Registra en la bitácora la tabla "Migraciones aplicadas en remoto" (4 archivos, ver `supabase/migrations/`, y fecha).

## Paso 2 · Configuración del proyecto (dashboard)

- API settings, Exposed schemas: añadir `agendo`.
- Auth: "Confirm email" activo, OTP de 6 dígitos, plantilla común con `{{ .Token }}` (probablemente ya está por otras apps).
- Realtime: permitir canales privados (Realtime Authorization).
- Comprobación:
  ```bash
  curl "$URL/rest/v1/business?select=name" -H "apikey: <publishable>" -H "Accept-Profile: agendo"
  # -> [{"name":"Northside Barber Co."}]
  ```

## Paso 3 · Vault, Edge Function y cron

```bash
CRON_SECRET=$(openssl rand -hex 32)      # no lo imprimas ni lo guardes en archivos
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -c "select vault.create_secret('https://<project-ref>.supabase.co', 'agendo_functions_base_url');" \
  -c "select vault.create_secret('$CRON_SECRET', 'agendo_reminders_cron_secret');"
supabase secrets set --project-ref <project-ref> \
  AGENDO_REMINDERS_CRON_SECRET="$CRON_SECRET" AGENDO_EXPO_ACCESS_TOKEN="<token de Expo>"
supabase functions deploy agendo-send-reminders --project-ref <project-ref> --no-verify-jwt
```

- Sin `supabase link` (no enlaces el repo al proyecto compartido). Los secretos de funciones son globales: van con prefijo `AGENDO_`.
- Verifica: `select jobname, schedule from cron.job where jobname = 'agendo-reminders';` y, a los 5-10 min,
  `select status, return_message from cron.job_run_details order by start_time desc limit 3;`.
- Rollback del cron (por nombre, nunca en bloque): `select cron.unschedule('agendo-reminders');`

## Paso 4 · GitHub y EAS

```bash
gh secret set SUPABASE_URL
gh secret set SUPABASE_PUBLISHABLE_KEY
gh secret set EXPO_TOKEN
gh workflow run keep-alive.yml && gh run list --workflow keep-alive.yml     # debe terminar en verde
```

EAS (una vez): `npx eas-cli@latest login`, `npx eas-cli@latest init` (escribe `extra.eas.projectId` en `app.json`:
commitéalo). Variables del entorno `preview`:

```bash
eas env:create preview --name EXPO_PUBLIC_SUPABASE_URL --value https://<project-ref>.supabase.co --visibility plaintext
eas env:create preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <publishable> --visibility plaintext
eas env:create preview --name EXPO_PUBLIC_DATA_SOURCE --value supabase --visibility plaintext
eas env:create preview --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret
```

`google-services.json` (Firebase, FCM) debe existir en tu máquina; está en `.gitignore`. Comprueba los flags con
`eas env:create --help` (la CLI cambia).

## Paso 5 · Usuarios de prueba y admin

```bash
cp .env.scripts.example .env.scripts      # rellena SUPABASE_URL y SUPABASE_SECRET_KEY (ignorado por git)
npm run dev:otp -- tu@email.com           # crea el usuario si no existe e imprime el código de 6 dígitos
```

1. Entra en la app con tu email y ese código; completa el onboarding.
2. Promueve a admin:
   ```bash
   psql "$SUPABASE_DB_URL" -c "update agendo.profiles set role = 'admin' where id = (select id from auth.users where email = 'tu@email.com');"
   ```
3. Crea un segundo cliente con `npm run dev:otp -- otro@email.com` para la demo con dos dispositivos.

## Paso 6 · APK `preview` y prueba de humo

```bash
npx eas-cli@latest build -p android --profile preview
```

Checklist (anota resultados en la bitácora):

- [ ] Explore demo como Client: reservar, simulación en vivo, cancelar, reprogramar, notificación local.
- [ ] Explore demo como Admin: agenda con citas; cambio de rol; salir del demo.
- [ ] Login real con código (`dev:otp`), onboarding, reserva en remoto.
- [ ] Dos dispositivos: el horario desaparece en vivo; la agenda admin se actualiza sola.
- [ ] Recordatorio push real a ~2 h de la cita (o forzando la función) que abre el detalle.
- [ ] Modo oscuro, ícono y splash correctos.
- [ ] Con el backend inaccesible (modo avión tras abrir): errores legibles y el demo sigue funcionando.
- [ ] Doble reserva imposible con dos dispositivos sobre el mismo hueco.

## Paso 7 · Media del README

Graba con `adb shell screenrecord /sdcard/demo.mp4`, `adb pull`, y convierte con
`ffmpeg -i demo.mp4 -vf "fps=12,scale=360:-1" docs/media/demo.gif`. Capturas (claro y oscuro) en `docs/media/`.
Lista exacta de archivos esperados: sección "Assets pendientes" al final de este documento. Después sustituye los
bloques `TODO` del README por las imágenes.

## Paso 8 · Versión, tag y Release

1. En una rama: `app.json` y `package.json` a `"version": "1.0.0"`; bitácora fase 13 terminada; PR y squash merge.
2. Con `main` actualizado:
   ```bash
   git tag -a v1.0.0 -m "Agendo v1.0.0"
   git push origin v1.0.0
   gh run watch                # release.yml: check + build EAS + GitHub Release
   gh release view v1.0.0      # debe tener agendo-v1.0.0.apk
   ```
3. Antes de hacer público (si aún no lo es): `git log -p | grep -nE "sb_secret_|service_role|BEGIN PRIVATE KEY"`
   solo debe mostrar menciones en documentación, nunca valores. Visibilidad:
   `gh repo edit --visibility public --accept-visibility-change-consequences`.
4. Portafolio (`../CLAUDE.md` y `../README.md`): Agendo a `✅ MVP listo` o `🚀 Publicado` (APK + GIF + repo público).

## Assets pendientes

- `docs/media/demo.gif` (15-30 s: reserva + horario desapareciendo en vivo)
- `docs/media/screen-services-light.png`, `screen-slots-light.png`, `screen-appointments-dark.png`, `screen-agenda-dark.png`
- Enlace real a la Release y badge de versión (funcionan al existir la primera release)
- `extra.eas.projectId` en `app.json` (tras `eas init`)
