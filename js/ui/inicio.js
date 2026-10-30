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

const PALABRAS_FALLBACK = [
  'HARRY POTTER',
  'RIVER PLATE',
  'LIONEL MESSI',
  'BREAKING BAD',
  'EL PADRINO',
  'DIEGO MARADONA',
  'LOS SIMPSONS',
  'STAR WARS',
  'SHREK',
  'SPIDER-MAN',
  'TOY STORY',
  'FREDDIE MERCURY',
  'FRIENDS',
  'BOCA JUNIORS',
  'TITANIC',
  'STRANGER THINGS',
  'BATMAN',
  'MICHAEL JACKSON',
  'VOLVER AL FUTURO',
  'SHAKIRA'
];

const COLORES_PALABRAS = [
  '#3b82f6', // Azul (como HARRY POTTER en el boceto)
  '#22c55e', // Verde (como RIVER PLATE en el boceto)
  '#f59e0b', // Naranja/Ámbar (como MESSI en el boceto)
  '#ec4899', // Rosa/Magenta (como BREAKING BAD en el boceto)
  '#a855f7', // Violeta
  '#ef4444', // Rojo
  '#06b6d4'  // Cian
];

let palabrasCatalogoCache = null;

async function obtenerPalabrasDeCartas() {
  if (palabrasCatalogoCache && palabrasCatalogoCache.length > 0) {
    return palabrasCatalogoCache;
  }
  try {
    const res = await fetch('data/cartas.json');
    if (!res.ok) throw new Error('No se pudo cargar cartas.json');
    const cartas = await res.json();
    const extraidas = [];
    cartas.forEach((c) => {
      if (Array.isArray(c.elementos)) {
        c.elementos.forEach((el) => {
          if (el.texto && el.texto.length <= 24) {
            extraidas.push(el.texto.toUpperCase());
          }
        });
      }
    });
    if (extraidas.length > 0) {
      palabrasCatalogoCache = extraidas;
      return extraidas;
    }
  } catch {
    // Usar fallback si falla
  }
  return PALABRAS_FALLBACK;
}

function iniciarPalabrasVoladoras(layerEl) {
  if (!layerEl) return;

  let palabras = [...PALABRAS_FALLBACK];
  obtenerPalabrasDeCartas().then((lista) => {
    if (lista && lista.length > 0) {
      palabras = lista;
    }
  });

  // Dividir la altura en carriles para distribuir las palabras por toda la pantalla
  const carrilesY = [8, 18, 30, 44, 58, 70, 80];
  let carrilIdx = 0;

  function crearPalabra(initialDelaySec = 0) {
    if (!document.body.contains(layerEl)) return;

    const rawTexto = palabras[Math.floor(Math.random() * palabras.length)];
    const color = COLORES_PALABRAS[Math.floor(Math.random() * COLORES_PALABRAS.length)];

    // Si tiene más de una palabra, separar cada palabra en un renglón (ej: HARRY / POTTER o GAME / OF / THRONES)
    const partes = rawTexto.trim().split(/\s+/);
    const texto = partes.length > 1 ? partes.join('\n') : rawTexto;

    // Trayectorias desparramadas en todas direcciones:
    // 0: Arriba hacia Abajo (vertical / diagonal descendente)
    // 1: Abajo hacia Arriba (vertical / diagonal ascendente)
    // 2: Izquierda a Derecha diagonal
    // 3: Derecha a Izquierda diagonal
    const tipos = ['down', 'up', 'left_to_right', 'right_to_left'];
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];

    let startX, startY, endX, endY;

    if (tipo === 'down') {
      startX = Math.floor(5 + Math.random() * 85);
      endX = startX + (Math.random() * 34 - 17);
      startY = -25;
      endY = 115;
    } else if (tipo === 'up') {
      startX = Math.floor(5 + Math.random() * 85);
      endX = startX + (Math.random() * 34 - 17);
      startY = 115;
      endY = -25;
    } else if (tipo === 'left_to_right') {
      startX = -35;
      endX = 115;
      startY = Math.floor(5 + Math.random() * 85);
      endY = startY + (Math.random() * 50 - 25);
    } else {
      startX = 115;
      endX = -35;
      startY = Math.floor(5 + Math.random() * 85);
      endY = startY + (Math.random() * 50 - 25);
    }

    // Ángulo de inclinación pronunciado (-38° a +38°, evitando 0°)
    const signo = Math.random() > 0.5 ? 1 : -1;
    const angulo = signo * Math.floor(14 + Math.random() * 26);

    // Duración del vuelo (entre 8.5s y 13.5s)
    const duracion = (8.5 + Math.random() * 5).toFixed(2);

    const span = document.createElement('span');
    span.className = 'flying-card-word';
    span.textContent = texto;
    span.style.color = color;
    span.style.setProperty('--start-x', `${startX.toFixed(1)}vw`);
    span.style.setProperty('--start-y', `${startY.toFixed(1)}vh`);
    span.style.setProperty('--end-x', `${endX.toFixed(1)}vw`);
    span.style.setProperty('--end-y', `${endY.toFixed(1)}vh`);
    span.style.setProperty('--rot', `${angulo}deg`);
    span.style.animationDuration = `${duracion}s`;
    if (initialDelaySec < 0) {
      span.style.animationDelay = `${initialDelaySec}s`;
    }

    span.addEventListener('animationend', () => {
      span.remove();
      if (document.body.contains(layerEl)) {
        crearPalabra(0);
      }
    });

    layerEl.appendChild(span);
  }

  // Sembrar 8 palabras iniciales ya en vuelo en distintas fases y trayectorias
  for (let i = 0; i < 8; i++) {
    crearPalabra(-(i * 1.5 + 0.4));
  }
}

export function renderInicio(container, router) {
  const tienePartidaEnCurso = gameState.enPartida;

  container.innerHTML = `
    <section class="screen inicio-screen" aria-label="Pantalla de inicio">
      <!-- Fondo de palabras de cartas volando por detrás del logo y botones -->
      <div class="hero-flying-words" id="hero-flying-words" aria-hidden="true"></div>

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

      <footer class="hero-donation-footer">
        Se aceptan donaciones al alias <span class="donation-alias" id="copy-alias" title="Tocar para copiar alias">bauticavallera</span>
      </footer>
    </section>
  `;

  // Iniciar animación de palabras voladoras por detrás
  const flyingLayer = container.querySelector('#hero-flying-words');
  iniciarPalabrasVoladoras(flyingLayer);

  // Copiar alias al tocarlo (opcional y cómodo)
  const aliasEl = container.querySelector('#copy-alias');
  aliasEl?.addEventListener('click', () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('bauticavallera').then(() => {
        const original = aliasEl.textContent;
        aliasEl.textContent = '¡bauticavallera (copiado!)';
        setTimeout(() => {
          aliasEl.textContent = original;
        }, 1600);
      }).catch(() => {});
    }
  });

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
