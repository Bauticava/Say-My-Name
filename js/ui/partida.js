/**
 * Pantalla de Partida (#partida)
 * Mazo de cartas, temporizador en tiempo real, rondas y puntuación.
 */

import { gameState, TOTAL_RONDAS, RONDAS_INFO } from '../game.js';
import { GameTimer } from '../timer.js';
import { customConfirm } from './modal.js';

let activeTimer = null;

export function renderPartida(container, router) {
  // Si no hay partida iniciada, redirigir a inicio
  if (!gameState.enPartida || gameState.cartasPartida.length === 0) {
    router.navigate('inicio', true);
    return;
  }

  // Limpiar timer previo si existía
  if (activeTimer) {
    activeTimer.destroy();
    activeTimer = null;
  }

  let segundosRestantes = gameState.tiempoPorTurno;

  activeTimer = new GameTimer({
    durationSeconds: gameState.tiempoPorTurno,
    onTick: (secs) => {
      segundosRestantes = secs;
      const digitsEl = container.querySelector('#timer-digits');
      if (digitsEl) {
        digitsEl.textContent = formatTime(secs);
        if (secs <= 5) {
          digitsEl.classList.add('timer-urgent');
        } else {
          digitsEl.classList.remove('timer-urgent');
        }
      }
    },
    onEnd: () => {
      gameState.tiempoAgotado();
      renderCurrentPhase();
    }
  });

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins > 0 ? mins + ':' : ''}${secs < 10 && mins > 0 ? '0' : ''}${secs}s`;
  }

  function renderCurrentPhase() {
    container.innerHTML = '';

    const rondaInfo = RONDAS_INFO[gameState.rondaActual] || { nombre: `Ronda ${gameState.rondaActual}`, icono: '🃏', descripcion: '' };

    if (gameState.faseTurno === 'partida_terminada') {
      renderPartidaTerminada();
      return;
    }

    if (gameState.faseTurno === 'ronda_terminada') {
      renderRondaTerminada(rondaInfo);
      return;
    }

    if (gameState.faseTurno === 'tiempo_agotado') {
      renderTiempoAgotado();
      return;
    }

    if (gameState.faseTurno === 'listo') {
      renderTurnoListo(rondaInfo);
      return;
    }

    if (gameState.faseTurno === 'jugando') {
      renderJugando(rondaInfo);
      return;
    }
  }

  // --- Fase: Listo para empezar turno ---
  function renderTurnoListo(rondaInfo) {
    container.innerHTML = `
      <section class="screen" aria-label="Turno listo">
        <header class="game-top-bar">
          <div class="round-pill">
            <span>${rondaInfo.icono}</span>
            <span>Ronda ${gameState.rondaActual} de ${TOTAL_RONDAS}</span>
          </div>
          <button id="btn-abandonar" class="icon-btn" type="button" aria-label="Abandonar partida" title="Abandonar partida">
            ✕
          </button>
        </header>

        <!-- Marcador actual -->
        <div class="scoreboard">
          ${gameState.equipos.map((eq, i) => `
            <div class="score-box ${i === gameState.equipoTurnoIndex ? 'active' : ''}">
              <div class="score-box-name">${escapeHtml(eq.nombre)}</div>
              <div class="score-box-points">${eq.puntos}</div>
            </div>
          `).join('')}
        </div>

        <div class="surface-card" style="margin-top: 1rem; text-align: center; padding: 2rem 1.25rem;">
          <p style="font-size: 0.9rem; color: var(--accent-secondary); font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem;">
            Ronda ${gameState.rondaActual}: ${rondaInfo.nombre}
          </p>
          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            ${rondaInfo.descripcion}
          </p>

          <hr style="border: none; border-top: 1px solid var(--bg-surface-border); margin: 1.25rem 0;" />

          <p style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
            Es el turno de:
          </p>
          <h2 style="font-size: 2rem; font-weight: var(--font-weight-black); color: var(--text-primary); margin-bottom: 0.5rem;">
            ${escapeHtml(gameState.equipoActual.nombre)}
          </h2>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 1.75rem;">
            Quedan ${gameState.cartasRondaRestantes.length} cartas en el mazo de esta ronda.
          </p>

          <button id="btn-iniciar-turno" class="btn btn-primary btn-large btn-block" type="button">
            ⏱️ Iniciar turno (${gameState.tiempoPorTurno}s)
          </button>
        </div>
      </section>
    `;

    container.querySelector('#btn-abandonar')?.addEventListener('click', () => {
      window.history.back();
    });

    container.querySelector('#btn-iniciar-turno')?.addEventListener('click', () => {
      gameState.faseTurno = 'jugando';
      gameState.sacarSiguienteCarta();
      activeTimer.reset(gameState.tiempoPorTurno);
      activeTimer.start();
      renderCurrentPhase();
    });
  }

  // --- Fase: Jugando ---
  function renderJugando(rondaInfo) {
    const carta = gameState.cartaActual;
    const cartasRestantes = gameState.cartasRondaRestantes.length;

    container.innerHTML = `
      <section class="screen" aria-label="Partida en curso">
        <header class="game-top-bar">
          <div class="round-pill">
            <span>${rondaInfo.icono} ${rondaInfo.nombre}</span>
          </div>
          <span class="turn-pill">Turno: ${escapeHtml(gameState.equipoActual.nombre)}</span>
        </header>

        <!-- Temporizador central -->
        <div class="timer-container" aria-live="polite">
          <div id="timer-digits" class="timer-digits">${formatTime(segundosRestantes)}</div>
          <div style="display: flex; gap: 0.75rem; margin-top: 0.35rem;">
            <button id="btn-pausar" class="btn btn-secondary" style="padding: 0.3rem 0.85rem; font-size: 0.85rem;" type="button">
              ${activeTimer.isPaused ? '▶️ Continuar' : '⏸️ Pausa'}
            </button>
            <button id="btn-reiniciar-timer" class="btn btn-secondary" style="padding: 0.3rem 0.85rem; font-size: 0.85rem;" type="button">
              🔄 Reiniciar
            </button>
          </div>
        </div>

        <!-- Escenario de la carta física -->
        <div class="card-stage" aria-live="assertive">
          ${carta ? `
            <div class="playing-card" id="current-card">
              <div class="playing-card-category">${escapeHtml(carta.categoria || 'Personaje')}</div>
              <div class="playing-card-name">${escapeHtml(carta.nombre)}</div>
              <div class="playing-card-footer">
                <span>Ronda ${gameState.rondaActual}</span>
                <span>Restan ${cartasRestantes}</span>
              </div>
            </div>
          ` : `
            <div class="surface-card" style="text-align: center; padding: 2rem;">
              <p>No quedan cartas en esta ronda.</p>
            </div>
          `}
        </div>

        <!-- Acciones en zona del pulgar -->
        <div class="game-bottom-actions">
          <button id="btn-paso" class="btn btn-secondary btn-large" type="button" aria-label="Pasar carta">
            ↪ Paso
          </button>
          <button id="btn-acierto" class="btn btn-success btn-large" type="button" aria-label="Carta acertada (+1 punto)">
            ✓ ¡Acierto! (+1)
          </button>
        </div>
      </section>
    `;

    // Pausa / reanudar
    const btnPausar = container.querySelector('#btn-pausar');
    btnPausar?.addEventListener('click', () => {
      if (activeTimer.isPaused) {
        activeTimer.resume();
      } else {
        activeTimer.pause();
      }
      renderCurrentPhase();
    });

    // Reiniciar tiempo del turno
    const btnReiniciarTimer = container.querySelector('#btn-reiniciar-timer');
    btnReiniciarTimer?.addEventListener('click', async () => {
      const estabaCorriendo = activeTimer.isRunning;
      if (estabaCorriendo) {
        activeTimer.pause();
      }
      const confirma = await customConfirm({
        title: '¿Reiniciar temporizador?',
        message: `¿Querés reiniciar el tiempo de este turno a ${gameState.tiempoPorTurno} segundos?`,
        confirmText: 'Reiniciar',
        cancelText: 'Seguir como estaba'
      });
      if (confirma) {
        activeTimer.reset(gameState.tiempoPorTurno);
        activeTimer.start();
      } else if (estabaCorriendo) {
        activeTimer.resume();
      }
      renderCurrentPhase();
    });

    // Paso
    const btnPaso = container.querySelector('#btn-paso');
    btnPaso?.addEventListener('click', () => {
      gameState.pasarCarta();
      renderCurrentPhase();
    });

    // Acierto
    const btnAcierto = container.querySelector('#btn-acierto');
    btnAcierto?.addEventListener('click', () => {
      gameState.acertarCarta();
      if (gameState.faseTurno === 'ronda_terminada' || gameState.faseTurno === 'partida_terminada') {
        activeTimer.pause();
      }
      renderCurrentPhase();
    });
  }

  // --- Fase: Tiempo Agotado ---
  function renderTiempoAgotado() {
    container.innerHTML = `
      <section class="screen" aria-label="Tiempo agotado">
        <div class="surface-card" style="text-align: center; padding: 2rem 1.25rem; margin: auto 0;">
          <div style="font-size: 3.5rem; margin-bottom: 0.75rem;">🔔</div>
          <h2 style="font-size: 1.85rem; font-weight: var(--font-weight-black); color: var(--accent-danger); margin-bottom: 0.5rem;">
            ¡Tiempo agotado!
          </h2>
          <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            Terminó el turno de <strong>${escapeHtml(gameState.equipoActual.nombre)}</strong>.
          </p>

          <!-- Marcador actualizado -->
          <div class="scoreboard" style="margin-bottom: 1.5rem;">
            ${gameState.equipos.map((eq, i) => `
              <div class="score-box ${i === gameState.equipoTurnoIndex ? 'active' : ''}">
                <div class="score-box-name">${escapeHtml(eq.nombre)}</div>
                <div class="score-box-points">${eq.puntos} pts</div>
              </div>
            `).join('')}
          </div>

          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">
            Quedan ${gameState.cartasRondaRestantes.length} cartas por adivinar en esta ronda. Pasale el teléfono al siguiente equipo.
          </p>

          <button id="btn-siguiente-turno" class="btn btn-primary btn-large btn-block" type="button">
            Pasar al siguiente equipo →
          </button>
        </div>
      </section>
    `;

    container.querySelector('#btn-siguiente-turno')?.addEventListener('click', () => {
      gameState.siguienteTurno();
      renderCurrentPhase();
    });
  }

  // --- Fase: Fin de Ronda ---
  function renderRondaTerminada(rondaInfo) {
    const siguienteRondaNum = gameState.rondaActual + 1;
    const proxInfo = RONDAS_INFO[siguienteRondaNum] || { nombre: `Ronda ${siguienteRondaNum}`, icono: '🃏', descripcion: '' };

    container.innerHTML = `
      <section class="screen" aria-label="Ronda terminada">
        <div class="surface-card" style="text-align: center; padding: 2rem 1.25rem; margin: auto 0;">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">🎉</div>
          <h2 style="font-size: 1.75rem; font-weight: var(--font-weight-black); margin-bottom: 0.5rem;">
            ¡Se agotó el mazo!
          </h2>
          <p style="font-size: 1rem; color: var(--accent-secondary); font-weight: bold; margin-bottom: 1.25rem;">
            Fin de la Ronda ${gameState.rondaActual} (${rondaInfo.nombre})
          </p>

          <div class="scoreboard" style="margin-bottom: 1.5rem;">
            ${gameState.equipos.map((eq) => `
              <div class="score-box">
                <div class="score-box-name">${escapeHtml(eq.nombre)}</div>
                <div class="score-box-points">${eq.puntos} pts</div>
              </div>
            `).join('')}
          </div>

          <div class="surface-card" style="background: var(--bg-surface-elevated); text-align: left; margin-bottom: 1.5rem;">
            <p style="font-size: 0.85rem; color: var(--accent-secondary); font-weight: bold; text-transform: uppercase;">
              Próxima: Ronda ${siguienteRondaNum} — ${proxInfo.nombre} ${proxInfo.icono}
            </p>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.35rem;">
              ${proxInfo.descripcion}
            </p>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">
              Se volverán a barajar las mismas ${gameState.cartasPartida.length} cartas.
            </p>
          </div>

          <button id="btn-siguiente-ronda" class="btn btn-primary btn-large btn-block" type="button">
            Comenzar Ronda ${siguienteRondaNum} →
          </button>
        </div>
      </section>
    `;

    container.querySelector('#btn-siguiente-ronda')?.addEventListener('click', () => {
      gameState.pasarSiguienteRonda();
      renderCurrentPhase();
    });
  }

  // --- Fase: Partida Terminada (Podio) ---
  function renderPartidaTerminada() {
    // Ordenar equipos por puntos
    const ranking = [...gameState.equipos].sort((a, b) => b.puntos - a.puntos);
    const ganador = ranking[0];
    const esEmpate = ranking.length > 1 && ranking[0].puntos === ranking[1].puntos;

    container.innerHTML = `
      <section class="screen" aria-label="Fin de la partida">
        <div class="surface-card" style="text-align: center; padding: 2.25rem 1.25rem; margin: auto 0;">
          <div style="font-size: 4rem; margin-bottom: 0.5rem;">🏆</div>
          <h2 style="font-size: 2rem; font-weight: var(--font-weight-black); margin-bottom: 0.25rem;">
            ${esEmpate ? '¡Empate épico!' : `¡Ganó ${escapeHtml(ganador.nombre)}!`}
          </h2>
          <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1.75rem;">
            Se completaron las ${TOTAL_RONDAS} rondas de la partida.
          </p>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem;">
            ${ranking.map((eq, index) => `
              <div class="team-item" style="${index === 0 ? 'border-color: var(--accent-secondary); background: rgba(251, 176, 52, 0.12);' : ''}">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span style="font-size: 1.25rem;">${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                  <span style="font-weight: var(--font-weight-bold); font-size: 1.1rem;">${escapeHtml(eq.nombre)}</span>
                </div>
                <span style="font-size: 1.2rem; font-weight: var(--font-weight-black); color: var(--text-primary);">
                  ${eq.puntos} pts
                </span>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            <button id="btn-volver-a-jugar" class="btn btn-primary btn-large btn-block" type="button">
              🔄 Revancha (Mismos equipos)
            </button>
            <button id="btn-ir-inicio" class="btn btn-secondary btn-block" type="button">
              🏠 Menú principal
            </button>
          </div>
        </div>
      </section>
    `;

    container.querySelector('#btn-volver-a-jugar')?.addEventListener('click', () => {
      router.navigate('configuracion');
    });

    container.querySelector('#btn-ir-inicio')?.addEventListener('click', () => {
      gameState.terminarPartida();
      router.navigate('inicio');
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  renderCurrentPhase();
}
