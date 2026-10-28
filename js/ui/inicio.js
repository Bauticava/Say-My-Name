/**
 * Pantalla de Inicio (#inicio)
 */

import { gameState } from '../game.js';
import { customConfirm } from './modal.js';
import { abrirModoDesarrollador } from './dev-mode.js';

export function renderInicio(container, router) {
  const tienePartidaEnCurso = gameState.enPartida;

  container.innerHTML = `
    <section class="screen" aria-label="Pantalla de inicio">
      <div class="hero">
        <img src="icons/icon.svg" alt="Say My Name" class="hero-icon" width="96" height="96" />
        <h1 class="hero-title">Say My Name</h1>
        <p class="hero-subtitle">La app compañera para tus partidas de cartas presenciales.</p>

        <div class="hero-actions">
          ${tienePartidaEnCurso ? `
            <button id="btn-reanudar" class="btn btn-primary btn-large btn-block" type="button">
              ▶️ Reanudar Partida
            </button>
            <button id="btn-jugar-nuevo" class="btn btn-secondary btn-block" type="button">
              Nueva Partida
            </button>
          ` : `
            <button id="btn-jugar" class="btn btn-primary btn-large btn-block" type="button">
              Jugar
            </button>
          `}
          <button id="btn-reglas" class="btn btn-secondary btn-block" type="button">
            Reglas del Juego
          </button>
        </div>
      </div>
    </section>
  `;

  if (tienePartidaEnCurso) {
    const btnReanudar = container.querySelector('#btn-reanudar');
    btnReanudar?.addEventListener('click', () => {
      router.navigate('partida');
    });

    const btnJugarNuevo = container.querySelector('#btn-jugar-nuevo');
    btnJugarNuevo?.addEventListener('click', async () => {
      const confirma = await customConfirm({
        title: '¿Nueva partida?',
        message: 'Se descartará la partida anterior que estaba en curso.',
        confirmText: 'Empezar nueva',
        cancelText: 'Cancelar',
        danger: true
      });
      if (confirma) {
        gameState.terminarPartida();
        router.navigate('equipos');
      }
    });
  } else {
    const btnJugar = container.querySelector('#btn-jugar');
    btnJugar?.addEventListener('click', () => {
      router.navigate('equipos');
    });
  }

  const btnReglas = container.querySelector('#btn-reglas');
  btnReglas?.addEventListener('click', () => {
    router.navigate('reglas');
  });

  // Activación discreta del Modo Desarrollador (5 toques en el título / logo)
  let devTapCount = 0;
  let devTapTimer = null;
  const logoEl = container.querySelector('.hero-icon');
  const titleEl = container.querySelector('.hero-title');

  function handleDevTap() {
    devTapCount += 1;
    clearTimeout(devTapTimer);
    devTapTimer = setTimeout(() => {
      devTapCount = 0;
    }, 2500);

    if (devTapCount >= 5) {
      devTapCount = 0;
      fetch('data/cartas.json')
        .then((r) => r.json())
        .catch(() => [])
        .then((catalogo) => {
          const customs = gameState.obtenerCartasCustom();
          abrirModoDesarrollador([...catalogo, ...customs]);
        });
    }
  }

  logoEl?.addEventListener('click', handleDevTap);
  titleEl?.addEventListener('click', handleDevTap);
}
