/**
 * SCORING ENGINE - PLATAFORMA DE QUINIELAS MUNDIALISTAS
 * Lógica matemática y pura para calcular puntos por partido en base a la matriz del torneo.
 */

import {
  GROUP_NAMES,
  getGroupMatches,
  getGroupResults,
  resolveKnockoutBracket,
  MatchPrediction
} from "./lib/worldCupData";

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
 * y el resultado real del partido (90 minutos reglamentarios en fase de grupos, o partido completo con penales en eliminatorias).
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

export interface BonusesResult {
  groupPoints: number; // 3 pts per correct position 1-3 in completed groups
  podioPoints: number; // 5 pts per correct position in Champion, RunnerUp, 3rd, 4th
  total: number;
}

/**
 * Calcula dinámicamente los puntos extras por bonos del torneo:
 * 1. Fase de Grupos: +3 pts por cada posición exacta (del 1º al 3º) en grupos completados.
 * 2. Podio Final: +5 pts por cada posición exacta en el podio (Campeón, Subcampeón, 3er Lugar y 4to Lugar).
 */
export function calculateTournamentBonuses(
  userPreds: Record<string, MatchPrediction>,
  userKO: Record<string, MatchPrediction>,
  officialMatches: any[]
): BonusesResult {
  const officialMatchesMap: Record<string, { home_goals: number; away_goals: number }> = {};
  const officialPreds: Record<string, MatchPrediction> = {};
  
  officialMatches.forEach((om) => {
    officialMatchesMap[om.match_id] = { home_goals: om.home_goals, away_goals: om.away_goals };
    officialPreds[om.match_id] = {
      matchId: om.match_id,
      homeGoals: om.home_goals,
      awayGoals: om.away_goals,
    };
  });

  // 1. FASE DE GRUPOS (Puntos por posición exacta 1 al 3 de los grupos completados)
  let groupPoints = 0;
  const userGroupResults = getGroupResults(userPreds);
  const officialGroupResults = getGroupResults(officialPreds);

  for (const group of GROUP_NAMES) {
    const groupMatchIds = getGroupMatches(group).map((m) => m.id);
    const isGroupCompleted = groupMatchIds.every((id) => officialMatchesMap[id] !== undefined);
    
    if (isGroupCompleted) {
      const u1 = userGroupResults[group]?.first;
      const u2 = userGroupResults[group]?.second;
      const u3 = userGroupResults[group]?.third?.teamCode;
      
      const o1 = officialGroupResults[group]?.first;
      const o2 = officialGroupResults[group]?.second;
      const o3 = officialGroupResults[group]?.third?.teamCode;
      
      if (u1 && o1 && u1 === o1) groupPoints += 3;
      if (u2 && o2 && u2 === o2) groupPoints += 3;
      if (u3 && o3 && u3 === o3) groupPoints += 3;
    }
  }

  // 2. PODIO FINAL (5 pts por cada posición exacta de Campeón, Subcampeón, 3er y 4to lugar)
  let podioPoints = 0;

  // Resolver brackets
  const userBracket = resolveKnockoutBracket(userGroupResults, userKO);
  const officialBracket = resolveKnockoutBracket(officialGroupResults, officialPreds);

  // Resolver ganadores y perdedores de los partidos de finales en un bracket
  const getWinnersAndLosers = (bracket: Record<string, { home: string; away: string }>, preds: Record<string, MatchPrediction>) => {
    const m103 = bracket["M103"]; // 3RD
    const p103 = preds["M103"];
    let third = "";
    let fourth = "";
    if (m103 && p103 && p103.homeGoals !== null && p103.awayGoals !== null && m103.home && m103.away) {
      if (p103.homeGoals > p103.awayGoals) {
        third = m103.home;
        fourth = m103.away;
      } else {
        third = m103.away;
        fourth = m103.home;
      }
    }

    const m104 = bracket["M104"]; // FINAL
    const p104 = preds["M104"];
    let champion = "";
    let runnerUp = "";
    if (m104 && p104 && p104.homeGoals !== null && p104.awayGoals !== null && m104.home && m104.away) {
      if (p104.homeGoals > p104.awayGoals) {
        champion = m104.home;
        runnerUp = m104.away;
      } else {
        champion = m104.away;
        runnerUp = m104.home;
      }
    }

    return { champion, runnerUp, third, fourth };
  };

  const userPodio = getWinnersAndLosers(userBracket, userKO);
  const officialPodio = getWinnersAndLosers(officialBracket, officialPreds);

  // Solo comparar si el partido correspondiente oficial ha sido jugado (existe en officialMatchesMap)
  const isFinalMatchCompleted = officialMatchesMap["M104"] !== undefined;
  const is3rdMatchCompleted = officialMatchesMap["M103"] !== undefined;

  if (isFinalMatchCompleted) {
    if (userPodio.champion && officialPodio.champion && userPodio.champion === officialPodio.champion) {
      podioPoints += 5;
    }
    if (userPodio.runnerUp && officialPodio.runnerUp && userPodio.runnerUp === officialPodio.runnerUp) {
      podioPoints += 5;
    }
  }

  if (is3rdMatchCompleted) {
    if (userPodio.third && officialPodio.third && userPodio.third === officialPodio.third) {
      podioPoints += 5;
    }
    if (userPodio.fourth && officialPodio.fourth && userPodio.fourth === officialPodio.fourth) {
      podioPoints += 5;
    }
  }

  return {
    groupPoints,
    podioPoints,
    total: groupPoints + podioPoints,
  };
}

