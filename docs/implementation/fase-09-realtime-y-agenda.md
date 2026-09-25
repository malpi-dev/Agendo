# Fase 09 · Realtime y agenda del admin

**Rama:** `feat/fase-09-realtime-y-agenda`
**Objetivo:** suscripciones Realtime reales (Broadcast desde la BD por canales privados) en *Choose slot* y en la
agenda, y la pestaña **Agenda** del admin: citas del día agrupadas por profesional, navegación entre días, filtro por
profesional y actualización en vivo.
**Referencias:** definición F3 CA4, F6 (§3.1), §5.1 flujo D, §7.2 (`realtime.messages`), §7.5, §8.4, §17 (riesgo y plan B).
**Requisitos previos:** fase 08 terminada · Supabase local levantado · el trigger `broadcast_appointment_change` y
las políticas `agendo_*` de `realtime.messages` existen (fase 04).

---

## Paso 0 · Inicio de fase

`00-guia-general.md` §3.1.

## Paso 1 · Prototipo de Broadcast (primero, antes de tocar la app)

El Broadcast desde BD con canales privados es la parte menos documentada (definición §17). Pruébalo aislado:

1. Script temporal en tu carpeta de scratch (no en el repo) con Node y `@supabase/supabase-js`: inicia sesión con
   un usuario local (`verifyOtp` con el código de Mailpit, o crea un usuario de prueba), llama a
   `await client.realtime.setAuth()`, suscríbete a `agendo:availability:<id de Marco>` con `{ config: { private: true } }`
   y escucha `broadcast` / `appointment_changed`.
2. Desde `psql` (`supabase status` da la URL de la BD local) inserta o cancela una cita de Marco.
3. Debe llegar el evento en < 3 s.

Si tras 2–3 intentos razonables no llega (revisa firma de `realtime.send`, políticas, `private: true`, `setAuth`):
anótalo en "Bloqueos" y **🙋 pregunta al autor** antes de pasar al plan B de la definición §17 (tabla `busy_slots`
sin datos personales + `postgres_changes`).

## Paso 2 · Suscripciones en los repositorios Supabase

`booking/data/supabase-booking-repository.ts` → `subscribeToAvailability(professionalId, onChange, onStatus)`:

```ts
const channel = client.channel(`agendo:availability:${professionalId}`, { config: { private: true } });
let wasLive = false;
channel.on('broadcast', { event: 'appointment_changed' }, () => onChange());
void client.realtime.setAuth().then(() =>
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      if (wasLive) onChange();           // resubscribed after a drop: we may have missed events
      wasLive = true;
      onStatus?.('live');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      onStatus?.('paused');
    }
  }),
);
onStatus?.('connecting');
return () => { void client.removeChannel(channel); };
```

(Comprueba los nombres de estado y la API de `setAuth` en la versión instalada de supabase-js.)

`agenda/data/supabase-agenda-repository.ts` → `subscribe(onChange, onStatus)`: igual con el topic `agendo:agenda`
(la política solo deja recibirlo al admin).

**Tests** con un cliente falso: `onChange` al recibir el broadcast; `onStatus('live')` con `SUBSCRIBED`;
`'paused'` con `CHANNEL_ERROR`; `onChange` extra al re-suscribirse; `removeChannel` al hacer unsubscribe.

## Paso 3 · Catálogo: listar todos los profesionales

Para el filtro de la agenda, cambia la firma a `listProfessionals(serviceId?: string)`: sin `serviceId` devuelve
todos los activos. Actualiza interfaz, mock, Supabase, `queryKeys.professionals` (usa `'all'` cuando no hay id) y
tests. Anótalo en la bitácora.

## Paso 4 · Pantalla *Agenda* (`app/(app)/(tabs)/agenda.tsx` → `agenda/presentation/screens/agenda-screen.tsx`)

- Protección: si `useCurrentUser()?.role !== 'admin'` → `<Redirect href="/" />` (ya existe de la fase 05; consérvala).
- Estado local: `date: LocalDate` (hoy en la zona del negocio) y `professionalId?: string`.
- Cabecera: `‹` (`testID="agenda-prev-day"`), fecha larga, `›` (`testID="agenda-next-day"`) y "Today"
  (`testID="agenda-today"`, visible si no es hoy). `LiveIndicator` al lado.
- Filtro: chips horizontales "All" + un chip por profesional (`testID="agenda-filter-all"` / `agenda-filter-<id>`).
- Lista: `useAgenda(date, professionalId)` (`queryKeys.agenda`) → `groupAgendaByProfessional` → secciones por
  profesional (`testID="agenda-group-<professionalId>"`) con filas: rango horario ("10:00 – 10:30 AM"), nombre del
  cliente, servicio (`testID="agenda-row-<appointmentId>"`). Solo lectura (F6 CA5).
- `useAgendaSubscription()`: `repos.agenda.subscribe(() => invalidateQueries({ queryKey: queryKeys.agendaAll }), setStatus)`.
- Estados: skeleton por profesional; vacío "No appointments for this day"; error + Retry; pull-to-refresh.

## Paso 5 · Choose slot con Realtime real

`useAvailabilitySubscription` (fase 06) ya invalida `busy` con cada evento; ahora, contra Supabase, recibirá
eventos reales. Revisa:
- que el `LiveIndicator` pasa a "Live" tras suscribirse y a "Live updates paused" si cortas la red;
- que al volver la red se refrescan los huecos (callback de re-suscripción + `onlineManager`);
- que al salir de la pantalla se elimina el canal (sin fugas: navega varias veces y verifica en los logs o en el
  inspector de Realtime de Studio que no se acumulan canales).

## Paso 6 · Verificación manual (la prueba estrella del portafolio)

Contra Supabase local, con dos sesiones (emulador + teléfono, o dos emuladores):

1. Dispositivo A (cliente) en *Choose slot* de Marco, mañana. Dispositivo B reserva uno de esos horarios →
   en A desaparece con animación en ≤ 3 s sin tocar nada (F3 CA4).
2. B cancela esa cita → en A reaparece el horario.
3. Dispositivo A con cuenta admin (`admin@agendo.dev`) en *Agenda*: B reserva, cancela y reprograma para hoy →
   la agenda cambia sola en ≤ 3 s (F6 CA4).
4. Si solo hay un dispositivo: usa `psql` para insertar/cancelar citas y observa la app.
5. En demo: la simulación de la fase 05 sigue funcionando en *Choose slot*; la agenda demo refleja las reservas hechas
   en el mismo demo (cambia de rol en Ajustes para comprobarlo).

Si necesitas un segundo dispositivo: **🙋 Acción del autor**.

## Paso 7 · Tests

- Vista de agenda: agrupa y ordena; filtro por profesional; navegación de días cambia la clave de query;
  cliente → redirección.
- Repos Supabase (Paso 2).

## Paso 8 · Cierre

`00-guia-general.md` §3.3. Registra en la bitácora el resultado del prototipo del Paso 1.

---

## Criterios de terminado

- [ ] Broadcast desde BD funcionando con canales privados `agendo:availability:<id>` y `agendo:agenda` (o plan B aprobado por el autor y documentado).
- [ ] F3 CA4 y F6 CA1–CA5 cumplidos contra Supabase local (≤ 3 s).
- [ ] Indicador "Live" / "Live updates paused" correcto; refresco al reconectar; sin canales huérfanos.
- [ ] `listProfessionals(serviceId?)` actualizado en interfaz, mock y Supabase.
- [ ] Tests de suscripciones y de la vista de agenda en verde.
- [ ] lint/typecheck/test en verde; PR mergeado; bitácora actualizada.
