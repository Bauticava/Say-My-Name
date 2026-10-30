# MEMORY.md — Memoria y Estado del Proyecto (Say My Name)

> Este archivo actúa como registro vivo y persistente del proyecto. Se actualiza tras cada conversación, decisión de diseño o cambio implementado para mantener el contexto siempre alineado.

---

## 1. Resumen y Propósito del Proyecto

**Say My Name** es una Progressive Web App (PWA) mobile-first y offline-first construida en **HTML5, CSS3 y JavaScript vanilla con módulos ES (`<script type="module">`)**, sin frameworks, sin bundlers y sin backend.
Funciona como **aplicación compañera** de un juego de cartas presencial: reemplaza la pila física de cartas, gestiona las rondas, aplica filtros, controla el temporizador con Wake Lock y lleva el marcador de los equipos.

- **Repositorio**: `git@github.com:Bauticava/Say-My-Name.git`
- **Hospedaje**: GitHub Pages (`https://bauticava.github.io/Say-My-Name/`)
- **Modo de desarrollo actual**: **100% LOCAL**. *No hacer `git push` a GitHub hasta que el usuario lo solicite expresamente.*

---

## 2. Decisiones Técnicas y Reglas Obligatorias

| Área | Regla |
|---|---|
| **Stack** | Vanilla ES Modules (`js/app.js`, `js/router.js`, `js/deck.js`, `js/game.js`, `js/timer.js`, `js/wakelock.js`, `js/ui/*.js`). Cero dependencias en runtime. |
| **Navegación** | History API con hash (`#inicio`, `#reglas`, `#equipos`, `#configuracion`, `#partida`). Escucha de `popstate`. El gesto "atrás" del teléfono siempre debe funcionar. En `#partida` se intercepta para pedir confirmación con modal propio. |
| **Alertas / Modales** | Cero `window.alert`, `window.confirm` o `window.prompt` nativos. Se utiliza `js/ui/modal.js` con diseño integrado a la estética de la app. |
| **Offline / PWA** | Service Worker (`sw.js`) con caché versionada (`cartas-v9` actual). Cada cambio en estáticos requiere subir la versión. `manifest.webmanifest` con rutas relativas (`./`). |
| **Temporizador** | Basado estrictamente en marcas de tiempo `Date.now()`, nunca en ticks de `setInterval`. Aviso con Web Audio API y `navigator.vibrate`. |
| **Pantalla activa** | Screen Wake Lock API (`navigator.wakeLock.request('screen')`) activo durante la partida y reactivado en `visibilitychange`. |
| **UX / UI** | Mobile-first, objetivos táctiles $\ge 44 \times 44\text{ px}$, soporte para safe-area-insets, voseo rioplatense en textos. |

---

## 3. Estructura de Datos (Cartas)

Cada carta en `data/cartas.json` y en `localStorage` (`cartas_personalizadas`) tiene la siguiente estructura estricta:

```json
{
  "id": 1,
  "elementos": [
    { "texto": "Felices los 4", "categoria": "Canción", "color": "rojo" },
    { "texto": "Gerard Piqué", "categoria": "Deportista", "color": "verde" },
    { "texto": "Ojos bien cerrados", "categoria": "Película", "color": "violeta" }
  ],
  "palabraClave": "Infidelidad",
  "dificultad": 2
}
```

### Relación Color $\to$ Tipo (constante `COLOR_TIPOS` en `js/deck.js`):
- **`rojo`** (arriba) = **Títulos** (canciones, películas, series, álbumes, libros, etc.).
- **`verde`** (medio) = **Personas** (personajes de ficción, personas reales, celebridades, bandas, deportistas).
- **`violeta`** (abajo) = **Mix** (lugares, conceptos, eventos, objetos y miscelánea).

---

## 4. Dinámica de Rondas y Reglas Acordadas

La partida consta de 4 etapas ordenadas (`RONDAS_CONFIG` en `js/game.js`):

### 1. Ronda 1 (Descripción libre)
- Se adivina **1 solo elemento** por carta (el seleccionado según los filtros activos).
- Muestra el elemento, su categoría y la **palabra clave como prohibida**.
- **No se puede pasar**.
- Botones: **¡Acierto!** (+1 punto) | **Terminar turno por error** (si quien da las pistas dice la palabra prohibida; la carta va al fondo del mazo) | **Deshacer**.

### 2. Ronda 2 (Una sola palabra)
- Se adivina **1 solo elemento** por carta (mismo mazo y elemento que Ronda 1).
- Pistas de una sola palabra.
- Si el equipo arriesga y dice una respuesta incorrecta, **pasa a la siguiente carta** (la carta va al fondo del mazo).
- Botones: **¡Acierto!** (+1 punto) | **Paso** | **Terminar turno por error** (si dice la palabra prohibida; carta va al fondo) | **Deshacer**.

