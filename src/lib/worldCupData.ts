// ===========================================================================
// WORLD CUP DATA - MUNDIAL FIFA 2026
// Datos oficiales del sorteo (5 Dic 2025) + lógica de clasificación
// ===========================================================================

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------
export interface Team {
  name: string;
  code: string;
  flag: string;
  iso2: string; // código ISO 3166-1 alpha-2 para flagcdn.com
}

export interface GroupMatch {
  id: string;
  group: string;
  matchday: number;
  homeTeam: string; // code del equipo
  awayTeam: string; // code del equipo
}

export interface MatchPrediction {
  matchId: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface StandingRow {
  teamCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface KnockoutMatch {
  id: string;
  round: string; // 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'FINAL'
  homeSlot: string; // ej: '1A', '2B', '3ABCDF'
  awaySlot: string;
  homeTeam?: string; // code, se rellena dinámicamente
  awayTeam?: string;
}

// ---------------------------------------------------------------------------
// 48 EQUIPOS OFICIALES
// ---------------------------------------------------------------------------
export const TEAMS: Record<string, Team> = {
  // Grupo A
  MEX: { name: "México", code: "MEX", flag: "🇲🇽", iso2: "mx" },
  RSA: { name: "Sudáfrica", code: "RSA", flag: "🇿🇦", iso2: "za" },
  KOR: { name: "Corea del Sur", code: "KOR", flag: "🇰🇷", iso2: "kr" },
  CZE: { name: "Chequia", code: "CZE", flag: "🇨🇿", iso2: "cz" },
  // Grupo B
  CAN: { name: "Canadá", code: "CAN", flag: "🇨🇦", iso2: "ca" },
  BIH: { name: "Bosnia y Herz.", code: "BIH", flag: "🇧🇦", iso2: "ba" },
  QAT: { name: "Qatar", code: "QAT", flag: "🇶🇦", iso2: "qa" },
  SUI: { name: "Suiza", code: "SUI", flag: "🇨🇭", iso2: "ch" },
  // Grupo C
  BRA: { name: "Brasil", code: "BRA", flag: "🇧🇷", iso2: "br" },
  MAR: { name: "Marruecos", code: "MAR", flag: "🇲🇦", iso2: "ma" },
  HAI: { name: "Haití", code: "HAI", flag: "🇭🇹", iso2: "ht" },
  SCO: { name: "Escocia", code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", iso2: "gb-sct" },
  // Grupo D
  USA: { name: "Estados Unidos", code: "USA", flag: "🇺🇸", iso2: "us" },
  PAR: { name: "Paraguay", code: "PAR", flag: "🇵🇾", iso2: "py" },
  AUS: { name: "Australia", code: "AUS", flag: "🇦🇺", iso2: "au" },
  TUR: { name: "Turquía", code: "TUR", flag: "🇹🇷", iso2: "tr" },
  // Grupo E
  GER: { name: "Alemania", code: "GER", flag: "🇩🇪", iso2: "de" },
  CUW: { name: "Curazao", code: "CUW", flag: "🇨🇼", iso2: "cw" },
  CIV: { name: "Costa de Marfil", code: "CIV", flag: "🇨🇮", iso2: "ci" },
  ECU: { name: "Ecuador", code: "ECU", flag: "🇪🇨", iso2: "ec" },
  // Grupo F
  NED: { name: "Países Bajos", code: "NED", flag: "🇳🇱", iso2: "nl" },
  JPN: { name: "Japón", code: "JPN", flag: "🇯🇵", iso2: "jp" },
  SWE: { name: "Suecia", code: "SWE", flag: "🇸🇪", iso2: "se" },
  TUN: { name: "Túnez", code: "TUN", flag: "🇹🇳", iso2: "tn" },
  // Grupo G
  BEL: { name: "Bélgica", code: "BEL", flag: "🇧🇪", iso2: "be" },
  EGY: { name: "Egipto", code: "EGY", flag: "🇪🇬", iso2: "eg" },
  IRN: { name: "Irán", code: "IRN", flag: "🇮🇷", iso2: "ir" },
  NZL: { name: "Nueva Zelanda", code: "NZL", flag: "🇳🇿", iso2: "nz" },
  // Grupo H
  ESP: { name: "España", code: "ESP", flag: "🇪🇸", iso2: "es" },
  CPV: { name: "Cabo Verde", code: "CPV", flag: "🇨🇻", iso2: "cv" },
  KSA: { name: "Arabia Saudita", code: "KSA", flag: "🇸🇦", iso2: "sa" },
  URU: { name: "Uruguay", code: "URU", flag: "🇺🇾", iso2: "uy" },
  // Grupo I
  FRA: { name: "Francia", code: "FRA", flag: "🇫🇷", iso2: "fr" },
  SEN: { name: "Senegal", code: "SEN", flag: "🇸🇳", iso2: "sn" },
  IRQ: { name: "Irak", code: "IRQ", flag: "🇮🇶", iso2: "iq" },
  NOR: { name: "Noruega", code: "NOR", flag: "🇳🇴", iso2: "no" },
  // Grupo J
  ARG: { name: "Argentina", code: "ARG", flag: "🇦🇷", iso2: "ar" },
  ALG: { name: "Argelia", code: "ALG", flag: "🇩🇿", iso2: "dz" },
  AUT: { name: "Austria", code: "AUT", flag: "🇦🇹", iso2: "at" },
  JOR: { name: "Jordania", code: "JOR", flag: "🇯🇴", iso2: "jo" },
  // Grupo K
  POR: { name: "Portugal", code: "POR", flag: "🇵🇹", iso2: "pt" },
  COD: { name: "R.D. Congo", code: "COD", flag: "🇨🇩", iso2: "cd" },
  UZB: { name: "Uzbekistán", code: "UZB", flag: "🇺🇿", iso2: "uz" },
  COL: { name: "Colombia", code: "COL", flag: "🇨🇴", iso2: "co" },
  // Grupo L
  ENG: { name: "Inglaterra", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", iso2: "gb-eng" },
  CRO: { name: "Croacia", code: "CRO", flag: "🇭🇷", iso2: "hr" },
  GHA: { name: "Ghana", code: "GHA", flag: "🇬🇭", iso2: "gh" },
  PAN: { name: "Panamá", code: "PAN", flag: "🇵🇦", iso2: "pa" },
};

// ---------------------------------------------------------------------------
// 12 GRUPOS OFICIALES
// ---------------------------------------------------------------------------
export const GROUPS: Record<string, string[]> = {
  A: ["MEX", "RSA", "KOR", "CZE"],
  B: ["CAN", "BIH", "QAT", "SUI"],
  C: ["BRA", "MAR", "HAI", "SCO"],
  D: ["USA", "PAR", "AUS", "TUR"],
  E: ["GER", "CUW", "CIV", "ECU"],
  F: ["NED", "JPN", "SWE", "TUN"],
  G: ["BEL", "EGY", "IRN", "NZL"],
  H: ["ESP", "CPV", "KSA", "URU"],
  I: ["FRA", "SEN", "IRQ", "NOR"],
  J: ["ARG", "ALG", "AUT", "JOR"],
  K: ["POR", "COD", "UZB", "COL"],
  L: ["ENG", "CRO", "GHA", "PAN"],
};

// ---------------------------------------------------------------------------
// 72 PARTIDOS DE FASE DE GRUPOS (6 por grupo, 3 jornadas)
// Formato estándar FIFA: J1 (1v2, 3v4), J2 (1v3, 4v2), J3 (4v1, 2v3)
// ---------------------------------------------------------------------------
function generateGroupMatches(group: string, teams: string[]): GroupMatch[] {
  const [t1, t2, t3, t4] = teams;
  return [
    // Jornada 1
    { id: `${group}-1`, group, matchday: 1, homeTeam: t1, awayTeam: t2 },
    { id: `${group}-2`, group, matchday: 1, homeTeam: t3, awayTeam: t4 },
    // Jornada 2
    { id: `${group}-3`, group, matchday: 2, homeTeam: t1, awayTeam: t3 },
    { id: `${group}-4`, group, matchday: 2, homeTeam: t4, awayTeam: t2 },
    // Jornada 3
    { id: `${group}-5`, group, matchday: 3, homeTeam: t4, awayTeam: t1 },
    { id: `${group}-6`, group, matchday: 3, homeTeam: t2, awayTeam: t3 },
  ];
}

export const ALL_GROUP_MATCHES: GroupMatch[] = Object.entries(GROUPS).flatMap(
  ([group, teams]) => generateGroupMatches(group, teams)
);

export function getGroupMatches(group: string): GroupMatch[] {
  return ALL_GROUP_MATCHES.filter((m) => m.group === group);
}

// ---------------------------------------------------------------------------
// CÁLCULO DE TABLA DE POSICIONES (criterios FIFA)
// ---------------------------------------------------------------------------
export function calculateGroupStandings(
  group: string,
  predictions: Record<string, MatchPrediction>
): StandingRow[] {
  const teams = GROUPS[group];
  const matches = getGroupMatches(group);

  // Inicializar filas
  const rows: Record<string, StandingRow> = {};
  for (const code of teams) {
    rows[code] = {
      teamCode: code,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    };
  }

  // Procesar cada partido con predicción
  for (const match of matches) {
    const pred = predictions[match.id];
    if (!pred || pred.homeGoals === null || pred.awayGoals === null) continue;

    const h = pred.homeGoals;
    const a = pred.awayGoals;
    const home = rows[match.homeTeam];
    const away = rows[match.awayTeam];

    home.played++;
    away.played++;
    home.goalsFor += h;
    home.goalsAgainst += a;
    away.goalsFor += a;
    away.goalsAgainst += h;

    if (h > a) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (h < a) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  // Recalcular diferencia de goles
  for (const code of teams) {
    rows[code].goalDiff = rows[code].goalsFor - rows[code].goalsAgainst;
  }

  // Ordenar por criterios FIFA: Pts > Dif > GF > (alfabético como fallback)
  return Object.values(rows).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamCode.localeCompare(b.teamCode);
  });
}

// ---------------------------------------------------------------------------
// CLASIFICACIÓN: OBTENER LOS 32 EQUIPOS PARA ELIMINATORIAS
// ---------------------------------------------------------------------------
export interface GroupResult {
  first: string;
  second: string;
  third: StandingRow;
}

export function getGroupResults(
  predictions: Record<string, MatchPrediction>
): Record<string, GroupResult> {
  const results: Record<string, GroupResult> = {};
  for (const group of Object.keys(GROUPS)) {
    const standings = calculateGroupStandings(group, predictions);
    results[group] = {
      first: standings[0]?.teamCode ?? "",
      second: standings[1]?.teamCode ?? "",
      third: standings[2] ?? {
        teamCode: "",
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      },
    };
  }
  return results;
}

// ---------------------------------------------------------------------------
// ANEXO C FIFA: ASIGNACIÓN DE TERCEROS LUGARES A LA RONDA DE 32
// ---------------------------------------------------------------------------
// Los 8 partidos que involucran terceros son: M74, M77, M79, M80, M81, M82, M85, M87
// Cada partido tiene restricciones sobre de qué grupo puede venir el tercer lugar:
//
// M74: 1E vs 3rd de {A,B,C,D,F}
// M77: 1I vs 3rd de {C,D,F,G,H}
// M79: 1A vs 3rd de {C,E,F,H,I}
// M80: 1L vs 3rd de {E,H,I,J,K}
// M81: 1D vs 3rd de {B,E,F,I,J}
// M82: 1G vs 3rd de {A,E,H,I,J}
// M85: 1B vs 3rd de {E,F,G,I,J}
// M87: 1K vs 3rd de {D,E,I,J,L}

interface ThirdPlaceSlot {
  matchId: string;
  allowedGroups: string[];
}

const THIRD_PLACE_SLOTS: ThirdPlaceSlot[] = [
  { matchId: "M74", allowedGroups: ["A", "B", "C", "D", "F"] },
  { matchId: "M77", allowedGroups: ["C", "D", "F", "G", "H"] },
  { matchId: "M79", allowedGroups: ["C", "E", "F", "H", "I"] },
  { matchId: "M80", allowedGroups: ["E", "H", "I", "J", "K"] },
  { matchId: "M81", allowedGroups: ["B", "E", "F", "I", "J"] },
  { matchId: "M82", allowedGroups: ["A", "E", "H", "I", "J"] },
  { matchId: "M85", allowedGroups: ["E", "F", "G", "I", "J"] },
  { matchId: "M87", allowedGroups: ["D", "E", "I", "J", "L"] },
];

/**
 * Determina los 8 mejores terceros y los asigna a sus slots del bracket
 * usando el sistema de restricciones del Anexo C de FIFA.
 * 
 * Algoritmo: Ordena los 12 terceros por ranking FIFA (pts > dif > gf),
 * toma los 8 mejores, luego los asigna a los slots respetando las
 * restricciones de grupos permitidos usando backtracking.
 */
export function assignThirdPlaceTeams(
  groupResults: Record<string, GroupResult>
): Record<string, string> {
  // Recoger los 12 terceros con su grupo de origen
  const allThirds = Object.entries(groupResults)
    .map(([group, result]) => ({
      group,
      ...result.third,
    }))
    .filter((t) => t.teamCode !== "");

  // Ordenar por ranking FIFA: Pts > Dif > GF
  allThirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.group.localeCompare(b.group);
  });

  // Tomar los 8 mejores
  const qualifyingThirds = allThirds.slice(0, 8);
  const qualifyingGroups = new Set(qualifyingThirds.map((t) => t.group));

  // Asignar usando backtracking para respetar restricciones del Anexo C
  const assignment: Record<string, string> = {};
  const usedGroups = new Set<string>();

  function backtrack(slotIndex: number): boolean {
    if (slotIndex >= THIRD_PLACE_SLOTS.length) return true;

    const slot = THIRD_PLACE_SLOTS[slotIndex];
    // Intentar cada grupo permitido para este slot
    for (const group of slot.allowedGroups) {
      if (qualifyingGroups.has(group) && !usedGroups.has(group)) {
        usedGroups.add(group);
        const third = qualifyingThirds.find((t) => t.group === group);
        if (third) {
          assignment[slot.matchId] = third.teamCode;
          if (backtrack(slotIndex + 1)) return true;
          delete assignment[slot.matchId];
        }
        usedGroups.delete(group);
      }
    }
    return false;
  }

  backtrack(0);
  return assignment;
}

// ---------------------------------------------------------------------------
// BRACKET DE ELIMINATORIAS (Ronda de 32 → Final)
// ---------------------------------------------------------------------------

// Estructura fija del bracket FIFA 2026
export const R32_MATCHES: KnockoutMatch[] = [
  // Lado A del bracket
  { id: "M73", round: "R32", homeSlot: "2A", awaySlot: "2B" },
  { id: "M74", round: "R32", homeSlot: "1E", awaySlot: "3RD" }, // 3rd place
  { id: "M75", round: "R32", homeSlot: "1F", awaySlot: "2C" },
  { id: "M76", round: "R32", homeSlot: "1C", awaySlot: "2F" },
  { id: "M77", round: "R32", homeSlot: "1I", awaySlot: "3RD" }, // 3rd place
  { id: "M78", round: "R32", homeSlot: "2E", awaySlot: "2I" },
  { id: "M79", round: "R32", homeSlot: "1A", awaySlot: "3RD" }, // 3rd place
  { id: "M80", round: "R32", homeSlot: "1L", awaySlot: "3RD" }, // 3rd place
  // Lado B del bracket
  { id: "M81", round: "R32", homeSlot: "1D", awaySlot: "3RD" }, // 3rd place
  { id: "M82", round: "R32", homeSlot: "1G", awaySlot: "3RD" }, // 3rd place
  { id: "M83", round: "R32", homeSlot: "2K", awaySlot: "2L" },
  { id: "M84", round: "R32", homeSlot: "1H", awaySlot: "2J" },
  { id: "M85", round: "R32", homeSlot: "1B", awaySlot: "3RD" }, // 3rd place
  { id: "M86", round: "R32", homeSlot: "1J", awaySlot: "2H" },
  { id: "M87", round: "R32", homeSlot: "1K", awaySlot: "3RD" }, // 3rd place
  { id: "M88", round: "R32", homeSlot: "2D", awaySlot: "2G" },
];

// Ronda de 16 (ganadores de R32)
export const R16_MATCHES: KnockoutMatch[] = [
  { id: "M89", round: "R16", homeSlot: "W_M73", awaySlot: "W_M74" },
  { id: "M90", round: "R16", homeSlot: "W_M75", awaySlot: "W_M76" },
  { id: "M91", round: "R16", homeSlot: "W_M77", awaySlot: "W_M78" },
  { id: "M92", round: "R16", homeSlot: "W_M79", awaySlot: "W_M80" },
  { id: "M93", round: "R16", homeSlot: "W_M81", awaySlot: "W_M82" },
  { id: "M94", round: "R16", homeSlot: "W_M83", awaySlot: "W_M84" },
  { id: "M95", round: "R16", homeSlot: "W_M85", awaySlot: "W_M86" },
  { id: "M96", round: "R16", homeSlot: "W_M87", awaySlot: "W_M88" },
];

// Cuartos de Final
export const QF_MATCHES: KnockoutMatch[] = [
  { id: "M97", round: "QF", homeSlot: "W_M89", awaySlot: "W_M90" },
  { id: "M98", round: "QF", homeSlot: "W_M91", awaySlot: "W_M92" },
  { id: "M99", round: "QF", homeSlot: "W_M93", awaySlot: "W_M94" },
  { id: "M100", round: "QF", homeSlot: "W_M95", awaySlot: "W_M96" },
];

// Semifinales
export const SF_MATCHES: KnockoutMatch[] = [
  { id: "M101", round: "SF", homeSlot: "W_M97", awaySlot: "W_M98" },
  { id: "M102", round: "SF", homeSlot: "W_M99", awaySlot: "W_M100" },
];

// Tercer Puesto y Final
export const FINAL_MATCHES: KnockoutMatch[] = [
  { id: "M103", round: "3RD", homeSlot: "L_M101", awaySlot: "L_M102" },
  { id: "M104", round: "FINAL", homeSlot: "W_M101", awaySlot: "W_M102" },
];

export const ALL_KNOCKOUT_MATCHES: KnockoutMatch[] = [
  ...R32_MATCHES,
  ...R16_MATCHES,
  ...QF_MATCHES,
  ...SF_MATCHES,
  ...FINAL_MATCHES,
];

// ---------------------------------------------------------------------------
// RESOLVER BRACKET: Asignar equipos reales a cada slot de eliminatorias
// ---------------------------------------------------------------------------
export function resolveKnockoutBracket(
  groupResults: Record<string, GroupResult>,
  knockoutPredictions: Record<string, MatchPrediction>
): Record<string, { home: string; away: string }> {
  const thirdAssignments = assignThirdPlaceTeams(groupResults);
  const resolved: Record<string, { home: string; away: string }> = {};
  const winners: Record<string, string> = {};

  function resolveSlot(slot: string, matchId?: string): string {
    if (slot.startsWith("1")) {
      // Ganador de grupo
      const group = slot[1];
      return groupResults[group]?.first ?? "";
    }
    if (slot.startsWith("2")) {
      // Segundo de grupo
      const group = slot[1];
      return groupResults[group]?.second ?? "";
    }
    if (slot === "3RD" && matchId) {
      // Tercer lugar asignado a este partido
      return thirdAssignments[matchId] ?? "";
    }
    if (slot.startsWith("W_")) {
      // Ganador de un partido anterior
      return winners[slot.substring(2)] ?? "";
    }
    if (slot.startsWith("L_")) {
      // Perdedor de un partido anterior
      const prevMatchId = slot.substring(2);
      const prevResolved = resolved[prevMatchId];
      const prevWinner = winners[prevMatchId];
      if (prevResolved && prevWinner) {
        return prevResolved.home === prevWinner
          ? prevResolved.away
          : prevResolved.home;
      }
      return "";
    }
    return "";
  }

  // Resolver R32
  for (const match of R32_MATCHES) {
    const home = resolveSlot(match.homeSlot, match.id);
    const away = resolveSlot(match.awaySlot, match.id);
    resolved[match.id] = { home, away };

    // Determinar ganador basado en predicción del usuario
    const pred = knockoutPredictions[match.id];
    if (pred && pred.homeGoals !== null && pred.awayGoals !== null && home && away) {
      winners[match.id] = pred.homeGoals >= pred.awayGoals ? home : away;
    }
  }

  // Resolver R16, QF, SF, Finals
  const laterRounds = [...R16_MATCHES, ...QF_MATCHES, ...SF_MATCHES, ...FINAL_MATCHES];
  for (const match of laterRounds) {
    const home = resolveSlot(match.homeSlot);
    const away = resolveSlot(match.awaySlot);
    resolved[match.id] = { home, away };

    const pred = knockoutPredictions[match.id];
    if (pred && pred.homeGoals !== null && pred.awayGoals !== null && home && away) {
      winners[match.id] = pred.homeGoals >= pred.awayGoals ? home : away;
    }
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// NOMBRES DE RONDAS EN ESPAÑOL
// ---------------------------------------------------------------------------
export const ROUND_NAMES: Record<string, string> = {
  R32: "Ronda de 32",
  R16: "Octavos de Final",
  QF: "Cuartos de Final",
  SF: "Semifinales",
  "3RD": "Tercer Puesto",
  FINAL: "Final",
};

export const GROUP_NAMES = Object.keys(GROUPS);