export interface UserPointsBreakdown {
  matchPoints: number;
  bonusPoints: number;
  totalPoints: number;
  exactScoresCount: number;
}

export function calculateUserPoints(
  userPreds: Record<string, MatchPrediction>,
  userKO: Record<string, MatchPrediction>,
  officialMatches: any[]
): UserPointsBreakdown {
  const officialMatchesMap: Record<string, { home_goals: number; away_goals: number }> = {};
  const officialGroupPreds: Record<string, MatchPrediction> = {};
  const officialKOPreds: Record<string, MatchPrediction> = {};

  officialMatches.forEach((om) => {
    officialMatchesMap[om.match_id] = { home_goals: om.home_goals, away_goals: om.away_goals };
    if (om.match_id.startsWith("M")) {
      officialKOPreds[om.match_id] = {
        matchId: om.match_id,
        homeGoals: om.home_goals,
        awayGoals: om.away_goals,
      };
    } else {
      officialGroupPreds[om.match_id] = {
        matchId: om.match_id,
        homeGoals: om.home_goals,
        awayGoals: om.away_goals,
      };
    }
  });

  const userGroupResults = getGroupResults(userPreds);
  const userBracket = resolveKnockoutBracket(userGroupResults, userKO);

  const officialGroupResults = getGroupResults(officialGroupPreds);
  const officialBracket = resolveKnockoutBracket(officialGroupResults, officialKOPreds);

  let matchPoints = 0;
  let exactScoresCount = 0;

  officialMatches.forEach((om) => {
    const isKnockout = om.match_id.startsWith("M");
    const pred = isKnockout ? userKO[om.match_id] : userPreds[om.match_id];

    if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
      const pts = calculateMatchPoints(
        pred.homeGoals,
        pred.awayGoals,
        om.home_goals,
        om.away_goals
      );
      matchPoints += pts;

      if (pred.homeGoals === om.home_goals && pred.awayGoals === om.away_goals) {
        exactScoresCount++;
      }
    }
  });

  const bonuses = calculateTournamentBonuses(userPreds, userKO, officialMatches);

  return {
    matchPoints,
    bonusPoints: bonuses.total,
    totalPoints: matchPoints + bonuses.total,
    exactScoresCount,
  };
}
