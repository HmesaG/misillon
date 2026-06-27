# Design System — MiSillón v1

> Referencia para Dev Senior. Implementar en `tailwind.config.js`.
> Todos los valores están probados en `landing-mockup.html`.

---

## 1. Colores

### Paleta de marca

| Token           | Hex       | Uso principal                                    |
|-----------------|-----------|--------------------------------------------------|
| `primary`       | `#2c1a0e` | Fondo hero, pasos activos, iconos, bordes select |
| `primary-dark`  | `#1a0f07` | Footer, fondo CTA final, sombras profundas       |
| `primary-light` | `#4a2e1a` | Hover de botones en fondos oscuros, logo footer  |
| `primary-50`    | `#faf5f0` | Fondo de icon-boxes en tarjetas                  |
| `primary-100`   | `#f0e6d9` | Texto secundario sobre fondos oscuros            |
| `accent`        | `#c45c2a` | Botón CTA, número paso 3, fondo confirmar        |
| `accent-dark`   | `#9e4420` | Hover de accent                                  |
| `accent-light`  | `#e07844` | Hover sobre fondos oscuros                       |
| `accent-50`     | `#fdf2ec` | Fondo de icon-box paso 3                         |

### Neutros

| Token     | Hex       | Uso principal                                 |
|-----------|-----------|-----------------------------------------------|
| `surface` | `#faf8f5` | Fondo global, hero, sección "cómo funciona"   |
| `muted`   | `#f2ede8` | Secciones alternas (problema, beneficios, etc)|
| `line`    | `#e5ddd6` | Bordes de tarjetas, separadores               |
| `ink`     | `#1c1714` | Texto principal, headings                     |
| `ink-muted` | `#6b5548` | Texto secundario, subtítulos, descripciones |

### Regla de alternancia de secciones

```
hero         → bg-surface
problema     → bg-muted
cómo funciona → bg-surface
beneficios   → bg-muted
producto     → bg-surface
testimonios  → bg-muted
cta-final    → bg-primary-dark (gradient)
footer       → #0f2318
```

### Config Tailwind

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2c1a0e',
          dark:    '#1a0f07',
          light:   '#4a2e1a',
          50:      '#faf5f0',
          100:     '#f0e6d9',
        },
        accent: {
          DEFAULT: '#c45c2a',
          dark:    '#9e4420',
          light:   '#e07844',
          50:      '#fdf2ec',
        },
        ink: {
          DEFAULT: '#1c1714',
          muted:   '#6b5548',
        },
        surface: '#faf8f5',
        muted:   '#f2ede8',
        line:    '#e5ddd6',
      },
    },
  },
};
```

---

## 2. Tipografía

**Font:** Inter — Google Fonts  
`https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap`

### Escala de headings

| Elemento     | Mobile              | Desktop             | Weight     |
|--------------|---------------------|---------------------|------------|
| H1 hero      | `text-4xl` (36px)   | `text-6xl` (60px)   | `font-black` (900) |
| H2 sección   | `text-3xl` (30px)   | `text-4xl` (36px)   | `font-black` (900) |
| H3 tarjeta   | `text-lg`  (18px)   | `text-lg`  (18px)   | `font-bold`  (700) |
| Pill badge   | `text-xs`  (12px)   | `text-xs`  (12px)   | `font-semibold` (600) |

### Escala de body

| Elemento         | Tamaño             | Weight    | Color       |
|------------------|--------------------|-----------|-------------|
| Párrafo hero     | `text-lg/xl`       | 400       | `ink-muted` |
| Párrafo sección  | `text-lg`          | 400       | `ink-muted` |
| Párrafo tarjeta  | `text-sm` (14px)   | 400       | `ink-muted` |
| Label / caption  | `text-xs` (12px)   | `font-semibold` | `ink-muted` |

### Tracking (letter-spacing)

- Headings grandes: `tracking-tight`
- Labels uppercase: `tracking-wider`
- Body y subheadings: sin modificar

### Line-height

- H1/H2: `leading-[1.06]` a `leading-tight`
- Body: `leading-relaxed`

---

## 3. Espaciado

Tailwind estándar (base 4px). Valores más usados en la landing:

| Token Tailwind | px  | Uso                                    |
|----------------|-----|----------------------------------------|
| `p-6`          | 24  | Padding interno de tarjetas beneficios |
| `p-7`          | 28  | Padding interno de tarjetas problema   |
| `p-8`          | 32  | Padding interno de mockup placeholders |
| `gap-4/5`      | 16/20 | Gap en grids de tarjetas            |
| `gap-10`       | 40  | Gap entre pasos de "cómo funciona"     |
| `mb-4`         | 16  | Separación heading → párrafo sección   |
| `mb-12/14/16`  | 48-64 | Separación heading → contenido       |
| `py-20`        | 80  | Padding vertical de secciones estándar |
| `py-24`        | 96  | Padding vertical CTA final             |

---

## 4. Breakpoints

Tailwind estándar (mobile-first):

| Prefijo | Mínimo  | Uso en la landing                              |
|---------|---------|------------------------------------------------|
| (base)  | 0px     | Stack vertical, 1 columna, CTA full-width      |
| `sm:`   | 640px   | Grid 3 col en problema/beneficios pequeño      |
| `md:`   | 768px   | Grid 3 col pasos, línea conectora visible      |
| `lg:`   | 1024px  | Grid 2 col hero (texto + phone), nav full      |
| `xl:`   | 1280px  | Ajuste fino de tipo en hero                    |

---

## 5. Componentes definidos

### Botón primario (CTA)

```jsx
// Fondo acento, texto verde oscuro
<button className="inline-flex items-center gap-2.5
  bg-accent text-primary-dark font-bold text-base
  px-8 py-4 rounded-2xl
  hover:bg-accent-dark transition-colors duration-150
  shadow-lg">
  Registrar mi negocio
  <LucideArrowRight size={20} strokeWidth={1.75} />
