/**
 * Temporizador de alta precisión basado en Date.now()
 * Con soporte para pausa, reanudación, reinicio, Web Audio API y vibración.
 */

export class GameTimer {
  /**
   * @param {Object} options
   * @param {number} options.durationSeconds - Duración por turno (ej: 60)
   * @param {function(number): void} [options.onTick] - Callback con segundos restantes
   * @param {function(): void} [options.onEnd] - Callback al agotarse el tiempo
   */
  constructor({ durationSeconds = 60, onTick = () => {}, onEnd = () => {} } = {}) {
    this.durationMs = durationSeconds * 1000;
    this.remainingMs = this.durationMs;
    this.endTime = null;
    this.intervalId = null;
    this.isRunning = false;
    this.isPaused = false;
    this.onTick = onTick;
    this.onEnd = onEnd;
    this.audioContext = null;
  }

  /**
   * Inicializa contexto de audio sintetizado.
   */
  _ensureAudioContext() {
    if (!this.audioContext && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Reproduce una señal sonora al finalizar el tiempo.
   */
  _playEndSound() {
    try {
      this._ensureAudioContext();
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      osc.frequency.setValueAtTime(880, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch {
      // Degradación silenciosa si el audio falla
    }
  }

  /**
   * Activa vibración si el dispositivo la soporta.
   */
  _triggerVibration() {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
    } catch {
      // Degradación silenciosa
    }
  }

  /**
   * Inicia o continúa la cuenta regresiva.
   */
  start() {
    this._ensureAudioContext();
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.endTime = Date.now() + this.remainingMs;

    this._tick();
    this.intervalId = setInterval(() => this._tick(), 200);
  }

  /**
   * Pausa el temporizador guardando el remanente exacto.
   */
  pause() {
    if (!this.isRunning || this.isPaused) return;

    this.remainingMs = Math.max(0, this.endTime - Date.now());
    this.isPaused = true;
    this.isRunning = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.onTick(Math.ceil(this.remainingMs / 1000));
  }

  /**
   * Reanuda tras una pausa.
   */
  resume() {
    if (!this.isPaused) return;
    this.start();
  }

  /**
   * Reinicia el temporizador a la duración original o nueva.
   * @param {number} [newDurationSeconds]
   */
  reset(newDurationSeconds) {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
    this.isPaused = false;

    if (typeof newDurationSeconds === 'number' && newDurationSeconds > 0) {
      this.durationMs = newDurationSeconds * 1000;
    }
    this.remainingMs = this.durationMs;
    this.endTime = null;
    this.onTick(Math.ceil(this.remainingMs / 1000));
  }

  _tick() {
    const now = Date.now();
    const remaining = Math.max(0, this.endTime - now);
    this.remainingMs = remaining;

    const secondsLeft = Math.ceil(remaining / 1000);
    this.onTick(secondsLeft);

    if (remaining <= 0) {
      this.isRunning = false;
      this.isPaused = false;
      clearInterval(this.intervalId);
      this.intervalId = null;

      this._playEndSound();
      this._triggerVibration();
      this.onEnd();
    }
  }

  /**
   * Destruye el timer y limpia intervalos.
   */
  destroy() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
  }
}
