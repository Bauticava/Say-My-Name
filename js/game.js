/**
 * Estado y reglas de la partida de Say My Name
 * Desacoplado del DOM con persistencia en localStorage.
 */

import { shuffle, selectRandomCards } from './deck.js';

export const TOTAL_RONDAS = 3;
export const RONDAS_INFO = {
  1: { nombre: 'Descripción libre', icono: '🗣️', descripcion: 'Podés hablar todo lo que quieras sin decir el nombre ni rimas.' },
  2: { nombre: 'Una sola palabra', icono: '☝️', descripcion: 'Solo podés decir una palabra de pista. Tu equipo tiene un solo intento.' },
  3: { nombre: 'Mímica', icono: '🎭', descripcion: 'Silencio absoluto: solo gestos y señas corporales.' }
};

const STORAGE_KEY = 'say_my_name_game_state_v1';

export class GameState {
  constructor() {
    this.equipos = [
      { id: 'eq-1', nombre: 'Equipo 1', puntos: 0 },
      { id: 'eq-2', nombre: 'Equipo 2', puntos: 0 }
    ];
    this.cantidadCartas = 20;
    this.tiempoPorTurno = 60; // segundos
    this.cartasPartida = []; // Todas las cartas seleccionadas para el juego
    this.cartasRondaRestantes = []; // Cartas restantes en la ronda actual
    this.cartaActual = null;
    this.rondaActual = 1;
    this.equipoTurnoIndex = 0;
    this.faseTurno = 'listo'; // 'listo' | 'jugando' | 'tiempo_agotado' | 'ronda_terminada' | 'partida_terminada'
    this.enPartida = false;

    this.loadFromStorage();
  }

  // --- Validación y Gestión de Equipos ---

  /**
   * Valida un nombre de equipo.
   * @param {string} nombre
   * @param {string} [excludeId]
   * @returns {{ valid: boolean, error: string|null, sanitized: string }}
   */
  validarNombreEquipo(nombre, excludeId = null) {
    const sanitized = (nombre || '').trim();
    if (!sanitized) {
      return { valid: false, error: 'El nombre del equipo no puede estar vacío.', sanitized };
    }
    if (sanitized.length > 25) {
      return { valid: false, error: 'El nombre es demasiado largo (máximo 25 caracteres).', sanitized };
    }
    const existeDuplicado = this.equipos.some(
      (eq) => eq.id !== excludeId && eq.nombre.toLowerCase() === sanitized.toLowerCase()
    );
    if (existeDuplicado) {
      return { valid: false, error: 'Ya existe un equipo con ese nombre.', sanitized };
    }
    return { valid: true, error: null, sanitized };
  }

