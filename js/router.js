/**
 * Enrutador de pantallas basado en History API y Hash
 * Soporta navegación por gestos del sistema, carga directa por URL
 * e interceptación de confirmación al salir de #partida.
 */

import { wakeLockManager } from './wakelock.js';
import { gameState } from './game.js';

export class Router {
  constructor(routes, container) {
    this.routes = routes;
    this.container = container;
    this.currentScreen = null;

    this._onPopState = this._onPopState.bind(this);
    window.addEventListener('popstate', this._onPopState);
  }

  /**
   * Obtiene la pantalla según el hash actual o 'inicio'
   */
  getScreenFromLocation() {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash && this.routes[hash]) {
      return hash;
    }
    return 'inicio';
  }

  /**
   * Navega a una pantalla específica
   * @param {string} pantalla
   * @param {boolean} [replace=false]
   */
  navigate(pantalla, replace = false) {
    if (!this.routes[pantalla]) {
      console.warn(`Pantalla no encontrada: ${pantalla}. Redirigiendo a 'inicio'.`);
      pantalla = 'inicio';
    }

    // Si salimos de partida, liberar Wake Lock
    if (this.currentScreen === 'partida' && pantalla !== 'partida') {
      wakeLockManager.release();
    }

    const state = { pantalla };
    const hash = `#${pantalla}`;

    if (replace) {
      window.history.replaceState(state, '', hash);
    } else {
      window.history.pushState(state, '', hash);
    }

    this._renderScreen(pantalla);
  }

  _onPopState(event) {
    const targetScreen = event.state?.pantalla || this.getScreenFromLocation();

    // Interceptar "atrás" si estamos en partida activa
    if (this.currentScreen === 'partida' && targetScreen !== 'partida' && gameState.enPartida) {
      const confirma = window.confirm('¿Querés abandonar la partida actual? Se mantendrá el progreso en este dispositivo.');
      if (!confirma) {
        // El usuario canceló: restaurar el estado en el historial
        window.history.pushState({ pantalla: 'partida' }, '', '#partida');
        return;
      }
      // Si confirmó, se libera el wake lock
      wakeLockManager.release();
    }

    this._renderScreen(targetScreen);
  }

  _renderScreen(pantalla) {
    this.currentScreen = pantalla;

    // Wake Lock en partida
    if (pantalla === 'partida') {
      wakeLockManager.request();
    } else {
      wakeLockManager.release();
    }

    const renderFn = this.routes[pantalla] || this.routes['inicio'];
    this.container.innerHTML = '';
    renderFn(this.container, this);

    // Scroll to top
    window.scrollTo(0, 0);
  }

  /**
   * Inicializa el enrutador al cargar la app
   */
  start() {
    const initialScreen = this.getScreenFromLocation();
    window.history.replaceState({ pantalla: initialScreen }, '', `#${initialScreen}`);
    this._renderScreen(initialScreen);
  }
}
