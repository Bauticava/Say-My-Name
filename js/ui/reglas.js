/**
 * Pantalla de Reglas (#reglas)
 */

function simpleMarkdownToHtml(md) {
  return md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/<li>.*<\/li>/gims, (match) => `<ul>${match}</ul>`)
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/---/g, '<hr style="border:none;border-top:1px solid var(--bg-surface-border);margin:1.25rem 0;" />');
}

export async function renderReglas(container, router) {
  container.innerHTML = `
    <section class="screen" aria-label="Pantalla de reglas">
      <header class="screen-header">
        <button id="btn-volver" class="header-back-btn" type="button" aria-label="Volver">
          ←
        </button>
        <h1>Reglas</h1>
        <div style="width: 44px;"></div>
      </header>

      <div class="surface-card rules-container" id="reglas-content">
        <p>Cargando reglas...</p>
      </div>

      <div style="margin-top: auto; padding-top: 1rem;">
        <button id="btn-entendido" class="btn btn-primary btn-block" type="button">
          ¡Entendido, a jugar!
        </button>
      </div>
    </section>
  `;

  const btnVolver = container.querySelector('#btn-volver');
  btnVolver.addEventListener('click', () => {
    window.history.back();
  });

  const btnEntendido = container.querySelector('#btn-entendido');
  btnEntendido.addEventListener('click', () => {
    router.navigate('equipos');
  });

  const contentEl = container.querySelector('#reglas-content');

  try {
    const res = await fetch('data/reglas.md');
    if (!res.ok) throw new Error('Error al cargar archivo de reglas');
    const text = await res.text();
    contentEl.innerHTML = simpleMarkdownToHtml(text);
  } catch (err) {
    contentEl.innerHTML = `
      <h2>Reglas del juego</h2>
      <p>Say My Name se juega en 3 rondas con el mismo mazo de cartas:</p>
      <ul>
        <li><strong>Ronda 1:</strong> Descripción libre sin decir el nombre.</li>
        <li><strong>Ronda 2:</strong> Una sola palabra de pista por carta.</li>
        <li><strong>Ronda 3:</strong> Mímica y gestos en silencio total.</li>
      </ul>
      <p>Cada acierto suma 1 punto para tu equipo.</p>
    `;
  }
}
