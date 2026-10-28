/**
 * Lógica pura del mazo de cartas (Fisher-Yates)
 * Libre de dependencias del DOM para máxima testabilidad.
 */

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
