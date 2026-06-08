"use client";

import { useState, useRef } from "react";
import { TEAMS, KnockoutMatch, ROUND_NAMES, MatchPrediction } from "@/lib/worldCupData";
import Flag from "@/components/ui/Flag";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Función de utilidad para enfocar automáticamente el siguiente input en móvil
const focusNextInput = (el: HTMLInputElement) => {
  setTimeout(() => {
    const inputs = Array.from(document.querySelectorAll("input[type='number']:not(:disabled)")) as HTMLInputElement[];
    const idx = inputs.indexOf(el);
    if (idx !== -1 && idx < inputs.length - 1) {
      inputs[idx + 1].focus();
      inputs[idx + 1].select();
    }
  }, 50);
};

const R32_MATCH_DESCRIPTIONS: Record<string, string> = {
  M73: "2do Lugar Grupo A vs 2do Lugar Grupo B",
  M74: "1er Lugar Grupo E vs 3er Lugar Grupo A/B/C/D/F",
  M75: "1er Lugar Grupo F vs 2do Lugar Grupo C",
  M76: "1er Lugar Grupo C vs 2do Lugar Grupo F",
  M77: "1er Lugar Grupo I vs 3er Lugar Grupo C/D/F/G/H",
  M78: "2do Lugar Grupo E vs 2do Lugar Grupo I",
  M79: "1er Lugar Grupo A vs 3er Lugar Grupo C/E/F/H/I",
  M80: "1er Lugar Grupo L vs 3er Lugar Grupo E/H/I/J/K",
  M81: "1er Lugar Grupo D vs 3er Lugar Grupo B/E/F/I/J",
  M82: "1er Lugar Grupo G vs 3er Lugar Grupo A/E/H/I/J",
  M83: "2do Lugar Grupo K vs 2do Lugar Grupo L",
  M84: "1er Lugar Grupo H vs 2do Lugar Grupo J",
  M85: "1er Lugar Grupo B vs 3er Lugar Grupo E/F/G/I/J",
  M86: "1er Lugar Grupo J vs 2do Lugar Grupo H",
  M87: "1er Lugar Grupo K vs 3er Lugar Grupo D/E/I/J/L",
  M88: "2do Lugar Grupo D vs 2do Lugar Grupo G",
};

interface BracketMatchCardProps {
  match: KnockoutMatch;
  homeCode: string;
  awayCode: string;
  prediction?: MatchPrediction;
  readOnly?: boolean;
  onUpdate?: (matchId: string, side: "home" | "away", value: string) => void;
}

