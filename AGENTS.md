# AGENTS.md — Reglas para agentes de código (Say My Name)

Leé `CONTEXT.md` antes de empezar. Ahí está qué se construye y por qué.

## Proyecto en una línea

PWA en HTML/CSS/JS vanilla, mobile-first y offline-first, que reemplaza la pila física de cartas
de un juego presencial y agrega reglas y temporizador. Sin backend.

## Stack y límites

- HTML, CSS y JavaScript con **módulos ES** (`<script type="module">`). Sin framework ni bundler salvo que se pida.
- Cero dependencias en runtime. Si hace falta una herramienta de desarrollo, que sea opcional.
- Sin backend, sin cuentas, sin llamadas de red en tiempo de juego.
- Hospedaje: GitHub Pages (rutas relativas, nada de rutas absolutas que empiecen con `/`).

## Estructura esperada

```
/
├── index.html
├── manifest.webmanifest
├── sw.js
├── css/
│   └── styles.css
├── js/
│   ├── app.js          # arranque
│   ├── router.js       # pantallas + History API
│   ├── deck.js         # mazo y barajado
│   ├── game.js         # estado de la partida: equipos, rondas, cartas elegidas
│   ├── timer.js        # temporizador
│   ├── wakelock.js     # pantalla encendida
│   └── ui/             # una función por pantalla
├── data/
│   ├── cartas.json
│   └── reglas.md
├── icons/              # 192x192, 512x512 y maskable
├── CONTEXT.md
└── AGENTS.md
```

## Reglas técnicas obligatorias

### Navegación (lo más importante)
- Cada pantalla es una entrada del historial: `history.pushState({ pantalla }, '', '#pantalla')`.
- Escuchar `popstate` y mostrar la pantalla del estado. Si no hay estado, mostrar `inicio`.
- Nunca reemplazar la navegación por botones propios de "volver" como única vía: el gesto del sistema debe funcionar.
- En `#partida`, interceptar "atrás" y pedir confirmación; si el usuario cancela, volver a hacer `pushState`.
- Soportar carga directa de una URL con hash (por ejemplo `#reglas`).

### Equipos, configuración y rondas
- Flujo de pantallas: `inicio` → `equipos` → `configuracion` → `partida`.
- Equipos: el usuario puede agregar, renombrar y quitar equipos. Cada equipo tiene `id` y `nombre`.
  Validar nombres (no vacíos, no repetidos, longitud máxima razonable) y recortar espacios.
- Configuración: el usuario elige la cantidad de cartas con la que se juega. Limitar el máximo al total
  disponible en `data/cartas.json` y mostrar el valor elegido de forma clara.
- Rondas: la cantidad de rondas es una **constante configurable** (`RONDAS = 3` por ahora), no un número
  repetido por el código. Mostrar la ronda actual (por ejemplo "Ronda 2 de 3") y el equipo en turno.
- El estado de la partida (equipos, cartas elegidas, ronda, cartas restantes) vive en `game.js`,
  separado del DOM, y se guarda en `localStorage` con `try/catch` para poder retomar la partida si se cierra la app.
- Al terminar la última ronda mostrar una pantalla de cierre con opción de volver a jugar o ir al inicio.

### Mazo
- Barajar con **Fisher-Yates** sobre una copia del array; no usar `sort(() => Math.random() - 0.5)`.
- Al iniciar la partida, armar el mazo con la cantidad de cartas elegida (selección aleatoria sin repetir).
- Sacar de a una carta, sin repetir hasta agotar el mazo; mostrar cuántas quedan.
- La lógica del mazo debe ser **pura y testeable**, separada del DOM.

### Temporizador
- Calcular el tiempo restante con `Date.now()` contra una marca de fin, **no** contando ticks de `setInterval`
  (los navegadores frenan los timers en segundo plano).
- Al terminar: sonido y `navigator.vibrate` si está disponible, con degradación silenciosa si no lo está.
- Permitir pausar, reanudar y reiniciar.

