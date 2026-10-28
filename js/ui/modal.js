/**
 * Modal personalizado para Say My Name
 * Reemplaza alert(), confirm() y prompt() con diálogos estilizados,
 * accesibles y acordes a la identidad visual de la app.
 */

function crearContenedorModal() {
  let container = document.getElementById('modal-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'modal-root';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Muestra una alerta personalizada.
 * @param {Object} options
 * @param {string} [options.title='Atención']
 * @param {string} options.message
 * @param {string} [options.confirmText='Entendido']
 * @returns {Promise<void>}
 */
export function customAlert({ title = 'Atención', message, confirmText = 'Entendido' }) {
  return new Promise((resolve) => {
    const root = crearContenedorModal();
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'modal-title');

    modalEl.innerHTML = `
      <div class="modal-card">
        <h2 id="modal-title" class="modal-title">${escapeHtml(title)}</h2>
        <p class="modal-message">${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button id="modal-btn-confirm" class="btn btn-primary btn-block" type="button">
            ${escapeHtml(confirmText)}
          </button>
        </div>
      </div>
    `;

    root.appendChild(modalEl);

    const btnConfirm = modalEl.querySelector('#modal-btn-confirm');
    btnConfirm.focus();

    function cerrar() {
      modalEl.classList.add('modal-closing');
      modalEl.addEventListener('animationend', () => {
        modalEl.remove();
        resolve();
      }, { once: true });
    }

    btnConfirm.addEventListener('click', cerrar);

    modalEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        cerrar();
      }
    });
  });
}

/**
 * Muestra un diálogo de confirmación personalizado.
 * @param {Object} options
 * @param {string} [options.title='¿Estás seguro?']
 * @param {string} options.message
 * @param {string} [options.confirmText='Aceptar']
 * @param {string} [options.cancelText='Cancelar']
 * @param {boolean} [options.danger=false] - Estilo destructivo para la acción
 * @returns {Promise<boolean>}
 */
export function customConfirm({
  title = '¿Estás seguro?',
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  danger = false
}) {
  return new Promise((resolve) => {
    const root = crearContenedorModal();
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'modal-title');

    modalEl.innerHTML = `
      <div class="modal-card">
        <h2 id="modal-title" class="modal-title">${escapeHtml(title)}</h2>
        <p class="modal-message">${escapeHtml(message)}</p>
        <div class="modal-actions modal-actions-split">
          <button id="modal-btn-cancel" class="btn btn-secondary" type="button">
            ${escapeHtml(cancelText)}
          </button>
          <button id="modal-btn-confirm" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button">
            ${escapeHtml(confirmText)}
          </button>
        </div>
      </div>
    `;

    root.appendChild(modalEl);

    const btnConfirm = modalEl.querySelector('#modal-btn-confirm');
    const btnCancel = modalEl.querySelector('#modal-btn-cancel');

    // Foco en cancelar por seguridad si es acción destructiva, o en confirmar si no lo es
    if (danger) {
      btnCancel.focus();
    } else {
      btnConfirm.focus();
    }

    function terminar(resultado) {
      modalEl.classList.add('modal-closing');
      modalEl.addEventListener('animationend', () => {
        modalEl.remove();
        resolve(resultado);
      }, { once: true });
    }

    btnConfirm.addEventListener('click', () => terminar(true));
    btnCancel.addEventListener('click', () => terminar(false));

    modalEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        terminar(false);
      }
    });
  });
}

/**
 * Muestra un prompt de entrada de texto personalizado.
 * @param {Object} options
 * @param {string} [options.title='Editar valor']
 * @param {string} [options.message='']
 * @param {string} [options.defaultValue='']
 * @param {string} [options.placeholder='']
 * @param {string} [options.confirmText='Guardar']
 * @param {string} [options.cancelText='Cancelar']
 * @param {function(string): {valid: boolean, error: string|null}} [options.validate]
 * @returns {Promise<string|null>} Retorna el texto ingresado o null si se cancela.
 */
export function customPrompt({
  title = 'Editar valor',
  message = '',
  defaultValue = '',
  placeholder = '',
  confirmText = 'Guardar',
  cancelText = 'Cancelar',
  validate = null
}) {
  return new Promise((resolve) => {
    const root = crearContenedorModal();
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'modal-title');

    modalEl.innerHTML = `
      <div class="modal-card">
        <h2 id="modal-title" class="modal-title">${escapeHtml(title)}</h2>
        ${message ? `<p class="modal-message">${escapeHtml(message)}</p>` : ''}
        
        <form id="modal-form" style="margin: 1.25rem 0 0.5rem 0;" autocomplete="off">
          <input
            id="modal-input"
            class="text-input"
            type="text"
            maxlength="25"
            value="${escapeHtml(defaultValue)}"
            placeholder="${escapeHtml(placeholder)}"
            required
          />
          <p id="modal-error" style="color: var(--accent-danger); font-size: 0.85rem; margin-top: 0.4rem; display: none;" role="alert"></p>

          <div class="modal-actions modal-actions-split" style="margin-top: 1.25rem;">
            <button id="modal-btn-cancel" class="btn btn-secondary" type="button">
              ${escapeHtml(cancelText)}
            </button>
            <button id="modal-btn-submit" class="btn btn-primary" type="submit">
              ${escapeHtml(confirmText)}
            </button>
          </div>
        </form>
      </div>
    `;

    root.appendChild(modalEl);

    const input = modalEl.querySelector('#modal-input');
    const form = modalEl.querySelector('#modal-form');
    const btnCancel = modalEl.querySelector('#modal-btn-cancel');
    const errorEl = modalEl.querySelector('#modal-error');

    // Seleccionar el texto del input al abrir
    input.focus();
    input.select();

    function terminar(resultado) {
      modalEl.classList.add('modal-closing');
      modalEl.addEventListener('animationend', () => {
        modalEl.remove();
        resolve(resultado);
      }, { once: true });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value;

      if (typeof validate === 'function') {
        const res = validate(val);
        if (!res.valid) {
          errorEl.textContent = res.error || 'Valor inválido.';
          errorEl.style.display = 'block';
          input.focus();
          return;
        }
      }

      terminar(val);
    });

    btnCancel.addEventListener('click', () => terminar(null));

    modalEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        terminar(null);
      }
    });
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