function BracketMatchCard({ match, homeCode, awayCode, prediction, readOnly, onUpdate }: BracketMatchCardProps) {
  const homeTeam = homeCode ? TEAMS[homeCode] : null;
  const awayTeam = awayCode ? TEAMS[awayCode] : null;
  const hasBothTeams = !!homeTeam && !!awayTeam;

  // Determinar ganador para resaltar
  const homeGoals = prediction?.homeGoals;
  const awayGoals = prediction?.awayGoals;
  const hasResult = homeGoals !== null && homeGoals !== undefined && awayGoals !== null && awayGoals !== undefined;
  const homeWins = hasResult && homeGoals > awayGoals;
  const awayWins = hasResult && awayGoals > homeGoals;
  const isTie = hasResult && homeGoals === awayGoals;

  return (
    <div className={`flex flex-col w-full lg:w-48 shrink-0 bg-card border rounded-lg overflow-hidden transition-all duration-300 ${
      isTie 
        ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
        : match.round === "FINAL" 
        ? "border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.1)]" 
        : "border-line hover:border-brand/30"
    }`}>
      {/* Header */}
      <div className={`px-3 py-1.5 flex flex-col gap-0.5 border-b ${
        isTie ? "bg-red-500/10 border-red-500/30" : "bg-panel/50 border-line/50"
      }`}>
        <div className="flex items-center justify-between w-full">
          <span className={`text-[10px] font-bold ${isTie ? "text-red-400" : "text-brand"}`}>{match.id}</span>
          <span className={`text-[10px] font-semibold ${
            isTie ? "text-red-500" : hasBothTeams ? "text-brand" : "text-content-muted"
          }`}>
            {isTie ? "Requiere Desempate" : hasBothTeams ? "Pendiente" : "TBD"}
          </span>
        </div>
        {match.round === "R32" && R32_MATCH_DESCRIPTIONS[match.id] && (
          <span className="text-[9px] text-content-muted/80 leading-tight">
            {R32_MATCH_DESCRIPTIONS[match.id]}
          </span>
        )}
      </div>

      {/* Home Team Row */}
      <div className={`flex items-center px-3 py-2 gap-2 transition-colors ${
        homeWins ? "bg-brand/10" : ""
      }`}>
        {homeTeam ? (
          <>
            <Flag iso2={homeTeam.iso2} name={homeTeam.name} size="md" />
            <span className={`text-xs font-semibold flex-1 truncate ${
              homeWins ? "text-brand" : "text-content"
            }`}>
              {homeTeam.name}
            </span>
          </>
        ) : (
          <>
            <span className="w-5 h-5 rounded bg-line/50 shrink-0"></span>
            <span className="text-xs text-content-muted flex-1">Por definir</span>
          </>
        )}
        <input
          type="number"
          min="0"
          max="20"
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={!hasBothTeams || readOnly}
          value={prediction?.homeGoals ?? ""}
          onChange={(e) => {
            onUpdate?.(match.id, "home", e.target.value);
            if (e.target.value !== "") focusNextInput(e.target);
          }}
          placeholder="–"
          className={`w-9 h-8 rounded text-center text-sm font-bold outline-none transition-all appearance-none ${
            readOnly
              ? "bg-transparent border-transparent text-content"
              : isTie
              ? "bg-red-500/10 border border-red-500 text-red-500 focus:ring-1 focus:ring-red-500"
              : hasBothTeams
              ? "bg-base border border-line text-content focus:border-brand focus:ring-1 focus:ring-brand"
              : "bg-line/30 border border-transparent text-content-muted/30 cursor-not-allowed"
          }`}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-line/40 mx-3"></div>

      {/* Away Team Row */}
      <div className={`flex items-center px-3 py-2 gap-2 transition-colors ${
        awayWins ? "bg-brand/10" : ""
      }`}>
        {awayTeam ? (
          <>
            <Flag iso2={awayTeam.iso2} name={awayTeam.name} size="md" />
            <span className={`text-xs font-semibold flex-1 truncate ${
              awayWins ? "text-brand" : "text-content"
            }`}>
              {awayTeam.name}
            </span>
          </>
        ) : (
          <>
            <span className="w-5 h-5 rounded bg-line/50 shrink-0"></span>
            <span className="text-xs text-content-muted flex-1">Por definir</span>
          </>
        )}
        <input
          type="number"
          min="0"
          max="20"
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={!hasBothTeams || readOnly}
          value={prediction?.awayGoals ?? ""}
          onChange={(e) => {
            onUpdate?.(match.id, "away", e.target.value);
            if (e.target.value !== "") focusNextInput(e.target);
          }}
          placeholder="–"
          className={`w-9 h-8 rounded text-center text-sm font-bold outline-none transition-all appearance-none ${
            readOnly
              ? "bg-transparent border-transparent text-content"
              : isTie
              ? "bg-red-500/10 border border-red-500 text-red-500 focus:ring-1 focus:ring-red-500"
              : hasBothTeams
              ? "bg-base border border-line text-content focus:border-brand focus:ring-1 focus:ring-brand"
              : "bg-line/30 border border-transparent text-content-muted/30 cursor-not-allowed"
          }`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BRACKET PRINCIPAL
// ---------------------------------------------------------------------------
interface KnockoutBracketProps {
  matches: KnockoutMatch[];
  resolvedBracket: Record<string, { home: string; away: string }>;
  predictions: Record<string, MatchPrediction>;
  readOnly?: boolean;
  onUpdate?: (matchId: string, side: "home" | "away", value: string) => void;
}

export default function KnockoutBracket({
  matches,
  resolvedBracket,
  predictions,
  readOnly = false,
  onUpdate,
}: KnockoutBracketProps) {
  const [activeMobileRound, setActiveMobileRound] = useState<string>("R32");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollBracket = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 350;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const byRound: Record<string, KnockoutMatch[]> = {};
  for (const m of matches) {
    if (!byRound[m.round]) byRound[m.round] = [];
    byRound[m.round].push(m);
  }

  const roundOrder = ["R32", "R16", "QF", "SF", "FINAL"];
  const thirdPlaceMatch = byRound["3RD"]?.[0];

  const topHalf: Record<string, KnockoutMatch[]> = {};
  const bottomHalf: Record<string, KnockoutMatch[]> = {};

  for (const round of roundOrder) {
    const roundMatches = byRound[round] || [];
    const mid = Math.ceil(roundMatches.length / 2);
    topHalf[round] = roundMatches.slice(0, mid);
    bottomHalf[round] = roundMatches.slice(mid);
  }

  const renderRoundColumn = (
    roundKey: string,
    roundMatches: KnockoutMatch[],
    gapClass: string
  ) => {
    const N = roundMatches.length;

    return (
      <div className={`flex flex-col justify-around shrink-0 w-[240px] relative h-full`}>
        {roundMatches.map((match) => {
          const resolved = resolvedBracket[match.id] || { home: "", away: "" };
          return (
            <div key={match.id} className="relative z-10 w-full py-2">
              <BracketMatchCard
                match={match}
                homeCode={resolved.home}
                awayCode={resolved.away}
                prediction={predictions[match.id]}
                readOnly={readOnly}
                onUpdate={onUpdate}
              />
            </div>
          );
        })}

        {/* LÍNEAS CONECTORAS MATEMÁTICAS (NIVEL COLUMNA) */}
        {roundKey !== "FINAL" && N > 0 && (
          <div className="absolute inset-0 pointer-events-none hidden lg:block -z-10">
            {Array.from({ length: Math.floor(N / 2) }).map((_, p) => {
              const topCenter = ((p * 2 + 0.5) / N) * 100;
              const bottomCenter = ((p * 2 + 1.5) / N) * 100;
              const middle = ((p * 2 + 1) / N) * 100;

              return (
                <div key={p}>
                  {/* Brazo horizontal tarjeta superior */}
                  <div 
                    className="absolute right-[-1.5rem] w-6 border-t-2 border-line/70"
                    style={{ top: `${topCenter}%` }}
                  ></div>
                  
                  {/* Brazo horizontal tarjeta inferior */}
                  <div 
                    className="absolute right-[-1.5rem] w-6 border-t-2 border-line/70"
                    style={{ top: `${bottomCenter}%` }}
                  ></div>

                  {/* Llave vertical */}
                  <div 
                    className="absolute right-[-1.5rem] w-0 border-r-2 border-line/70"
                    style={{ top: `${topCenter}%`, bottom: `${100 - bottomCenter}%` }}
                  ></div>

                  {/* Brazo hacia la siguiente ronda */}
                  <div 
                    className="absolute right-[-3rem] w-6 border-t-2 border-line/70"
                    style={{ top: `${middle}%` }}
                  ></div>
                </div>
              );
            })}

            {/* Caso especial Semifinales (N=1 en su respectiva mitad) */}
            {N === 1 && (
              <div 
                className="absolute right-[-3rem] w-12 border-t-2 border-line/70"
                style={{ top: `50%` }}
              ></div>
            )}
          </div>
        )}
      </div>
    );
  };

  const gapClasses: Record<string, string> = {
    R32: "gap-3",
    R16: "gap-[4.5rem]",
    QF: "gap-[10rem]",
    SF: "gap-[20rem]",
    FINAL: "gap-0",
  };

  return (
    <>
      {/* Vista Desktop (Árbol Horizontal) */}
      <div className="hidden lg:block space-y-6 relative group/bracket">
        
        {/* Banner informativo con indicador visual */}
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between gap-4 text-xs font-medium">
          <span className="text-yellow-500/95 flex items-center gap-2">
            💡 Los mejores terceros de la Ronda de 32 están definidos de acuerdo a los resultados que colocaste en la Fase de Grupos.
          </span>
          <div className="flex items-center gap-2 bg-brand/10 border border-brand/20 px-3.5 py-1.5 rounded-lg text-brand font-bold shrink-0 animate-pulse">
            <span>Usa las flechas laterales o desliza para ver la final &rarr;</span>
          </div>
        </div>

        {/* Scroll Container Wrapper */}
        <div className="relative border border-line rounded-2xl bg-panel/10 p-6">
          {/* Botón Scroll Izquierdo */}
          <div className="absolute inset-y-0 left-4 w-12 pointer-events-none z-20">
            <div className="sticky top-[50vh] -translate-y-1/2 pointer-events-auto">
              <button
                type="button"
                onClick={() => scrollBracket("left")}
                className="bg-base/90 hover:bg-brand text-content hover:text-white border border-line hover:border-brand w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-brand/20 cursor-pointer hover:scale-105 active:scale-95 group-hover/bracket:opacity-100 opacity-60"
                title="Desplazar a la izquierda"
              >
                <ChevronLeft size={24} />
              </button>
            </div>
          </div>

          {/* Botón Scroll Derecho */}
          <div className="absolute inset-y-0 right-4 w-12 pointer-events-none z-20">
            <div className="sticky top-[50vh] -translate-y-1/2 pointer-events-auto">
              <button
                type="button"
                onClick={() => scrollBracket("right")}
                className="bg-base/90 hover:bg-brand text-content hover:text-white border border-line hover:border-brand w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-brand/20 cursor-pointer hover:scale-105 active:scale-95 group-hover/bracket:opacity-100 opacity-60"
                title="Desplazar a la derecha"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          {/* Scroll Container */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto pb-4 custom-horizontal-scrollbar scroll-smooth"
          >
            <div className="flex flex-col gap-6 min-w-max">
              {/* Headers */}
              <div className="flex gap-12 pl-0">
                {roundOrder.map((round) => (
                  <div key={round} className="w-[240px] shrink-0 text-center">
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${
                      round === "FINAL" ? "text-yellow-500" : "text-brand"
                    }`}>
                      {ROUND_NAMES[round]}
                    </h3>
                  </div>
                ))}
              </div>

              {/* Top Half */}
              <div className="flex gap-12 items-stretch">
                {roundOrder.map((round) => {
                  const roundMatches = topHalf[round] || [];
                  if (roundMatches.length === 0 && round !== "FINAL") return null;
                  return (
                    <div key={round} className="w-[240px] shrink-0">
                      {renderRoundColumn(round, roundMatches, gapClasses[round])}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-line/30 mx-8"></div>

              {/* Bottom Half */}
              <div className="flex gap-12 items-stretch">
                {roundOrder.map((round) => {
                  const roundMatches = bottomHalf[round] || [];
                  if (roundMatches.length === 0 && round !== "FINAL") return null;
                  return (
                    <div key={round} className="w-[240px] shrink-0">
                      {roundMatches.length > 0 ? (
                        renderRoundColumn(round, roundMatches, gapClasses[round])
                      ) : (
                        <div className="w-[240px] shrink-0"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {thirdPlaceMatch && (
          <div className="border-t border-line/30 pt-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-content-muted text-center mb-4">
              {ROUND_NAMES["3RD"]}
            </h3>
            <div className="flex justify-center">
              <BracketMatchCard
                match={thirdPlaceMatch}
                homeCode={resolvedBracket[thirdPlaceMatch.id]?.home || ""}
                awayCode={resolvedBracket[thirdPlaceMatch.id]?.away || ""}
                prediction={predictions[thirdPlaceMatch.id]}
                readOnly={readOnly}
                onUpdate={onUpdate}
              />
            </div>
          </div>
        )}
      </div>

      {/* Vista Mobile (Pestañas de Selección de Ronda + Vista Condicional) */}
      <div className="lg:hidden flex flex-col mt-2">
        {/* Barra de Rondas (Scrollable en móviles pequeños) */}
        <div className="relative mb-6">
          <div className="flex overflow-x-auto pb-3 gap-2 hide-scrollbar">
            {roundOrder.map((round) => {
              const isActive = activeMobileRound === round;
              const hasMatches = (byRound[round] || []).length > 0;
              if (!hasMatches) return null;

              return (
                <button
                  key={round}
                  type="button"
                  onClick={() => setActiveMobileRound(round)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
                    isActive
                      ? "bg-brand text-white border-brand shadow-[0_0_12px_rgba(0,176,107,0.3)]"
                      : "bg-panel text-content-muted border-line hover:text-content"
                  }`}
                >
                  {ROUND_NAMES[round]}
                </button>
              );
            })}
          </div>
          {/* Gradiente de desplazamiento horizontal para pestañas en móvil */}
          <div className="absolute right-0 top-0 bottom-3 w-8 pointer-events-none bg-gradient-to-l from-base to-transparent"></div>
        </div>

        {/* Partidos de la Ronda Activa */}
        <div className="space-y-4 animate-in fade-in duration-300">
          {activeMobileRound === "R32" && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3.5 text-center text-xs text-yellow-500/90 font-medium">
              💡 Los mejores terceros están definidos de acuerdo a los resultados que colocaste en la Fase de Grupos.
            </div>
          )}

          {(() => {
            const roundMatches = byRound[activeMobileRound] || [];
            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {roundMatches.map((match) => {
                    const resolved = resolvedBracket[match.id] || { home: "", away: "" };
                    return (
                      <BracketMatchCard
                        key={match.id}
                        match={match}
                        homeCode={resolved.home}
                        awayCode={resolved.away}
                        prediction={predictions[match.id]}
                        readOnly={readOnly}
                        onUpdate={onUpdate}
                      />
                    );
                  })}
                </div>

                {/* Mostrar partido de tercer puesto si estamos en la pestaña de la FINAL */}
                {activeMobileRound === "FINAL" && thirdPlaceMatch && (
                  <div className="space-y-4 mt-8 pt-6 border-t border-line/30">
                    <h3 className="font-bold text-content-muted text-sm uppercase tracking-wider text-center">
                      {ROUND_NAMES["3RD"]}
                    </h3>
                    <div className="flex justify-center">
                      <BracketMatchCard
                        match={thirdPlaceMatch}
                        homeCode={resolvedBracket[thirdPlaceMatch.id]?.home || ""}
                        awayCode={resolvedBracket[thirdPlaceMatch.id]?.away || ""}
                        prediction={predictions[thirdPlaceMatch.id]}
                        readOnly={readOnly}
                        onUpdate={onUpdate}
                      />
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Barra de Rondas Inferior (Duplicada para navegación móvil) */}
        <div className="relative mt-8">
          <div className="flex overflow-x-auto pb-3 gap-2 hide-scrollbar">
            {roundOrder.map((round) => {
              const isActive = activeMobileRound === round;
              const hasMatches = (byRound[round] || []).length > 0;
              if (!hasMatches) return null;

              return (
                <button
                  key={`bottom-${round}`}
                  type="button"
                  onClick={() => {
                    setActiveMobileRound(round);
                    // Opcionalmente hacer scroll suave hacia arriba al cambiar de ronda
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
                    isActive
                      ? "bg-brand text-white border-brand shadow-[0_0_12px_rgba(0,176,107,0.3)]"
                      : "bg-panel text-content-muted border-line hover:text-content"
                  }`}
                >
                  {ROUND_NAMES[round]}
                </button>
              );
            })}
          </div>
          {/* Gradiente de desplazamiento horizontal para pestañas en móvil */}
          <div className="absolute right-0 top-0 bottom-3 w-8 pointer-events-none bg-gradient-to-l from-base to-transparent"></div>
        </div>
      </div>
    </>
  );
}
