# CONTEXT.md — Say My Name (app acompañante de juego de cartas)

> Este archivo describe QUÉ es el proyecto y POR QUÉ se tomaron las decisiones.
> Las reglas de trabajo para agentes están en `AGENTS.md`.

## Qué es

**Say My Name** es una web app instalable (PWA) que funciona como **acompañante de un juego de cartas presencial**.
Los jugadores están en el mismo lugar, con un solo teléfono (o uno por persona). La app **no es el juego**:
reemplaza la pila física de cartas y aporta herramientas alrededor de la partida.

## Funcionalidades

1. **Reglas del juego**: pantalla de consulta rápida, siempre disponible offline.
2. **Equipos**: antes de jugar se arman grupos y cada equipo elige su **nombre**.
3. **Configuración de la partida**: se elige **con cuántas cartas** se juega (el mazo de la partida es una selección aleatoria de esa cantidad).
4. **Rondas**: la partida tiene **3 rondas** (a confirmar; ver "Pendiente de definir").
5. **Mazo digital**: selección aleatoria de cartas, sin repetir hasta agotar el mazo (o reiniciarlo).
6. **Temporizador**: cuenta regresiva configurable, con aviso sonoro y/o vibración al terminar.
7. Las cartas que salen **se juegan de manera presencial**: la app solo las muestra.

Fuera de alcance (por ahora): multijugador online, cuentas de usuario, backend, pagos, puntajes en la nube.

## Decisiones tomadas

| Decisión | Motivo |
|---|---|
| PWA en HTML/CSS/JS, sin backend | Se juega en el mismo lugar; no hace falta servidor ni internet |
| Hospedaje en GitHub Pages | Gratis, se actualiza con un `git push`, se comparte con un link |
| Sin framework ni paso de build al inicio | Proyecto chico; menos complejidad. Se puede migrar después si crece |
| Navegación con History API (hash) | El gesto "atrás" del teléfono debe volver a la pantalla anterior, no cerrar la app |
| Offline-first con service worker | Se va a usar en lugares con mala señal |
| Pantalla siempre encendida (Wake Lock) durante la partida | Evita que el teléfono se bloquee a mitad del juego |
| Play Store más adelante (opcional) | Se puede envolver la misma PWA con Capacitor o TWA si se quiere |

## Pantallas

- `#inicio` — menú principal (Jugar, Reglas).
- `#reglas` — reglas del juego.
- `#equipos` — crear equipos y ponerles nombre.
- `#configuracion` — elegir cantidad de cartas (y, si aplica, duración del temporizador).
- `#partida` — mazo + temporizador + ronda actual.
- Flujo: `inicio` → `equipos` → `configuracion` → `partida`.
- Comportamiento de "atrás": desde `#partida` pide confirmación; desde `#inicio` cierra la app (comportamiento normal).

## Datos

- `data/cartas.json` — lista de cartas (id, texto/título, y campos extra según el juego).
- `data/reglas.md` (o `reglas.json`) — texto de las reglas.

## Pendiente de definir (completar acá)

- [x] Nombre de la app: **Say My Name**
- [ ] Cantidad de rondas: se piensa en 3, confirmar
- [ ] Cantidad de equipos permitida (mínimo y máximo) y de jugadores por equipo
- [ ] Opciones de cantidad de cartas (por ejemplo 10 / 20 / 30, o libre) y total de cartas disponibles
- [ ] Qué pasa entre rondas: ¿se reutilizan las mismas cartas? ¿el temporizador cambia por ronda?
- [ ] ¿Se llevan puntajes por equipo en la app?
- [ ] Tipo de cartas (texto, retos, imágenes)
- [ ] Reglas exactas del juego
- [ ] Duraciones del temporizador (fijas o configurables)
- [ ] Identidad visual (colores, tipografía, tono)
- [ ] Idioma de la interfaz (por defecto: español rioplatense)

## Cómo se publica

1. Subir el repo a GitHub.
2. Activar GitHub Pages sobre la rama `main` (carpeta raíz).
3. Abrir el link en el teléfono y usar "Agregar a pantalla de inicio".