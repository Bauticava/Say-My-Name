/**
 * Pantalla de Partida (#partida)
 * Mazo de cartas, temporizador, rondas configurables, ronda relámpago, deshacer y marcador.
 */

import { gameState, RONDAS_CONFIG } from '../game.js';
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

  const duracionRonda = gameState.esRondaRelampago
    ? (gameState.rondaActualConfig.duracionSegundos || 15)
    : gameState.tiempoPorTurno;

  let segundosRestantes = duracionRonda;

  activeTimer = new GameTimer({
    durationSeconds: duracionRonda,
    onTick: (secs) => {
      segundosRestantes = secs;
      const digitsEl = container.querySelector('#timer-digits');
      if (digitsEl) {
        digitsEl.textContent = formatTime(secs);
        if (secs <= 5) {
          digitsEl.classList.add('timer-urgent');
          document.body.classList.add('body-timer-urgent');
        } else {
          digitsEl.classList.remove('timer-urgent');
          document.body.classList.remove('body-timer-urgent');
        }
      }
    },
    onEnd: () => {
      document.body.classList.remove('body-timer-urgent');
      mostrarAnimacionTiempo(() => {
        gameState.tiempoAgotado();
        renderCurrentPhase();
      });
    }
  });

  function mostrarAnimacionTiempo(callback) {
    document.body.classList.remove('body-timer-urgent');

    const overlay = document.createElement('div');
    overlay.className = 'time-up-overlay';
    overlay.id = 'time-up-overlay';
    overlay.innerHTML = `
      <div class="time-up-content">
        <span class="time-up-badge">Fin del turno</span>
        <h1 class="time-up-title">¡TIEMPO!</h1>
        <p class="time-up-sub">Se acabó el tiempo</p>
      </div>
    `;

    let cerrado = false;
    const cerrar = () => {
      if (cerrado) return;
      cerrado = true;
      overlay.classList.add('time-up-closing');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        callback();
      }, 200);
    };

    overlay.addEventListener('click', cerrar);
    document.body.appendChild(overlay);

    setTimeout(cerrar, 1400);
  }

  function initSwipeGesture(cardEl, { onAcierto, onPaso, puedePasar }) {
    if (!cardEl) return;

    let startX = 0;
    let startY = 0;
    let isDragging = false;

    const startDrag = (x, y) => {
      startX = x;
      startY = y;
      isDragging = true;
      cardEl.style.transition = 'none';
    };

    const moveDrag = (x, y) => {
      if (!isDragging) return;
      let dx = x - startX;
      let dy = y - startY;

      // Resistencia elástica si se arrastra hacia la izquierda o hacia arriba
      if (dx < 0) dx = dx * 0.15;
      if (dy < 0) dy = dy * 0.15;
      if (!puedePasar && dy > 0) dy = dy * 0.1;

      const rot = (dx * 0.05).toFixed(2);
      cardEl.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`;
    };

    const endDrag = (x, y) => {
      if (!isDragging) return;
      isDragging = false;

      let dx = x - startX;
      let dy = y - startY;
      const threshold = 80;

      if (dx >= threshold && dx > dy) {
        // Swipe a la derecha -> ¡Acierto!
        cardEl.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
        cardEl.style.transform = 'translate3d(130%, -20px, 0) rotate(16deg)';
        cardEl.style.opacity = '0';
        onAcierto();
      } else if (dy >= threshold && dy > dx && puedePasar) {
        // Swipe hacia abajo -> Paso
        cardEl.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
        cardEl.style.transform = 'translate3d(0, 120px, 0) scale(0.85)';
        cardEl.style.opacity = '0';
        onPaso();
      } else {
        // Retorno elástico
        cardEl.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)';
        cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
      }
    };

    // Eventos táctiles
    cardEl.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY);
    }, { passive: true });

    cardEl.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
    }, { passive: true });

    cardEl.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      endDrag(t.clientX, t.clientY);
    });

    cardEl.addEventListener('touchcancel', (e) => {
      const t = e.changedTouches[0];
      endDrag(t.clientX, t.clientY);
    });

    // Eventos de ratón (desktop)
    cardEl.addEventListener('mousedown', (e) => {
      startDrag(e.clientX, e.clientY);
      const onMouseMove = (ev) => moveDrag(ev.clientX, ev.clientY);
      const onMouseUp = (ev) => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        endDrag(ev.clientX, ev.clientY);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins > 0 ? mins + ':' : ''}${secs < 10 && mins > 0 ? '0' : ''}${secs}s`;
  }

  function renderCurrentPhase() {
    document.body.classList.remove('body-timer-urgent');
    container.innerHTML = '';
    const config = gameState.rondaActualConfig;

    if (gameState.faseTurno === 'partida_terminada') {
      renderPartidaTerminada();
      return;
    }

    if (gameState.faseTurno === 'ronda_terminada') {
      renderRondaTerminada(config);
      return;
    }

    if (gameState.faseTurno === 'mazo_completado') {
      renderMazoCompletado(config);
      return;
    }

    if (gameState.faseTurno === 'turno_terminado_error') {
      renderTurnoTerminadoError();
      return;
    }

    if (gameState.faseTurno === 'turno_terminado_pase') {
      renderTurnoTerminadoPase();
      return;
    }

    if (gameState.faseTurno === 'tiempo_agotado') {
      renderTiempoAgotado();
      return;
    }

    if (gameState.faseTurno === 'relampago_evaluando') {
      renderRelampagoEvaluando();
      return;
    }

    if (gameState.faseTurno === 'listo') {
      renderTurnoListo(config);
      return;
    }

    if (gameState.faseTurno === 'jugando') {
      if (gameState.esRondaRelampago) {
        renderRelampagoJugando(config);
      } else {
        renderJugando(config);
      }
      return;
    }
  }

  // --- Fase: Listo para empezar turno ---
  function renderTurnoListo(config) {
    const esRelampago = gameState.esRondaRelampago;
    const duracion = esRelampago ? (config.duracionSegundos || 15) : gameState.tiempoPorTurno;
    const turnoRel = esRelampago ? gameState.relampagoTurnos[gameState.relampagoTurnoIndex] : null;

    container.innerHTML = `
      <section class="screen" aria-label="Turno listo">
        <header class="game-top-bar">
          <div class="round-pill">
            <span>${config.icono}</span>
            <span>${escapeHtml(config.nombre)}</span>
          </div>
          <button id="btn-abandonar" class="icon-btn" type="button" aria-label="Abandonar partida" title="Abandonar partida">
            ✕
          </button>
        </header>

        <!-- Marcador actual -->
        <div class="scoreboard">
          ${gameState.equipos.map((eq, i) => {
            const esActivo = i === (esRelampago ? (turnoRel ? turnoRel.equipoIndex : 0) : gameState.equipoTurnoIndex);
            const eqColor = eq.color || '#f59e0b';
            return `
              <div 
                class="score-box ${esActivo ? 'active' : ''}" 
                style="${esActivo ? `border-color: ${eqColor}; box-shadow: 0 0 12px ${eqColor}44;` : ''}"
              >
                <div class="score-box-name" style="display: flex; align-items: center; justify-content: center; gap: 0.35rem;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${eqColor}; flex-shrink: 0;"></span>
                  <span>${escapeHtml(eq.nombre)}</span>
                </div>
                <div class="score-box-points" style="${esActivo ? `color: ${eqColor};` : ''}">${eq.puntos} pts</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="surface-card" style="margin-top: 1rem; text-align: center; padding: 2rem 1.25rem;">
          <p style="font-size: 0.9rem; color: var(--accent-secondary); font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.35rem;">
            ${escapeHtml(config.nombre)}
          </p>
          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            ${escapeHtml(config.reglaResumen)}
          </p>

          <hr style="border: none; border-top: 1px solid var(--bg-surface-border); margin: 1.25rem 0;" />

          <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
            ${esRelampago ? 'Lee un integrante de:' : 'Turno de:'}
          </p>
          <h2 style="font-size: 2.2rem; font-weight: var(--font-weight-black); color: var(--accent-secondary); margin-bottom: 0.5rem;">
            ${escapeHtml(gameState.equipoActual.nombre)}
          </h2>

          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 1.75rem;">
            ${esRelampago
              ? `Carta ${turnoRel.pasada} de 2 para este equipo (¡Lee en voz alta!).`
              : 'Pasale el teléfono a quien vaya a dar pistas en este turno.'}
          </p>

          <button id="btn-iniciar-turno" class="btn btn-primary btn-large btn-block" type="button" style="font-size: 1.25rem;">
            ¡Arrancar! (${duracion}s)
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
      activeTimer.reset(duracion);
      activeTimer.start();
      renderCurrentPhase();
    });
  }

  // --- Fase: Jugando Rondas 1, 2 y 3 ---
  function renderJugando(config) {
    const carta = gameState.cartaActual;
    const cartasRestantes = gameState.cartasRondaRestantes.length;
    const elemento = carta ? (carta.elementoAsignado || carta.elementos[0]) : null;
    const colorElem = elemento ? elemento.color : 'rojo';
    const puedePasar = Boolean(config.permitePaso);
    const hayAciertoParaDeshacer = Boolean(gameState.ultimoAcierto);

    container.innerHTML = `
      <section class="screen" aria-label="Partida en curso">
        <header class="game-top-bar">
          <div class="round-pill">
            <span>${config.icono} ${escapeHtml(config.nombre)}</span>
          </div>
          <span class="turn-pill" style="border-left: 3px solid ${gameState.equipoActual.color || 'var(--accent-secondary)'}; padding-left: 0.5rem;">
            Turno: <strong style="color: ${gameState.equipoActual.color || 'var(--accent-secondary)'};">${escapeHtml(gameState.equipoActual.nombre)}</strong>
          </span>
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
          ${carta && elemento ? `
            <div class="playing-card card-theme-${colorElem}" id="current-card">
              <div class="playing-card-header">
                <span class="playing-card-category elem-${colorElem}">
                  ${escapeHtml(elemento.categoria || 'Elemento')}
                </span>
                <span class="playing-card-dificultad" title="Dificultad ${carta.dificultad || 1}">
                  ${carta.dificultad || 1}
                </span>
              </div>

              <div class="playing-card-name">
                ${escapeHtml(elemento.texto)}
              </div>

              <div class="forbidden-box">
                <span class="forbidden-label">⚠️ Palabra Prohibida</span>
                <span class="forbidden-word">${escapeHtml(carta.palabraClave)}</span>
              </div>

              <div class="playing-card-footer">
                <span>Ronda ${config.numero}</span>
                <span>Restan ${cartasRestantes} en mazo</span>
              </div>
            </div>
          ` : `
            <div class="surface-card" style="text-align: center; padding: 2rem;">
              <p>No quedan cartas en esta ronda.</p>
            </div>
          `}
        </div>

        <!-- Botonera de acciones (Alcance del pulgar) -->
        <div class="game-bottom-actions-container">
          <div class="game-top-actions-row">
            ${hayAciertoParaDeshacer ? `
              <button id="btn-deshacer" class="btn btn-secondary" style="flex: 1; padding: 0.5rem; font-size: 0.9rem;" type="button">
                ↩ Deshacer acierto
              </button>
            ` : ''}
            <button id="btn-error" class="btn btn-danger" style="${hayAciertoParaDeshacer ? 'flex: 1;' : 'width: 100%;'} padding: 0.5rem; font-size: 0.9rem;" type="button">
              🚫 Terminar turno por error
            </button>
          </div>

          <div class="${puedePasar ? 'game-primary-actions-row' : 'game-primary-actions-single'}">
            ${puedePasar ? `
              <button id="btn-paso" class="btn btn-secondary btn-large" type="button" aria-label="Pasar carta">
                ↪ Paso
              </button>
            ` : ''}
            <button id="btn-acierto" class="btn btn-success btn-large" type="button" aria-label="Carta acertada (+1 punto)">
              ✓ ¡Acierto! (+1)
            </button>
          </div>
        </div>
      </section>
    `;

    // Pausa / reanudar
    container.querySelector('#btn-pausar')?.addEventListener('click', () => {
      if (activeTimer.isPaused) {
        activeTimer.resume();
      } else {
        activeTimer.pause();
      }
      renderCurrentPhase();
    });

    // Reiniciar tiempo del turno
    container.querySelector('#btn-reiniciar-timer')?.addEventListener('click', async () => {
      const estabaCorriendo = activeTimer.isRunning;
      if (estabaCorriendo) activeTimer.pause();
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

    // Deshacer
    container.querySelector('#btn-deshacer')?.addEventListener('click', () => {
      gameState.deshacerUltimoAcierto();
      renderCurrentPhase();
    });

    // Terminar turno por error (palabra prohibida dicha)
    container.querySelector('#btn-error')?.addEventListener('click', async () => {
      const estabaCorriendo = activeTimer.isRunning;
      if (estabaCorriendo) activeTimer.pause();
      const confirma = await customConfirm({
        title: '¿Terminar turno por error?',
        message: 'Si se dijo la palabra prohibida o se cometió una falta, la carta vuelve al fondo del mazo y el turno termina.',
        confirmText: 'Sí, cometer falta',
        cancelText: 'Continuar turno',
        danger: true
      });
      if (confirma) {
        activeTimer.destroy();
        gameState.terminarTurnoPorError();
        renderCurrentPhase();
      } else if (estabaCorriendo) {
        activeTimer.resume();
      }
    });

    // Paso
    container.querySelector('#btn-paso')?.addEventListener('click', () => {
      activeTimer.playPassSound();
      const cardEl = container.querySelector('#current-card');
      if (cardEl) {
        cardEl.classList.add('card-exit-paso');
        setTimeout(() => {
          gameState.pasarCarta();
          if (gameState.faseTurno === 'turno_terminado_pase') {
            activeTimer.pause();
          }
          renderCurrentPhase();
        }, 190);
      } else {
        gameState.pasarCarta();
        if (gameState.faseTurno === 'turno_terminado_pase') {
          activeTimer.pause();
        }
        renderCurrentPhase();
      }
    });

    // Acierto
    container.querySelector('#btn-acierto')?.addEventListener('click', () => {
      activeTimer.playSuccessSound();
      const cardEl = container.querySelector('#current-card');
      if (cardEl) {
        cardEl.classList.add('card-exit-acierto');
        setTimeout(() => {
          gameState.acertarCarta();
          if (
            gameState.faseTurno === 'mazo_completado' ||
            gameState.faseTurno === 'ronda_terminada' ||
            gameState.faseTurno === 'turno_terminado_pase'
          ) {
            activeTimer.pause();
          }
          renderCurrentPhase();
        }, 190);
      } else {
        gameState.acertarCarta();
        if (
          gameState.faseTurno === 'mazo_completado' ||
          gameState.faseTurno === 'ronda_terminada' ||
          gameState.faseTurno === 'turno_terminado_pase'
        ) {
          activeTimer.pause();
        }
        renderCurrentPhase();
      }
    });

    // Gesto de arrastre táctil (Swipe)
    const cardEl = container.querySelector('#current-card');
    if (cardEl) {
      initSwipeGesture(cardEl, {
        puedePasar,
        onAcierto: () => {
          activeTimer.playSuccessSound();
          setTimeout(() => {
            gameState.acertarCarta();
            if (
              gameState.faseTurno === 'mazo_completado' ||
              gameState.faseTurno === 'ronda_terminada' ||
              gameState.faseTurno === 'turno_terminado_pase'
            ) {
              activeTimer.pause();
            }
            renderCurrentPhase();
          }, 180);
        },
        onPaso: () => {
          activeTimer.playPassSound();
          setTimeout(() => {
            gameState.pasarCarta();
            if (gameState.faseTurno === 'turno_terminado_pase') {
              activeTimer.pause();
            }
            renderCurrentPhase();
          }, 180);
        }
      });
    }
  }

  // --- Fase: Jugando Ronda Relámpago ---
  function renderRelampagoJugando(config) {
    const carta = gameState.cartaActual;
    const turnoRel = gameState.relampagoTurnos[gameState.relampagoTurnoIndex];

    container.innerHTML = `
      <section class="screen" aria-label="Ronda relámpago">
        <header class="game-top-bar">
          <div class="round-pill">
            <span>⚡ Ronda Relámpago</span>
          </div>
          <span class="turn-pill">Lee: ${escapeHtml(gameState.equipoActual.nombre)} (${turnoRel.pasada}/2)</span>
        </header>

        <!-- Temporizador 15s -->
        <div class="timer-container" aria-live="polite">
          <div id="timer-digits" class="timer-digits">${formatTime(segundosRestantes)}</div>
          <p style="font-size: 0.85rem; color: var(--accent-secondary); font-weight: bold; margin-top: 0.25rem;">
            ¡Todos intentan adivinar la palabra clave!
          </p>
        </div>

        <!-- Carta con los 3 elementos -->
        <div class="card-stage" aria-live="assertive">
          ${carta ? `
            <div class="playing-card" id="current-card">
              <div class="playing-card-header">
                <span style="font-size: 0.85rem; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">
                  3 Pistas
                </span>
                <span class="playing-card-dificultad" title="Dificultad ${carta.dificultad || 1}">
                  ${carta.dificultad || 1}
                </span>
              </div>

              <div class="relampago-stack">
                ${carta.elementos.map((elem) => `
                  <div class="relampago-row elem-${elem.color}">
                    <span class="relampago-row-categoria">${escapeHtml(elem.categoria)} (${elem.color})</span>
                    <span class="relampago-row-texto">${escapeHtml(elem.texto)}</span>
                  </div>
                `).join('')}
              </div>

              <!-- Palabra clave visible para quien lee la carta -->
              <div class="forbidden-box" style="background: #eef2ff; border-color: #6366f1;">
                <span class="forbidden-label" style="color: #4f46e5;">Palabra Clave (Para quien lee)</span>
                <span class="forbidden-word" style="color: #1e1b4b; font-size: 1.35rem;">
                  ${escapeHtml(carta.palabraClave)}
                </span>
              </div>

              <div class="playing-card-footer">
                <span>Relámpago</span>
                <span>Carta ${gameState.relampagoTurnoIndex + 1} de ${gameState.relampagoTurnos.length}</span>
              </div>
            </div>
          ` : ''}
        </div>
      </section>
    `;
  }

  // --- Fase: Evaluación Ronda Relámpago (Quién adivinó) ---
  function renderRelampagoEvaluando() {
    const carta = gameState.cartaActual;
    const turnoRel = gameState.relampagoTurnos[gameState.relampagoTurnoIndex];

    container.innerHTML = `
      <section class="screen" aria-label="Resultado de carta relámpago">
        <div class="surface-card" style="text-align: center; padding: 1.75rem 1.25rem; margin: auto 0;">
          <div style="font-size: 3rem; margin-bottom: 0.35rem;">⚡</div>
          <h2 style="font-size: 1.6rem; font-weight: var(--font-weight-black); margin-bottom: 0.25rem;">
            ¡Tiempo finalizado!
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            La palabra clave de esta carta era:
          </p>

          <!-- Palabra Clave Revelada -->
          <div style="background: #eef2ff; border: 2px solid #6366f1; border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem;">
            <span style="font-size: 0.75rem; font-weight: bold; text-transform: uppercase; color: #4f46e5; display: block; margin-bottom: 0.25rem;">
              Palabra Clave
            </span>
            <span style="font-size: 2rem; font-weight: var(--font-weight-black); color: #1e1b4b;">
              ${escapeHtml(carta ? carta.palabraClave : '')}
            </span>
          </div>

          <h3 style="font-size: 1.15rem; font-weight: bold; margin-bottom: 1rem; color: var(--text-primary);">
            ¿Qué equipo la adivinó? (+3 pts)
          </h3>

          <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 1.5rem;">
            ${gameState.equipos.map((eq) => `
              <button 
                class="btn btn-secondary btn-asignar-relampago btn-large" 
                data-id="${eq.id}" 
                type="button"
                style="justify-content: space-between;"
              >
                <span>${escapeHtml(eq.nombre)} ${eq.id === gameState.equipoActual.id ? '(Leyó)' : ''}</span>
                <span style="color: var(--accent-secondary); font-weight: bold;">+3 pts</span>
              </button>
            `).join('')}

            <button 
              id="btn-relampago-nadie" 
              class="btn btn-secondary" 
              type="button" 
              style="margin-top: 0.35rem; color: var(--text-muted);"
            >
              Nadie la adivinó (0 pts)
            </button>
          </div>
        </div>
      </section>
    `;

    const botonesAsignar = container.querySelectorAll('.btn-asignar-relampago');
    botonesAsignar.forEach((btn) => {
      btn.addEventListener('click', () => {
        const eqId = btn.getAttribute('data-id');
        gameState.resolverCartaRelampago(eqId);
        renderCurrentPhase();
      });
    });

    container.querySelector('#btn-relampago-nadie')?.addEventListener('click', () => {
      gameState.resolverCartaRelampago(null);
      renderCurrentPhase();
    });
  }

  // --- Fase: Mazo Completado (Fin de turno por mazo agotado) ---
  function renderMazoCompletado(config) {
    container.innerHTML = `
      <section class="screen" aria-label="Mazo completado">
        <div class="surface-card" style="text-align: center; padding: 2rem 1.25rem; margin: auto 0;">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">🎉</div>
          <h2 style="font-size: 1.85rem; font-weight: var(--font-weight-black); margin-bottom: 0.5rem;">
            ¡Completaron el mazo!
          </h2>
          <p style="font-size: 1rem; color: var(--accent-secondary); font-weight: bold; margin-bottom: 1.25rem;">
            ${escapeHtml(gameState.equipoActual.nombre)} adivinó la última carta restante.
          </p>

          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            El turno finaliza inmediatamente al completarse el mazo de esta ronda.
          </p>

          <!-- Marcador actual -->
          <div class="scoreboard" style="margin-bottom: 1.5rem;">
            ${gameState.equipos.map((eq) => `
              <div class="score-box">
                <div class="score-box-name">${escapeHtml(eq.nombre)}</div>
                <div class="score-box-points">${eq.puntos} pts</div>
              </div>
            `).join('')}
          </div>

          <button id="btn-concluir-ronda" class="btn btn-primary btn-large btn-block" type="button">
            Concluir Ronda y continuar →
          </button>
        </div>
      </section>
    `;

    container.querySelector('#btn-concluir-ronda')?.addEventListener('click', () => {
      gameState.pasarSiguienteRonda();
      renderCurrentPhase();
    });
  }

  // --- Fase: Turno Terminado por Error ---
  function renderTurnoTerminadoError() {
    container.innerHTML = `
      <section class="screen" aria-label="Turno terminado por error">
        <div class="surface-card" style="text-align: center; padding: 2rem 1.25rem; margin: auto 0;">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">🚫</div>
          <h2 style="font-size: 1.8rem; font-weight: var(--font-weight-black); color: var(--accent-danger); margin-bottom: 0.5rem;">
            Turno terminado por falta
          </h2>
          <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            Se dijo la palabra prohibida o se cometió una falta. La carta volvió al fondo del mazo.
          </p>

          <!-- Marcador -->
          <div class="scoreboard" style="margin-bottom: 1.5rem;">
            ${gameState.equipos.map((eq, i) => `
              <div class="score-box ${i === gameState.equipoTurnoIndex ? 'active' : ''}">
                <div class="score-box-name">${escapeHtml(eq.nombre)}</div>
                <div class="score-box-points">${eq.puntos} pts</div>
              </div>
            `).join('')}
          </div>

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

  // --- Fase: Turno Terminado por Recorrer el Mazo (Pase de cartas) ---
  function renderTurnoTerminadoPase() {
    container.innerHTML = `
      <section class="screen" aria-label="Turno terminado">
        <div class="surface-card" style="text-align: center; padding: 2rem 1.25rem; margin: auto 0;">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">↪️</div>
          <h2 style="font-size: 1.8rem; font-weight: var(--font-weight-black); margin-bottom: 0.5rem;">
            Fin del turno
          </h2>
          <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            Se recorrieron todas las cartas disponibles en este turno. Las cartas que saltearon vuelven al mazo para el siguiente equipo.
          </p>

          <!-- Marcador -->
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

  // --- Fase: Tiempo Agotado ---
  function renderTiempoAgotado() {
    container.innerHTML = `
      <section class="screen" aria-label="Tiempo agotado">
        <div class="surface-card" style="text-align: center; padding: 2rem 1.25rem; margin: auto 0;">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">🔔</div>
          <h2 style="font-size: 1.85rem; font-weight: var(--font-weight-black); color: var(--accent-danger); margin-bottom: 0.5rem;">
            ¡Tiempo agotado!
          </h2>
          <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            Terminó el turno de <strong>${escapeHtml(gameState.equipoActual.nombre)}</strong>.
          </p>

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
  function renderRondaTerminada(config) {
    const siguienteRondaIdx = gameState.rondaIndex + 1;
    const proxConfig = RONDAS_CONFIG[siguienteRondaIdx];

    container.innerHTML = `
      <section class="screen" aria-label="Ronda terminada">
        <div class="surface-card" style="text-align: center; padding: 2rem 1.25rem; margin: auto 0;">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">🏁</div>
          <h2 style="font-size: 1.85rem; font-weight: var(--font-weight-black); margin-bottom: 0.5rem;">
            ¡Fin de la ${escapeHtml(config.nombre)}!
          </h2>

          <div class="scoreboard" style="margin-bottom: 1.5rem;">
            ${gameState.equipos.map((eq) => `
              <div class="score-box">
                <div class="score-box-name">${escapeHtml(eq.nombre)}</div>
                <div class="score-box-points">${eq.puntos} pts</div>
              </div>
            `).join('')}
          </div>

          ${proxConfig ? `
            <div class="surface-card" style="background: var(--bg-surface-elevated); text-align: left; margin-bottom: 1.5rem;">
              <p style="font-size: 0.85rem; color: var(--accent-secondary); font-weight: bold; text-transform: uppercase;">
                Próxima: ${escapeHtml(proxConfig.nombre)} ${proxConfig.icono}
              </p>
              <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.35rem;">
                ${escapeHtml(proxConfig.reglaResumen)}
              </p>
            </div>

            <button id="btn-siguiente-ronda" class="btn btn-primary btn-large btn-block" type="button">
              Comenzar ${escapeHtml(proxConfig.nombre)} →
            </button>
          ` : `
            <button id="btn-siguiente-ronda" class="btn btn-primary btn-large btn-block" type="button">
              Ver Resultados Finales 🏆
            </button>
          `}
        </div>
      </section>
    `;

    container.querySelector('#btn-siguiente-ronda')?.addEventListener('click', () => {
      gameState.pasarSiguienteRonda();
      renderCurrentPhase();
    });
  }

  // --- Fase: Partida Terminada (Podio Ascendente y Marcador Final) ---
  function renderPartidaTerminada() {
    document.body.classList.remove('body-timer-urgent');
    const ranking = [...gameState.equipos].sort((a, b) => b.puntos - a.puntos);
    const ganador = ranking[0];
    const esEmpate = ranking.length > 1 && ranking[0].puntos === ranking[1].puntos;

    container.innerHTML = `
      <section class="screen" aria-label="Fin de la partida">
        <div class="surface-card" style="text-align: center; padding: 2.25rem 1.25rem; margin: auto 0; position: relative;">
          <div style="font-size: 3.8rem; margin-bottom: 0.35rem;" id="podium-trophy">🏆</div>
          <h2 id="podium-title" style="font-size: 2rem; font-weight: var(--font-weight-black); margin-bottom: 0.25rem;">
            ${esEmpate ? '¡Empate épico!' : `¡Ganó ${escapeHtml(ganador.nombre)}!`}
          </h2>
          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.75rem;">
            Se completaron todas las rondas de la partida.
          </p>

          <div id="podium-list" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
            ${ranking.map((eq, index) => {
              const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
              const eqColor = eq.color || '#f59e0b';
              return `
                <div 
                  class="team-item podium-item" 
                  data-index="${index}" 
                  style="${index === 0 ? 'border-color: var(--accent-secondary);' : ''} border-left: 4px solid ${eqColor};"
                >
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-size: 1.3rem;">${medalla}</span>
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${eqColor}; flex-shrink: 0;"></span>
                    <span style="font-weight: var(--font-weight-bold); font-size: 1.1rem;">${escapeHtml(eq.nombre)}</span>
                  </div>
                  <span style="font-size: 1.2rem; font-weight: var(--font-weight-black); color: var(--text-primary);">
                    ${eq.puntos} pts
                  </span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Botón y contenedor de desglose por rondas -->
          <button id="btn-toggle-desglose" class="btn btn-secondary btn-block" type="button" style="margin-bottom: 1.25rem;">
            📊 Ver detalle por rondas
          </button>

          <div id="desglose-rondas-container" style="display: none; margin-bottom: 1.5rem; text-align: left;">
            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--bg-surface-border); border-radius: var(--radius-md); padding: 0.85rem; overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--bg-surface-border); color: var(--text-secondary);">
                    <th style="padding: 0.4rem 0.2rem; text-align: left;">Ronda</th>
                    ${gameState.equipos.map((eq) => `
                      <th style="padding: 0.4rem 0.2rem; text-align: right; color: ${eq.color || '#fff'};">
                        ${escapeHtml(eq.nombre)}
                      </th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${RONDAS_CONFIG.map((r) => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                      <td style="padding: 0.5rem 0.2rem; color: var(--text-secondary);">
                        ${r.icono} ${escapeHtml(r.nombre.split(':')[0])}
                      </td>
                      ${gameState.equipos.map((eq) => `
                        <td style="padding: 0.5rem 0.2rem; text-align: right; font-weight: bold; color: var(--text-primary);">
                          +${(gameState.puntosPorRonda && gameState.puntosPorRonda[r.id] && gameState.puntosPorRonda[r.id][eq.id]) || 0}
                        </td>
                      `).join('')}
                    </tr>
                  `).join('')}
                  <tr style="font-weight: bold; border-top: 2px solid var(--bg-surface-border);">
                    <td style="padding: 0.6rem 0.2rem; color: var(--accent-secondary);">TOTAL</td>
                    ${gameState.equipos.map((eq) => `
                      <td style="padding: 0.6rem 0.2rem; text-align: right; font-size: 1rem; color: ${eq.color || 'var(--accent-secondary)'};">
                        ${eq.puntos} pts
                      </td>
                    `).join('')}
                  </tr>
                </tbody>
              </table>
            </div>
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

    // Animación ascendente: revelar desde el último puesto hasta el 1.º
    const items = Array.from(container.querySelectorAll('.podium-item'));
    const total = items.length;
    let timeouts = [];

    // Revelar de abajo hacia arriba (ascendente)
    items.forEach((item, idxFromTop) => {
      // Posición desde el fondo: último puesto primero, ganador al final
      const idxFromBottom = total - 1 - idxFromTop;
      const delay = 350 + idxFromBottom * 750;

      const t = setTimeout(() => {
        item.classList.add('podium-reveal');
        if (idxFromTop === 0) {
          // Ganador: glow dorado, fanfarria y confeti
          item.classList.add('podium-winner-glow');
          activeTimer.playFanfareSound();
          dispararConfeti();
        } else {
          activeTimer.triggerHaptic([35]);
        }
      }, delay);
      timeouts.push(t);
    });

    // Tap en la tarjeta revela todo de golpe si no quieren esperar
    container.querySelector('.surface-card')?.addEventListener('click', () => {
      timeouts.forEach(clearTimeout);
      items.forEach((item, idx) => {
        item.classList.add('podium-reveal');
        if (idx === 0) item.classList.add('podium-winner-glow');
      });
      dispararConfeti();
    }, { once: true });

    // Toggle desglose de puntos por ronda
    const btnToggleDesglose = container.querySelector('#btn-toggle-desglose');
    const desgloseEl = container.querySelector('#desglose-rondas-container');
    if (btnToggleDesglose && desgloseEl) {
      btnToggleDesglose.addEventListener('click', (e) => {
        e.stopPropagation();
        const estaOculto = desgloseEl.style.display === 'none';
        desgloseEl.style.display = estaOculto ? 'block' : 'none';
        btnToggleDesglose.textContent = estaOculto ? '🔼 Ocultar detalle' : '📊 Ver detalle por rondas';
      });
    }

    container.querySelector('#btn-volver-a-jugar')?.addEventListener('click', () => {
      router.navigate('configuracion');
    });

    container.querySelector('#btn-ir-inicio')?.addEventListener('click', () => {
      gameState.terminarPartida();
      router.navigate('inicio');
    });
  }

  function dispararConfeti() {
    if (document.getElementById('confetti-canvas')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    const colors = ['#fbb034', '#ff5e36', '#10b981', '#6366f1', '#ec4899', '#ffffff'];
    const particles = Array.from({ length: 90 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * -height * 0.4,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3.5 + 2,
      angle: Math.random() * 360,
      vAngle: (Math.random() - 0.5) * 6
    }));

    let animId;
    const loop = () => {
      ctx.clearRect(0, 0, width, height);
      let alive = false;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.vAngle;

        if (p.y < height + 20) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.angle * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      if (alive) {
        animId = requestAnimationFrame(loop);
      } else {
        cleanup();
      }
    };

    const cleanup = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };

    animId = requestAnimationFrame(loop);
    setTimeout(cleanup, 4500);
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  renderCurrentPhase();
}
