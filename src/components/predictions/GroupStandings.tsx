"use client";

import { StandingRow, TEAMS, calculateGroupStandings, getGroupMatches, MatchPrediction } from "@/lib/worldCupData";
import Flag from "@/components/ui/Flag";

interface GroupStandingsProps {
  standings: StandingRow[];
  groupName: string;
  officialMatchesMap?: Record<string, { home_goals?: number; away_goals?: number; homeGoals?: number; awayGoals?: number }>;
}

export default function GroupStandings({ standings, groupName, officialMatchesMap }: GroupStandingsProps) {
  // Convertir el mapa de partidos oficiales en el formato MatchPrediction para poder calcular la tabla
  const officialPreds: Record<string, MatchPrediction> = {};
  if (officialMatchesMap) {
    Object.entries(officialMatchesMap).forEach(([id, match]) => {
      const home = match.home_goals !== undefined ? match.home_goals : match.homeGoals;
      const away = match.away_goals !== undefined ? match.away_goals : match.awayGoals;
      if (home !== undefined && home !== null && away !== undefined && away !== null) {
        officialPreds[id] = {
          matchId: id,
          homeGoals: home,
          awayGoals: away
        };
      }
    });
  }

  // Verificar si el grupo ha sido completamente completado
  const groupMatches = getGroupMatches(groupName);
  const isGroupCompleted = groupMatches.length > 0 && groupMatches.every(m => officialPreds[m.id] !== undefined);

  // Calcular la tabla de posiciones oficial si está completa
  const officialStandings = isGroupCompleted ? calculateGroupStandings(groupName, officialPreds) : [];

  return (
    <div className="glass-panel overflow-hidden">
      <div className="bg-card px-4 py-3 border-b border-line flex items-center justify-between">
        <h3 className="text-sm font-bold text-content uppercase tracking-wider">
          Tabla Grupo {groupName}
        </h3>
        {isGroupCompleted && (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full shrink-0">
            Grupo Finalizado
          </span>
        )}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-line text-content-muted">
            <th className="py-2 px-2 text-left font-semibold">#</th>
            <th className="py-2 px-2 text-left font-semibold">Equipo</th>
            <th className="py-2 px-1 text-center font-semibold">PJ</th>
            <th className="py-2 px-1 text-center font-semibold">G</th>
            <th className="py-2 px-1 text-center font-semibold">E</th>
            <th className="py-2 px-1 text-center font-semibold">P</th>
            <th className="py-2 px-1 text-center font-semibold">GF</th>
            <th className="py-2 px-1 text-center font-semibold">GC</th>
            <th className="py-2 px-1 text-center font-semibold">Dif</th>
            <th className="py-2 px-2 text-center font-bold">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/50">
          {standings.map((row, idx) => {
            const team = TEAMS[row.teamCode];
            // Colores: 1° y 2° clasifican directo (verde), 3° posible repechaje (amarillo)
            let rowClass = "";
            if (idx === 0 || idx === 1) rowClass = "bg-brand/5";
            else if (idx === 2) rowClass = "bg-yellow-500/5";

            // Un usuario suma +3 pts por cada posición del 1 al 3 que coincida exactamente con la oficial final
            const isCorrectPosition = isGroupCompleted && idx < 3 && officialStandings[idx]?.teamCode === row.teamCode;

            return (
              <tr key={row.teamCode} className={`${rowClass} transition-colors`}>
                <td className="py-2 px-2 font-bold text-content-muted">{idx + 1}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {team && <Flag iso2={team.iso2} name={team.name} size="sm" />}
                    <span className="font-medium text-content truncate max-w-[80px]" title={team?.name}>
                      {team?.name}
                    </span>
                    {isCorrectPosition && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 shrink-0 shadow-sm animate-pulse"
                        title="Predicción de posición exacta acertada (+3 pts)"
                      >
                        +3 pts
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-1 text-center text-content-muted">{row.played}</td>
                <td className="py-2 px-1 text-center text-content-muted">{row.won}</td>
                <td className="py-2 px-1 text-center text-content-muted">{row.drawn}</td>
                <td className="py-2 px-1 text-center text-content-muted">{row.lost}</td>
                <td className="py-2 px-1 text-center text-content-muted">{row.goalsFor}</td>
                <td className="py-2 px-1 text-center text-content-muted">{row.goalsAgainst}</td>
                <td className="py-2 px-1 text-center font-medium text-content">
                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                </td>
                <td className="py-2 px-2 text-center font-bold text-brand">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Leyenda */}
      <div className="px-4 py-2 border-t border-line/50 flex gap-4 text-[10px] text-content-muted">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand/40"></span> Clasifica directo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500/40"></span> Posible repechaje</span>
      </div>
    </div>
  );
}
