/**
 * Modo Desarrollador (#dev)
 * Panel discreto para crear cartas nuevas, autocompletar categorías y exportar JSON.
 */

import { gameState } from '../game.js';
import { COLOR_TIPOS } from '../deck.js';
import { customAlert } from './modal.js';

export function abrirModoDesarrollador(todasLasCartas, onCartaGuardada = () => {}) {
  let modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  }

  // Obtener categorías existentes agrupadas por color
  const categoriasPorColor = {
    rojo: new Set(),
    verde: new Set(),
    violeta: new Set()
  };

  todasLasCartas.forEach((carta) => {
    (carta.elementos || []).forEach((el) => {
      if (el.color && el.categoria && categoriasPorColor[el.color]) {
        categoriasPorColor[el.color].add(el.categoria);
      }
    });
  });

  const devModal = document.createElement('div');
  devModal.className = 'modal-overlay';
  devModal.setAttribute('role', 'dialog');
  devModal.setAttribute('aria-modal', 'true');

  devModal.innerHTML = `
    <div class="modal-card" style="max-width: 500px; max-height: 90vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h2 style="font-size: 1.25rem; font-weight: bold; color: var(--accent-secondary);">
          🛠️ Modo Desarrollador
        </h2>
        <button id="dev-btn-cerrar" class="icon-btn" type="button" aria-label="Cerrar">✕</button>
      </div>

      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
        Agregá cartas nuevas al juego. Se guardan en este dispositivo y podés exportar el JSON completo.
      </p>

      <form id="form-dev-carta" autocomplete="off">
        <!-- 1. Elemento Rojo (Títulos) -->
        <fieldset class="surface-card" style="border-color: #f87171; background: rgba(239, 68, 68, 0.05); margin-bottom: 1rem;">
          <legend style="color: #ef4444; font-weight: bold; font-size: 0.9rem; padding: 0 0.35rem;">
            Rojo — ${COLOR_TIPOS.rojo.label} (${COLOR_TIPOS.rojo.descripcion})
          </legend>
          <div class="input-group" style="margin-bottom: 0.65rem;">
            <label class="input-label">Texto / Título</label>
            <input id="elem-rojo-texto" class="text-input" type="text" placeholder="Ej: Bohemian Rhapsody" required />
          </div>
          <div class="input-group" style="margin-bottom: 0;">
            <label class="input-label">Categoría</label>
            <input id="elem-rojo-cat" class="text-input" type="text" list="dl-cat-rojo" placeholder="Ej: Canción" required />
            <datalist id="dl-cat-rojo">
              ${Array.from(categoriasPorColor.rojo).map((c) => `<option value="${escapeHtml(c)}">`).join('')}
            </datalist>
          </div>
        </fieldset>

        <!-- 2. Elemento Verde (Personas) -->
        <fieldset class="surface-card" style="border-color: #34d399; background: rgba(16, 185, 129, 0.05); margin-bottom: 1rem;">
          <legend style="color: #10b981; font-weight: bold; font-size: 0.9rem; padding: 0 0.35rem;">
            Verde — ${COLOR_TIPOS.verde.label} (${COLOR_TIPOS.verde.descripcion})
          </legend>
          <div class="input-group" style="margin-bottom: 0.65rem;">
            <label class="input-label">Texto / Persona</label>
            <input id="elem-verde-texto" class="text-input" type="text" placeholder="Ej: Freddie Mercury" required />
          </div>
          <div class="input-group" style="margin-bottom: 0;">
            <label class="input-label">Categoría</label>
            <input id="elem-verde-cat" class="text-input" type="text" list="dl-cat-verde" placeholder="Ej: Músico" required />
            <datalist id="dl-cat-verde">
              ${Array.from(categoriasPorColor.verde).map((c) => `<option value="${escapeHtml(c)}">`).join('')}
            </datalist>
          </div>
        </fieldset>

        <!-- 3. Elemento Violeta (Mix) -->
        <fieldset class="surface-card" style="border-color: #c084fc; background: rgba(168, 85, 247, 0.05); margin-bottom: 1rem;">
          <legend style="color: #a855f7; font-weight: bold; font-size: 0.9rem; padding: 0 0.35rem;">
            Violeta — ${COLOR_TIPOS.violeta.label} (${COLOR_TIPOS.violeta.descripcion})
          </legend>
          <div class="input-group" style="margin-bottom: 0.65rem;">
            <label class="input-label">Texto / Miscelánea</label>
            <input id="elem-violeta-texto" class="text-input" type="text" placeholder="Ej: Corona Real" required />
          </div>
          <div class="input-group" style="margin-bottom: 0;">
            <label class="input-label">Categoría</label>
            <input id="elem-violeta-cat" class="text-input" type="text" list="dl-cat-violeta" placeholder="Ej: Objeto" required />
            <datalist id="dl-cat-violeta">
              ${Array.from(categoriasPorColor.violeta).map((c) => `<option value="${escapeHtml(c)}">`).join('')}
            </datalist>
          </div>
        </fieldset>

        <!-- Palabra Clave y Dificultad -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
          <div class="input-group" style="margin-bottom: 0;">
            <label class="input-label">Palabra Clave (Prohibida)</label>
            <input id="dev-palabra-clave" class="text-input" type="text" placeholder="Ej: Queen" required />
          </div>
          <div class="input-group" style="margin-bottom: 0;">
            <label class="input-label">Dificultad (1-5)</label>
            <input id="dev-dificultad" class="text-input" type="number" min="1" max="5" value="2" required />
          </div>
        </div>

        <p id="dev-error" style="color: var(--accent-danger); font-size: 0.85rem; margin-bottom: 0.75rem; display: none;" role="alert"></p>

        <div style="display: flex; gap: 0.5rem; margin-top: 1.25rem;">
          <button id="dev-btn-guardar" class="btn btn-primary btn-block" type="submit">
            + Guardar Carta
          </button>
        </div>
      </form>

      <hr style="border: none; border-top: 1px solid var(--bg-surface-border); margin: 1.5rem 0;" />

      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <h3 style="font-size: 1rem; color: var(--text-primary);">Exportar Catálogo Total</h3>
          <span style="font-size: 0.85rem; color: var(--accent-secondary);">
            ${todasLasCartas.length} cartas
          </span>
        </div>
        <button id="dev-btn-exportar" class="btn btn-secondary btn-block" type="button">
          📥 Descargar cartas.json actualizado
        </button>
      </div>
    </div>
  `;

  modalRoot.appendChild(devModal);

  function cerrar() {
    devModal.remove();
  }

  devModal.querySelector('#dev-btn-cerrar')?.addEventListener('click', cerrar);

  const form = devModal.querySelector('#form-dev-carta');
  const errorEl = devModal.querySelector('#dev-error');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rojoTexto = devModal.querySelector('#elem-rojo-texto').value.trim();
    const rojoCat = devModal.querySelector('#elem-rojo-cat').value.trim();

    const verdeTexto = devModal.querySelector('#elem-verde-texto').value.trim();
    const verdeCat = devModal.querySelector('#elem-verde-cat').value.trim();

    const violetaTexto = devModal.querySelector('#elem-violeta-texto').value.trim();
    const violetaCat = devModal.querySelector('#elem-violeta-cat').value.trim();

    const palabraClave = devModal.querySelector('#dev-palabra-clave').value.trim();
    const dificultad = parseInt(devModal.querySelector('#dev-dificultad').value, 10) || 1;

    if (!rojoTexto || !rojoCat || !verdeTexto || !verdeCat || !violetaTexto || !violetaCat || !palabraClave) {
      errorEl.textContent = 'Completá todos los campos obligatorios.';
      errorEl.style.display = 'block';
      return;
    }

    const nuevaCarta = {
      elementos: [
        { texto: rojoTexto, categoria: rojoCat, color: 'rojo' },
        { texto: verdeTexto, categoria: verdeCat, color: 'verde' },
        { texto: violetaTexto, categoria: violetaCat, color: 'violeta' }
      ],
      palabraClave,
      dificultad
    };

    try {
      const cartaGuardada = gameState.guardarCartaCustom(nuevaCarta);
      todasLasCartas.push(cartaGuardada);
      onCartaGuardada(cartaGuardada);
      form.reset();
      errorEl.style.display = 'none';

      await customAlert({
        title: '¡Carta guardada!',
        message: `La carta con la palabra clave "${palabraClave}" fue añadida a tu almacenamiento local.`
      });
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  });

  // Exportar JSON
  devModal.querySelector('#dev-btn-exportar')?.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(todasLasCartas, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'cartas.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
