/**
 * Lógica pura del mazo de cartas (Fisher-Yates)
 * Libre de dependencias del DOM para máxima testabilidad.
 */

/**
 * Relación canónica entre color y tipo de elemento.
 * Centralizada en una única constante.
 */
export const COLOR_TIPOS = {
  rojo: {
    id: 'titulos',
    label: 'Títulos',
    descripcion: 'Canciones, películas, álbumes, series, libros'
  },
  verde: {
    id: 'personas',
    label: 'Personas',
    descripcion: 'Personajes de ficción, personas reales, bandas, celebridades'
  },
  violeta: {
    id: 'mix',
    label: 'Mix',
    descripcion: 'Lugares, conceptos, eventos, objetos y miscelánea'
  }
};

/**
 * Baraja una copia del array usando el algoritmo de Fisher-Yates.
 * @template T
 * @param {T[]} array
 * @returns {T[]} Nuevo array barajado
 */
export function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Determina si una carta cumple con los filtros activos.
 * @param {Object} carta
 * @param {Object} filtros
 * @param {string[]} [filtros.tipos] - IDs de tipos (ej: ['titulos', 'personas'])
 * @param {string[]} [filtros.categorias] - Nombres de categorías seleccionadas
 * @param {number} [filtros.dificultadMin=1]
 * @param {number} [filtros.dificultadMax=5]
 * @returns {boolean}
 */
export function cartaCumpleFiltros(carta, filtros = {}) {
  const { tipos = [], categorias = [], dificultadMin = 1, dificultadMax = 5 } = filtros;

  // Filtro de dificultad
  const dif = carta.dificultad || 1;
  if (dif < dificultadMin || dif > dificultadMax) {
    return false;
  }

  // Si no hay filtros de tipo ni categoría, cumple
  if (tipos.length === 0 && categorias.length === 0) {
    return true;
  }

  // Debe tener al menos un elemento que cumpla los filtros seleccionados
  return carta.elementos.some((elem) => {
    const tipoDelElem = COLOR_TIPOS[elem.color]?.id;
    const cumpleTipo = tipos.length === 0 || tipos.includes(tipoDelElem);
    const cumpleCategoria = categorias.length === 0 || categorias.includes(elem.categoria);
    return cumpleTipo && cumpleCategoria;
  });
}

/**
 * Elige un elemento elegible de la carta para las rondas 1, 2 y 3 según los filtros.
 * Si varios cumplen, elige uno al azar.
 * Si no hay filtros, elige uno al azar entre los 3.
 * @param {Object} carta
 * @param {Object} filtros
 * @returns {Object} Elemento seleccionado
 */
export function seleccionarElementoParaCarta(carta, filtros = {}) {
  const { tipos = [], categorias = [] } = filtros;
  if (!carta.elementos || carta.elementos.length === 0) {
    return null;
  }

  const candidatos = carta.elementos.filter((elem) => {
    const tipoDelElem = COLOR_TIPOS[elem.color]?.id;
    const cumpleTipo = tipos.length === 0 || tipos.includes(tipoDelElem);
    const cumpleCategoria = categorias.length === 0 || categorias.includes(elem.categoria);
    return cumpleTipo && cumpleCategoria;
  });

  const pool = candidatos.length > 0 ? candidatos : carta.elementos;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Selecciona una cantidad de cartas al azar del conjunto total.
 * @template T
 * @param {T[]} allCards
 * @param {number} count
 * @returns {T[]}
 */
export function selectRandomCards(allCards, count) {
  const shuffled = shuffle(allCards);
  return shuffled.slice(0, Math.min(count, allCards.length));
}

/**
 * Clase controladora del mazo para una ronda.
 */
export class Deck {
  /**
   * @param {Array} cards - Cartas iniciales para este mazo
   */
  constructor(cards = []) {
    this.initialCards = [...cards];
    this.remainingCards = shuffle(cards);
    this.drawnCards = [];
  }

  /**
   * Saca la siguiente carta del mazo.
   * @returns {Object|null} Carta extraída o null si no quedan cartas.
   */
  draw() {
    if (this.remainingCards.length === 0) {
      return null;
    }
    const card = this.remainingCards.pop();
    this.drawnCards.push(card);
    return card;
  }

  /**
   * Cantidad de cartas restantes en la pila actual.
   * @returns {number}
   */
  get remainingCount() {
    return this.remainingCards.length;
  }

  /**
   * Total de cartas de la partida.
   * @returns {number}
   */
  get totalCount() {
    return this.initialCards.length;
  }

  /**
   * Si el mazo se quedó sin cartas.
   * @returns {boolean}
   */
  get isEmpty() {
    return this.remainingCards.length === 0;
  }

  /**
   * Reinicia el mazo para una nueva ronda manteniendo las mismas cartas.
   */
  resetForNewRound() {
    this.remainingCards = shuffle(this.initialCards);
    this.drawnCards = [];
  }
}
