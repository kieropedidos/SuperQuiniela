"use client";

import { StandingRow, TEAMS } from "@/lib/worldCupData";
import Flag from "@/components/ui/Flag";

interface GroupStandingsProps {
  standings: StandingRow[];
  groupName: string;
}

export default function GroupStandings({ standings, groupName }: GroupStandingsProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="bg-card px-4 py-3 border-b border-line">
        <h3 className="text-sm font-bold text-content uppercase tracking-wider">
          Tabla Grupo {groupName}
        </h3>
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

            return (
              <tr key={row.teamCode} className={`${rowClass} transition-colors`}>
                <td className="py-2 px-2 font-bold text-content-muted">{idx + 1}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-1.5">
                    {team && <Flag iso2={team.iso2} name={team.name} size="sm" />}
                    <span className="font-medium text-content truncate max-w-[80px]">{team?.name}</span>
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
