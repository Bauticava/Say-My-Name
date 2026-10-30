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
    this._lastTickSec = null;
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
      this.audioContext.resume().catch(() => {});
    }
  }

  /**
   * Reproduce sonido de tic-tac para los últimos segundos.
   */
  playTickSound() {
    try {
      this._ensureAudioContext();
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Degradación silenciosa
    }
  }

  /**
   * Sonido alegre de acierto (+1 punto).
   */
  playSuccessSound() {
    try {
      this._ensureAudioContext();
      this.triggerHaptic([40]);
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(783.99, now + 0.08); // G5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch {
      // Degradación silenciosa
    }
  }

  /**
   * Sonido sutil de paso de carta.
   */
  playPassSound() {
    try {
      this._ensureAudioContext();
      this.triggerHaptic([25]);
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.1);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch {
      // Degradación silenciosa
    }
  }

  /**
   * Sonido de retroceso / deshacer acción.
   */
  playUndoSound() {
    try {
      this._ensureAudioContext();
      this.triggerHaptic([30]);
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Degradación silenciosa
    }
  }

  /**
   * Sonido grave de falta / error ("buzzer").
   */
  playErrorSound() {
    try {
      this._ensureAudioContext();
      this.triggerHaptic([80, 40, 80]);
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.setValueAtTime(130, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Degradación silenciosa
    }
  }

  /**
   * Sonido dramático de tiempo agotado (alarma de juego de mesa).
   */
  playTimeUpSound() {
    try {
      this._ensureAudioContext();
      this.triggerHaptic([150, 50, 150, 50, 400]);
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;

      // Doble oscilador para sonido de chicharra con cuerpo
      const osc1 = this.audioContext.createOscillator();
      const osc2 = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';

      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.exponentialRampToValueAtTime(180, now + 0.55);

      osc2.frequency.setValueAtTime(328, now);
      osc2.frequency.exponentialRampToValueAtTime(184, now + 0.55);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioContext.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.62);
      osc2.stop(now + 0.62);
    } catch {
      // Degradación silenciosa
    }
  }

  /**
   * Fanfarria alegre para la coronación del ganador.
   */
  playFanfareSound() {
    try {
      this._ensureAudioContext();
      this.triggerHaptic([60, 40, 60, 40, 150]);
      if (!this.audioContext) return;

      const notas = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const dur = 0.12;

      notas.forEach((freq, idx) => {
        const start = this.audioContext.currentTime + idx * dur;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        const length = idx === notas.length - 1 ? 0.4 : dur * 0.9;
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + length);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start(start);
        osc.stop(start + length);
      });
    } catch {
      // Degradación silenciosa
    }
  }

  /**
   * Activa vibración con degradación silenciosa.
   */
  triggerHaptic(pattern = [100]) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
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
    this._lastTickSec = null;

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
    this._lastTickSec = null;

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

    if (secondsLeft !== this._lastTickSec) {
      this._lastTickSec = secondsLeft;
      this.onTick(secondsLeft);

      // Tic-tac suave en los últimos 5 segundos
      if (secondsLeft > 0 && secondsLeft <= 5) {
        this.playTickSound();
      }
    }

    if (remaining <= 0) {
      this.isRunning = false;
      this.isPaused = false;
      clearInterval(this.intervalId);
      this.intervalId = null;

      this.playTimeUpSound();
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
