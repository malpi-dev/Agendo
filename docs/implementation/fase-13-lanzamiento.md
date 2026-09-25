# Fase 13 · Lanzamiento: Supabase remoto, APK, README y `v1.0.0`

**Rama:** `feat/fase-13-lanzamiento`
**Objetivo:** aplicar el backend al proyecto Supabase **compartido** sin romper nada de las otras apps, desplegar la
Edge Function y el cron, generar el APK `preview`, escribir el README completo (en inglés), verificar la definición
de terminado y publicar `v1.0.0` en GitHub Releases.
**Referencias:** definición §7.6 (remoto), §14, §15, §16 (definición de terminado) · `CLAUDE.md` "Backend", "Seguridad",
"Definición de terminado" y "Plantilla de README".
**Requisitos previos:** fases 01–12 terminadas.

> Esta fase toca **infraestructura compartida y pública**. Cada paso marcado **🙋** requiere confirmación explícita
> del autor antes de ejecutarlo. Nunca pegues claves en archivos commiteados, en el PR ni en la bitácora.

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1. Pide al autor (**🙋**), de una vez:
1. `SUPABASE_DB_URL` del proyecto compartido exportada **en su shell** (no en archivos del repo), el `project-ref`,
   la URL del proyecto y la publishable key.
2. La secret key (`sb_secret_…`) **solo** para el script local del Paso 5, en `.env.scripts` (ignorado por git).
3. `supabase login` hecho en su máquina.

## Paso 1 · Migraciones en remoto (🙋 confirmar antes)

1. Comprueba que el schema no existe todavía: `psql "$SUPABASE_DB_URL" -c "select 1 from pg_namespace where nspname = 'agendo';"`.
   Si ya existe, **detente** y pregunta (puede haber aplicaciones previas).
2. Aplica en orden, deteniéndote ante el primer error:
   ```bash
   for f in supabase/migrations/*.sql; do
     echo "Applying $f"; psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f" || break
   done
   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed/01_catalog.sql
   ```
   **Nunca** `supabase db push` ni `02_demo_data.sql`/`03_local_vault.sql` en remoto.
3. Registra en la bitácora una tabla "Migraciones aplicadas en remoto" (archivo + fecha). Las futuras migraciones se
   aplicarán igual, una a una.

## Paso 2 · Configuración del proyecto remoto (🙋 el autor, en el dashboard)

- *API settings* → **Exposed schemas**: añadir `agendo`.
- Auth: "Confirm email" activado, OTP de 6 dígitos (convención común; ya debería estar por otras apps — solo verificar).
- Realtime: comprobar que los canales privados están permitidos (Realtime Authorization).
- Comprobación: `curl "$URL/rest/v1/business?select=name" -H "apikey: <publishable>" -H "Accept-Profile: agendo"`
  devuelve "Northside Barber Co.".

## Paso 3 · Vault, Edge Function y cron en remoto (🙋 confirmar antes)

```bash
CRON_SECRET=$(openssl rand -hex 32)      # never print it into logs or files
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -c "select vault.create_secret('https://<project-ref>.supabase.co', 'agendo_functions_base_url');" \
  -c "select vault.create_secret('$CRON_SECRET', 'agendo_reminders_cron_secret');"
supabase secrets set --project-ref <project-ref> AGENDO_REMINDERS_CRON_SECRET="$CRON_SECRET" AGENDO_EXPO_ACCESS_TOKEN="<token del autor>"
supabase functions deploy agendo-send-reminders --project-ref <project-ref> --no-verify-jwt
```

- Verifica: `select jobname, schedule from cron.job where jobname = 'agendo-reminders';` y, tras 5–10 min,
  `select status, return_message from cron.job_run_details order by start_time desc limit 3;`.
- `supabase functions deploy` **no** requiere `supabase link`; no enlaces el repo al proyecto compartido.

## Paso 4 · Secretos de GitHub y variables de EAS (🙋)

- `gh secret set SUPABASE_URL` y `gh secret set SUPABASE_PUBLISHABLE_KEY` (el autor pega los valores).
- Lanza el keep-alive a mano: `gh workflow run keep-alive.yml` y comprueba que termina en verde (`gh run list --workflow keep-alive.yml`).
- Variables EAS `preview` de la fase 12 §4 con los valores remotos (`EXPO_PUBLIC_DATA_SOURCE=supabase`).

## Paso 5 · Cuenta admin remota y script de códigos OTP de desarrollo

El SMTP por defecto de Supabase solo entrega a miembros del equipo y la plantilla compartida puede no mostrar el
código. Para usuarios de prueba en remoto (`CLAUDE.md`, convención 1) crea `scripts/dev-otp.mjs` (Node, inglés):

- Lee `SUPABASE_URL` y `SUPABASE_SECRET_KEY` de `.env.scripts` (añádelo a `.gitignore`; crea `.env.scripts.example`).
- Recibe un email por argumento; si el usuario no existe, `auth.admin.createUser({ email, email_confirm: true })`.
- `auth.admin.generateLink({ type: 'magiclink', email })` → imprime `data.properties.email_otp`. No envía correo.
- Script `"dev:otp": "node --env-file=.env.scripts scripts/dev-otp.mjs"`.
- Aviso en la cabecera del script: solo para desarrollo, nunca en el bundle de la app.

