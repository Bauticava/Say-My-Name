/**
 * Manejo seguro de Screen Wake Lock API
 * Mantiene la pantalla encendida durante la partida y se reactiva en visibilitychange.
 */

class WakeLockManager {
  constructor() {
    this.wakeLock = null;
    this.isActive = false;
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
  }

  /**
   * Solicita el bloqueo de apagado de pantalla si está disponible.
   */
  async request() {
    this.isActive = true;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      if (!this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      document.addEventListener('visibilitychange', this._onVisibilityChange);
      return true;
    } catch (err) {
      // Puede fallar si la batería es baja o la pestaña no está activa
      console.warn('Wake Lock no disponible o denegado:', err);
      return false;
    }
  }

  /**
   * Libera el bloqueo de pantalla.
   */
  async release() {
    this.isActive = false;
    document.removeEventListener('visibilitychange', this._onVisibilityChange);

    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (err) {
        console.warn('Error al liberar Wake Lock:', err);
      } finally {
        this.wakeLock = null;
      }
    }
  }

  async _onVisibilityChange() {
    if (this.isActive && document.visibilityState === 'visible') {
      await this.request();
    }
  }
}

export const wakeLockManager = new WakeLockManager();
