# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es MiSillón

SaaS de reservas para barberías. Una barbería se registra, comparte su QR/link, y sus clientes reservan turno sin llamar. Hay dos modelos de negocio: **barbería con equipo** (dueño + peluqueros) e **independiente** (el peluquero es el dueño, solo).

## Comandos

```bash
npm run dev      # dev server en http://localhost:5173 (abre browser automáticamente)
npm run build    # build de producción
npm run preview  # preview del build
```

Variables de entorno requeridas en `.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Arquitectura

### Roles y rutas

Cuatro roles definidos en `useAuth`. El hook resuelve el rol consultando Supabase en cascada:

```
super_admin  →  /admin
dueno        →  /panel/dueno
peluquero    →  /panel/peluquero
independiente →  /panel/independiente   (dueño que es su propio único peluquero)
```

`ProtectedRoute` wrappea cada grupo de rutas en `App.jsx` y redirige al panel correcto si el rol no coincide.

### Rutas públicas por slug

Las rutas `/:slug` y `/:slug/:peluquero_slug` van **después** de todas las rutas fijas en `App.jsx` para evitar colisiones. La RLS de Supabase filtra barberías por estado `aprobada`.

### Hooks de datos

Cada entidad tiene su hook en `src/hooks/`:
- `useAuth` — sesión + rol + barbería + peluquero del usuario activo
- `useBarberia(slug)` — página pública de barbería con sus peluqueros
- `usePeluquero(slug, barberiaSlug)` — página pública de peluquero
- `useReserva` — flujo de reserva del cliente

Todos usan el patrón `activo = true` + cleanup para evitar setState en componente desmontado.

### Generación de slots

`src/utils/slots.js` → `generarSlots()` cruza la disponibilidad semanal del peluquero (`dia_semana` 0=domingo) con las reservas ya tomadas y la duración del servicio. No conoce la DB: recibe arrays y devuelve `[{ hora, iso }]`.

### Panel de administración

`src/components/panel/SidebarPanel.jsx` + `src/components/panel/sections/` — cada sección del panel (Servicios, Disponibilidad, MisReservas, etc.) es un componente independiente. `src/components/panel/ui.jsx` contiene primitivos compartidos del panel.

### Mensajes de error

`src/lib/supabase.js` → `mensajeError()` traduce errores crudos de Supabase a español. Usarla siempre que se muestre un error al usuario.

## Design system

Documentado en `design-system.md`. Resumen crítico:

**Colores Tailwind extendidos** (configurar en `tailwind.config.js`):
- `primary` `#1a3a2e` / `primary-dark` `#0f2318` / `primary-light` `#2d5c47`
- `accent` `#c9943a` / `accent-dark` / `accent-light`
- `surface` `#fafaf8` · `muted` `#f0efed` · `line` `#e0dfdc`
- `ink` `#1a1f1e` · `ink-muted` `#526860`

**Alternancia de secciones:** `surface → muted → surface → muted → primary-dark`

**Iconos:** `lucide-react` ya instalado. Tamaños: `size={16}` sm · `size={20}` base · `size={28}` lg. `strokeWidth={1.75}` base, `1.5` en iconos grandes.

**Componentes clave** (ver `design-system.md` §5): botón CTA accent, pill badge, card contenido, card paso, badge estado de cita.
