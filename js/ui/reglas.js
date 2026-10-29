/**
 * Pantalla de Reglas (#reglas)
 */

function formatInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function simpleMarkdownToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }

    if (line === '---') {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += '<hr class="rules-divider" />';
      continue;
    }

    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h1>${formatInline(line.slice(2))}</h1>`;
      continue;
    }

    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2>${formatInline(line.slice(3))}</h2>`;
      continue;
    }

    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${formatInline(line.slice(4))}</h3>`;
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      if (!inList) {
        html += '<ul class="rules-list">';
        inList = true;
      }
      const itemContent = line.replace(/^(-\s+|\*\s+|\d+\.\s+)/, '');
      html += `<li>${formatInline(itemContent)}</li>`;
      continue;
    }

    // Párrafo de texto normal
    if (inList) {
      html += '</ul>';
      inList = false;
    }
    html += `<p>${formatInline(line)}</p>`;
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}

export async function renderReglas(container, router) {
  container.innerHTML = `
    <section class="screen" aria-label="Pantalla de reglas">
      <header class="screen-header">
        <button id="btn-volver" class="header-back-btn" type="button" aria-label="Volver">
          ←
        </button>
        <h1>Say My Name</h1>
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
