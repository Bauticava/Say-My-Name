/**
 * Pantalla de Equipos (#equipos)
 * Permite agregar, renombrar y quitar equipos con validaciones completas.
 */

import { gameState } from '../game.js';
import { customAlert, customConfirm, customPrompt } from './modal.js';

export function renderEquipos(container, router) {
  function updateUI() {
    container.innerHTML = `
      <section class="screen" aria-label="Armado de equipos">
        <header class="screen-header">
          <button id="btn-volver" class="header-back-btn" type="button" aria-label="Volver">
            ←
          </button>
          <h1>Equipos</h1>
          <div style="width: 44px;"></div>
        </header>

        <p class="hero-subtitle" style="margin-bottom: 1.25rem;">
          Armá al menos 2 equipos para la partida. Podés cambiarles el nombre o agregar más.
        </p>

        <!-- Formulario para agregar equipo -->
        <form id="form-agregar-equipo" class="input-group" style="margin-bottom: 1.5rem;" autocomplete="off">
          <label for="input-nuevo-equipo" class="input-label">Nuevo equipo</label>
          <div style="display: flex; gap: 0.5rem;">
            <input
              id="input-nuevo-equipo"
              class="text-input"
              type="text"
              maxlength="25"
              placeholder="Ej: Los Dinamita"
              required
            />
            <button id="btn-agregar" class="btn btn-secondary" type="submit">
              + Agregar
            </button>
          </div>
          <p id="error-equipo" style="color: var(--accent-danger); font-size: 0.85rem; margin-top: 0.35rem; display: none;" role="alert"></p>
        </form>

        <!-- Lista de equipos actuales -->
        <div class="surface-card" style="padding: 1rem;">
          <h2 style="font-size: 1.1rem; margin-bottom: 0.85rem; color: var(--text-secondary);">
            Equipos en juego (${gameState.equipos.length})
          </h2>

          <div id="lista-equipos">
            ${gameState.equipos.map((eq, index) => `
              <div class="team-item" data-id="${eq.id}">
                <span class="team-item-name">${index + 1}. ${escapeHtml(eq.nombre)}</span>
                <div class="team-actions">
                  <button class="icon-btn btn-editar" data-id="${eq.id}" type="button" aria-label="Renombrar ${escapeHtml(eq.nombre)}">
                    ✏️
                  </button>
                  <button 
                    class="icon-btn icon-btn-danger btn-eliminar" 
                    data-id="${eq.id}" 
                    type="button" 
                    aria-label="Quitar ${escapeHtml(eq.nombre)}"
                    ${gameState.equipos.length <= 2 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-top: auto; padding-top: 1rem;">
          <button id="btn-continuar" class="btn btn-primary btn-large btn-block" type="button">
            Continuar a configuración →
          </button>
        </div>
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Volver atrás con History API
    const btnVolver = container.querySelector('#btn-volver');
    btnVolver.addEventListener('click', () => {
      window.history.back();
    });

    // Agregar equipo
    const form = container.querySelector('#form-agregar-equipo');
    const input = container.querySelector('#input-nuevo-equipo');
    const errorEl = container.querySelector('#error-equipo');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = input.value;
      const validacion = gameState.validarNombreEquipo(nombre);

      if (!validacion.valid) {
        errorEl.textContent = validacion.error;
        errorEl.style.display = 'block';
        input.focus();
        return;
      }

      errorEl.style.display = 'none';
      try {
        gameState.agregarEquipo(nombre);
        updateUI();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    });

    // Renombrar equipo
    const botonesEditar = container.querySelectorAll('.btn-editar');
    botonesEditar.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const eq = gameState.equipos.find((e) => e.id === id);
        if (!eq) return;

        const nuevoNombre = await customPrompt({
          title: 'Renombrar equipo',
          message: 'Ingresá el nuevo nombre para este equipo:',
          defaultValue: eq.nombre,
          placeholder: 'Ej: Los Dinamita',
          confirmText: 'Guardar',
          cancelText: 'Cancelar',
          validate: (val) => gameState.validarNombreEquipo(val, id)
        });

        if (nuevoNombre !== null) {
          gameState.renombrarEquipo(id, nuevoNombre);
          updateUI();
        }
      });
    });

    // Eliminar equipo
    const botonesEliminar = container.querySelectorAll('.btn-eliminar');
    botonesEliminar.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const eq = gameState.equipos.find((e) => e.id === id);
        if (!eq) return;

        const confirma = await customConfirm({
          title: '¿Quitar equipo?',
          message: `¿Querés eliminar a "${eq.nombre}" de la partida?`,
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
          danger: true
        });

        if (confirma) {
          try {
            gameState.quitarEquipo(id);
            updateUI();
          } catch (err) {
            await customAlert({
              title: 'No se puede quitar',
              message: err.message
            });
          }
        }
      });
    });

    // Continuar
    const btnContinuar = container.querySelector('#btn-continuar');
    btnContinuar.addEventListener('click', async () => {
      if (gameState.equipos.length < 2) {
        await customAlert({
          title: 'Equipos insuficientes',
          message: 'Se necesitan al menos 2 equipos para poder jugar.'
        });
        return;
      }
      router.navigate('configuracion');
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  updateUI();
}
