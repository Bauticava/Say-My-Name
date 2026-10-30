/**
 * Pantalla de Partida (#partida)
 * Mazo de cartas, temporizador, rondas configurables, ronda relámpago, deshacer y marcador.
 */

import { gameState, RONDAS_CONFIG, RONDA_DESEMPATE_CONFIG } from '../game.js';
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

      // Resistencia elástica si se arrastra hacia la izquierda o hacia abajo
      if (dx < 0) dx = dx * 0.15;
      if (dy > 0) dy = dy * 0.15;
      if (!puedePasar && dy < 0) dy = dy * 0.1;

      const rot = (dx * 0.05).toFixed(2);
      cardEl.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`;
    };

    const endDrag = (x, y) => {
      if (!isDragging) return;
      isDragging = false;

      let dx = x - startX;
      let dy = y - startY;
      const threshold = 80;

      if (dx >= threshold && dx > Math.abs(dy)) {
        // Swipe a la derecha -> ¡Acierto!
        cardEl.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
        cardEl.style.transform = 'translate3d(130%, -20px, 0) rotate(16deg)';
        cardEl.style.opacity = '0';
        onAcierto();
      } else if (dy <= -threshold && Math.abs(dy) > Math.abs(dx) && puedePasar) {
        // Swipe hacia arriba -> Paso
        cardEl.style.transition = 'transform 0.22s ease-out, opacity 0.22s ease-out';
        cardEl.style.transform = 'translate3d(0, -120px, 0) scale(0.85)';
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
      if (e.cancelable) e.preventDefault();
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
    }, { passive: false });

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
    if (mins > 0) {
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${secs}`;
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
              ? (gameState.enDesempate
                  ? `Carta única de desempate para este equipo (${gameState.relampagoTurnoIndex + 1} de ${gameState.relampagoTurnos.length} en total — ¡Lee en voz alta!).`
                  : `Carta ${turnoRel.pasada} de 2 para este equipo (¡Lee en voz alta!).`)
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
    const puedeDeshacer = Boolean(gameState.ultimaAccion);

    // SVGs limpios sin emojis
    const svgPause = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    const svgPlay = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    const svgRestart = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
    const svgUndo = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>`;
    const svgCheck = `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
    const svgCross = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

    container.innerHTML = `
      <section class="screen" aria-label="Partida en curso" style="padding-top: 0.5rem;">
        <!-- Header minimalista: Ronda y Equipo -->
        <div class="game-turn-header">
          ${escapeHtml(config.nombre.toUpperCase())} - ${escapeHtml(gameState.equipoActual.nombre.toUpperCase())}
        </div>

        <!-- Temporizador y controles SVG -->
        <div class="game-timer-row" aria-live="polite">
          <button id="btn-pausar" class="btn-timer-pause" type="button" aria-label="${activeTimer.isPaused ? 'Continuar' : 'Pausar'}" title="${activeTimer.isPaused ? 'Continuar' : 'Pausar'}">
            ${activeTimer.isPaused ? svgPlay : svgPause}
          </button>
          
          <div id="timer-digits" class="game-timer-number ${segundosRestantes <= 5 ? 'timer-urgent' : ''}">
            ${formatTime(segundosRestantes)}
          </div>

          <button id="btn-reiniciar-timer" class="btn-timer-restart" type="button" aria-label="Reiniciar temporizador" title="Reiniciar temporizador">
            ${svgRestart}
          </button>
        </div>

        <!-- Escenario de la carta física limpia -->
        <div class="card-stage" aria-live="assertive">
          ${carta && elemento ? `
            <div class="playing-card-clean card-theme-${colorElem}" id="current-card">
              <!-- Header de la carta: Categoría y Contador de cartas restantes en mazo -->
              <div class="card-header-minimal">
                <div class="card-category-title">
                  ${escapeHtml(elemento.categoria || 'Elemento')}
                </div>
                <div class="card-deck-count-badge" title="${cartasRestantes} cartas restantes en mazo">
                  ${cartasRestantes}
                </div>
              </div>

              <!-- Palabra principal a adivinar -->
              <div class="card-word-target">
                ${escapeHtml(elemento.texto)}
              </div>

              <!-- Fila inferior: Deshacer y Palabra prohibida -->
              <div class="card-bottom-row">
                <button 
                  id="btn-deshacer" 
                  class="card-undo-btn ${!puedeDeshacer ? 'disabled' : ''}" 
                  type="button" 
                  aria-label="Deshacer última acción" 
                  title="Deshacer última acción"
                  ${!puedeDeshacer ? 'disabled' : ''}
                >
                  ${svgUndo}
                </button>

                <div class="card-forbidden-pill">
                  ${escapeHtml(carta.palabraClave)}
                </div>
              </div>
            </div>
          ` : `
            <div class="surface-card" style="text-align: center; padding: 2rem; max-width: 350px; margin: 0 auto;">
              <p style="color: #ffffff; font-size: 1.1rem; font-weight: bold;">No quedan cartas en esta ronda.</p>
            </div>
          `}
        </div>

        <!-- Botonera inferior limpia (Alcance del pulgar) -->
        <div class="game-bottom-actions-clean">
          ${puedePasar ? `
            <!-- Botón Paso (Ronda 2 y 3) con animación hold para terminar turno -->
            <button id="btn-paso" class="action-btn-clean btn-action-paso" type="button" aria-label="Pasar carta (o mantener para terminar turno)">
              <div class="hold-fill-layer"></div>
              <span class="paso-label">PASO</span>
            </button>
          ` : `
            <!-- Botón Terminar turno por error (Ronda 1) -->
            <button id="btn-error" class="action-btn-clean btn-action-terminar" type="button" aria-label="Terminar turno por error">
              ${svgCross}
            </button>
          `}

          <!-- Botón ¡Acierto! -->
          <button id="btn-acierto" class="action-btn-clean btn-action-acierto" type="button" aria-label="Carta acertada (+1 punto)">
            ${svgCheck}
          </button>
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

    // Deshacer acción previa (acierto o paso)
    container.querySelector('#btn-deshacer')?.addEventListener('click', () => {
      if (!gameState.ultimaAccion) return;
      activeTimer.playUndoSound();
      const ok = gameState.deshacerUltimaAccion();
      if (ok) {
        renderCurrentPhase();
        const newCard = container.querySelector('#current-card');
        if (newCard) {
          newCard.classList.add('card-enter-undo');
        }
      }
    });

    // Botón Error (Ronda 1)
    container.querySelector('#btn-error')?.addEventListener('click', async () => {
      const estabaCorriendo = activeTimer.isRunning;
      if (estabaCorriendo) activeTimer.pause();
      const confirma = await customConfirm({
        title: '¿Terminar turno por error?',
        message: 'Si se dijo la palabra prohibida o se cometió una falta, la carta vuelve al mazo y el turno termina.',
        confirmText: 'Terminar turno',
        cancelText: 'Continuar turno',
        danger: true
      });
      if (confirma) {
        activeTimer.destroy();
        activeTimer.playErrorSound();
        gameState.terminarTurnoPorError();
        renderCurrentPhase();
      } else if (estabaCorriendo) {
        activeTimer.resume();
      }
    });

    // Botón Paso con pulsación larga para terminar turno (Rondas 2 y 3)
    const btnPaso = container.querySelector('#btn-paso');
    if (btnPaso) {
      let holdTimeout = null;
      let isHoldConverted = false;

      const triggerConvertAndEndTurn = () => {
        isHoldConverted = true;
        btnPaso.classList.add('converted');
        const pasoLabel = btnPaso.querySelector('.paso-label');
        if (pasoLabel) {
          pasoLabel.innerHTML = svgCross;
        }
        activeTimer.playErrorSound();
        setTimeout(() => {
          activeTimer.destroy();
          gameState.terminarTurnoPorError();
          renderCurrentPhase();
        }, 220);
      };

      const startHold = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        isHoldConverted = false;
        btnPaso.classList.add('holding');
        holdTimeout = setTimeout(triggerConvertAndEndTurn, 950);
      };

      const cancelHold = () => {
        if (holdTimeout) {
          clearTimeout(holdTimeout);
          holdTimeout = null;
        }
        btnPaso.classList.remove('holding');
      };

      const endHold = (e) => {
        if (holdTimeout) {
          clearTimeout(holdTimeout);
          holdTimeout = null;
        }
        btnPaso.classList.remove('holding');

        if (!isHoldConverted) {
          // Fue un tap / click normal: Pasar carta
          ejecutarPaso();
        }
      };

      const ejecutarPaso = () => {
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
      };

      // Eventos pointer / touch / mouse
      btnPaso.addEventListener('pointerdown', startHold);
      btnPaso.addEventListener('pointerup', endHold);
      btnPaso.addEventListener('pointerleave', cancelHold);
      btnPaso.addEventListener('pointercancel', cancelHold);
    }

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

  // --- Fase: Jugando Ronda Relámpago / Desempate ---
  function renderRelampagoJugando(config) {
    const carta = gameState.cartaActual;
    const turnoRel = gameState.relampagoTurnos[gameState.relampagoTurnoIndex];
    const esDesempate = gameState.enDesempate;

    container.innerHTML = `
      <section class="screen" aria-label="${escapeHtml(config.nombre)}">
        <header class="game-top-bar">
          <div class="round-pill">
            <span>${config.icono} ${escapeHtml(config.nombre)}</span>
          </div>
          <span class="turn-pill">
            Lee: ${escapeHtml(gameState.equipoActual.nombre)} ${esDesempate ? `(${gameState.relampagoTurnoIndex + 1}/${gameState.relampagoTurnos.length})` : `(${turnoRel ? turnoRel.pasada : 1}/2)`}
          </span>
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
                <span>${esDesempate ? 'Desempate' : 'Relámpago'}</span>
                <span>Carta ${gameState.relampagoTurnoIndex + 1} de ${gameState.relampagoTurnos.length}</span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Botón para terminar los 15 segundos si alguien adivinó antes -->
        <div style="margin-top: 0.85rem;">
          <button id="btn-terminar-relampago" class="btn btn-primary btn-large btn-block" type="button">
            ⚡ ¡Ya adivinaron! / Pasar tiempo →
          </button>
        </div>
      </section>
    `;

    container.querySelector('#btn-terminar-relampago')?.addEventListener('click', () => {
      activeTimer.destroy();
      activeTimer.playSuccessSound();
      gameState.tiempoAgotado();
      renderCurrentPhase();
    });
  }

  // --- Fase: Evaluación Ronda Relámpago / Desempate (Quién adivinó) ---
  function renderRelampagoEvaluando() {
    const carta = gameState.cartaActual;
    const equiposCandidatos = gameState.enDesempate && gameState.equiposDesempateIds.length >= 2
      ? gameState.equipos.filter((eq) => gameState.equiposDesempateIds.includes(eq.id))
      : gameState.equipos;

    container.innerHTML = `
      <section class="screen" aria-label="Resultado de carta relámpago">
        <div class="surface-card" style="text-align: center; padding: 1.75rem 1.25rem; margin: auto 0;">
          <div style="font-size: 3rem; margin-bottom: 0.35rem;">${gameState.enDesempate ? '🔥' : '⚡'}</div>
          <h2 style="font-size: 1.6rem; font-weight: var(--font-weight-black); margin-bottom: 0.25rem;">
            ¡Definición de la carta!
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
            ${equiposCandidatos.map((eq) => `
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
    const esUltimaRonda = !gameState.enDesempate && gameState.rondaIndex + 1 >= RONDAS_CONFIG.length;
    const empatados = esUltimaRonda ? gameState.obtenerEquiposEmpatadosPrimerPuesto() : [];
    const hayDesempate = empatados.length >= 2;

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

          ${hayDesempate ? `
            <div class="surface-card" style="background: var(--bg-surface-elevated); text-align: left; margin-bottom: 1.5rem; border-color: var(--accent-secondary);">
              <p style="font-size: 0.85rem; color: var(--accent-secondary); font-weight: bold; text-transform: uppercase;">
                🔥 ¡Empate en el 1.° puesto! (${empatados.map((e) => escapeHtml(e.nombre)).join(' vs ')})
              </p>
              <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.35rem;">
                Se jugará una Ronda de Desempate: 1 carta tipo Relámpago para leer por cada equipo en el empate.
              </p>
            </div>
          ` : ''}

          <button id="btn-concluir-ronda" class="btn btn-primary btn-large btn-block" type="button">
            ${hayDesempate ? 'Comenzar Ronda de Desempate 🔥 →' : (esUltimaRonda ? 'Ver Resultados Finales 🏆' : 'Concluir Ronda y continuar →')}
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
    const proxConfig = !gameState.enDesempate ? RONDAS_CONFIG[siguienteRondaIdx] : null;
    const empatados = !proxConfig ? gameState.obtenerEquiposEmpatadosPrimerPuesto() : [];
    const hayDesempate = empatados.length >= 2;

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
          ` : hayDesempate ? `
            <div class="surface-card" style="background: var(--bg-surface-elevated); text-align: left; margin-bottom: 1.5rem; border-color: var(--accent-secondary);">
              <p style="font-size: 0.85rem; color: var(--accent-secondary); font-weight: bold; text-transform: uppercase;">
                🔥 ¡Sigue el empate en el 1.° puesto! (${empatados.map((e) => escapeHtml(e.nombre)).join(' vs ')})
              </p>
              <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.35rem;">
                Se jugará una Ronda de Desempate: 1 carta tipo Relámpago para leer por cada equipo empatado.
              </p>
            </div>

            <button id="btn-siguiente-ronda" class="btn btn-primary btn-large btn-block" type="button">
              Comenzar Ronda de Desempate 🔥 →
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
                  ${[
                    ...RONDAS_CONFIG,
                    ...(gameState.puntosPorRonda && gameState.puntosPorRonda[RONDA_DESEMPATE_CONFIG.id] ? [RONDA_DESEMPATE_CONFIG] : [])
                  ].map((r) => `
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