  agregarEquipo(nombre) {
    const validacion = this.validarNombreEquipo(nombre);
    if (!validacion.valid) {
      throw new Error(validacion.error);
    }
    const nuevoEquipo = {
      id: `eq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nombre: validacion.sanitized,
      puntos: 0
    };
    this.equipos.push(nuevoEquipo);
    this.saveToStorage();
    return nuevoEquipo;
  }

  renombrarEquipo(id, nuevoNombre) {
    const validacion = this.validarNombreEquipo(nuevoNombre, id);
    if (!validacion.valid) {
      throw new Error(validacion.error);
    }
    const eq = this.equipos.find((e) => e.id === id);
    if (eq) {
      eq.nombre = validacion.sanitized;
      this.saveToStorage();
    }
  }

  quitarEquipo(id) {
    if (this.equipos.length <= 2) {
      throw new Error('Se necesitan al menos 2 equipos para jugar.');
    }
    this.equipos = this.equipos.filter((e) => e.id !== id);
    if (this.equipoTurnoIndex >= this.equipos.length) {
      this.equipoTurnoIndex = 0;
    }
    this.saveToStorage();
  }

  setCantidadCartas(cantidad) {
    const num = parseInt(cantidad, 10);
    if (!isNaN(num) && num > 0) {
      this.cantidadCartas = num;
      this.saveToStorage();
    }
  }

  setTiempoPorTurno(segundos) {
    const num = parseInt(segundos, 10);
    if (!isNaN(num) && num >= 15) {
      this.tiempoPorTurno = num;
      this.saveToStorage();
    }
  }

  // --- Ciclo de Juego ---

  /**
   * Inicia una nueva partida con cartas seleccionadas al azar.
   * @param {Array} allCards - Catálogo total disponible en data/cartas.json
   */
  iniciarNuevaPartida(allCards) {
    // Resetear puntajes
    this.equipos.forEach((eq) => {
      eq.puntos = 0;
    });

    const cantidadReal = Math.min(this.cantidadCartas, allCards.length);
    this.cartasPartida = selectRandomCards(allCards, cantidadReal);
    this.cartasRondaRestantes = shuffle(this.cartasPartida);
    this.cartaActual = null;
    this.rondaActual = 1;
    this.equipoTurnoIndex = 0;
    this.faseTurno = 'listo';
    this.enPartida = true;

    this.saveToStorage();
  }

  get equipoActual() {
    return this.equipos[this.equipoTurnoIndex] || this.equipos[0];
  }

  /**
   * Saca una carta del mazo de la ronda.
   */
  sacarSiguienteCarta() {
    if (this.cartasRondaRestantes.length === 0) {
      this.cartaActual = null;
      return null;
    }
    this.cartaActual = this.cartasRondaRestantes.pop();
    this.saveToStorage();
    return this.cartaActual;
  }

  /**
   * Se acierta la carta actual: suma punto y saca la siguiente.
   */
  acertarCarta() {
    if (!this.cartaActual) return null;

    if (this.equipoActual) {
      this.equipoActual.puntos += 1;
    }

    if (this.cartasRondaRestantes.length === 0) {
      this.cartaActual = null;
      // Fin de la ronda
      if (this.rondaActual >= TOTAL_RONDAS) {
        this.faseTurno = 'partida_terminada';
      } else {
        this.faseTurno = 'ronda_terminada';
      }
      this.saveToStorage();
      return null;
    }

    return this.sacarSiguienteCarta();
  }

  /**
   * Pasa la carta (no la adivinaron o quieren saltear): vuelve al fondo del mazo de la ronda.
   */
  pasarCarta() {
    if (!this.cartaActual) return null;
    const pasada = this.cartaActual;
    // La insertamos al inicio (fondo del mazo)
    this.cartasRondaRestantes.unshift(pasada);
    return this.sacarSiguienteCarta();
  }

  /**
   * El tiempo del turno expiró.
   */
  tiempoAgotado() {
    // Si había una carta en pantalla que no se acertó, vuelve al mazo
    if (this.cartaActual) {
      this.cartasRondaRestantes.push(this.cartaActual);
      this.cartaActual = null;
    }
    this.faseTurno = 'tiempo_agotado';
    this.saveToStorage();
  }

  /**
   * Pasa el turno al siguiente equipo.
   */
  siguienteTurno() {
    this.equipoTurnoIndex = (this.equipoTurnoIndex + 1) % this.equipos.length;
    this.cartaActual = null;
    this.faseTurno = 'listo';
    this.saveToStorage();
  }

  /**
   * Pasa a la siguiente ronda barajando de nuevo todas las cartas de la partida.
   */
  pasarSiguienteRonda() {
    if (this.rondaActual < TOTAL_RONDAS) {
      this.rondaActual += 1;
      this.cartasRondaRestantes = shuffle(this.cartasPartida);
      this.cartaActual = null;
      this.equipoTurnoIndex = (this.equipoTurnoIndex + 1) % this.equipos.length;
      this.faseTurno = 'listo';
      this.saveToStorage();
    } else {
      this.faseTurno = 'partida_terminada';
      this.saveToStorage();
    }
  }

  /**
   * Reinicia la partida por completo.
   */
  terminarPartida() {
    this.enPartida = false;
    this.cartaActual = null;
    this.cartasRondaRestantes = [];
    this.faseTurno = 'listo';
    this.saveToStorage();
  }

  // --- Persistencia ---

  saveToStorage() {
    try {
      const data = {
        equipos: this.equipos,
        cantidadCartas: this.cantidadCartas,
        tiempoPorTurno: this.tiempoPorTurno,
        cartasPartida: this.cartasPartida,
        cartasRondaRestantes: this.cartasRondaRestantes,
        cartaActual: this.cartaActual,
        rondaActual: this.rondaActual,
        equipoTurnoIndex: this.equipoTurnoIndex,
        faseTurno: this.faseTurno,
        enPartida: this.enPartida
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('No se pudo guardar el estado en localStorage:', e);
    }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.equipos) && data.equipos.length >= 2) {
        this.equipos = data.equipos;
      }
      if (typeof data.cantidadCartas === 'number') {
        this.cantidadCartas = data.cantidadCartas;
      }
      if (typeof data.tiempoPorTurno === 'number') {
        this.tiempoPorTurno = data.tiempoPorTurno;
      }
      if (Array.isArray(data.cartasPartida)) {
        this.cartasPartida = data.cartasPartida;
      }
      if (Array.isArray(data.cartasRondaRestantes)) {
        this.cartasRondaRestantes = data.cartasRondaRestantes;
      }
      this.cartaActual = data.cartaActual || null;
      this.rondaActual = data.rondaActual || 1;
      this.equipoTurnoIndex = data.equipoTurnoIndex || 0;
      this.faseTurno = data.faseTurno || 'listo';
      this.enPartida = Boolean(data.enPartida);
    } catch (e) {
      console.warn('No se pudo leer el estado previo de localStorage:', e);
    }
  }
}

export const gameState = new GameState();
