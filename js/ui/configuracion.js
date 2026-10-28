/**
 * Pantalla de Configuración (#configuracion)
 * Elección de cantidad de cartas y duración del temporizador.
 */

import { gameState } from '../game.js';

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
    // Fallback mínimo si falla la red
    return [
      { id: 1, nombre: 'Lionel Messi', categoria: 'Deporte' },
      { id: 2, nombre: 'Marilyn Monroe', categoria: 'Cine' },
      { id: 3, nombre: 'Gustavo Cerati', categoria: 'Música' },
      { id: 4, nombre: 'Harry Potter', categoria: 'Ficción' },
      { id: 5, nombre: 'Frida Kahlo', categoria: 'Arte' }
    ];
  }
}

export async function renderConfiguracion(container, router) {
  const todasLasCartas = await obtenerCatalogoCartas();
  const maxCartas = todasLasCartas.length;

  // Ajustar si la cantidad actual supera el catálogo
  if (gameState.cantidadCartas > maxCartas) {
    gameState.setCantidadCartas(maxCartas);
  }

  function updateUI() {
    container.innerHTML = `
      <section class="screen" aria-label="Configuración de la partida">
        <header class="screen-header">
          <button id="btn-volver" class="header-back-btn" type="button" aria-label="Volver">
            ←
          </button>
          <h1>Configuración</h1>
          <div style="width: 44px;"></div>
        </header>

        <!-- Selección de Cantidad de Cartas -->
        <div class="surface-card">
          <label class="input-label" style="display: block; margin-bottom: 0.5rem;">
            Cantidad de cartas para la partida
          </label>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            Se elegirán al azar entre las ${maxCartas} disponibles y se mantendrán durante las 3 rondas.
          </p>

          <div class="setting-counter">
            <button id="btn-menos-cartas" class="counter-btn" type="button" aria-label="Menos cartas">-</button>
            <div style="text-align: center;">
              <span id="valor-cartas" class="counter-value">${gameState.cantidadCartas}</span>
              <span style="font-size: 0.85rem; color: var(--text-secondary); display: block;">cartas</span>
            </div>
            <button id="btn-mas-cartas" class="counter-btn" type="button" aria-label="Más cartas">+</button>
          </div>

          <!-- Atajos rápidos -->
          <div style="display: flex; gap: 0.5rem; margin-top: 0.85rem; flex-wrap: wrap;">
            ${[15, 25, 35, maxCartas].filter((v, i, arr) => arr.indexOf(v) === i && v <= maxCartas).map((preset) => `
              <button 
                class="btn btn-secondary btn-preset-cartas" 
                data-preset="${preset}" 
                type="button" 
                style="padding: 0.4rem 0.8rem; font-size: 0.85rem; flex: 1; ${gameState.cantidadCartas === preset ? 'border-color: var(--accent-secondary); color: var(--accent-secondary);' : ''}"
              >
                ${preset === maxCartas ? 'Todas (' + maxCartas + ')' : preset}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Selección de Tiempo por Turno -->
        <div class="surface-card">
          <label class="input-label" style="display: block; margin-bottom: 0.5rem;">
            Tiempo por turno
          </label>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            Duración del temporizador para cada equipo en cada pasada.
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

        <!-- Resumen de partida -->
        <div class="surface-card" style="background: rgba(255, 94, 54, 0.08); border-color: rgba(255, 94, 54, 0.25);">
          <div style="font-size: 0.9rem; color: var(--text-secondary); display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span>Equipos:</span>
            <strong style="color: var(--text-primary);">${gameState.equipos.length}</strong>
          </div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span>Rondas:</span>
            <strong style="color: var(--text-primary);">3 rondas clásicas</strong>
          </div>
          <div style="font-size: 0.9rem; color: var(--text-secondary); display: flex; justify-content: space-between;">
            <span>Mazo:</span>
            <strong style="color: var(--text-primary);">${gameState.cantidadCartas} personajes</strong>
          </div>
        </div>

        <div style="margin-top: auto; padding-top: 1rem;">
          <button id="btn-comenzar" class="btn btn-primary btn-large btn-block" type="button">
            ¡Comenzar partida! 🚀
          </button>
        </div>
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Volver atrás
    const btnVolver = container.querySelector('#btn-volver');
    btnVolver.addEventListener('click', () => {
      window.history.back();
    });

    // Menos cartas
    const btnMenos = container.querySelector('#btn-menos-cartas');
    btnMenos.addEventListener('click', () => {
      if (gameState.cantidadCartas > 5) {
        gameState.setCantidadCartas(gameState.cantidadCartas - 5);
        updateUI();
      }
    });

    // Más cartas
    const btnMas = container.querySelector('#btn-mas-cartas');
    btnMas.addEventListener('click', () => {
      if (gameState.cantidadCartas < maxCartas) {
        gameState.setCantidadCartas(Math.min(gameState.cantidadCartas + 5, maxCartas));
        updateUI();
      }
    });

    // Presets de cartas
    const botonesPreset = container.querySelectorAll('.btn-preset-cartas');
    botonesPreset.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.getAttribute('data-preset'), 10);
        gameState.setCantidadCartas(val);
        updateUI();
      });
    });

    // Tiempos
    const botonesTiempo = container.querySelectorAll('.btn-tiempo');
    botonesTiempo.forEach((btn) => {
      btn.addEventListener('click', () => {
        const seg = parseInt(btn.getAttribute('data-segundos'), 10);
        gameState.setTiempoPorTurno(seg);
        updateUI();
      });
    });

    // Comenzar partida
    const btnComenzar = container.querySelector('#btn-comenzar');
    btnComenzar.addEventListener('click', () => {
      gameState.iniciarNuevaPartida(todasLasCartas);
      router.navigate('partida');
    });
  }

  updateUI();
}
