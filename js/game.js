/**
 * Estado y reglas de la partida de Say My Name
 * Desacoplado del DOM con persistencia en localStorage.
 */

import { shuffle, selectRandomCards, cartaCumpleFiltros, seleccionarElementoParaCarta } from './deck.js';

export const RONDAS_CONFIG = [
  {
    id: 'ronda_1',
    numero: 1,
    nombre: 'Ronda 1: Descripción libre',
    icono: '🗣️',
    reglaResumen: 'Podés hablar todo lo que quieras sin decir la palabra prohibida ni rimas.',
    mostrarUnSoloElemento: true,
    acciones: ['acierto', 'error', 'deshacer'],
    puntosPorAcierto: 1,
    permitePaso: false,
    esRelampago: false
  },
  {
    id: 'ronda_2',
    numero: 2,
    nombre: 'Ronda 2: Una sola palabra',
    icono: '☝️',
    reglaResumen: 'Solo podés decir una palabra de pista por carta. Tu equipo tiene un solo intento; si falla, pasá de carta.',
    mostrarUnSoloElemento: true,
    acciones: ['acierto', 'paso', 'error', 'deshacer'],
    puntosPorAcierto: 1,
    permitePaso: true,
    esRelampago: false
  },
  {
    id: 'ronda_relampago',
    numero: '⚡',
    nombre: 'Ronda Relámpago',
    icono: '⚡',
    reglaResumen: 'Un integrante lee los 3 elementos en voz alta. Todos los equipos intentan adivinar la palabra clave en 15 segundos.',
    mostrarUnSoloElemento: false, // Muestra los 3 elementos
    acciones: ['revelar_relampago', 'deshacer'],
    puntosPorAcierto: 3,
    duracionSegundos: 15,
    esRelampago: true
  },
  {
    id: 'ronda_3',
    numero: 3,
    nombre: 'Ronda 3: Mímica',
    icono: '🎭',
    reglaResumen: 'Silencio absoluto: solo gestos y señas corporales. Se puede pasar de carta.',
    mostrarUnSoloElemento: true,
    acciones: ['acierto', 'paso', 'error', 'deshacer'],
    puntosPorAcierto: 1,
    permitePaso: true,
    esRelampago: false
  }
];

export const RONDA_DESEMPATE_CONFIG = {
  id: 'ronda_desempate',
  numero: '🔥',
  nombre: 'Ronda de Desempate',
  icono: '🔥',
  reglaResumen: 'Un integrante de cada equipo empatado lee 1 carta con los 3 elementos. Todos compiten en 15 segundos por adivinar la palabra clave.',
  mostrarUnSoloElemento: false,
  acciones: ['revelar_relampago', 'deshacer'],
  puntosPorAcierto: 3,
  duracionSegundos: 15,
  esRelampago: true,
  esDesempate: true
};

export const PALETA_EQUIPOS = [
  { id: 'ambar', hex: '#f59e0b', nombre: 'Ámbar' },
  { id: 'esmeralda', hex: '#10b981', nombre: 'Esmeralda' },
  { id: 'azul', hex: '#3b82f6', nombre: 'Azul' },
  { id: 'purpura', hex: '#8b5cf6', nombre: 'Púrpura' },
  { id: 'coral', hex: '#f43f5e', nombre: 'Coral' },
  { id: 'cian', hex: '#06b6d4', nombre: 'Cian' }
];

const STORAGE_KEY = 'say_my_name_game_state_v2';
const CARTAS_DEV_STORAGE_KEY = 'say_my_name_custom_cards_v1';

