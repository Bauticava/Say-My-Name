/**
 * Say My Name — Módulo principal de arranque (app.js)
 * Registra Service Worker e inicializa el router con módulos ES.
 */

import { Router } from './router.js';
import { renderInicio } from './ui/inicio.js';
import { renderReglas } from './ui/reglas.js';
import { renderEquipos } from './ui/equipos.js';
import { renderConfiguracion } from './ui/configuracion.js';
import { renderPartida } from './ui/partida.js';

// Gestión del prompt de instalación de PWA
export let deferredInstallPrompt = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-app-installed'));
  });
}

// Registrar Service Worker para soporte offline
function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('sw.js', { scope: './' });
        console.log('Service Worker registrado correctamente:', registration.scope);
      } catch (error) {
        console.warn('Fallo al registrar Service Worker:', error);
      }
    });
  }
}

// Inicialización de la aplicación
function iniciarApp() {
  const container = document.getElementById('app');
  if (!container) {
    console.error('No se encontró el contenedor #app en el DOM.');
    return;
  }

  const routes = {
    inicio: renderInicio,
    reglas: renderReglas,
    equipos: renderEquipos,
    configuracion: renderConfiguracion,
    partida: renderPartida,
  };

  const router = new Router(routes, container);
  router.start();
  registrarServiceWorker();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarApp);
  } else {
    iniciarApp();
  }
}