</button>
```

**Sombra:** `box-shadow: 0 8px 24px rgba(201,148,58,0.30)`

### Botón primario — variante sobre fondo oscuro

Mismo estilo. Al hacer hover: `hover:bg-accent-light`

### Botón secundario (no usado en landing, definir para dashboard)

```jsx
<button className="inline-flex items-center gap-2
  border border-line bg-surface text-ink font-semibold text-sm
  px-5 py-2.5 rounded-xl
  hover:border-primary hover:text-primary transition-colors duration-150">
  Acción secundaria
</button>
```

### Pill / Badge informativo

```jsx
<div className="inline-flex items-center gap-2
  bg-primary-50 border border-primary-100
  text-primary font-semibold text-xs
  px-4 py-1.5 rounded-full">
  Contenido del pill
</div>
```

### Card — variante "contenido" (problema, beneficios)

```jsx
<div className="bg-surface rounded-2xl p-6
  border border-line shadow-sm
  flex gap-4 items-start">
  {/* icon box */}
  <div className="w-10 h-10 bg-primary-50 rounded-xl
    flex items-center justify-center flex-shrink-0 mt-0.5">
    <LucideIcon size={20} strokeWidth={1.75} color="#1a3a2e" />
  </div>
  <div>
    <h3 className="font-bold text-ink mb-1.5">Título</h3>
    <p className="text-ink-muted text-sm leading-relaxed">Descripción</p>
  </div>
</div>
```

**Esquinas:** `rounded-2xl` (tarjetas beneficios), `rounded-3xl` (tarjetas problema)

### Card — variante "paso" (cómo funciona)

```jsx
<div className="flex flex-col items-center text-center">
  {/* Número */}
  <div className="w-12 h-12 rounded-full bg-primary text-white
    font-black text-xl flex items-center justify-center mb-5">
    1
  </div>
  {/* Icon box */}
  <div className="w-14 h-14 bg-primary-50 rounded-2xl
    flex items-center justify-center mb-4">
    <LucideIcon size={28} strokeWidth={1.5} color="#1a3a2e" />
  </div>
  <h3 className="font-bold text-ink text-lg mb-2">Título</h3>
  <p className="text-ink-muted text-sm leading-relaxed max-w-xs mx-auto">
    Descripción
  </p>
</div>
```

Paso 3 (acento): número con `bg-accent text-primary-dark`, icon box con `bg-accent-50`.

### Badge de estado de cita (para el dashboard)

```jsx
// Confirmada
<span className="inline-flex items-center gap-1.5
  bg-primary-50 text-primary font-semibold text-xs
  px-2.5 py-1 rounded-full">
  <LucideCheckCircle size={12} strokeWidth={2} />
  Confirmada
</span>

// Pendiente
<span className="inline-flex items-center gap-1.5
  bg-accent-50 text-accent-dark font-semibold text-xs
  px-2.5 py-1 rounded-full">
  <LucideClock size={12} strokeWidth={2} />
  Pendiente
</span>

// Cancelada
<span className="inline-flex items-center gap-1.5
  bg-red-50 text-red-600 font-semibold text-xs
  px-2.5 py-1 rounded-full">
  <LucideX size={12} strokeWidth={2} />
  Cancelada
</span>
```

### Mockup placeholder (sección "Así se ve")

```jsx
<div className="mockup-ph rounded-3xl flex flex-col
  items-center justify-center gap-4 p-8"
  style={{ aspectRatio: '...' }}>
  {/* Ícono descriptivo + texto */}