### 3. Ronda Relámpago (Entre Ronda 2 y Ronda 3)
- Se muestran los **3 elementos** de la carta a la vez.
- **Palabra clave visible para el lector**: Quien lee la carta puede ver la palabra clave para arbitrar con rapidez y saber al instante si alguien adivinó.
- **Temporizador fijo de 15 segundos**: La cuenta regresiva corre los 15 segundos completos. Al finalizar el tiempo, se abre la asignación de puntos.
- Asignación: Pregunta *"¿Qué equipo adivinó?"* con botón por cada equipo (incluido el lector) y opción *"Nadie"*.
- **Puntaje**: +3 puntos por carta acertada.
- **Estructura**: Cada equipo lee **2 cartas**, por integrantes diferentes (vuelta 1 y vuelta 2).
- **Mazo exclusivo**: Las cartas de la relámpago salen de las cartas filtradas pero **no** forman parte del mazo de las rondas 1 a 3. Requiere $2 \times \text{cantidadDeEquipos}$ cartas reservadas.

### 4. Ronda 3 (Mímica)
- Se adivina **1 solo elemento** por carta (mismo mazo y elemento de R1 y R2).
- Solo gestos y mímica, sin sonidos.
- Botones: **¡Acierto!** (+1 punto) | **Paso** | **Terminar turno por error** (si emite sonidos o dice la palabra prohibida) | **Deshacer**.

---

## 5. Reglas de Fin de Turno y Deshacer

- **Fin de turno por completar mazo (`mazo_completado`)**: Cuando un equipo acierta todas las cartas restantes de la ronda, su turno termina inmediatamente. No vuelve a empezar el mazo en esa misma ronda.
- **Fin de turno por recorrer todo el mazo pasando (`turno_terminado_pase`)**: Si un equipo va salteando cartas con el botón "Paso" hasta recorrer todas las cartas disponibles en ese turno sin acertar, el turno termina automáticamente y el control pasa al siguiente equipo. Las cartas pasadas vuelven al pozo de la ronda.
- **Terminar turno por error (`turno_terminado_error`)**: Si el dador de pistas comete una falta (dice la palabra prohibida o habla en ronda 3), se toca este botón, la carta vuelve al pozo y el turno finaliza.
- **Deshacer (`deshacerUltimoAcierto`)**: Disponible en todas las rondas (incluyendo relámpago). Resta el punto asignado y reinserta la carta en el turno actual sin reiniciar el temporizador.

---

## 6. Identidad Visual y Diseño

- **Estilo**: Cartel retro tipo marquesina luminosa (*retro marquee sign* / *broadway sign*) con bombillas perimetrales iluminadas, tipografía contundente en mayúsculas y fondo crema/marfil con rayos beige y rojos.
- **Colores de la marca**:
  - Fondo crema: `#F5ECCF`
  - Rojo retro: `#B83A2E`
  - Verde oscuro / petróleo: `#1E4D48`
  - Focos marquesina: `#FFD43F` con halo cálido.
- **Colores de categorías en cartas**:
  - `rojo`: Títulos (`#DC2626` / `#F87171`)
  - `verde`: Personas (`#16A34A` / `#4ADE80`)
  - `violeta`: Mix (`#9333EA` / `#C084FC`)
- **Activos de icono**:
  - `icons/logo.png`
  - `icons/icon-512.png`
  - `icons/icon-192.png`
  - `icons/icon-maskable.png`
  - `icons/icon.svg`

---

## 7. Modo Desarrollador

- **Acceso**: 5 toques rápidos en el logo/título de la pantalla `#inicio`.
- **Funcionalidad**:
  - Modal con formulario completo para dar de alta nuevas cartas (3 elementos con color, texto y categoría; palabra clave; dificultad 1 a 5).
  - Sugerencia automática de categorías preexistentes filtradas por color mediante `<datalist>`.
  - Validación completa (campos requeridos, sin duplicados).
  - Persistencia en `localStorage` bajo `cartas_personalizadas` (se fusionan automáticamente con `data/cartas.json`).
  - Botón para **exportar a JSON** para incorporar las cartas fácilmente a la base de datos oficial.

---

## 8. Filtros y Configuración de Partida

En la pantalla `#configuracion`:
- **Tipo de elemento**: Selector múltiple (Títulos, Personas, Mix).
- **Categorías**: Chips seleccionables generados dinámicamente con las categorías disponibles en el mazo.
- **Rango de dificultad**: Sliders / selector de nivel (1 a 5).
- **Validación de mazo disponible**: Muestra el total de cartas que cumplen los filtros y exige un mínimo de $N_{\text{cartas}} + 2 \times N_{\text{equipos}}$. Si no alcanzan, se bloquea el inicio de la partida indicando el motivo.

