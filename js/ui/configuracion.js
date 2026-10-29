/**
 * Pantalla de Configuración (#configuracion)
 * Elección de cantidad de cartas, duración del temporizador y filtros avanzados.
 */

import { gameState } from '../game.js';
import { COLOR_TIPOS, cartaCumpleFiltros } from '../deck.js';
import { customAlert } from './modal.js';

let catalogoCartasCache = null;

async function obtenerCatalogoCartas() {
  if (catalogoCartasCache && catalogoCartasCache.length > 0) {
    return catalogoCartasCache;
  }
  try {
    const res = await fetch('data/cartas.json');
    if (!res.ok) throw new Error('Error al cargar cartas');
    catalogoCartasCache = await res.json();
    return catalogoCartasCache;
  } catch (err) {
    console.warn('Fallback de cartas por error de red:', err);
    return [];
  }
}

export async function renderConfiguracion(container, router) {
  const cartasEstaticas = await obtenerCatalogoCartas();
  const cartasCustom = gameState.obtenerCartasCustom();
  const todasLasCartas = [...cartasEstaticas, ...cartasCustom];

  // Limpiar cualquier filtro previo de categorías específicas
  if (gameState.filtros.categorias && gameState.filtros.categorias.length > 0) {
    gameState.setFiltros({ categorias: [] });
  }

  function updateUI() {
    // Calcular cuántas cartas cumplen los filtros activos
    const cartasFiltradas = todasLasCartas.filter((c) => cartaCumpleFiltros(c, gameState.filtros));
    const cantidadRelampago = gameState.equipos.length * 2;
    const maximoCartasPrincipal = Math.max(0, cartasFiltradas.length - cantidadRelampago);
    const alcanzanCartas = maximoCartasPrincipal >= 5;

    // Asegurar que la cantidad de cartas elegida no supere el máximo disponible
    if (gameState.cantidadCartas > maximoCartasPrincipal && maximoCartasPrincipal > 0) {
      gameState.setCantidadCartas(maximoCartasPrincipal);
    } else if (gameState.cantidadCartas < 5 && maximoCartasPrincipal >= 5) {
      gameState.setCantidadCartas(Math.min(15, maximoCartasPrincipal));
    }

    container.innerHTML = `
      <section class="screen" aria-label="Configuración de la partida">
        <header class="screen-header">
          <button id="btn-volver" class="header-back-btn" type="button" aria-label="Volver">
            ←
          </button>
          <h1>Configuración</h1>
          <div style="width: 44px;"></div>
        </header>

        <!-- Filtros de Contenido -->
        <div class="surface-card">
          <h2 style="font-size: 1.1rem; margin-bottom: 0.75rem; color: var(--text-primary);">
            🎯 Filtros de Cartas
          </h2>

          <!-- Filtro por Tipo de Elemento (Fila completa con colores individuales) -->
          <div style="margin-bottom: 1.25rem;">
            <label class="input-label" style="display: block; margin-bottom: 0.5rem;">
              Tipo de elemento
            </label>
            <div class="btn-tipo-stack">
              ${Object.values(COLOR_TIPOS).map((tipo) => {
                const activo = gameState.filtros.tipos.includes(tipo.id);
                return `
                  <button 
                    class="btn-tipo-card ${activo ? 'active' : ''}" 
                    data-tipo="${tipo.id}" 
                    type="button"
                  >
                    <span>${tipo.label}</span>
                    <span class="btn-tipo-indicator"></span>
                  </button>
                `;
              }).join('')}
            </div>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">
              Si no seleccionás ninguno, entran todos los tipos.
            </p>
          </div>

          <!-- Filtro por Dificultad (1 a 5) -->
          <div style="margin-bottom: 0.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
              <label class="input-label">Dificultad máxima</label>
              <span id="label-dificultad" style="font-weight: bold; color: var(--accent-secondary);">
                Hasta nivel ${gameState.filtros.dificultadMax || 5}
              </span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              ${[1, 2, 3, 4, 5].map((lvl) => `
                <button 
                  class="btn btn-secondary btn-filtro-dif ${gameState.filtros.dificultadMax === lvl ? 'btn-warning' : ''}" 
                  data-lvl="${lvl}" 
                  type="button" 
                  style="flex: 1; padding: 0.6rem 0.2rem; font-size: 0.95rem;"
                >
                  ${lvl}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Contador de Cartas Elegibles -->
          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--bg-surface-border); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; color: var(--text-secondary);">Cartas que cumplen filtros:</span>
            <span style="font-size: 1.1rem; font-weight: var(--font-weight-black); color: var(--accent-secondary);">
              ${cartasFiltradas.length} disponibles
            </span>
          </div>
        </div>

        <!-- Cantidad de Cartas para el Mazo Principal -->
        <div class="surface-card">
          <label class="input-label" style="display: block; margin-bottom: 0.35rem;">
            Cantidad de cartas para la partida
          </label>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            ${cantidadRelampago} cartas exclusivas irán a la Ronda Relámpago (2 por equipo). Máximo disponible para rondas 1 a 3: <strong>${maximoCartasPrincipal}</strong>.
          </p>

          <div class="setting-counter">
            <button id="btn-menos-cartas" class="counter-btn" type="button" aria-label="Menos cartas" ${!alcanzanCartas ? 'disabled style="opacity:0.4"' : ''}>-</button>
            <div class="counter-input-wrap">
              <input
                id="input-cantidad-cartas"
                class="counter-input"
                type="number"
                inputmode="numeric"
                pattern="[0-9]*"
                min="5"
                max="${maximoCartasPrincipal}"
                value="${alcanzanCartas ? gameState.cantidadCartas : 0}"
                ${!alcanzanCartas ? 'disabled style="opacity:0.4"' : ''}
              />
              <span class="counter-unit">cartas</span>
            </div>
            <button id="btn-mas-cartas" class="counter-btn" type="button" aria-label="Más cartas" ${!alcanzanCartas ? 'disabled style="opacity:0.4"' : ''}>+</button>
          </div>

          ${alcanzanCartas ? `
            <div style="display: flex; gap: 0.5rem; margin-top: 0.85rem; flex-wrap: wrap;">
              ${[10, 15, 20, maximoCartasPrincipal].filter((v, i, arr) => arr.indexOf(v) === i && v <= maximoCartasPrincipal && v >= 5).map((preset) => `
                <button 
                  class="btn btn-secondary btn-preset-cartas" 
                  data-preset="${preset}" 
                  type="button" 
                  style="padding: 0.4rem 0.8rem; font-size: 0.85rem; flex: 1; ${gameState.cantidadCartas === preset ? 'border-color: var(--accent-secondary); color: var(--accent-secondary);' : ''}"
                >
                  ${preset === maximoCartasPrincipal ? 'Máx (' + maximoCartasPrincipal + ')' : preset}
                </button>
              `).join('')}
            </div>
          ` : `
            <div style="margin-top: 0.85rem; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: var(--radius-sm); padding: 0.75rem;">
              <p style="font-size: 0.85rem; color: #fca5a5;">
                ⚠️ No alcanzan las cartas con los filtros seleccionados. Se necesitan al menos ${cantidadRelampago + 5} cartas (${cantidadRelampago} para la relámpago y 5 para las rondas principales).
              </p>
            </div>
          `}
        </div>

        <!-- Tiempo por Turno -->
        <div class="surface-card">
          <label class="input-label" style="display: block; margin-bottom: 0.35rem;">
            Tiempo por turno (Rondas 1, 2 y 3)
          </label>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            La Ronda Relámpago tiene una duración fija de 15 segundos por carta.
          </p>

          <div style="display: flex; gap: 0.5rem;">
            ${[30, 45, 60, 90].map((segundos) => `
              <button 
                class="btn btn-secondary btn-tiempo ${gameState.tiempoPorTurno === segundos ? 'btn-warning' : ''}" 
                data-segundos="${segundos}" 
                type="button" 
                style="flex: 1; padding: 0.65rem 0.5rem; font-size: 0.95rem;"
              >
                ${segundos}s
              </button>
            `).join('')}
          </div>
        </div>

        <div style="margin-top: auto; padding-top: 1rem;">
          <button 
            id="btn-comenzar" 
            class="btn btn-primary btn-large btn-block" 
            type="button"
            ${!alcanzanCartas ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
          >
            ¡Comenzar partida! 🚀
          </button>
        </div>
      </section>
    `;

    bindEvents(cartasFiltradas, maximoCartasPrincipal, alcanzanCartas);
  }

  function bindEvents(cartasFiltradas, maximoCartasPrincipal, alcanzanCartas) {
    container.querySelector('#btn-volver')?.addEventListener('click', () => {
      window.history.back();
    });

    // Filtros de Tipo de Elemento (Títulos, Personas, Mix)
    const botonesTipo = container.querySelectorAll('.btn-tipo-card');
    botonesTipo.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tipo = btn.getAttribute('data-tipo');
        let nuevosTipos = [...gameState.filtros.tipos];
        if (nuevosTipos.includes(tipo)) {
          nuevosTipos = nuevosTipos.filter((t) => t !== tipo);
        } else {
          nuevosTipos.push(tipo);
        }
        gameState.setFiltros({ tipos: nuevosTipos });
        updateUI();
      });
    });

    // Filtros de Dificultad (1 a 5)
    const botonesDif = container.querySelectorAll('.btn-filtro-dif');
    botonesDif.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lvl = parseInt(btn.getAttribute('data-lvl'), 10);
        gameState.setFiltros({ dificultadMax: lvl });
        updateUI();
      });
    });

    // Input directo para escribir cantidad de cartas
    const inputCartas = container.querySelector('#input-cantidad-cartas');
    if (inputCartas) {
      inputCartas.addEventListener('input', () => {
        const val = parseInt(inputCartas.value, 10);
        if (!isNaN(val) && val >= 1) {
          const clamped = Math.min(val, maximoCartasPrincipal);
          gameState.setCantidadCartas(clamped);

          // Actualizar highlights de botones preset sin regenerar el DOM
          container.querySelectorAll('.btn-preset-cartas').forEach((b) => {
            const p = parseInt(b.getAttribute('data-preset'), 10);
            if (p === clamped) {
              b.style.borderColor = 'var(--accent-secondary)';
              b.style.color = 'var(--accent-secondary)';
            } else {
              b.style.borderColor = '';
              b.style.color = '';
            }
          });
        }
      });

      const validarValorFinal = () => {
        let val = parseInt(inputCartas.value, 10);
        if (isNaN(val) || val < 5) {
          val = Math.min(5, maximoCartasPrincipal);
        } else if (val > maximoCartasPrincipal) {
          val = maximoCartasPrincipal;
        }
        gameState.setCantidadCartas(val);
        inputCartas.value = val;
      };

      inputCartas.addEventListener('change', validarValorFinal);
      inputCartas.addEventListener('blur', validarValorFinal);
    }

    // Botones de incremento y decremento
    container.querySelector('#btn-menos-cartas')?.addEventListener('click', () => {
      if (gameState.cantidadCartas > 5) {
        const nuevo = Math.max(5, gameState.cantidadCartas - 1);
        gameState.setCantidadCartas(nuevo);
        if (inputCartas) inputCartas.value = nuevo;
        updateUI();
      }
    });

    container.querySelector('#btn-mas-cartas')?.addEventListener('click', () => {
      if (gameState.cantidadCartas < maximoCartasPrincipal) {
        const nuevo = Math.min(gameState.cantidadCartas + 1, maximoCartasPrincipal);
        gameState.setCantidadCartas(nuevo);
        if (inputCartas) inputCartas.value = nuevo;
        updateUI();
      }
    });

    const botonesPreset = container.querySelectorAll('.btn-preset-cartas');
    botonesPreset.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.getAttribute('data-preset'), 10);
        gameState.setCantidadCartas(val);
        updateUI();
      });
    });

    // Tiempo por turno
    const botonesTiempo = container.querySelectorAll('.btn-tiempo');
    botonesTiempo.forEach((btn) => {
      btn.addEventListener('click', () => {
        const seg = parseInt(btn.getAttribute('data-segundos'), 10);
        gameState.setTiempoPorTurno(seg);
        updateUI();
      });
    });

    // Comenzar partida
    container.querySelector('#btn-comenzar')?.addEventListener('click', async () => {
      if (!alcanzanCartas) return;
      try {
        gameState.iniciarNuevaPartida(todasLasCartas);
        router.navigate('partida');
      } catch (err) {
        await customAlert(err.message, 'Atención');
      }
    });
  }

  updateUI();
}