</div>
```

CSS base: `background: linear-gradient(145deg, #eeede9 0%, #e5e4e0 100%); border: 1.5px solid #d6d5d1;`

---

## 6. Elevación / Sombras

| Nombre       | Valor CSS                                          | Uso                    |
|--------------|----------------------------------------------------|------------------------|
| `shadow-sm`  | Tailwind default                                   | Tarjetas en secciones  |
| shadow CTA   | `0 8px 24px rgba(196,92,42,0.30)`                  | Botón accent principal |
| shadow paso  | `0 8px 24px rgba(44,26,14,0.28)`                   | Círculos numerados     |
| shadow phone | `0 60px 120px rgba(0,0,0,0.35), 0 20px 40px …`    | Frame del teléfono     |

---

## 7. Radios de borde

| Token Tailwind | px  | Uso                                  |
|----------------|-----|--------------------------------------|
| `rounded-xl`   | 12  | Botones nav, icon boxes sm           |
| `rounded-2xl`  | 16  | Tarjetas beneficios, botones CTA     |
| `rounded-3xl`  | 24  | Tarjetas problema, mockup placeholders|
| `rounded-full` | 50% | Pills, badges, círculos de pasos     |
| `rounded-lg`   | 8   | Logo del nav, icon boxes mini        |

---

## 8. Navegación

- Altura: `h-16` (64px), fija (`fixed top-0`)
- Fondo: `bg-surface/95` con `backdrop-blur-sm`
- Estado scroll: añadir clase `.is-scrolled` con JS → `border-bottom: 1px solid #e0dfdc; box-shadow: 0 2px 16px rgba(26,31,30,0.07)`
- Sin links adicionales en v1. Solo logo (izq) + botón CTA (der)

---

## 9. Accesibilidad

- Focus global: `outline: 2px solid #c45c2a; outline-offset: 3px; border-radius: 6px`
- Fuente body: mínimo 14px, preferente 16px
- Contraste texto principal sobre `surface`: ratio > 14:1 (`#1c1714` sobre `#faf8f5`)
- Contraste `ink-muted` sobre `surface`: ratio ~6.4:1 (cumple AA para body)
- Contraste `accent` sobre `surface`: ratio ~6.9:1 (cumple AA)
- Todos los botones CTA tienen texto descriptivo (sin "clic aquí")
- `aria-label` en el logo del nav
- `aria-hidden="true"` en elementos decorativos

---

## 10. Iconos Lucide usados en la landing

Instalar: `npm install lucide-react`  
CDN (standalone): `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`

| Icono              | Sección                            |
|--------------------|------------------------------------|
| `scissors`         | Logo nav, logo footer, mockup phone|
| `arrow-right`      | Botones CTA                        |
| `check-circle`     | Trust signal hero, servicio selec. |
| `zap`              | Pill badge hero (alternativa)      |
| `book-open`        | Problema — cuaderno físico         |
| `message-circle`   | Problema — WhatsApp                |
| `calendar-x`       | Problema — citas dobles            |
| `building-2`       | Paso 1 — Registrar negocio         |
| `share-2`          | Paso 2 — Compartir QR/link         |
| `calendar-check`   | Paso 3 — Confirmación + beneficio  |
| `palette`          | Beneficio — personalización marca  |
| `phone`            | Beneficio — WhatsApp notificaciones|
| `users`            | Beneficio — equipo vs. individual  |
| `smartphone`       | Beneficio — sin instalación        |
| `qr-code`          | Beneficio — QR imprimible          |
| `layout-dashboard` | Mockup — panel barbero             |
| `message-square`   | Testimonios — estado vacío         |
| `shield-check`     | CTA final — confianza              |

### Tamaños estándar (clases CSS a definir globalmente)

```css
.icon    { width: 20px; height: 20px; stroke-width: 1.75; flex-shrink: 0; }
.icon-sm { width: 16px; height: 16px; stroke-width: 2;    flex-shrink: 0; }
.icon-lg { width: 28px; height: 28px; stroke-width: 1.5;  flex-shrink: 0; }
.icon-xl { width: 40px; height: 40px; stroke-width: 1.5;  flex-shrink: 0; }
```

En React usar `<LucideIcon size={20} strokeWidth={1.75} />` equivalente.

---

## 11. Notas para Dev Senior

- La landing es puramente estática (sin estado, sin routing). Convertirla en componentes React agrupados por sección es un refactor directo.
- El phone mockup en el hero es 100% HTML/CSS; en React puede mantenerse como componente `<PhoneMockup />` con los datos hardcodeados o props.
- El QR decorativo en la sección de producto es CSS puro; en producción reemplazar con el QR real generado por la librería correspondiente.
- La sección de testimonios tiene estado vacío intencional. Diseñar el componente `<TestimonialCard />` para cuando haya datos reales.
- La config de Tailwind usa `extend` (no override), por lo que los colores de Tailwind base (grays, reds para errores, etc.) siguen disponibles.
