"use client";

import { TEAMS, KnockoutMatch, ROUND_NAMES, MatchPrediction } from "@/lib/worldCupData";
import Flag from "@/components/ui/Flag";

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
      <div className={`px-3 py-1.5 flex items-center justify-between border-b ${
        isTie ? "bg-red-500/10 border-red-500/30" : "bg-panel/50 border-line/50"
      }`}>
        <span className={`text-[10px] font-medium ${isTie ? "text-red-400" : "text-content-muted"}`}>{match.id}</span>
        <span className={`text-[10px] font-semibold ${
          isTie ? "text-red-500" : hasBothTeams ? "text-brand" : "text-content-muted"
        }`}>
          {isTie ? "Requiere Desempate" : hasBothTeams ? "Pendiente" : "TBD"}
        </span>
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
          disabled={!hasBothTeams || readOnly}
          value={prediction?.homeGoals ?? ""}
          onChange={(e) => onUpdate?.(match.id, "home", e.target.value)}
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
          disabled={!hasBothTeams || readOnly}
          value={prediction?.awayGoals ?? ""}
          onChange={(e) => onUpdate?.(match.id, "away", e.target.value)}
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
      <div className="hidden lg:block space-y-12">
        <div className="flex gap-12 pl-0 overflow-x-auto hide-scrollbar">
          {roundOrder.map((round) => (
            <div key={round} className="w-52 shrink-0 text-center">
              <h3 className={`text-xs font-bold uppercase tracking-widest ${
                round === "FINAL" ? "text-yellow-500" : "text-brand"
              }`}>
                {ROUND_NAMES[round]}
              </h3>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto hide-scrollbar pb-4">
          <div className="flex gap-12 items-stretch min-w-max">
            {roundOrder.map((round) => {
              const roundMatches = topHalf[round] || [];
              if (roundMatches.length === 0 && round !== "FINAL") return null;
              return (
                <div key={round}>
                  {renderRoundColumn(round, roundMatches, gapClasses[round])}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-line/30 mx-8"></div>

        <div className="overflow-x-auto hide-scrollbar pb-4">
          <div className="flex gap-12 items-stretch min-w-max">
            {roundOrder.map((round) => {
              const roundMatches = bottomHalf[round] || [];
              if (roundMatches.length === 0) return null;
              return (
                <div key={round}>
                  {renderRoundColumn(round, roundMatches, gapClasses[round])}
                </div>
              );
            })}
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

      {/* Vista Mobile (Lista Vertical Apilada) */}
      <div className="lg:hidden flex flex-col space-y-8 mt-2">
        {roundOrder.map((round) => {
          const roundMatches = byRound[round] || [];
          if (roundMatches.length === 0) return null;
          
          return (
            <div key={round} className="space-y-4">
              <h3 className="font-bold text-brand text-lg border-b border-line pb-2 uppercase tracking-wide">
                {ROUND_NAMES[round]}
              </h3>
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
            </div>
          );
        })}
        
        {thirdPlaceMatch && (
          <div className="space-y-4 mt-6">
            <h3 className="font-bold text-content-muted text-lg border-b border-line pb-2 uppercase tracking-wide">
              {ROUND_NAMES["3RD"]}
            </h3>
            <BracketMatchCard
              match={thirdPlaceMatch}
              homeCode={resolvedBracket[thirdPlaceMatch.id]?.home || ""}
              awayCode={resolvedBracket[thirdPlaceMatch.id]?.away || ""}
              prediction={predictions[thirdPlaceMatch.id]}
              readOnly={readOnly}
              onUpdate={onUpdate}
            />
          </div>
        )}
      </div>
    </>
  );
}
