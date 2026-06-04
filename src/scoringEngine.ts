/**
 * SCORING ENGINE - PLATAFORMA DE QUINIELAS MUNDIALISTAS
 * Lógica matemática y pura para calcular puntos por partido en base a la matriz del torneo.
 */

/**
 * Interfaz que representa el resultado detallado de la puntuación
 */
export interface MatchScoringResult {
  points: number;
  isExactScore: boolean;
  isWinnerGuessed: boolean;
  isTieGuessed: boolean;
  isConsolation: boolean;
  isIncorrect: boolean;
}

/**
 * Función pura que calcula exactamente los puntos obtenidos por un usuario en base a su predicción
 * y el resultado real del partido en los 90 minutos reglamentarios.
 * 
 * Reglas de Puntuación aplicadas:
 * 1. Marcador Exacto (goles coinciden perfectamente): +5 puntos.
 * 2. Acertar Ganador, pero no el marcador exacto (ej: predijo 2-1, quedó 1-0): +3 puntos.
 * 3. Acertar Empate, pero no el marcador exacto (ej: predijo 1-1, quedó 2-2): +3 puntos.
 * 4. Predijo Empate, pero ganó cualquier equipo (Consolación): +1 punto.
 * 5. Predijo Ganador, pero el partido quedó empate (Consolación): +1 punto.
 * 6. Ganador Incorrecto (cualquier otro caso): 0 puntos.
 * 
 * @param predHome Goles predichos para el equipo local
 * @param predAway Goles predichos para el equipo visitante
 * @param realHome Goles reales marcados por el equipo local
 * @param realAway Goles reales marcados por el equipo visitante
 * @returns Número de puntos acumulados (5, 3, 1, o 0)
 */
export function calculateMatchPoints(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number
): number {
  // Validación rápida para asegurar que no se procesen números negativos
  if (predHome < 0 || predAway < 0 || realHome < 0 || realAway < 0) {
    return 0;
  }

  // Caso 1: Marcador Exacto (+5 puntos)
  if (predHome === realHome && predAway === realAway) {
    return 5;
  }

  // Determinar los signos del resultado (1 = Victoria Local, -1 = Victoria Visitante, 0 = Empate)
  const predSign = Math.sign(predHome - predAway);
  const realSign = Math.sign(realHome - realAway);

  // Casos 2 y 3: Acertar Ganador o Empate sin marcador exacto (+3 puntos)
  if (predSign === realSign) {
    return 3;
  }

  // Casos 4 y 5: Consolaciones por aproximación (+1 punto)
  // - Caso 4: Predijo Empate (predSign === 0), pero ganó cualquier equipo (realSign !== 0)
  // - Caso 5: Predijo Ganador (predSign !== 0), pero el partido quedó empate (realSign === 0)
  if (predSign === 0 || realSign === 0) {
    return 1;
  }

  // Caso 6: Ganador Incorrecto (0 puntos)
  return 0;
}

/**
 * Función extendida que proporciona un desglose detallado del cálculo de puntos.
 * Útil para interfaces de usuario que deseen explicar detalladamente al usuario por qué
 * obtuvo dicho puntaje.
 */
export function getDetailedMatchScoring(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number
): MatchScoringResult {
  const points = calculateMatchPoints(predHome, predAway, realHome, realAway);
  
  const predSign = Math.sign(predHome - predAway);
  const realSign = Math.sign(realHome - realAway);

  const isExactScore = predHome === realHome && predAway === realAway;
  const isWinnerGuessed = !isExactScore && predSign === realSign && realSign !== 0;
  const isTieGuessed = !isExactScore && predSign === realSign && realSign === 0;
  const isConsolation = (predSign === 0 && realSign !== 0) || (predSign !== 0 && realSign === 0);
  const isIncorrect = points === 0;

  return {
    points,
    isExactScore,
    isWinnerGuessed,
    isTieGuessed,
    isConsolation,
    isIncorrect
  };
}