### Pantalla encendida
- Pedir Wake Lock (`navigator.wakeLock.request('screen')`) al entrar a `#partida` y liberarlo al salir.
- Volver a pedirlo en `visibilitychange` cuando la app vuelve a estar visible.
- Siempre con `try/catch` y detección de soporte.

### PWA / offline
- `manifest.webmanifest`: `name`, `short_name`, `start_url: "./"`, `display: "standalone"`, `theme_color`,
  `background_color`, íconos 192 y 512 (más uno maskable).
- Service worker con **caché versionado** (`const CACHE = 'cartas-v1'`), precache del shell, limpieza de cachés viejos
  en `activate`, y estrategia cache-first para estáticos.
- Al cambiar cualquier archivo estático, subir la versión del caché.
- Probar con Lighthouse (categoría PWA) y en un teléfono real, incluido iPhone (Safari tiene particularidades).

### UI / UX
- Mobile-first. Objetivos táctiles de al menos 44×44 px. Texto legible con luz variable (buen contraste).
- Respetar `env(safe-area-inset-*)` para pantallas con notch.
- Una mano: las acciones principales (sacar carta, iniciar temporizador) al alcance del pulgar.
- Respetar `prefers-reduced-motion` y `prefers-color-scheme`.
- Interfaz en español rioplatense (voseo) salvo indicación contraria.
- Accesibilidad: HTML semántico, `aria-live` para el temporizador y la carta actual, foco visible.

### Calidad de código
- Funciones chicas, nombres en español o inglés pero **consistentes** (elegir uno y mantenerlo).
- Sin código muerto ni dependencias "por las dudas".
- Comentarios solo donde el *porqué* no es obvio.
- Datos del juego (cartas y reglas) **fuera del código**, en `data/`.

## Flujo de trabajo

1. Antes de implementar algo no trivial, explicar el plan en pocas líneas.
2. Cambios chicos y commits atómicos con mensajes claros (por ejemplo `feat: temporizador con pausa`).
3. Tras cada cambio relevante: abrir la app, probar el flujo completo y confirmar que "atrás" sigue funcionando.
4. No agregar funcionalidades fuera del alcance definido en `CONTEXT.md` sin preguntar.
5. Si algo es ambiguo (reglas del juego, cantidad de cartas, diseño), **preguntar** en vez de inventar.

## Skills recomendadas (skills.sh)

Instalar desde la raíz del proyecto (requiere Node.js). Revisar el `SKILL.md` de cada una antes de instalarla.

```bash
# Diseño de interfaz distintivo, evita el aspecto genérico
npx skills add https://github.com/anthropics/skills --skill frontend-design

# Auditoría de UI: accesibilidad, UX y consistencia
npx skills add vercel-labs/agent-skills --skill web-design-guidelines

# PWA: manifest, service worker, caché, instalación y particularidades de iOS
npx skills add https://github.com/jwynia/agent-skills --skill pwa-development

# Opcional: pruebas del flujo en navegador real
npx skills add anthropics/skills --skill webapp-testing
```

Para buscar más: `npx skills find pwa`, `npx skills find mobile`, `npx skills find accessibility`.
Para mantenerlas al día: `npx skills check` y `npx skills update`.

Uso sugerido:
- `frontend-design` al crear o rediseñar pantallas.
- `pwa-development` al tocar `manifest.webmanifest`, `sw.js` o la instalación.
- `web-design-guidelines` como revisión final antes de cada publicación.

## Definición de "terminado" para una funcionalidad

- [ ] Funciona en Android (Chrome) y iPhone (Safari), instalada como PWA.
- [ ] Funciona sin conexión.
- [ ] El gesto "atrás" se comporta como se espera en todas las pantallas.
- [ ] Sin errores en consola y Lighthouse PWA en verde.
- [ ] `CONTEXT.md` actualizado si cambió una decisión.