export class GameState {
  constructor() {
    this.equipos = [
      { id: 'eq-1', nombre: 'Equipo 1', color: PALETA_EQUIPOS[0].hex, puntos: 0 },
      { id: 'eq-2', nombre: 'Equipo 2', color: PALETA_EQUIPOS[1].hex, puntos: 0 }
    ];
    this.cantidadCartas = 15;
    this.tiempoPorTurno = 60; // segundos para rondas tradicionales
    this.filtros = {
      tipos: [],       // ['titulos', 'personas', 'mix']
      categorias: [],  // ['Canción', 'Película', ...]
      dificultadMin: 1,
      dificultadMax: 5
    };

    // Mazo y rondas
    this.cartasPartida = []; // Cartas para rondas 1, 2 y 3 (cada una con su elementoAsignado)
    this.cartasRelampago = []; // 2 cartas por equipo para la relámpago
    this.cartasRondaRestantes = []; // Pila actual de la ronda
    this.cartasPasadasEnTurno = []; // Cartas pasadas durante el turno actual
    this.cartaActual = null;
    this.rondaIndex = 0; // 0: Ronda 1, 1: Ronda 2, 2: Relámpago, 3: Ronda 3
    this.equipoTurnoIndex = 0;

    // Desglose de puntos por ronda: { [rondaId]: { [equipoId]: number } }
    this.puntosPorRonda = {};

    // Estado del turno
    // 'listo' | 'jugando' | 'tiempo_agotado' | 'turno_terminado_error' | 'turno_terminado_pase' | 'mazo_completado' | 'relampago_evaluando' | 'ronda_terminada' | 'partida_terminada'
    this.faseTurno = 'listo';
    this.enPartida = false;

    // Relámpago y Desempate seguimiento
    this.relampagoTurnos = []; // Array con { equipoIndex, pasada: 1|2, carta }
    this.relampagoTurnoIndex = 0;
    this.relampagoPalabraRevelada = false;
    this.enDesempate = false;
    this.equiposDesempateIds = [];
    this.cartasReservaDesempate = [];

    // Historial para "Deshacer"
    this.ultimoAcierto = null; // { carta, equipoId, puntos, fasePrevia }
    this.ultimaAccion = null; // { tipo: 'acierto'|'paso', carta, equipoId, puntos }

    this.loadFromStorage();
  }

  get rondaActualConfig() {
    if (this.enDesempate) {
      return RONDA_DESEMPATE_CONFIG;
    }
    return RONDAS_CONFIG[this.rondaIndex] || RONDAS_CONFIG[0];
  }

  get esRondaRelampago() {
    return Boolean(this.rondaActualConfig?.esRelampago);
  }

  obtenerEquiposEmpatadosPrimerPuesto() {
    if (!this.equipos || this.equipos.length < 2) return [];
    const maxPuntos = Math.max(...this.equipos.map((e) => e.puntos));
    const empatados = this.equipos.filter((e) => e.puntos === maxPuntos);
    return empatados.length >= 2 ? empatados : [];
  }

  get equipoActual() {
    if (this.esRondaRelampago) {
      const turnoRel = this.relampagoTurnos[this.relampagoTurnoIndex];
      const eqIdx = turnoRel ? turnoRel.equipoIndex : 0;
      return this.equipos[eqIdx] || this.equipos[0];
    }
    return this.equipos[this.equipoTurnoIndex] || this.equipos[0];
  }

  // --- Validación y Gestión de Equipos ---

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

