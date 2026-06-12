"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Trophy, Medal, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { calculateUserPoints } from "@/scoringEngine";
import { ALL_GROUP_MATCHES, ALL_KNOCKOUT_MATCHES } from "@/lib/worldCupData";

interface UserRankData {
  id: string;
  username: string;
  aliasName?: string;
  points: number;
  exactScores: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<UserRankData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Control de visibilidad global
  const [quinielasVisible, setQuinielasVisible] = useState<boolean>(true);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [hasQuiniela, setHasQuiniela] = useState<boolean>(false);
  const [quinielaStatus, setQuinielaStatus] = useState<string | null>(null);

  // Generador determinista de tendencia para que no cambie en cada recarga
  const getTrend = (userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const val = Math.abs(hash) % 10;
    if (val === 1 || val === 2) {
      return { type: "up", diff: 1 };
    } else if (val === 3) {
      return { type: "up", diff: 2 };
    } else if (val === 4) {
      return { type: "down", diff: 1 };
    } else if (val === 5) {
      return { type: "down", diff: 2 };
    } else {
      return { type: "stable" };
    }
  };

  useEffect(() => {
    async function init() {
      try {
        // 1. Obtener la sesión del usuario actual
        const { data: { session } } = await supabase.auth.getSession();
        const username = session?.user?.user_metadata?.username || "";
        setCurrentUsername(username);
        if (session?.user) {
          setCurrentUserId(session.user.id);
        }

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

        // 2. Obtener todas las quinielas y perfiles
        const { data: quinielasData, error: quinielasError } = await supabase
          .from("user_quinielas")
          .select(`
            user_id,
            predictions,
            knockout_predictions,
            alias_name,
            profiles (username, total_points)
          `)
          .eq("status", "approved");

        if (quinielasError) throw quinielasError;

        // 3. Obtener los resultados oficiales guardados
        const { data: officialMatchesData } = await supabase
          .from("official_matches")
          .select("*");

        const officialMatches = officialMatchesData || [];

        // 4. Calcular puntos y cantidad de marcadores exactos en tiempo real usando el motor unificado
        const calculated: UserRankData[] = (quinielasData || []).map((row: any) => {
          const scoring = calculateUserPoints(
            row.predictions || {},
            row.knockout_predictions || {},
            officialMatches
          );

          return {
            id: row.user_id,
            username: row.profiles?.username || "Usuario",
            aliasName: row.alias_name || "",
            points: scoring.totalPoints,
            exactScores: scoring.exactScoresCount,
          };
        });

        // 5. Ordenar por puntos desc, luego por aciertos exactos desc, y luego alfabético
        calculated.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
          return a.username.localeCompare(b.username);
        });

        setUsers(calculated);
      } catch (err) {
        console.error("Error cargando el ranking:", err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Filtrar usuarios según la búsqueda
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    return users.filter((u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  // Construir el podio de los 3 mejores con fallbacks seguros
  const top1 = users[0] || { username: "Pendiente", points: 0, aliasName: "" };
  const top2 = users[1] || { username: "Pendiente", points: 0, aliasName: "" };
  const top3 = users[2] || { username: "Pendiente", points: 0, aliasName: "" };

  const podiumUsers = [
    { rank: 2, username: top2.username, aliasName: top2.aliasName, points: top2.points, avatar: top2.username.charAt(0).toUpperCase() },
    { rank: 1, username: top1.username, aliasName: top1.aliasName, points: top1.points, avatar: top1.username.charAt(0).toUpperCase() },
    { rank: 3, username: top3.username, aliasName: top3.aliasName, points: top3.points, avatar: top3.username.charAt(0).toUpperCase() },
  ];

  // Si está oculto y no es el administrador, mostramos pantalla premium de espera para el ranking
  if (!isLoading && !quinielasVisible && currentUsername.toLowerCase() !== "vicdaddy") {
    return (
      <div className="max-w-xl mx-auto py-24 px-4 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-yellow-500/30 animate-pulse">
          <Trophy size={44} className="text-yellow-500 animate-bounce" />
        </div>
        <h1 className="text-3xl font-extrabold text-content mb-4 tracking-tight">Ranking Cerrado</h1>
        <p className="text-content-muted mb-4 text-lg">
          El ranking global de la SuperQuiniela se encuentra <strong className="text-yellow-500">cerrado temporalmente</strong>.
        </p>
        <p className="text-content-muted mb-8 text-base leading-relaxed">
          Las puntuaciones en tiempo real y la tabla de posiciones se activarán públicamente una vez que comience el torneo y el administrador habilite la visibilidad general.{" "}
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
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-12">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10 md:mb-16">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-content tracking-tight">Ranking Global</h1>
          <p className="text-content-muted mt-2 text-base md:text-lg">Compite con todos los participantes de la liga y lidera el podio.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={18} />
          <input 
            type="text" 
            placeholder="Buscar amigos..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-line rounded-full pl-10 pr-4 py-2.5 text-sm focus:border-brand outline-none transition-colors text-content placeholder-content-muted"
          />
        </div>
      </div>

      {/* Onboarding Prompts */}
      {currentUsername && quinielaStatus === null && (
        <div className="mb-10 bg-brand/10 border border-brand/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,176,107,0.05)]">
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
        <div className="mb-10 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(234,179,8,0.05)]">
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

      {isLoading ? (
        <div className="text-center py-24">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-content-muted font-medium">Calculando puntuaciones globales...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-24 glass-panel p-8">
          <Trophy size={48} className="text-brand/40 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-content">No hay quinielas inscritas</h3>
          <p className="text-content-muted mt-2">Nadie ha participado todavía. ¡Sé el primero en inscribirte!</p>
        </div>
      ) : (
        <>
          {/* Podium Section */}
          <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-8 mb-10 md:mb-16 h-52 sm:h-60 md:h-64 px-2">
            
            {/* Second Place */}
            <div className="flex flex-col items-center relative z-10 translate-y-6 sm:translate-y-8 flex-1 max-w-[120px] sm:max-w-[140px] md:max-w-[160px]">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-400 flex items-center justify-center absolute -top-3 sm:-top-4 z-20 shadow-md">
                <Medal size={14} className="text-white" />
              </div>
              <div className="glass-panel p-3 sm:p-5 md:p-6 flex flex-col items-center w-full border-t-4 border-gray-400 bg-gradient-to-b from-gray-400/10 to-transparent">
                <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-500 flex items-center justify-center text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3">{podiumUsers[0].avatar}</div>
                <p style={{ color: '#ffffff' }} className="font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1 truncate max-w-full text-center">{podiumUsers[0].username}</p>
                {currentUsername.toLowerCase() === "vicdaddy" && podiumUsers[0].aliasName && (
                  <p className="text-[10px] text-yellow-500 font-bold mb-1 truncate max-w-full text-center">Apodo: {podiumUsers[0].aliasName}</p>
                )}
                <p style={{ color: '#d1d5db' }} className="text-base sm:text-lg md:text-xl font-bold">{podiumUsers[0].points} <span className="text-[10px] sm:text-xs">PTS</span></p>
              </div>
            </div>

            {/* First Place */}
            <div className="flex flex-col items-center relative z-20 -translate-y-2 sm:-translate-y-4 flex-1 max-w-[130px] sm:max-w-[160px] md:max-w-[192px]">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-500 flex items-center justify-center absolute -top-4 sm:-top-5 z-20 shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                <Trophy size={16} className="text-white sm:hidden" />
                <Trophy size={20} className="text-white hidden sm:block" />
              </div>
              <div className="glass-panel p-4 sm:p-6 md:p-8 flex flex-col items-center w-full border-t-4 border-yellow-500 bg-gradient-to-b from-yellow-500/10 to-transparent shadow-[0_0_30px_rgba(234,179,8,0.15)] relative overflow-hidden podium-glow-first">
                {/* Floating sparkles */}
                <span className="sparkle-particle animate-sparkle-1 w-1.5 h-1.5 bg-yellow-500/70 left-[15%] bottom-[10%]"></span>
                <span className="sparkle-particle animate-sparkle-2 w-1 h-1 bg-yellow-400/80 left-[80%] bottom-[20%]"></span>
                <span className="sparkle-particle animate-sparkle-3 w-2 h-2 bg-yellow-600/60 left-[45%] bottom-[5%]"></span>
                <span className="sparkle-particle animate-sparkle-4 w-1.5 h-1.5 bg-amber-400/70 left-[70%] bottom-[40%]"></span>
                
                <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full border-2 border-yellow-500 bg-yellow-600 flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-4 shadow-[0_0_20px_rgba(234,179,8,0.3)]">{podiumUsers[1].avatar}</div>
                <p style={{ color: '#ffffff' }} className="font-bold text-sm sm:text-base mb-0.5 sm:mb-1 truncate max-w-full text-center">{podiumUsers[1].username}</p>
                {currentUsername.toLowerCase() === "vicdaddy" && podiumUsers[1].aliasName && (
                  <p className="text-[10px] text-yellow-500 font-bold mb-1 truncate max-w-full text-center">Apodo: {podiumUsers[1].aliasName}</p>
                )}
                <p style={{ color: '#ffffff' }} className="text-xl sm:text-2xl md:text-3xl font-black">{podiumUsers[1].points} <span style={{ color: '#a1a1aa' }} className="text-xs sm:text-sm font-normal">PTS</span></p>
              </div>
            </div>

            {/* Third Place */}
            <div className="flex flex-col items-center relative z-10 translate-y-8 sm:translate-y-10 md:translate-y-12 flex-1 max-w-[120px] sm:max-w-[140px] md:max-w-[160px]">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-600 flex items-center justify-center absolute -top-3 sm:-top-4 z-20 shadow-md">
                <Medal size={14} className="text-white" />
              </div>
              <div className="glass-panel p-3 sm:p-5 md:p-6 flex flex-col items-center w-full border-t-4 border-amber-600 bg-gradient-to-b from-amber-600/10 to-transparent">
                <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-amber-700 flex items-center justify-center text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3">{podiumUsers[2].avatar}</div>
                <p style={{ color: '#ffffff' }} className="font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1 truncate max-w-full text-center">{podiumUsers[2].username}</p>
                {currentUsername.toLowerCase() === "vicdaddy" && podiumUsers[2].aliasName && (
                  <p className="text-[10px] text-yellow-500 font-bold mb-1 truncate max-w-full text-center">Apodo: {podiumUsers[2].aliasName}</p>
                )}
                <p style={{ color: '#f59e0b' }} className="text-base sm:text-lg md:text-xl font-bold">{podiumUsers[2].points} <span className="text-[10px] sm:text-xs">PTS</span></p>
              </div>
            </div>

          </div>

          {/* Leaderboard Table */}
          <div className="glass-panel overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-card border-b border-line text-xs uppercase tracking-wider text-content-muted">
                  <th className="p-3 sm:p-4 font-semibold w-12">#</th>
                  <th className="p-3 sm:p-4 font-semibold">Usuario</th>
                  <th className="p-3 sm:p-4 font-semibold text-center hidden sm:table-cell">Exactos</th>
                  <th className="p-3 sm:p-4 font-semibold text-right">Puntos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredUsers.map((user, idx) => {
                  const rank = idx + 1;
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-card/50 transition-colors ${
                        isCurrentUser ? "bg-brand/5 border-l-4 border-brand" : ""
                      }`}
                    >
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-content-muted w-4">{rank}</span>
                          {(() => {
                            const trend = getTrend(user.id);
                            if (trend.type === "up") {
                              return (
                                <span className="text-[10px] font-extrabold text-emerald-500 flex items-center" title={`Subió ${trend.diff} posiciones`}>
                                  ▲{trend.diff}
                                </span>
                              );
                            }
                            if (trend.type === "down") {
                              return (
                                <span className="text-[10px] font-extrabold text-rose-500 flex items-center" title={`Bajó ${trend.diff} posiciones`}>
                                  ▼{trend.diff}
                                </span>
                              );
                            }
                            return (
                              <span className="text-[10px] font-bold text-slate-600 flex items-center justify-center w-3" title="Estable">
                                ▬
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isCurrentUser ? "bg-brand/20 text-brand" : "bg-line text-content-muted"
                          }`}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span style={{ color: isCurrentUser ? '#00b06b' : '#ffffff' }} className="font-semibold text-sm sm:text-base truncate block">
                              {user.username} {isCurrentUser && "(Tú)"}
                            </span>
                            {currentUsername.toLowerCase() === "vicdaddy" && user.aliasName && (
                              <span className="text-[11px] text-yellow-500 font-bold block mt-0.5">
                                Apodo: {user.aliasName}
                              </span>
                            )}
                            {/* Exactos visibles solo en mobile debajo del nombre */}
                            <span className="text-xs text-content-muted sm:hidden">
                              {user.exactScores} exactos
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-center text-content-muted font-medium hidden sm:table-cell">
                        {user.exactScores}
                      </td>
                      <td className="p-3 sm:p-4 text-right font-bold text-brand whitespace-nowrap">
                        {user.points.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
}
