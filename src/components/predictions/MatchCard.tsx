"use client";

import { CalendarDays, Lock } from "lucide-react";

interface MatchCardProps {
  id: string;
  homeTeam: string;
  homeFlag: string;
  awayTeam: string;
  awayFlag: string;
  dateStr: string;
  groupStr: string;
  predHome?: number | null;
  predAway?: number | null;
  isLocked?: boolean;
  onSave?: (home: number, away: number) => void;
}

export default function MatchCard({
  id,
  homeTeam,
  homeFlag,
  awayTeam,
  awayFlag,
  dateStr,
  groupStr,
  predHome = null,
  predAway = null,
  isLocked = false,
  onSave,
}: MatchCardProps) {
  const handleSave = () => {
    if (onSave) {
      onSave(predHome ?? 0, predAway ?? 0);
    }
  };

  return (
    <div className="glass-card flex flex-col p-5 hover:border-brand/30 transition-colors">
      {/* Header del Partido */}
      <div className="flex items-center justify-between text-xs text-content-muted mb-6">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={14} />
          <span>{dateStr}</span>
        </div>
        <div className="bg-line px-2 py-1 rounded-md font-medium text-content/80">
          Grupo {groupStr}
        </div>
      </div>

      {/* Contenido Principal: Equipos y Marcadores */}
      <div className="flex items-center justify-between px-2 mb-8">
        
        {/* Equipo Local */}
        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="text-4xl filter drop-shadow-md">{homeFlag}</div>
          <span className="font-semibold text-content text-sm text-center">{homeTeam}</span>
        </div>

        {/* Marcadores */}
        <div className="flex items-center gap-3 w-1/3 justify-center">
          <input
            type="number"
            disabled={isLocked}
            defaultValue={predHome ?? ""}
            placeholder="-"
            className="w-12 h-14 bg-transparent border-2 border-line rounded-lg text-center text-xl font-bold text-content focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
          />
          <span className="text-content-muted font-bold">-</span>
          <input
            type="number"
            disabled={isLocked}
            defaultValue={predAway ?? ""}
            placeholder="-"
            className="w-12 h-14 bg-transparent border-2 border-line rounded-lg text-center text-xl font-bold text-content focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
          />
        </div>

        {/* Equipo Visitante */}
        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="text-4xl filter drop-shadow-md">{awayFlag}</div>
          <span className="font-semibold text-content text-sm text-center">{awayTeam}</span>
        </div>
      </div>

      {/* Footer del Partido */}
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-line/50">
        <div className="flex items-center gap-1.5 text-xs text-content-muted">
          <Lock size={12} />
          <span>Los pronósticos se bloquean al inicio</span>
        </div>
        
        {isLocked ? (
          <button disabled className="bg-line/50 text-content-muted px-4 py-1.5 rounded-md text-sm font-medium cursor-not-allowed flex items-center gap-1.5">
            <Lock size={14} /> Bloqueado
          </button>
        ) : (
          <button 
            onClick={handleSave}
            className="bg-brand/10 text-brand hover:bg-brand hover:text-white border border-brand/50 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors shadow-[0_0_10px_rgba(0,176,107,0.2)]"
          >
            Guardar
          </button>
        )}
      </div>
    </div>
  );
}