  agregarEquipo(nombre, color = null) {
    const validacion = this.validarNombreEquipo(nombre);
    if (!validacion.valid) {
      throw new Error(validacion.error);
    }
    const colorAsignado = color || PALETA_EQUIPOS[this.equipos.length % PALETA_EQUIPOS.length].hex;
    const nuevoEquipo = {
      id: `eq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nombre: validacion.sanitized,
      color: colorAsignado,
      puntos: 0
    };
    this.equipos.push(nuevoEquipo);
    this.saveToStorage();
    return nuevoEquipo;
  }

  cambiarColorEquipo(id, nuevoColor) {
    const eq = this.equipos.find((e) => e.id === id);
    if (eq && nuevoColor) {
      eq.color = nuevoColor;
      this.saveToStorage();
    }
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

  setFiltros(nuevosFiltros) {
    this.filtros = { ...this.filtros, ...nuevosFiltros };
    this.saveToStorage();
  }

  // --- Modo Desarrollador (Cartas en LocalStorage) ---

  obtenerCartasCustom() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CARTAS_DEV_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  guardarCartaCustom(nuevaCarta) {
    if (typeof localStorage === 'undefined') return nuevaCarta;
    const customs = this.obtenerCartasCustom();
    // Validar id único
    const id = Date.now();
    const cartaConId = { ...nuevaCarta, id };
    customs.push(cartaConId);
    localStorage.setItem(CARTAS_DEV_STORAGE_KEY, JSON.stringify(customs));
    return cartaConId;
  }

  // --- Ciclo de Juego ---

  /**
   * Inicia una nueva partida preparando mazo principal y mazo relámpago según filtros.
   */
  iniciarNuevaPartida(catalogoCompleto) {
    // Unir catálogo estático con cartas custom de desarrollo
    const customCards = this.obtenerCartasCustom();
    const todos = [...catalogoCompleto, ...customCards];

    // Resetear puntos e historial por ronda
    this.puntosPorRonda = {};
    RONDAS_CONFIG.forEach((r) => {
      this.puntosPorRonda[r.id] = {};
      this.equipos.forEach((eq) => {
        this.puntosPorRonda[r.id][eq.id] = 0;
      });
    });
    this.equipos.forEach((eq) => {
      eq.puntos = 0;
    });

    // 1. Filtrar cartas elegibles
    const cartasElegibles = todos.filter((c) => cartaCumpleFiltros(c, this.filtros));
    const cartasBarajadas = shuffle(cartasElegibles);

    // 2. Separar cartas para la Ronda Relámpago (2 por equipo)
    const cantidadRelampago = this.equipos.length * 2;
    if (cartasBarajadas.length < cantidadRelampago + 5) {
      throw new Error(`Se necesitan al menos ${cantidadRelampago + 5} cartas filtradas para jugar.`);
    }

    this.cartasRelampago = cartasBarajadas.slice(0, cantidadRelampago);

    // 3. Seleccionar cartas para las Rondas 1, 2 y 3
    const cartasDisponiblesPrincipal = cartasBarajadas.slice(cantidadRelampago);
    const cantidadPrincipal = Math.min(this.cantidadCartas, cartasDisponiblesPrincipal.length);
    const cartasSeleccionadas = cartasDisponiblesPrincipal.slice(0, cantidadPrincipal);

    // Guardar el resto de cartas barajadas como reserva por si hay Ronda de Desempate
    const sobrantesFiltradas = cartasDisponiblesPrincipal.slice(cantidadPrincipal);
    const idsUsados = new Set([...this.cartasRelampago, ...cartasSeleccionadas, ...sobrantesFiltradas].map((c) => c.id));
    const restoCatalogo = shuffle(todos.filter((c) => !idsUsados.has(c.id)));
    this.cartasReservaDesempate = [...sobrantesFiltradas, ...restoCatalogo];

    // Asignar y fijar el elemento para rondas 1 a 3
    this.cartasPartida = cartasSeleccionadas.map((c) => ({
      ...c,
      elementoAsignado: seleccionarElementoParaCarta(c, this.filtros)
    }));

    // Armar turnos de la ronda relámpago (2 pasadas ordenadas por equipos)
    this.relampagoTurnos = [];
    let relCartaIdx = 0;
    for (let pasada = 1; pasada <= 2; pasada++) {
      for (let eqIdx = 0; eqIdx < this.equipos.length; eqIdx++) {
        this.relampagoTurnos.push({
          equipoIndex: eqIdx,
          pasada,
          carta: this.cartasRelampago[relCartaIdx++]
        });
      }
    }

    // Inicializar ronda 1
    this.rondaIndex = 0;
    this.enDesempate = false;
    this.equiposDesempateIds = [];
    this.cartasRondaRestantes = shuffle(this.cartasPartida);
    this.cartasPasadasEnTurno = [];
    this.cartaActual = null;
    this.equipoTurnoIndex = 0;
    this.faseTurno = 'listo';
    this.enPartida = true;
    this.ultimoAcierto = null;
    this.ultimaAccion = null;
    this.relampagoTurnoIndex = 0;
    this.relampagoPalabraRevelada = false;

    this.saveToStorage();
  }

  sacarSiguienteCarta() {
    if (this.esRondaRelampago) {
      const turnoRel = this.relampagoTurnos[this.relampagoTurnoIndex];
      this.cartaActual = turnoRel ? turnoRel.carta : null;
      this.relampagoPalabraRevelada = false;
      this.saveToStorage();
      return this.cartaActual;
    }

    if (this.cartasRondaRestantes.length === 0) {
      this.cartaActual = null;
      return null;
    }
    this.cartaActual = this.cartasRondaRestantes.pop();
    this.saveToStorage();
    return this.cartaActual;
  }

  /**
   * Se acierta la carta actual (+1 punto en rondas normales).
   */
  acertarCarta() {
    if (!this.cartaActual) return null;

    const puntos = this.rondaActualConfig.puntosPorAcierto || 1;
    if (this.equipoActual) {
      this.equipoActual.puntos += puntos;
      const rId = this.rondaActualConfig.id;
      if (!this.puntosPorRonda[rId]) this.puntosPorRonda[rId] = {};
      this.puntosPorRonda[rId][this.equipoActual.id] = (this.puntosPorRonda[rId][this.equipoActual.id] || 0) + puntos;
    }

    // Guardar para "Deshacer"
    this.ultimoAcierto = {
      carta: this.cartaActual,
      equipoId: this.equipoActual.id,
      puntos,
      esRelampago: false
    };
    this.ultimaAccion = {
      tipo: 'acierto',
      carta: this.cartaActual,
      equipoId: this.equipoActual.id,
      puntos,
      esRelampago: false
    };

    // ¿Quedan más cartas sin ver en el mazo de la ronda?
    if (this.cartasRondaRestantes.length === 0) {
      this.cartaActual = null;
      // Si hubo cartas que pasaron en este turno, se devuelven al mazo y se termina el turno
      if (this.cartasPasadasEnTurno.length > 0) {
        this.cartasRondaRestantes = [...this.cartasPasadasEnTurno];
        this.cartasPasadasEnTurno = [];
        this.faseTurno = 'turno_terminado_pase';
      } else {
        // No hay cartas pasadas ni pendientes: se completó el mazo entero de la ronda
        this.faseTurno = 'mazo_completado';
      }
      this.saveToStorage();
      return null;
    }

    return this.sacarSiguienteCarta();
  }

  /**
   * Pasa la carta actual: se separa para este turno.
   * Si no quedan más cartas sin ver en el mazo, se devuelven las pasadas y concluye el turno.
   */
  pasarCarta() {
    if (!this.cartaActual || this.esRondaRelampago) return null;

    // Agregar la carta actual a las pasadas en este turno
    this.cartasPasadasEnTurno.push(this.cartaActual);
    this.ultimaAccion = {
      tipo: 'paso',
      carta: this.cartaActual
    };
    this.cartaActual = null;

    // ¿Quedan más cartas sin ver en el mazo de la ronda?
    if (this.cartasRondaRestantes.length === 0) {
      // Se recorrió todo el mazo en este turno: devolvemos las pasadas y termina el turno
      this.cartasRondaRestantes = [...this.cartasPasadasEnTurno];
      this.cartasPasadasEnTurno = [];
      this.faseTurno = 'turno_terminado_pase';
      this.saveToStorage();
      return null;
    }

    return this.sacarSiguienteCarta();
  }

  /**
   * Termina el turno por error (ej: quien da la pista dice la palabra prohibida).
   * La carta actual y las pasadas en el turno vuelven al mazo.
   */
  terminarTurnoPorError() {
    if (this.cartaActual) {
      this.cartasRondaRestantes.unshift(this.cartaActual);
      this.cartaActual = null;
    }
    if (this.cartasPasadasEnTurno.length > 0) {
      this.cartasRondaRestantes.unshift(...this.cartasPasadasEnTurno);
      this.cartasPasadasEnTurno = [];
    }
    this.faseTurno = 'turno_terminado_error';
    this.saveToStorage();
  }

  /**
   * Deshace el último acierto realizado.
   * Resta los puntos y devuelve la carta a la pantalla o mazo sin alterar el timer.
   */
  deshacerUltimoAcierto() {
    if (!this.ultimoAcierto) return false;

    const { carta, equipoId, puntos, esRelampago, rondaId } = this.ultimoAcierto;
    const eq = this.equipos.find((e) => e.id === equipoId);
    if (eq) {
      eq.puntos = Math.max(0, eq.puntos - puntos);
      const rId = rondaId || (esRelampago ? 'ronda_relampago' : this.rondaActualConfig.id);
      if (this.puntosPorRonda[rId] && this.puntosPorRonda[rId][equipoId]) {
        this.puntosPorRonda[rId][equipoId] = Math.max(0, this.puntosPorRonda[rId][equipoId] - puntos);
      }
    }

    if (esRelampago) {
      this.faseTurno = 'relampago_evaluando';
      this.ultimoAcierto = null;
      this.saveToStorage();
      return true;
    }

    // Si se había terminado el turno por mazo o por pase, reanudar
    if (this.faseTurno === 'mazo_completado' || this.faseTurno === 'turno_terminado_pase') {
      this.faseTurno = 'jugando';
    }

    // Si había una carta en pantalla, devolverla al mazo
    if (this.cartaActual) {
      this.cartasRondaRestantes.push(this.cartaActual);
    }

    // Restaurar la carta deshecha como carta activa
    this.cartaActual = carta;
    this.ultimoAcierto = null;
    this.ultimaAccion = null;
    this.saveToStorage();
    return true;
  }

  /**
   * Deshace la última acción del turno (sea acierto o paso).
   * Devuelve la carta previa a la pantalla sin alterar el temporizador.
   */
  deshacerUltimaAccion() {
    if (!this.ultimaAccion) return false;

    if (this.ultimaAccion.tipo === 'acierto') {
      return this.deshacerUltimoAcierto();
    }

    if (this.ultimaAccion.tipo === 'paso') {
      const { carta } = this.ultimaAccion;
      const idx = this.cartasPasadasEnTurno.indexOf(carta);
      if (idx !== -1) {
        this.cartasPasadasEnTurno.splice(idx, 1);
      }

      if (this.faseTurno === 'turno_terminado_pase') {
        this.faseTurno = 'jugando';
      }

      if (this.cartaActual) {
        this.cartasRondaRestantes.push(this.cartaActual);
      }

      this.cartaActual = carta;
      this.ultimaAccion = null;
      this.saveToStorage();
      return true;
    }

    return false;
  }

  /**
   * El tiempo del turno expiró.
   */
  tiempoAgotado() {
    if (this.esRondaRelampago) {
      this.relampagoPalabraRevelada = true;
      this.faseTurno = 'relampago_evaluando';
      this.saveToStorage();
      return;
    }

    if (this.cartaActual) {
      this.cartasRondaRestantes.unshift(this.cartaActual);
      this.cartaActual = null;
    }
    if (this.cartasPasadasEnTurno.length > 0) {
      this.cartasRondaRestantes.unshift(...this.cartasPasadasEnTurno);
      this.cartasPasadasEnTurno = [];
    }
    this.faseTurno = 'tiempo_agotado';
    this.saveToStorage();
  }

  /**
   * En Ronda Relámpago o Desempate: asigna los 3 puntos al equipo ganador (o a nadie).
   * @param {string|null} ganadorEquipoId - ID del equipo o null si nadie adivinó.
   */
  resolverCartaRelampago(ganadorEquipoId) {
    if (!this.esRondaRelampago) return;

    const rId = this.enDesempate ? 'ronda_desempate' : 'ronda_relampago';
    if (ganadorEquipoId) {
      const eq = this.equipos.find((e) => e.id === ganadorEquipoId);
      if (eq) {
        eq.puntos += 3;
        if (!this.puntosPorRonda[rId]) this.puntosPorRonda[rId] = {};
        this.puntosPorRonda[rId][eq.id] = (this.puntosPorRonda[rId][eq.id] || 0) + 3;
        this.ultimoAcierto = {
          carta: this.cartaActual,
          equipoId: eq.id,
          puntos: 3,
          esRelampago: true,
          rondaId: rId
        };
      }
    } else {
      this.ultimoAcierto = null;
    }

    // Pasar a la siguiente carta de la relámpago / desempate
    this.relampagoTurnoIndex += 1;

    // ¿Terminaron todos los turnos?
    if (this.relampagoTurnoIndex >= this.relampagoTurnos.length) {
      this.faseTurno = 'ronda_terminada';
    } else {
      this.faseTurno = 'listo';
      this.cartaActual = null;
    }

    this.saveToStorage();
  }

  /**
   * Prepara e inicia una Ronda de Desempate con 1 carta por cada equipo empatado en el 1.° puesto.
   */
  iniciarRondaDesempate(equiposEmpatados) {
    this.enDesempate = true;
    this.equiposDesempateIds = equiposEmpatados.map((e) => e.id);

    if (!this.puntosPorRonda['ronda_desempate']) {
      this.puntosPorRonda['ronda_desempate'] = {};
      this.equipos.forEach((eq) => {
        this.puntosPorRonda['ronda_desempate'][eq.id] = 0;
      });
    }

    // Si la reserva se agotó, reciclar cartas barajadas de la partida
    if (!Array.isArray(this.cartasReservaDesempate) || this.cartasReservaDesempate.length < equiposEmpatados.length) {
      this.cartasReservaDesempate = [
        ...(this.cartasReservaDesempate || []),
        ...shuffle(this.cartasPartida)
      ];
    }

    // 1 carta para leer por cada equipo en el empate
    this.relampagoTurnos = equiposEmpatados.map((eq) => {
      const eqIdx = this.equipos.findIndex((e) => e.id === eq.id);
      const carta = this.cartasReservaDesempate.shift() || this.cartasPartida[0];
      return {
        equipoIndex: eqIdx !== -1 ? eqIdx : 0,
        pasada: 1,
        carta
      };
    });

    this.relampagoTurnoIndex = 0;
    this.relampagoPalabraRevelada = false;
    this.cartaActual = null;
    this.cartasPasadasEnTurno = [];
    this.ultimoAcierto = null;
    this.ultimaAccion = null;
    this.faseTurno = 'listo';
    this.saveToStorage();
  }

  /**
   * Pasa el turno al siguiente equipo en rondas normales.
   */
  siguienteTurno() {
    this.equipoTurnoIndex = (this.equipoTurnoIndex + 1) % this.equipos.length;
    this.cartaActual = null;
    this.cartasPasadasEnTurno = [];
    this.faseTurno = 'listo';
    this.ultimoAcierto = null;
    this.ultimaAccion = null;
    this.saveToStorage();
  }

  /**
   * Avanza a la siguiente ronda (o activa desempate / finaliza partida si era la última).
   */
  pasarSiguienteRonda() {
    if (!this.enDesempate && this.rondaIndex + 1 < RONDAS_CONFIG.length) {
      this.rondaIndex += 1;
      this.cartaActual = null;
      this.cartasPasadasEnTurno = [];
      this.ultimoAcierto = null;
      this.ultimaAccion = null;

      if (this.esRondaRelampago) {
        this.relampagoTurnoIndex = 0;
        this.relampagoPalabraRevelada = false;
      } else {
        // Barajar de nuevo las cartas asignadas a la partida
        this.cartasRondaRestantes = shuffle(this.cartasPartida);
        this.equipoTurnoIndex = (this.equipoTurnoIndex + 1) % this.equipos.length;
      }

      this.faseTurno = 'listo';
      this.saveToStorage();
    } else {
      // Terminó la Ronda 3 (o una Ronda de Desempate): verificar si hay empate en el 1.° puesto
      const empatados = this.obtenerEquiposEmpatadosPrimerPuesto();
      if (empatados.length >= 2) {
        this.iniciarRondaDesempate(empatados);
      } else {
        this.enDesempate = false;
        this.faseTurno = 'partida_terminada';
        this.saveToStorage();
      }
    }
  }

  terminarPartida() {
    this.enPartida = false;
    this.enDesempate = false;
    this.equiposDesempateIds = [];
    this.cartasReservaDesempate = [];
    this.cartaActual = null;
    this.cartasRondaRestantes = [];
    this.cartasPasadasEnTurno = [];
    this.cartasPartida = [];
    this.cartasRelampago = [];
    this.faseTurno = 'listo';
    this.ultimoAcierto = null;
    this.ultimaAccion = null;
    this.saveToStorage();
  }

  // --- Persistencia ---

  saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = {
        equipos: this.equipos,
        cantidadCartas: this.cantidadCartas,
        tiempoPorTurno: this.tiempoPorTurno,
        filtros: this.filtros,
        cartasPartida: this.cartasPartida,
        cartasRelampago: this.cartasRelampago,
        cartasRondaRestantes: this.cartasRondaRestantes,
        cartasPasadasEnTurno: this.cartasPasadasEnTurno,
        cartaActual: this.cartaActual,
        rondaIndex: this.rondaIndex,
        equipoTurnoIndex: this.equipoTurnoIndex,
        faseTurno: this.faseTurno,
        enPartida: this.enPartida,
        relampagoTurnos: this.relampagoTurnos,
        relampagoTurnoIndex: this.relampagoTurnoIndex,
        relampagoPalabraRevelada: this.relampagoPalabraRevelada,
        enDesempate: this.enDesempate,
        equiposDesempateIds: this.equiposDesempateIds,
        cartasReservaDesempate: this.cartasReservaDesempate,
        ultimoAcierto: this.ultimoAcierto,
        puntosPorRonda: this.puntosPorRonda
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('No se pudo guardar el estado en localStorage:', e);
    }
  }

  loadFromStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.equipos) && data.equipos.length >= 2) {
        this.equipos = data.equipos;
        // Asegurar que cada equipo tenga un color válido
        this.equipos.forEach((eq, idx) => {
          if (!eq.color) {
            eq.color = PALETA_EQUIPOS[idx % PALETA_EQUIPOS.length].hex;
          }
        });
      }
      if (typeof data.cantidadCartas === 'number') this.cantidadCartas = data.cantidadCartas;
      if (typeof data.tiempoPorTurno === 'number') this.tiempoPorTurno = data.tiempoPorTurno;
      if (data.filtros) this.filtros = data.filtros;
      if (Array.isArray(data.cartasPartida)) this.cartasPartida = data.cartasPartida;
      if (Array.isArray(data.cartasRelampago)) this.cartasRelampago = data.cartasRelampago;
      if (Array.isArray(data.cartasRondaRestantes)) this.cartasRondaRestantes = data.cartasRondaRestantes;
      if (Array.isArray(data.cartasPasadasEnTurno)) this.cartasPasadasEnTurno = data.cartasPasadasEnTurno;
      this.cartaActual = data.cartaActual || null;
      this.rondaIndex = data.rondaIndex || 0;
      this.equipoTurnoIndex = data.equipoTurnoIndex || 0;
      this.faseTurno = data.faseTurno || 'listo';
      this.enPartida = Boolean(data.enPartida);
      if (Array.isArray(data.relampagoTurnos)) this.relampagoTurnos = data.relampagoTurnos;
      this.relampagoTurnoIndex = data.relampagoTurnoIndex || 0;
      this.relampagoPalabraRevelada = Boolean(data.relampagoPalabraRevelada);
      this.enDesempate = Boolean(data.enDesempate);
      if (Array.isArray(data.equiposDesempateIds)) this.equiposDesempateIds = data.equiposDesempateIds;
      if (Array.isArray(data.cartasReservaDesempate)) this.cartasReservaDesempate = data.cartasReservaDesempate;
      this.ultimoAcierto = data.ultimoAcierto || null;
      if (data.puntosPorRonda && typeof data.puntosPorRonda === 'object') {
        this.puntosPorRonda = data.puntosPorRonda;
      }
    } catch (e) {
      console.warn('No se pudo leer el estado previo de localStorage:', e);
    }
  }
}

export const gameState = new GameState();