Con él (**🙋** el autor ejecuta y usa el código en la app):
1. Inicia sesión en la app con el email del autor → onboarding.
2. Promueve a admin: `psql "$SUPABASE_DB_URL" -c "update agendo.profiles set role = 'admin' where id = (select id from auth.users where email = '<email>');"`
3. Crea un segundo usuario cliente de prueba para la demo de Realtime con dos dispositivos.

## Paso 6 · APK `preview` y prueba de humo (🙋 con el autor)

```bash
eas build -p android --profile preview
```

Instala el APK en el teléfono y recorre esta lista (anota resultados en la bitácora):

- [ ] Explore demo como Client: reserva, simulación en vivo, cancelar, reprogramar, notificación local.
- [ ] Explore demo como Admin: agenda con citas; cambio de rol; salir del demo.
- [ ] Login real con código (vía `dev:otp`), onboarding, reserva en remoto.
- [ ] Dos dispositivos: el horario desaparece en vivo; la agenda del admin se actualiza sola.
- [ ] Recordatorio push real a ~2 h de la cita (o forzando la invocación) que abre el detalle.
- [ ] Modo oscuro, ícono y splash correctos.
- [ ] Con el backend inaccesible (modo avión tras abrir), la app muestra errores legibles y el demo sigue funcionando.

## Paso 7 · README (en inglés, plantilla del `CLAUDE.md`)

`README.md` en la raíz, con estas secciones y contenido concreto:

1. **Agendo** + tagline + badges (CI, última release, "platform: Android").
2. **Demo**: GIF de 15–30 s (reserva + horario desapareciendo en vivo) y 3–4 capturas (claro y oscuro) en
   `docs/media/`. Graba con `adb shell screenrecord` y convierte con `ffmpeg` (o **🙋** pide al autor el GIF).
3. **Try it**: enlace a la última release (APK) y "Use **Explore demo** to skip sign-up".
4. **Features**: F1–F6 en una línea cada una.
5. **Tech stack**: tabla corta (Expo/Router, TS strict, TanStack Query, Zustand, NativeWind, Supabase, EAS, Maestro).
6. **Architecture**: diagrama Mermaid de capas (`presentation → domain ← data`, `core`), explicación de los repositorios
   intercambiables (`supabase-*` / `mock-*`) y del modo demo; destacar `getAvailableSlots` como caso de uso puro y testeado.
7. **Backend**: tabla de tablas del schema `agendo`; tabla "policy → what it protects" (de la migración de RLS);
   las dos restricciones `EXCLUDE` con el SQL; RPCs; Broadcast desde BD; `pg_cron` → Edge Function; por qué se usa
   Broadcast y no `postgres_changes`.
8. **Getting started**: requisitos; sin backend (`EXPO_PUBLIC_DATA_SOURCE=mock`); con Supabase local
   (`supabase start`, `supabase db reset`, `.env`, `10.0.2.2` en emulador, Mailpit); development build para push.
9. **Testing**: `npm test`, `supabase test db`, `npm run e2e` (Maestro).
10. **Roadmap**: definición §3.3 + "Ideas para el roadmap" de la bitácora.

Añade también una nota sobre el proyecto Supabase compartido (un schema por app) y el keep-alive (60 días de
inactividad de GitHub).

## Paso 8 · Definición de terminado

Recorre la definición §16 y el `CLAUDE.md` ("Definición de terminado"). Copia la checklist a la bitácora y marca cada
punto con evidencia (comando, captura o paso de la prueba de humo). Si algo falla, corrígelo en esta rama antes de
seguir. Si algo no se puede cumplir, **🙋** decide con el autor si se publica como `v0.9.0`.

## Paso 9 · Versión, merge y release (🙋 confirmar antes del tag)

1. `app.json` → `"version": "1.0.0"`; `package.json` → `"version": "1.0.0"`.
2. Actualiza la bitácora (fase 13 terminada, barra al 100 %).
3. Cierra la fase con el PR y el squash merge de `00-guia-general.md` §3.3.
4. Ya en `main` actualizado:
   ```bash
   git tag -a v1.0.0 -m "Agendo v1.0.0"
   git push origin v1.0.0
   gh run watch                        # release.yml: check + EAS build + GitHub Release
   gh release view v1.0.0              # debe tener el APK adjunto
   ```
5. **🙋** El autor decide cuándo hacer público el repo (`gh repo edit --visibility public --accept-visibility-change-consequences`);
   antes, revisa que no haya secretos en el historial (`git log -p | grep -nE "sb_secret_|service_role|BEGIN PRIVATE KEY"` no devuelve nada).
6. En la carpeta del portafolio (`../CLAUDE.md` y `../README.md`): estado de Agendo → `✅ MVP listo` o `🚀 Publicado`
   (si ya hay APK + GIF + repo público), con enlaces al repo y a la release.

---

## Criterios de terminado

- [ ] Migraciones y catálogo aplicados en remoto con `psql` (sin `db push`), registrados en la bitácora.
- [ ] Schema `agendo` expuesto; Edge Function desplegada; cron `agendo-reminders` ejecutándose; secretos solo en Supabase/Vault.
- [ ] Keep-alive en verde; `EXPO_TOKEN`, `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` configurados en GitHub.
- [ ] Prueba de humo del APK `preview` completa.
- [ ] README completo en inglés con GIF y capturas.
- [ ] Definición de terminado §16 verificada con evidencia.
- [ ] `v1.0.0` publicada en GitHub Releases con el APK; tablas del portafolio actualizadas.
