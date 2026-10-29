/**
 * Pantalla de Inicio (#inicio)
 */

import { gameState } from '../game.js';
import { deferredInstallPrompt } from '../app.js';
import { customConfirm } from './modal.js';
import { abrirModoDesarrollador } from './dev-mode.js';

function esModoStandalone() {
  if (typeof window === 'undefined') return false;
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || Boolean(navigator.standalone);
}

export function renderInicio(container, router) {
  const tienePartidaEnCurso = gameState.enPartida;

  container.innerHTML = `
    <section class="screen" aria-label="Pantalla de inicio">
      <div class="hero">
        <div class="hero-logo-wrapper" id="hero-logo-tap" title="Say My Name">
          <img src="icons/logo.png" alt="Say My Name" class="hero-marquee-img" />
        </div>
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
          <button id="btn-instalar-app" class="btn btn-secondary btn-block" type="button" style="display: ${!esModoStandalone() && deferredInstallPrompt ? 'block' : 'none'}; border-color: var(--accent-secondary); color: var(--accent-secondary);">
            📲 Instalar aplicación
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

  // Botón de instalación PWA
  const btnInstalar = container.querySelector('#btn-instalar-app');
  if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          btnInstalar.style.display = 'none';
        }
      }
    });

    const onPromptAvailable = () => {
      if (!esModoStandalone() && btnInstalar) {
        btnInstalar.style.display = 'block';
      }
    };
    window.addEventListener('pwa-prompt-available', onPromptAvailable);
    window.addEventListener('pwa-app-installed', () => {
      if (btnInstalar) btnInstalar.style.display = 'none';
    });
  }

  // Activación discreta del Modo Desarrollador (5 toques en el logo)
  let devTapCount = 0;
  let devTapTimer = null;
  const logoWrapper = container.querySelector('#hero-logo-tap');

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

  logoWrapper?.addEventListener('click', handleDevTap);
}
