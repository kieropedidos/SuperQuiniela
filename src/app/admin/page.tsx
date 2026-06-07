"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, AlertTriangle, Save, UserCheck, UserX, Clock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { ALL_GROUP_MATCHES, TEAMS, MatchPrediction, ALL_KNOCKOUT_MATCHES, getGroupResults, resolveKnockoutBracket } from "@/lib/worldCupData";
import Flag from "@/components/ui/Flag";

const CHRONOLOGICAL_MATCHES = [...ALL_GROUP_MATCHES].sort((a, b) => {
  // 1. Primero por jornada (matchday)
  if (a.matchday !== b.matchday) {
    return a.matchday - b.matchday;
  }
  // 2. Segundo por grupo alfabéticamente (A-L)
  if (a.group !== b.group) {
    return a.group.localeCompare(b.group);
  }
  // 3. Tercero por el número de partido dentro del grupo (ej: A-1 vs A-2)
  const numA = parseInt(a.id.split("-")[1], 10);
  const numB = parseInt(b.id.split("-")[1], 10);
  return numA - numB;
});

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [results, setResults] = useState<Record<string, { homeGoals: number; awayGoals: number }>>({});
  const [loadingMatches, setLoadingMatches] = useState<Record<string, boolean>>({});
  const [savedMatches, setSavedMatches] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [adminTab, setAdminTab] = useState<"inscripciones" | "resultados">("inscripciones");

  // Visibilidad global de las quinielas
  const [quinielasVisible, setQuinielasVisible] = useState<boolean>(false);
  const [savingVisibility, setSavingVisibility] = useState<boolean>(false);

  // Gestión de inscripciones
  interface PendingQuiniela {
    id: string;
    user_id: string;
    username: string;
    status: string;
    championCode: string;
    runnerUpCode: string;
    created_at: string;
  }

  const [pendingQuinielas, setPendingQuinielas] = useState<PendingQuiniela[]>([]);
  const [approvedQuinielas, setApprovedQuinielas] = useState<PendingQuiniela[]>([]);
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});

  async function loadQuinielas() {
    const { data, error } = await supabase
      .from("user_quinielas")
      .select(`
        id,
        user_id,
        status,
        predictions,
        knockout_predictions,
        created_at,
        profiles (username)
      `)
      .order("created_at", { ascending: false });

    if (error || !data) return;

    const mapped = data.map((row: any) => {
      // Calcular campeón/subcampeón
      let championCode = "TBD";
      let runnerUpCode = "TBD";
      try {
        const groupResults = getGroupResults(row.predictions);
        const resolvedKnockout = resolveKnockoutBracket(groupResults, row.knockout_predictions);
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
      } catch {}

      return {
        id: row.id,
        user_id: row.user_id,
        username: row.profiles?.username || "Usuario",
        status: row.status || "pending",
        championCode,
        runnerUpCode,
        created_at: row.created_at,
      };
    });

    setPendingQuinielas(mapped.filter((q) => q.status === "pending"));
    setApprovedQuinielas(mapped.filter((q) => q.status === "approved"));
  }

  const handleApprove = async (quinielaId: string) => {
    setProcessingIds((prev) => ({ ...prev, [quinielaId]: true }));
    const { error } = await supabase
      .from("user_quinielas")
      .update({ status: "approved" })
      .eq("id", quinielaId);

    if (error) {
      alert("Error al aprobar: " + error.message);
    } else {
      await loadQuinielas();
    }
    setProcessingIds((prev) => ({ ...prev, [quinielaId]: false }));
  };

  const handleReject = async (quinielaId: string) => {
    if (!confirm("¿Seguro que deseas rechazar y ELIMINAR esta quiniela? El usuario tendrá que volver a inscribirse.")) return;

    setProcessingIds((prev) => ({ ...prev, [quinielaId]: true }));
    const { error } = await supabase
      .from("user_quinielas")
      .delete()
      .eq("id", quinielaId);

    if (error) {
      alert("Error al rechazar: " + error.message);
    } else {
      await loadQuinielas();
    }
    setProcessingIds((prev) => ({ ...prev, [quinielaId]: false }));
  };

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const username = session?.user?.user_metadata?.username || "";
      if (username.toLowerCase() === "vicdaddy") {
        setIsAdmin(true);
        
        // Cargar visibilidad global de las quinielas
        const { data: settingData } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "quinielas_visible")
          .single();
        if (settingData && settingData.value) {
          setQuinielasVisible(!!settingData.value.enabled);
        }

        // Cargar resultados oficiales existentes
        const { data } = await supabase.from("official_matches").select("*");
        if (data) {
          const loadedResults: Record<string, { homeGoals: number; awayGoals: number }> = {};
          const loadedSaved: Record<string, boolean> = {};
          data.forEach((row) => {
             loadedResults[row.match_id] = { homeGoals: row.home_goals, awayGoals: row.away_goals };
             loadedSaved[row.match_id] = true;
          });
          setResults(loadedResults);
          setSavedMatches(loadedSaved);
        }
        // Cargar quinielas pendientes y aprobadas
        await loadQuinielas();
      } else {
        setIsAdmin(false);
        window.location.href = "/";
      }
    }
    init();
  }, []);

  const handleToggleVisibility = async () => {
    setSavingVisibility(true);
    const nextVal = !quinielasVisible;
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key: "quinielas_visible",
        value: { enabled: nextVal },
        updated_at: new Date().toISOString()
      });

    if (error) {
      alert("Error al cambiar visibilidad: " + error.message);
    } else {
      setQuinielasVisible(nextVal);
    }
    setSavingVisibility(false);
  };

  const handleUpdate = (matchId: string, side: "home" | "away", value: string) => {
    const numVal = value === "" ? null : parseInt(value, 10);
    if (numVal !== null && (isNaN(numVal) || numVal < 0 || numVal > 20)) return;

    setResults((prev) => ({
      ...prev,
      [matchId]: {
        homeGoals: side === "home" ? (numVal ?? 0) : (prev[matchId]?.homeGoals ?? 0),
        awayGoals: side === "away" ? (numVal ?? 0) : (prev[matchId]?.awayGoals ?? 0),
      },
    }));
    setSavedMatches((prev) => ({ ...prev, [matchId]: false }));
  };

  const handleSaveMatch = async (matchId: string) => {
    const matchResult = results[matchId];
    if (!matchResult || matchResult.homeGoals === undefined || matchResult.awayGoals === undefined) {
       return;
    }
    
    setLoadingMatches((prev) => ({ ...prev, [matchId]: true }));
    
    const { error } = await supabase.from("official_matches").upsert({
       match_id: matchId,
       home_goals: matchResult.homeGoals,
       away_goals: matchResult.awayGoals,
       is_completed: true
    });

    setLoadingMatches((prev) => ({ ...prev, [matchId]: false }));
    
    if (!error) {
       setSavedMatches((prev) => ({ ...prev, [matchId]: true }));
    } else {
       alert("Error guardando el partido: " + error.message);
    }
  };

  if (isAdmin === null) {
    return <div className="p-12 text-center font-bold text-content-muted">Verificando credenciales seguras...</div>;
  }
  if (isAdmin === false) return null; // Redirigiendo

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="text-red-500" size={32} />
          <h1 className="text-3xl font-extrabold text-content tracking-tight">Panel de Administrador</h1>
        </div>
        <p className="text-content-muted">
          Plataforma exclusiva para <span className="font-bold text-content">VicDaddy</span>.
        </p>
      </div>

      {/* Control de Visibilidad del Torneo */}
      <div className="glass-panel p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-line">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${quinielasVisible ? 'bg-brand/10 text-brand border border-brand/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
            {quinielasVisible ? <Eye size={22} /> : <EyeOff size={22} />}
          </div>
          <div>
            <h3 className="font-bold text-content text-base">Visibilidad Pública del Torneo</h3>
            <p className="text-xs text-content-muted mt-0.5">
              {quinielasVisible 
                ? "Las quinielas aprobadas y el ranking son visibles para todos los usuarios." 
                : "Las quinielas y el ranking están ocultos para usuarios normales hasta que decidas activarlos."}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleVisibility}
          disabled={savingVisibility}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shrink-0 ${
            quinielasVisible 
              ? 'bg-red-500/15 hover:bg-red-500/25 text-red-500 border border-red-500/30' 
              : 'bg-brand text-white shadow-[0_0_15px_rgba(0,176,107,0.3)] hover:bg-brand-hover'
          }`}
        >
          {savingVisibility ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : quinielasVisible ? (
            <>Ocultar Quinielas</>
          ) : (
            <>Hacer Públicas</>
          )}
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-line mb-8 pb-4">
        <button
          onClick={() => setAdminTab("inscripciones")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            adminTab === "inscripciones"
              ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              : "text-content-muted hover:bg-panel hover:text-content"
          }`}
        >
          <UserCheck size={18} /> Gestión de Inscripciones
          {pendingQuinielas.length > 0 && (
            <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full ml-1">
              {pendingQuinielas.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setAdminTab("resultados")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            adminTab === "resultados"
              ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              : "text-content-muted hover:bg-panel hover:text-content"
          }`}
        >
          <Save size={18} /> Cargar Resultados
        </button>
      </div>

      {/* ======================================================
          TAB 1: GESTIÓN DE INSCRIPCIONES
      ====================================================== */}
      {adminTab === "inscripciones" && (
        <div className="space-y-8">
          {/* QUINIELAS PENDIENTES */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4 mb-6">
              <Clock size={22} className="text-yellow-500" />
              <h2 className="text-xl font-bold text-content">Quinielas Pendientes de Aprobación</h2>
              <span className="text-sm font-bold bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full ml-auto">
                {pendingQuinielas.length} pendientes
              </span>
            </div>

            {pendingQuinielas.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 size={40} className="text-brand/40 mx-auto mb-3" />
                <p className="text-content-muted font-medium">No hay quinielas pendientes de aprobación</p>
                <p className="text-content-muted text-xs mt-1">Todas las inscripciones han sido procesadas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingQuinielas.map((q) => {
                  const champion = q.championCode !== "TBD" ? TEAMS[q.championCode] : null;
                  const runnerUp = q.runnerUpCode !== "TBD" ? TEAMS[q.runnerUpCode] : null;
                  const isProcessing = processingIds[q.id];
                  const date = new Date(q.created_at).toLocaleDateString("es-MX", {
                    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                  });

                  return (
                    <div key={q.id} className="bg-card border-2 border-yellow-500/30 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50 shrink-0">
                          <span className="text-yellow-500 font-bold text-lg">
                            {q.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-content text-lg truncate">{q.username}</h3>
                          <p className="text-xs text-content-muted">Registrada: {date}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            {champion && (
                              <span className="flex items-center gap-1 text-xs text-content-muted">
                                <span className="text-content-muted">🏆</span>
                                <Flag iso2={champion.iso2} name={champion.name} size="sm" />
                                {champion.name}
                              </span>
                            )}
                            {runnerUp && (
                              <span className="flex items-center gap-1 text-xs text-content-muted">
                                <span>🥈</span>
                                <Flag iso2={runnerUp.iso2} name={runnerUp.name} size="sm" />
                                {runnerUp.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                          onClick={() => handleApprove(q.id)}
                          disabled={isProcessing}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-brand hover:bg-brand-hover text-white transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <><UserCheck size={16} /> Aprobar</>
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(q.id)}
                          disabled={isProcessing}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 transition-colors disabled:opacity-50"
                        >
                          <UserX size={16} /> Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* QUINIELAS APROBADAS */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4 mb-6">
              <CheckCircle2 size={22} className="text-brand" />
              <h2 className="text-xl font-bold text-content">Quinielas Aprobadas</h2>
              <span className="text-sm font-bold bg-brand/20 text-brand px-3 py-1 rounded-full ml-auto">
                {approvedQuinielas.length} aprobadas
              </span>
            </div>

            {approvedQuinielas.length === 0 ? (
              <p className="text-center text-content-muted py-8">No hay quinielas aprobadas todavía.</p>
            ) : (
              <div className="space-y-3">
                {approvedQuinielas.map((q) => {
                  const champion = q.championCode !== "TBD" ? TEAMS[q.championCode] : null;
                  const isProcessing = processingIds[q.id];

                  return (
                    <div key={q.id} className="bg-card border border-line rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center border border-brand/50 shrink-0">
                          <span className="text-brand font-bold text-sm">
                            {q.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-content truncate">{q.username}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {champion && (
                              <span className="flex items-center gap-1 text-xs text-content-muted">
                                🏆
                                <Flag iso2={champion.iso2} name={champion.name} size="sm" />
                                {champion.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold bg-brand/10 text-brand px-3 py-1 rounded-full hidden sm:inline">
                          ✓ Aprobada
                        </span>
                        <button
                          onClick={() => handleReject(q.id)}
                          disabled={isProcessing}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors disabled:opacity-50"
                          title="Eliminar Quiniela"
                        >
                          <UserX size={14} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================
          TAB 2: CARGA DE RESULTADOS OFICIALES
      ====================================================== */}
      {adminTab === "resultados" && (
        <>
          {/* Warning Banner */}
          <div className="flex items-start gap-4 bg-red-500/10 border border-red-500/30 text-red-500 px-6 py-4 rounded-xl mb-8">
            <AlertTriangle size={24} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-lg mb-1">Carga de Resultados Oficiales</p>
              <p className="text-sm opacity-90">
                Los marcadores ingresados en esta sección afectarán directamente el ranking global de todos los usuarios.
                Asegúrate de que los partidos hayan finalizado antes de registrar el marcador.
              </p>
            </div>
          </div>

          {/* Match List */}
          <div className="glass-panel p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-xl font-bold text-content">Partidos Oficiales (Cronológico)</h2>
              <span className="text-sm text-content-muted">Guarda uno por uno</span>
            </div>

            <div className="flex flex-col gap-4">
              {CHRONOLOGICAL_MATCHES.map((match) => {
                const home = TEAMS[match.homeTeam];
                const away = TEAMS[match.awayTeam];
                const prediction = results[match.id];
                const isSaved = savedMatches[match.id];
                const isLoading = loadingMatches[match.id];

                return (
                  <div key={match.id} className="bg-card border border-line rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    
                    <div className="flex items-center justify-between w-full md:w-auto flex-1">
                      <span className="text-xs font-bold text-content-muted w-10 shrink-0">{match.id}</span>
                      {/* Home */}
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="font-medium text-content text-sm text-right truncate">
                          {home.name}
                        </span>
                        <Flag iso2={home.iso2} name={home.name} size="md" />
                      </div>

                      {/* Inputs */}
                      <div className="flex items-center gap-2 px-4 shrink-0">
                        <input
                          type="number"
                          value={prediction?.homeGoals ?? ""}
                          onChange={(e) => handleUpdate(match.id, "home", e.target.value)}
                          placeholder="-"
                          className="w-10 h-10 bg-base border border-line rounded-lg text-center text-lg font-bold text-content focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all appearance-none"
                        />
                        <span className="text-content-muted font-bold">:</span>
                        <input
                          type="number"
                          value={prediction?.awayGoals ?? ""}
                          onChange={(e) => handleUpdate(match.id, "away", e.target.value)}
                          placeholder="-"
                          className="w-10 h-10 bg-base border border-line rounded-lg text-center text-lg font-bold text-content focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all appearance-none"
                        />
                      </div>

                      {/* Away */}
                      <div className="flex items-center gap-2 flex-1">
                        <Flag iso2={away.iso2} name={away.name} size="md" />
                        <span className="font-medium text-content text-sm truncate">
                          {away.name}
                        </span>
                      </div>
                    </div>

                    {/* Save Button for this specific match */}
                    <button
                      onClick={() => handleSaveMatch(match.id)}
                      disabled={isLoading || prediction?.homeGoals === undefined || prediction?.awayGoals === undefined}
                      className={`shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors w-full md:w-32 ${
                        isSaved 
                          ? "bg-brand/10 text-brand border border-brand/30" 
                          : "bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:bg-panel disabled:text-content-muted disabled:border disabled:border-line"
                      }`}
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : isSaved ? (
                        <>Guardado ✓</>
                      ) : (
                        <>
                          <Save size={16} /> Guardar
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