---

## 9. Historial de Cambios Recientes

- **2026-10-29**:
  - **Pantalla Equipos**:
    - Simplificación del texto a *"Armá al menos 2 equipos para la partida."* y centrado prolijo.
  - **Pantalla Reglas**:
    - Título unificado a *"Say My Name"* tanto en el encabezado como dentro del documento de reglas.
    - Texto justificado (`text-align: justify;`) para aprovechar el ancho completo de la tarjeta con lectura limpia.
    - Eliminación de emojis excesivos para un diseño más sobrio.
    - Estructuración limpia de los 3 elementos (Rojo, Verde y Violeta) uno debajo del otro, sin amontonamiento ni saltos extraños de línea.
    - Redacción de reglas mucho más concisa y directa.
    - Corrección en el parser markdown para anidamiento y formateo correcto de listas.
  - **Pantalla Configuración**:
    - Filtros de Tipo de Elemento transformados a filas completas (Títulos, Personas, Mix), más grandes y apilados verticalmente.
    - Cada tipo adopta el color correspondiente al seleccionarse: Rojo (`#ef4444`), Verde (`#22c55e`) y Violeta (`#a855f7`) con indicadores luminosos.
    - Se removieron los textos entre paréntesis `(titulos)`, `(personas)` y `(mix)`.
    - Eliminación del filtro de categorías específicas para simplificar la interfaz.
    - Selector de cantidad de cartas con `<input type="number">` directo para escribir el número exacto, complementado con botones `[-]`, `[+]` y accesos directos de presets `[10]`, `[15]`, `[20]`, `[Máx]`.
  - **Animación "¡TIEMPO!" y Tensión de Reloj**:
    - Al terminar el temporizador, overlay fullscreen con resplandor rojo (`timeUpRedBloom`), tipografía "¡TIEMPO!" en escala elástica con text-shadow luminoso y vibración/alarma sincronizada. Toque en pantalla para avanzar inmediatamente o auto-cierre en 1.4s.
    - Tensión en los últimos 5 segundos: borde de pantalla pulsando en rojo (`body-timer-urgent`) y sonido sintetizado de tic-tac en Web Audio API.
  - **Color de fondo de cartas y Animación de Descarte**:
    - Fondo de la carta en juego con gradiente y sombras del color de su categoría (`.card-theme-rojo`, `.card-theme-verde`, `.card-theme-violeta`), reemplazando el fondo blanco plano.
    - Animación física de descarte: giro y deslizamiento a la derecha (`.card-exit-acierto`) en aciertos con tono alegre; deslizamiento hacia abajo (`.card-exit-paso`) en paso y error con sus respectivos sonidos.
  - **Pantalla de Pase de Teléfono**:
    - Pantalla de inicio de turno limpia con mensaje: *"Turno de: [Equipo]"*, *"Pasale el teléfono a quien vaya a dar pistas en este turno"* y botón destacado **"¡Arrancar!"**.
  - **Podio Ascendente y Confeti**:
    - Al terminar la Ronda 3, revelación progresiva de posiciones en orden ascendente (desde el último puesto hasta coronar al ganador).
    - El primer puesto se revela con fanfarria sonora, glow dorado y lluvia de confeti en `<canvas>` nativo ligero (sin dependencias).
  - **Gesto táctil de arrastre (Swipe) en cartas**:
    - Arrastre a la derecha $\ge 80\text{px}$ $\to$ ¡Acierto! con inclinación y salida lateral.
    - Arrastre hacia arriba $\ge 80\text{px}$ (`dy <= -80`) $\to$ Paso (habilitado en rondas que permiten paso; bloqueado con resistencia elástica en Ronda 1).
    - Retorno elástico suave si se suelta sin superar el umbral. Compatible con gestos táctiles en mobile y arrastre de ratón en desktop.
  - **Ronda Relámpago y Ronda de Desempate**:
    - Botón `"⚡ ¡Ya adivinaron! / Pasar tiempo →"` en Ronda Relámpago para finalizar los 15 segundos inmediatamente cuando un equipo acierta antes de que suene la alarma.
    - **Ronda de Desempate (`RONDA_DESEMPATE_CONFIG`)**: Si al finalizar la Ronda 3 hay 2 o más equipos empatados en el 1.° puesto, se activa automáticamente una Ronda de Desempate con el formato de Ronda Relámpago (1 carta de reserva para leer por cada equipo en el empate).
  - **Color identificador para cada equipo**:
    - Paleta de 6 colores vibrantes (`PALETA_EQUIPOS`: Ámbar, Esmeralda, Azul, Púrpura, Coral, Cian).
    - Selector táctil de color (círculo interactivo) en la pantalla de Equipos para alternar entre colores.
    - Integración cromática del equipo en la barra de turnos, cajas de marcador y tarjetas del podio.
  - **Desglose de puntos por ronda en el Podio**:
    - Al finalizar la partida, botón *"📊 Ver detalle por rondas"* que despliega una tabla comparativa con los puntos obtenidos por cada equipo en Ronda 1, Ronda 2, Relámpago, Ronda 3 y Desempate (si hubo).
  - **Botón inteligente de instalación PWA**:
    - Detecta el evento `beforeinstallprompt` y estado standalone. Solo se muestra en `#inicio` si la app no está instalada, y desaparece en cuanto se instala (`appinstalled`).
  - **Service Worker**:
    - Actualizada la versión de caché a `cartas-v14`.
  - **Pantalla Principal (`#inicio`) con Palabras Voladoras y Pie de Donaciones**:
    - Sin tocar el logo ni los botones, se sumó una capa de fondo (`z-index: 0`) donde palabras reales del mazo vuelan por detrás del logo y botones (`z-index: 3`).
    - **Trayectorias desparramadas**: Las palabras ahora viajan en trayectorias variadas (de arriba a abajo, de abajo a arriba, y diagonales cruzadas) con ángulos de inclinación pronunciados.
    - **Formato apilado para frases compuestas**: Frases de más de una palabra (como "HARRY POTTER" o "GAME OF THRONES") se dividen en renglones apilados centrados con `white-space: pre-line`.
    - Al pie de la pantalla se agregó *"Se aceptan donaciones al alias bauticavallera"* (con opción de copiar el alias al tocarlo).
  - **Bloqueo de Pull-to-Refresh**:
    - Se agregó `overscroll-behavior-y: none` en `html, body` y `touch-action: none` con `e.preventDefault()` al arrastrar la carta en juego para evitar que el gesto de deslizar hacia abajo ("Paso") dispare la actualización de página del navegador móvil.
  - **Rediseño Minimalista de Pantallas de Rondas (1, 2 y 3)**:
    - **Header superior**: Formato directo `RONDA X - EQUIPO` en tipografía prominente y sin elementos distractores.
    - **Temporizador central e Iconografía SVG**: Reloj numérico grande flanqueado por botones circulares con íconos vectoriales SVG limpios (Pausa/Reanudar en azul y Reiniciar con flecha circular en rojo). Cero emojis.
    - **Tarjeta física de categoría sólida**:
      - Fondo de color plano, saturado y fuerte según la categoría activa: Rojo (`#dc2626`), Verde (`#16a34a`) o Violeta (`#7c3aed`).
      - Parte superior: Nombre de la categoría centrado y badge circular negro con borde blanco a la derecha indicando las cartas restantes en el mazo.
      - Centro: Palabra a adivinar en tipografía blanca de gran tamaño y máximo contraste.
      - Parte inferior interna: Botón circular blanco con ícono SVG de retroceso (Deshacer) a la izquierda, y píldora negra con borde blanco que aloja la palabra prohibida.
    - **Botonera inferior al alcance del pulgar**:
      - **Ronda 1**: Botón izquierdo rojo con ícono SVG de cruz "✕" para terminar turno por error (sin texto) y botón derecho verde con tilde SVG "✓" para acierto (+1).
      - **Rondas 2 y 3**: Botón izquierdo naranja con texto "PASO". Al pulsarlo rápidamente pasa la carta; si se mantiene presionado (long-press), una animación progresiva de barrido en rojo llena el botón hasta convertirlo en "Terminar turno", vibrando y finalizando el turno por falta.
      - Botón de retroceso conectado a `deshacerUltimaAccion()` que recupera tanto el acierto como el paso previo con animación y sonido característico.
  - **Catálogo Oficial de 153 Cartas Reales**:
    - Se procesaron las 153 fotografías del mazo físico original (`data/Cards-20261029T212046Z-1-001/Cards/`).
    - Se extrajeron con 100% de fidelidad todos los elementos con su texto, color (`rojo`, `verde`, `violeta`), categoría original (42 categorías representadas), palabra clave y nivel de dificultad (2 a 5).
    - Se actualizó `data/cartas.json` reemplazando los datos de prueba por el mazo oficial completo de 153 cartas del juego.



---

## 10. Estado Actual y Próximos Pasos

- **Servidor local**: `node dev-server.js` (puerto 3000 / IP local).
- **Branch Git**: `main` (sincronizado con `origin/main` en GitHub).
- **Próximas tareas según feedback del usuario**:
  - Seguir iterando sobre las pruebas en dispositivos móviles en red local.
  - Ajustes de UX/UI o balance de cartas según pruebas reales.

