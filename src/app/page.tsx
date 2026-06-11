"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Users, Swords, X, Trophy, EyeOff } from "lucide-react";
import {
  ALL_GROUP_MATCHES,
  ALL_KNOCKOUT_MATCHES,
  getGroupResults,
  resolveKnockoutBracket,
  TEAMS,
  MatchPrediction,
  GROUP_NAMES,
  getGroupMatches,
  calculateGroupStandings,
} from "@/lib/worldCupData";
import { calculateMatchPoints, getDetailedMatchScoring, calculateTournamentBonuses, calculateUserPoints } from "@/scoringEngine";
import KnockoutBracket from "@/components/predictions/KnockoutBracket";
import GroupStandings from "@/components/predictions/GroupStandings";
import Flag from "@/components/ui/Flag";

import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// INTERFAZ DE DATOS DE USUARIO REAL
// ---------------------------------------------------------------------------
interface UserQuinielaData {
  id: string;
  username: string;
  championCode: string;
  runnerUpCode: string;
  points: number;
  predictions: Record<string, MatchPrediction>;
  knockoutPredictions: Record<string, MatchPrediction>;
}

// ---------------------------------------------------------------------------
// PÁGINA PRINCIPAL: HUB DE PRONÓSTICOS
// ---------------------------------------------------------------------------
export default function PronosticosPage() {
  const [viewMode, setViewMode] = useState<"feed" | "compare">("feed");
  const [users, setUsers] = useState<UserQuinielaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserQuinielaData | null>(null);
  const [modalTab, setModalTab] = useState<"groups" | "knockout">("groups");
  const [modalGroupIndex, setModalGroupIndex] = useState(0);
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");
  const [compareTab, setCompareTab] = useState<"groups" | "knockout">("groups");
  const [compareGroupFilter, setCompareGroupFilter] = useState<string>("all");
  const [officialMatchesMap, setOfficialMatchesMap] = useState<Record<string, { home_goals: number; away_goals: number }>>({});

  // Control de visibilidad global
  const [quinielasVisible, setQuinielasVisible] = useState<boolean>(true);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [hasQuiniela, setHasQuiniela] = useState<boolean>(false);
  const [quinielaStatus, setQuinielaStatus] = useState<string | null>(null);

  const openUserModal = (user: UserQuinielaData) => {
    setSelectedUser(user);
    setModalTab("groups");
    setModalGroupIndex(0);
  };

  useEffect(() => {
    async function loadQuinielas() {
      try {
        // Cargar sesión del usuario actual
        const { data: { session } } = await supabase.auth.getSession();
        const username = session?.user?.user_metadata?.username || "";
        setCurrentUsername(username);

        // Verificar si este usuario ya tiene una quiniela registrada (pendiente o aprobada)
        if (session?.user) {
          const { data: userQ } = await supabase
            .from("user_quinielas")
            .select("id, status, predictions, knockout_predictions")
            .eq("user_id", session.user.id)
            .maybeSingle();
            
          if (userQ) {
            // Verificar si la quiniela realmente está completa
            const predsMap = userQ.predictions || {};
            const koMap = userQ.knockout_predictions || {};
            
            let isComplete = true;
            for (const m of ALL_GROUP_MATCHES) {
              const p = predsMap[m.id];
              if (!p || p.homeGoals === null || p.awayGoals === null) {
                isComplete = false;
                break;
              }
            }
            if (isComplete) {
              for (const m of ALL_KNOCKOUT_MATCHES) {
                const p = koMap[m.id];
                if (!p || p.homeGoals === null || p.awayGoals === null) {
                  isComplete = false;
                  break;
                }
              }
            }
            
            const effectiveStatus = (userQ.status === "draft" || !isComplete) ? "draft" : userQ.status;
            setHasQuiniela(effectiveStatus !== "draft");
            setQuinielaStatus(effectiveStatus);
          } else {
            setHasQuiniela(false);
            setQuinielaStatus(null);
          }
        }

        // Cargar visibilidad global del torneo
        try {
          const { data: settingData, error: settingError } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "quinielas_visible")
            .single();
          if (!settingError && settingData && settingData.value) {
            setQuinielasVisible(!!settingData.value.enabled);
          }
        } catch (err) {
          console.warn("No se pudo obtener el ajuste de visibilidad. Por defecto: visible.");
        }

        const { data, error } = await supabase
          .from("user_quinielas")
          .select(`
            user_id,
            predictions,
            knockout_predictions,
            profiles (username, total_points)
          `)
          .eq("status", "approved");
        
        if (error) throw error;

        // Cargar los marcadores oficiales guardados por el administrador
        const { data: officialMatchesData, error: officialError } = await supabase
          .from("official_matches")
          .select("*");

        if (officialError) {
          console.error("Error al cargar partidos oficiales:", officialError);
        }

        const officialMatches = officialMatchesData || [];

        // Construir mapa de resultados oficiales para acceso rápido
        const offMap: Record<string, { home_goals: number; away_goals: number }> = {};
        officialMatches.forEach((om: any) => {
          offMap[om.match_id] = { home_goals: om.home_goals, away_goals: om.away_goals };
        });
        setOfficialMatchesMap(offMap);
 
        const formattedUsers: UserQuinielaData[] = (data || []).map((row: any) => {
          const groupResults = getGroupResults(row.predictions);
          const resolvedKnockout = resolveKnockoutBracket(groupResults, row.knockout_predictions);
          
          let championCode = "TBD";
          let runnerUpCode = "TBD";
 
          const finalMatch = ALL_KNOCKOUT_MATCHES.find((m) => m.round === "FINAL");
          if (finalMatch) {
             const finalResolved = resolvedKnockout[finalMatch.id];
             const pred = row.knockout_predictions[finalMatch.id];
             
             if (finalResolved && pred && pred.homeGoals !== null && pred.awayGoals !== null) {
                if (pred.homeGoals > pred.awayGoals) {
                  championCode = finalResolved.home;
                  runnerUpCode = finalResolved.away;
                } else {
                  championCode = finalResolved.away;
                  runnerUpCode = finalResolved.home;
                }
             }
          }

          // Calcular puntos de forma dinámica usando el motor de puntuación unificado
          const scoring = calculateUserPoints(
            row.predictions || {},
            row.knockout_predictions || {},
            officialMatches
          );
          let calculatedPoints = scoring.totalPoints;
 
          return {
            id: row.user_id,
            username: row.profiles?.username || "Usuario",
            points: calculatedPoints, // Mostrar puntos en tiempo real calculados dinámicamente
            predictions: row.predictions,
            knockoutPredictions: row.knockout_predictions,
            championCode,
            runnerUpCode
          };
        });

        formattedUsers.sort((a, b) => b.points - a.points);
        setUsers(formattedUsers);
        if (formattedUsers.length >= 2) {
           setCompareA(formattedUsers[0].id);
           setCompareB(formattedUsers[1].id);
        } else if (formattedUsers.length === 1) {
           setCompareA(formattedUsers[0].id);
        }
      } catch (err) {
        console.error("Error loading quinielas:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadQuinielas();
  }, []);

  // Calcular bracket del usuario seleccionado
  const resolvedUserBracket = useMemo(() => {
    if (!selectedUser) return null;
    const groupResults = getGroupResults(selectedUser.predictions);
    return resolveKnockoutBracket(groupResults, selectedUser.knockoutPredictions);
  }, [selectedUser]);

  // Si está oculto y no es el administrador, mostramos pantalla premium de espera
  if (!isLoading && !quinielasVisible && currentUsername.toLowerCase() !== "vicdaddy") {
    return (
      <div className="max-w-xl mx-auto py-24 px-4 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-yellow-500/30 animate-pulse">
          <EyeOff size={44} className="text-yellow-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-content mb-4 tracking-tight">Predicciones Ocultas</h1>
        <p className="text-content-muted mb-4 text-lg">
          Las quinielas de todos los participantes están <strong className="text-yellow-500">ocultas temporalmente</strong> por decisión del administrador.
        </p>
        <p className="text-content-muted mb-8 text-base leading-relaxed">
          Se harán públicas de forma automática al comenzar el primer partido del torneo para garantizar la transparencia y evitar copias.{" "}
          {quinielaStatus === "draft" ? (
            <span className="font-semibold text-yellow-500">¡Tienes un borrador guardado! Puedes continuar completándolo.</span>
          ) : hasQuiniela ? (
            <span className="font-semibold text-brand">¡Tu quiniela ya está registrada de forma segura!</span>
          ) : (
            <span className="font-semibold text-yellow-500">¡Aún no has inscrito tu quiniela!</span>
          )}
        </p>
        <a
          href="/inscribir"
          className="inline-block px-8 py-3.5 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(0,176,107,0.3)]"
        >
          {quinielaStatus === "draft" ? "Completar Borrador" : hasQuiniela ? "Ver Mi Inscripción" : "Inscribir Quiniela"}
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-content tracking-tight">Hub de Quinielas</h1>
        <p className="text-content-muted mt-2">
          Explora las predicciones de todos los participantes de la liga.
        </p>
      </div>

      {/* Onboarding Prompts */}
      {currentUsername && quinielaStatus === null && (
        <div className="mb-8 bg-brand/10 border border-brand/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,176,107,0.05)]">
          <div>
            <h3 className="font-bold text-content text-lg">¡Registra tu quiniela!</h3>
            <p className="text-sm text-content-muted mt-1">
              Aún no has inscrito tus pronósticos para el Mundial. ¡No te quedes fuera!
            </p>
          </div>
          <Link
            href="/inscribir"
            className="btn-primary py-2.5 px-5 text-sm font-bold shadow-[0_0_12px_rgba(0,176,107,0.2)] whitespace-nowrap text-center shrink-0"
          >
            Registra tu quiniela
          </Link>
        </div>
      )}

      {currentUsername && quinielaStatus === "draft" && (
        <div className="mb-8 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(234,179,8,0.05)]">
          <div>
            <h3 className="font-bold text-content text-lg">¡Completa tu quiniela!</h3>
            <p className="text-sm text-content-muted mt-1">
              Tienes un borrador guardado a medias. Completa tu quiniela para participar.
            </p>
          </div>
          <Link
            href="/inscribir"
            className="inline-block bg-yellow-500 hover:bg-yellow-600 text-base-dark py-2.5 px-5 rounded-lg text-sm font-bold whitespace-nowrap text-center shrink-0 transition-colors shadow-[0_0_12px_rgba(234,179,8,0.2)]"
          >
            Completa tu quiniela
          </Link>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-line mb-8 pb-4">
        <button
          onClick={() => setViewMode("feed")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === "feed"
              ? "bg-brand text-white shadow-[0_0_15px_rgba(0,176,107,0.3)]"
              : "text-content-muted hover:bg-panel hover:text-content"
          }`}
        >
          <Users size={18} /> Explorar Quinielas
        </button>
        <button
          onClick={() => setViewMode("compare")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === "compare"
              ? "bg-brand text-white shadow-[0_0_15px_rgba(0,176,107,0.3)]"
              : "text-content-muted hover:bg-panel hover:text-content"
          }`}
        >
          <Swords size={18} /> Comparar Cara a Cara
        </button>
      </div>

      {/* =========================================
          VISTA 1: FEED DE JUGADORES
      ========================================= */}
      {viewMode === "feed" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
               <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-content-muted">Cargando predicciones de la liga...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-panel rounded-full flex items-center justify-center mx-auto mb-4 border border-line">
                <Trophy size={28} className="text-brand/50" />
              </div>
              <h3 className="text-xl font-bold text-content">El torneo está vacío</h3>
              <p className="text-content-muted mt-2">Nadie ha inscrito su quiniela aún. ¡Aprovecha y sé el primero!</p>
            </div>
          ) : users.map((user) => {
            const champion = user.championCode !== "TBD" ? TEAMS[user.championCode] : null;
            const runnerUp = user.runnerUpCode !== "TBD" ? TEAMS[user.runnerUpCode] : null;
            
            return (
              <div 
                key={user.id} 
                className="glass-card p-5 card-hover cursor-pointer group"
                onClick={() => openUserModal(user)}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center border border-brand/50 shrink-0">
                    <span className="text-brand font-bold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-content text-lg group-hover:text-brand transition-colors">
                      {user.username}
                    </h3>
                    <p className="text-xs text-brand font-medium">{user.points} Puntos</p>
                  </div>
                </div>

                <div className="bg-panel rounded-lg p-3 space-y-2 border border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-content-muted font-medium">Campeón:</span>
                    <div className="flex items-center gap-1.5">
                      {champion ? (
                        <>
                          <Flag iso2={champion.iso2} name={champion.name} size="sm" />
                          <span className="text-sm font-semibold text-content">{champion.name}</span>
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-content-muted">Pendiente</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-content-muted font-medium">Subcampeón:</span>
                    <div className="flex items-center gap-1.5 opacity-80">
                      {runnerUp ? (
                        <>
                          <Flag iso2={runnerUp.iso2} name={runnerUp.name} size="sm" />
                          <span className="text-xs text-content">{runnerUp.name}</span>
                        </>
                      ) : (
                        <span className="text-xs text-content-muted">Pendiente</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-center text-xs text-content-muted mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver Quiniela Completa →
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================
          VISTA 2: COMPARADOR CARA A CARA
      ========================================= */}
      {viewMode === "compare" && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-center gap-6 glass-panel p-6 justify-center">
            {/* User A */}
            <div className="flex-1 w-full max-w-xs">
              <label className="block text-xs font-bold text-content-muted uppercase mb-2">Usuario A</label>
              <select 
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
                className="w-full bg-base border border-line rounded-lg px-4 py-3 text-content font-semibold focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              >
                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
            
            <div className="shrink-0 flex flex-col items-center justify-center">
              <Swords size={32} className="text-brand/50" />
              <span className="text-xs font-bold text-content-muted uppercase mt-1">VS</span>
            </div>

            {/* User B */}
            <div className="flex-1 w-full max-w-xs">
              <label className="block text-xs font-bold text-content-muted uppercase mb-2">Usuario B</label>
              <select 
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
                className="w-full bg-base border border-line rounded-lg px-4 py-3 text-content font-semibold focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              >
                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
          </div>

          {/* Comparador de Partidos (Grupos + Eliminatorias) */}
          <div className="glass-card overflow-hidden">
            {/* Header con Pestañas y Filtro */}
            <div className="bg-panel px-6 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCompareTab("groups")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                    compareTab === "groups"
                      ? "bg-brand text-white border-brand shadow-[0_0_12px_rgba(0,176,107,0.25)]"
                      : "bg-panel text-content-muted border-line hover:text-content"
                  }`}
                >
                  Fase de Grupos (72 partidos)
                </button>
                <button
                  type="button"
                  onClick={() => setCompareTab("knockout")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                    compareTab === "knockout"
                      ? "bg-brand text-white border-brand shadow-[0_0_12px_rgba(0,176,107,0.25)]"
                      : "bg-panel text-content-muted border-line hover:text-content"
                  }`}
                >
                  Fase de Eliminatorias (32 partidos)
                </button>
              </div>

              {/* Filtro de Grupos (Solo si Fase de Grupos está activa) */}
              {compareTab === "groups" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-content-muted uppercase">Filtrar:</span>
                  <select
                    value={compareGroupFilter}
                    onChange={(e) => setCompareGroupFilter(e.target.value)}
                    className="bg-base border border-line rounded-lg px-3 py-1.5 text-xs text-content font-semibold focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  >
                    <option value="all">Todos los Grupos</option>
                    {GROUP_NAMES.map((g) => (
                      <option key={g} value={g}>
                        Grupo {g}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Listado Comparativo */}
            <div className="divide-y divide-line/50">
              {(() => {
                const userA = users.find((u) => u.id === compareA);
                const userB = users.find((u) => u.id === compareB);

                const userAGroupResults = userA ? getGroupResults(userA.predictions) : {};
                const userBGroupResults = userB ? getGroupResults(userB.predictions) : {};
                const userAResolved = userA ? resolveKnockoutBracket(userAGroupResults, userA.knockoutPredictions) : {};
                const userBResolved = userB ? resolveKnockoutBracket(userBGroupResults, userB.knockoutPredictions) : {};

                // Resolviendo el bracket oficial
                const officialGroupPreds: Record<string, MatchPrediction> = {};
                const officialKOPreds: Record<string, MatchPrediction> = {};
                Object.entries(officialMatchesMap).forEach(([id, om]) => {
                  if (id.startsWith("M")) {
                    officialKOPreds[id] = { matchId: id, homeGoals: om.home_goals, awayGoals: om.away_goals };
                  } else {
                    officialGroupPreds[id] = { matchId: id, homeGoals: om.home_goals, awayGoals: om.away_goals };
                  }
                });
                const officialGroupResults = getGroupResults(officialGroupPreds);
                const officialResolved = resolveKnockoutBracket(officialGroupResults, officialKOPreds);

                const getMatchPoints = (matchId: string, isKO: boolean, userPreds: Record<string, MatchPrediction> | undefined, userResolved: any) => {
                  if (!userPreds) return 0;
                  const pred = userPreds[matchId];
                  const official = officialMatchesMap[matchId];
                  if (!pred || pred.homeGoals === null || pred.awayGoals === null || !official) {
                    return 0;
                  }
                  if (isKO) {
                    const uTeams = userResolved[matchId];
                    const oTeams = officialResolved[matchId];
                    if (
                      !uTeams ||
                      !oTeams ||
                      !uTeams.home ||
                      !uTeams.away ||
                      uTeams.home !== oTeams.home ||
                      uTeams.away !== oTeams.away
                    ) {
                      return 0;
                    }
                  }
                  return calculateMatchPoints(pred.homeGoals, pred.awayGoals, official.home_goals, official.away_goals);
                };

                const renderPointsBadge = (points: number, pred: MatchPrediction | undefined, official: any) => {
                  if (!pred || pred.homeGoals === null || pred.awayGoals === null) {
                    return <span className="text-[10px] text-content-muted bg-panel/30 border border-line/50 px-2 py-0.5 rounded-full font-medium">Sin pronosticar</span>;
                  }
                  if (!official) {
                    return <span className="text-[10px] text-content-muted bg-panel/30 border border-line/50 px-2 py-0.5 rounded-full font-medium">Pendiente</span>;
                  }
                  
                  const scoring = getDetailedMatchScoring(pred.homeGoals, pred.awayGoals, official.home_goals, official.away_goals);
                  
                  const pointsColor = scoring.isExactScore ? "text-emerald-400 bg-emerald-500/20 border-emerald-500/40"
                    : scoring.isWinnerGuessed || scoring.isTieGuessed ? "text-green-400 bg-green-500/15 border-green-500/30"
                    : scoring.isConsolation ? "text-yellow-400 bg-yellow-500/15 border-yellow-500/30"
                    : "text-red-400 bg-red-500/15 border-red-500/30";
                  
                  const pointsLabel = scoring.isExactScore ? "Exacto"
                    : scoring.isWinnerGuessed ? "Ganador"
                    : scoring.isTieGuessed ? "Empate"
                    : scoring.isConsolation ? "Cercano"
                    : "Errado";

                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${pointsColor} shrink-0`}>
                      <span>+{points} pts</span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline">{pointsLabel}</span>
                    </span>
                  );
                };

                const renderDiffBadge = (ptsA: number, ptsB: number, official: any) => {
                  if (!official) return null;
                  const diff = ptsA - ptsB;
                  if (diff > 0) {
                    return (
                      <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg shrink-0 flex items-center shadow-sm">
                        <span>← +{diff}</span>
                      </span>
                    );
                  }
                  if (diff < 0) {
                    return (
                      <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg shrink-0 flex items-center shadow-sm">
                        <span>+{Math.abs(diff)} →</span>
                      </span>
                    );
                  }
                  return (
                    <span className="text-[10px] font-bold bg-panel text-content-muted border border-line px-2.5 py-1 rounded-lg shrink-0">
                      0
                    </span>
                  );
                };

                const matchesToRender = compareTab === "groups"
                  ? ALL_GROUP_MATCHES.filter((m) => compareGroupFilter === "all" || m.group === compareGroupFilter)
                  : ALL_KNOCKOUT_MATCHES;

                if (matchesToRender.length === 0) {
                  return (
                    <div className="p-8 text-center text-content-muted">
                      No hay partidos que coincidan con el filtro seleccionado.
                    </div>
                  );
                }

                return matchesToRender.map((match) => {
                  const isKO = match.id.startsWith("M");
                  const homeACode = isKO ? userAResolved[match.id]?.home : (match as any).homeTeam;
                  const awayACode = isKO ? userAResolved[match.id]?.away : (match as any).awayTeam;
                  const homeBCode = isKO ? userBResolved[match.id]?.home : (match as any).homeTeam;
                  const awayBCode = isKO ? userBResolved[match.id]?.away : (match as any).awayTeam;

                  const homeA = homeACode ? TEAMS[homeACode] : null;
                  const awayA = awayACode ? TEAMS[awayACode] : null;
                  const homeB = homeBCode ? TEAMS[homeBCode] : null;
                  const awayB = awayBCode ? TEAMS[awayBCode] : null;

                  const userAPred = userA ? (isKO ? userA.knockoutPredictions[match.id] : userA.predictions[match.id]) : undefined;
                  const userBPred = userB ? (isKO ? userB.knockoutPredictions[match.id] : userB.predictions[match.id]) : undefined;

                  const ptsA = getMatchPoints(match.id, isKO, isKO ? userA?.knockoutPredictions : userA?.predictions, userAResolved);
                  const ptsB = getMatchPoints(match.id, isKO, isKO ? userB?.knockoutPredictions : userB?.predictions, userBResolved);
                  const official = officialMatchesMap[match.id];

                  return (
                    <div
                      key={match.id}
                      className="p-4 flex flex-col md:flex-row items-center justify-between hover:bg-panel/30 transition-colors gap-4"
                    >
                      {/* Usuario A */}
                      <div className="flex-1 w-full flex items-center justify-between gap-3 md:justify-end">
                        {/* Equipos A */}
                        <div className="flex items-center gap-2 min-w-0 md:justify-end flex-1">
                          {homeA ? (
                            <>
                              <span className="font-semibold text-content text-xs sm:text-sm truncate md:order-1">
                                {homeA.name}
                              </span>
                              <div className="md:order-2 shrink-0">
                                <Flag iso2={homeA.iso2} name={homeA.name} size="md" />
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-content-muted italic">TBD</span>
                          )}
                          <span className="text-content-muted font-bold text-xs mx-1 md:order-3">vs</span>
                          {awayA ? (
                            <>
                              <div className="shrink-0 md:order-4">
                                <Flag iso2={awayA.iso2} name={awayA.name} size="md" />
                              </div>
                              <span className="font-semibold text-content text-xs sm:text-sm truncate md:order-5">
                                {awayA.name}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-content-muted italic">TBD</span>
                          )}
                        </div>

                        {/* Pronóstico A */}
                        <div className="flex items-center gap-2 shrink-0 md:ml-3">
                          <div className="flex items-center gap-1 bg-base px-2 py-1 rounded border border-line text-xs font-extrabold text-content shadow-sm">
                            <span>{userAPred?.homeGoals ?? "-"}</span>
                            <span className="text-content-muted">:</span>
                            <span>{userAPred?.awayGoals ?? "-"}</span>
                          </div>
                          {renderPointsBadge(ptsA, userAPred, official)}
                        </div>
                      </div>

                      {/* Resultado Oficial + Diferencia de Puntos */}
                      <div className="shrink-0 flex md:flex-col items-center justify-between md:justify-center px-4 bg-panel/35 py-2 md:py-2 rounded-xl md:rounded-2xl border border-line/40 gap-3 w-full md:w-28 shadow-sm">
                        <span className="text-[10px] font-bold text-brand uppercase tracking-wider">{match.id}</span>
                        {official ? (
                          <div className="flex items-center gap-1 text-xs font-extrabold text-content bg-base border border-line px-2.5 py-1 rounded-lg shadow-inner">
                            {official.home_goals} - {official.away_goals}
                          </div>
                        ) : (
                          <span className="text-[10px] text-content-muted font-bold bg-base border border-line/40 px-2 py-0.5 rounded-md">TBD</span>
                        )}
                        {renderDiffBadge(ptsA, ptsB, official)}
                      </div>

                      {/* Usuario B */}
                      <div className="flex-1 w-full flex items-center justify-between gap-3">
                        {/* Pronóstico B */}
                        <div className="flex items-center gap-2 shrink-0 md:mr-3">
                          {renderPointsBadge(ptsB, userBPred, official)}
                          <div className="flex items-center gap-1 bg-base px-2 py-1 rounded border border-line text-xs font-extrabold text-content shadow-sm">
                            <span>{userBPred?.homeGoals ?? "-"}</span>
                            <span className="text-content-muted">:</span>
                            <span>{userBPred?.awayGoals ?? "-"}</span>
                          </div>
                        </div>

                        {/* Equipos B */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {homeB ? (
                            <>
                              <div className="shrink-0">
                                <Flag iso2={homeB.iso2} name={homeB.name} size="md" />
                              </div>
                              <span className="font-semibold text-content text-xs sm:text-sm truncate">
                                {homeB.name}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-content-muted italic">TBD</span>
                          )}
                          <span className="text-content-muted font-bold text-xs mx-1">vs</span>
                          {awayB ? (
                            <>
                              <div className="shrink-0">
                                <Flag iso2={awayB.iso2} name={awayB.name} size="md" />
                              </div>
                              <span className="font-semibold text-content text-xs sm:text-sm truncate">
                                {awayB.name}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-content-muted italic">TBD</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            {/* Pie de Página */}
            <div className="p-4 text-center bg-panel/30 border-t border-line/50">
              <p className="text-xs text-content-muted">
                Comparando todos los pronósticos y diferencias en tiempo real.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: DETALLE DE QUINIELA DEL USUARIO
      ========================================= */}
      {selectedUser && resolvedUserBracket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-base/90 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
          
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-card border border-line rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-line bg-panel/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center border border-brand/50">
                  <span className="text-brand font-bold text-lg">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-content">Quiniela de {selectedUser.username}</h2>
                  <p className="text-sm text-brand font-medium">Torneo Mundial 2026</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-lg text-content-muted hover:text-white hover:bg-base transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-4 px-6 border-b border-line bg-panel/30">
              <button
                onClick={() => setModalTab("groups")}
                className={`py-3 text-sm font-bold border-b-2 transition-all ${
                  modalTab === "groups"
                    ? "border-brand text-brand"
                    : "border-transparent text-content-muted hover:text-content"
                }`}
              >
                Fase de Grupos
              </button>
              <button
                onClick={() => setModalTab("knockout")}
                className={`py-3 text-sm font-bold border-b-2 transition-all ${
                  modalTab === "knockout"
                    ? "border-brand text-brand"
                    : "border-transparent text-content-muted hover:text-content"
                }`}
              >
                Fase de Eliminatorias
              </button>
            </div>

            {/* Group selector inside Modal (only for groups tab) */}
            {modalTab === "groups" && (
              <div className="flex overflow-x-auto px-6 py-3 border-b border-line/50 gap-2 bg-panel/10 hide-scrollbar shrink-0">
                {GROUP_NAMES.map((g, idx) => (
                  <button
                    key={g}
                    onClick={() => setModalGroupIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      idx === modalGroupIndex
                        ? "bg-brand text-white shadow-sm"
                        : "bg-panel text-content-muted hover:text-content border border-line"
                    }`}
                  >
                    Grupo {g}
                  </button>
                ))}
              </div>
            )}

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {modalTab === "groups" ? (
                (() => {
                  const groupKey = GROUP_NAMES[modalGroupIndex];
                  const groupMatches = getGroupMatches(groupKey);
                  const standings = calculateGroupStandings(groupKey, selectedUser.predictions);

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Partidos Pronosticados */}
                      <div className="lg:col-span-3 space-y-4">
                        <h3 className="text-lg font-bold text-content mb-2">
                          Partidos Grupo {groupKey}
                        </h3>
                        {[1, 2, 3].map((matchday) => (
                          <div key={matchday} className="space-y-3">
                            <p className="text-xs text-content-muted uppercase tracking-wider font-semibold mt-4 first:mt-0">
                              Jornada {matchday}
                            </p>
                            <div className="space-y-3">
                              {groupMatches
                                .filter((m) => m.matchday === matchday)
                                .map((match) => {
                                  const home = TEAMS[match.homeTeam];
                                  const away = TEAMS[match.awayTeam];
                                  const pred = selectedUser.predictions[match.id];
                                  const official = officialMatchesMap[match.id];
                                  const scoring = (pred && official && pred.homeGoals !== null && pred.awayGoals !== null)
                                    ? getDetailedMatchScoring(pred.homeGoals, pred.awayGoals, official.home_goals, official.away_goals)
                                    : null;
                                  
                                  const pointsColor = scoring
                                    ? scoring.isExactScore ? "text-emerald-400 bg-emerald-500/20 border-emerald-500/40"
                                    : scoring.isWinnerGuessed || scoring.isTieGuessed ? "text-green-400 bg-green-500/15 border-green-500/30"
                                    : scoring.isConsolation ? "text-yellow-400 bg-yellow-500/15 border-yellow-500/30"
                                    : "text-red-400 bg-red-500/15 border-red-500/30"
                                    : null;
                                  
                                  const pointsLabel = scoring
                                    ? scoring.isExactScore ? "Exacto"
                                    : scoring.isWinnerGuessed ? "Ganador"
                                    : scoring.isTieGuessed ? "Empate"
                                    : scoring.isConsolation ? "Cercano"
                                    : "Errado"
                                    : null;

                                  return (
                                    <div
                                      key={match.id}
                                      className={`bg-card border rounded-xl p-3 sm:p-4 shadow-sm transition-colors ${
                                        scoring
                                          ? scoring.isExactScore ? "border-emerald-500/40" : scoring.points > 0 ? "border-line" : "border-red-500/20"
                                          : "border-line hover:border-line-hover"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        {/* Home */}
                                        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                          <span className="font-semibold text-content text-xs sm:text-sm text-right truncate">
                                            {home.name}
                                          </span>
                                          <Flag iso2={home.iso2} name={home.name} size="md" />
                                        </div>

                                        {/* Score Display (Read Only) */}
                                        <div className="flex items-center gap-2 shrink-0">
                                          <div className="w-10 h-10 bg-base border border-line rounded-lg flex items-center justify-center font-bold text-base text-content shadow-inner">
                                            {pred?.homeGoals ?? "-"}
                                          </div>
                                          <span className="text-content-muted font-bold">:</span>
                                          <div className="w-10 h-10 bg-base border border-line rounded-lg flex items-center justify-center font-bold text-base text-content shadow-inner">
                                            {pred?.awayGoals ?? "-"}
                                          </div>
                                        </div>

                                        {/* Away */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <Flag iso2={away.iso2} name={away.name} size="md" />
                                          <span className="font-semibold text-content text-xs sm:text-sm truncate">
                                            {away.name}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Resultado Oficial + Puntos */}
                                      {official && scoring && (
                                        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-line/50">
                                          <div className="flex items-center gap-2 text-xs text-content-muted">
                                            <span className="font-medium">Oficial:</span>
                                            <span className="font-bold text-content">
                                              {official.home_goals} - {official.away_goals}
                                            </span>
                                          </div>
                                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${pointsColor}`}>
                                            <span>+{scoring.points}</span>
                                            <span className="hidden sm:inline">·</span>
                                            <span className="hidden sm:inline">{pointsLabel}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Tabla de Posiciones Resultante */}
                      <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-lg font-bold text-content">Tabla de Posiciones</h3>
                        <GroupStandings standings={standings} groupName={groupKey} />
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-brand flex items-center gap-2 mb-4">
                    <Trophy size={20} />
                    Fase de Eliminatorias
                  </h3>
                  <KnockoutBracket
                    matches={ALL_KNOCKOUT_MATCHES}
                    resolvedBracket={resolvedUserBracket}
                    predictions={selectedUser.knockoutPredictions}
                    readOnly={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
