"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  GROUPS,
  GROUP_NAMES,
  TEAMS,
  getGroupMatches,
  calculateGroupStandings,
  getGroupResults,
  resolveKnockoutBracket,
  ALL_KNOCKOUT_MATCHES,
  ALL_GROUP_MATCHES,
  MatchPrediction,
} from "@/lib/worldCupData";
import GroupStandings from "@/components/predictions/GroupStandings";
import KnockoutBracket from "@/components/predictions/KnockoutBracket";
import Flag from "@/components/ui/Flag";
import { Trophy, ChevronRight, ChevronLeft, Check, Lock, Dices, Clock, Save, UserX } from "lucide-react";

type Step = "groups" | "knockout" | "confirm";

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

export default function InscribirPage() {
  const router = useRouter();
  const [currentGroup, setCurrentGroup] = useState(0);
  const [step, setStep] = useState<Step>("groups");
  const [predictions, setPredictions] = useState<Record<string, MatchPrediction>>({});
  const [knockoutPredictions, setKnockoutPredictions] = useState<Record<string, MatchPrediction>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<"loading" | "none" | "pending" | "approved" | "registrations_closed">("loading");

  const [blockRegistrations, setBlockRegistrations] = useState(false);
  const [blockEdits, setBlockEdits] = useState(false);
  const [blockEditsKnockout, setBlockEditsKnockout] = useState(false);
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);

  // Verificar si ya tiene quiniela inscrita y su estado de aprobación
  useEffect(() => {
    async function checkRegistration() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setRegistrationStatus("none");
        return;
      }

      // Cargar configuraciones de bloqueo
      let isRegBlocked = false;
      let isEditsBlocked = false;
      let isEditsKnockoutBlocked = false;
      try {
        const { data: settings } = await supabase
          .from("system_settings")
          .select("*");
        if (settings) {
          const regSetting = settings.find((s) => s.key === "block_registrations");
          const editSetting = settings.find((s) => s.key === "block_edits");
          const editKnockoutSetting = settings.find((s) => s.key === "block_edits_knockout");
          isRegBlocked = !!regSetting?.value?.enabled;
          isEditsBlocked = !!editSetting?.value?.enabled;
          isEditsKnockoutBlocked = !!editKnockoutSetting?.value?.enabled;
          setBlockRegistrations(isRegBlocked);
          setBlockEdits(isEditsBlocked);
          setBlockEditsKnockout(isEditsKnockoutBlocked);
        }
      } catch (err) {
        console.error("Error al cargar configuraciones de bloqueo:", err);
      }

      const { data } = await supabase
        .from("user_quinielas")
        .select("id, status, predictions, knockout_predictions")
        .eq("user_id", session.user.id)
        .maybeSingle();
        
      if (data) {
        // Guardar estado original
        setOriginalStatus(data.status);

        // Verificar si la quiniela realmente está completa
        const predsMap = data.predictions || {};
        const koMap = data.knockout_predictions || {};
        
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

        const effectiveStatus = (data.status === "draft" || !isComplete) ? "draft" : data.status;

        if (effectiveStatus === "draft") {
          // Si es borrador, pero las inscripciones están cerradas
          if (isRegBlocked) {
            setRegistrationStatus("registrations_closed");
          } else {
            if (data.predictions) {
              setPredictions(data.predictions);
            }
            if (data.knockout_predictions) {
              setKnockoutPredictions(data.knockout_predictions);
            }
            setRegistrationStatus("none");

            // Si figura como aprobada/pendiente en la DB pero está incompleta, la revertimos a borrador (draft)
            if (data.status !== "draft") {
              supabase
                .from("user_quinielas")
                .update({ status: "draft" })
                .eq("id", data.id)
                .then(({ error }) => {
                  if (error) console.error("Error al revertir quiniela incompleta a draft:", error);
                });
            }
          }
        } else {
          // Si ya está inscrita (pending o approved)
          if (isEditsBlocked && isEditsKnockoutBlocked) {
            // Ediciones cerradas por completo: mostramos pantalla de bloqueo según corresponda
            setRegistrationStatus(data.status === "approved" ? "approved" : "pending");
          } else {
            // Ediciones abiertas para al menos una fase: cargamos datos y permitimos editar
            if (data.predictions) {
              setPredictions(data.predictions);
            }
            if (data.knockout_predictions) {
              setKnockoutPredictions(data.knockout_predictions);
            }
            setRegistrationStatus("none");
          }
        }
      } else {
        // No tiene quiniela aún
        if (isRegBlocked) {
          setRegistrationStatus("registrations_closed");
        } else {
          setRegistrationStatus("none");
        }
      }
    }
    checkRegistration();
  }, [router]);

  // Actualizar predicción de un partido
  const updatePrediction = useCallback(
    (matchId: string, side: "home" | "away", value: string) => {
      const numVal = value === "" ? null : parseInt(value, 10);
      if (numVal !== null && (isNaN(numVal) || numVal < 0 || numVal > 20)) return;
      setPredictions((prev) => ({
        ...prev,
        [matchId]: {
          matchId,
          homeGoals: side === "home" ? numVal : (prev[matchId]?.homeGoals ?? null),
          awayGoals: side === "away" ? numVal : (prev[matchId]?.awayGoals ?? null),
        },
      }));
    },
    []
  );

  const updateKnockoutPrediction = useCallback(
    (matchId: string, side: "home" | "away", value: string) => {
      const numVal = value === "" ? null : parseInt(value, 10);
      if (numVal !== null && (isNaN(numVal) || numVal < 0 || numVal > 20)) return;
      setKnockoutPredictions((prev) => ({
        ...prev,
        [matchId]: {
          matchId,
          homeGoals: side === "home" ? numVal : (prev[matchId]?.homeGoals ?? null),
          awayGoals: side === "away" ? numVal : (prev[matchId]?.awayGoals ?? null),
        },
      }));
    },
    []
  );

  // Rellenar fase de grupos al azar
  const fillRandomGroups = useCallback(() => {
    const randomPreds: Record<string, MatchPrediction> = {};
    ALL_GROUP_MATCHES.forEach((m) => {
      randomPreds[m.id] = {
        matchId: m.id,
        homeGoals: Math.floor(Math.random() * 4),
        awayGoals: Math.floor(Math.random() * 4),
      };
    });
    setPredictions(randomPreds);
  }, []);

  // Rellenar eliminatorias al azar (sin empates)
  const fillRandomKnockout = useCallback(() => {
    const randomPreds: Record<string, MatchPrediction> = {};
    ALL_KNOCKOUT_MATCHES.forEach((m) => {
      let home = Math.floor(Math.random() * 4);
      let away = Math.floor(Math.random() * 4);
      
      // Asegurar que no haya empates en eliminatorias
      while (home === away) {
        home = Math.floor(Math.random() * 5);
        away = Math.floor(Math.random() * 5);
      }
      
      randomPreds[m.id] = {
        matchId: m.id,
        homeGoals: home,
        awayGoals: away,
      };
    });
    setKnockoutPredictions(randomPreds);
  }, []);

  // Calcular la tabla del grupo actual
  const groupKey = GROUP_NAMES[currentGroup];
  const groupMatches = useMemo(() => getGroupMatches(groupKey), [groupKey]);
  const standings = useMemo(
    () => calculateGroupStandings(groupKey, predictions),
    [groupKey, predictions]
  );

  // Verificar si todos los partidos de grupo están completos
  const allGroupsFilled = useMemo(() => {
    for (const group of GROUP_NAMES) {
      const matches = getGroupMatches(group);
      for (const m of matches) {
        const p = predictions[m.id];
        if (!p || p.homeGoals === null || p.awayGoals === null) return false;
      }
    }
    return true;
  }, [predictions]);

  // Conteo de partidos completados por grupo
  const groupCompletionCount = useCallback(
    (group: string) => {
      const matches = getGroupMatches(group);
      return matches.filter((m) => {
        const p = predictions[m.id];
        return p && p.homeGoals !== null && p.awayGoals !== null;
      }).length;
    },
    [predictions]
  );

  // Resolver bracket de eliminatorias
  const groupResults = useMemo(() => getGroupResults(predictions), [predictions]);
  const resolvedBracket = useMemo(
    () => resolveKnockoutBracket(groupResults, knockoutPredictions),
    [groupResults, knockoutPredictions]
  );

  const hasKnockoutTies = useMemo(() => {
    return Object.values(knockoutPredictions).some(
      (p) => p.homeGoals !== null && p.awayGoals !== null && p.homeGoals === p.awayGoals
    );
  }, [knockoutPredictions]);

  // Contar cuántos partidos de eliminatorias faltan por pronosticar
  const remainingKnockoutCount = useMemo(() => {
    let count = 0;
    for (const m of ALL_KNOCKOUT_MATCHES) {
      const p = knockoutPredictions[m.id];
      if (!p || p.homeGoals === null || p.awayGoals === null) {
        count++;
      }
    }
    return count;
  }, [knockoutPredictions]);

  // Contar cuántos partidos de grupo faltan por pronosticar
  const remainingGroupsCount = useMemo(() => {
    let count = 0;
    for (const m of ALL_GROUP_MATCHES) {
      const p = predictions[m.id];
      if (!p || p.homeGoals === null || p.awayGoals === null) {
        count++;
      }
    }
    return count;
  }, [predictions]);

  const totalRemainingCount = remainingGroupsCount + remainingKnockoutCount;

  const allKnockoutFilled = remainingKnockoutCount === 0;

  // Guardar Borrador
  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        alert("❌ Error: Debes iniciar sesión para guardar tu borrador.");
        setIsSavingDraft(false);
        return;
      }

      // Si las inscripciones están bloqueadas y no tiene una quiniela ya inscrita, bloquear guardado de borrador
      const { data: settings } = await supabase
        .from("system_settings")
        .select("*");
      
      let isRegBlocked = false;
      if (settings) {
        const regSetting = settings.find((s) => s.key === "block_registrations");
        isRegBlocked = !!regSetting?.value?.enabled;
      }

      const isEditing = originalStatus !== null && originalStatus !== "draft";

      if (!isEditing && isRegBlocked) {
        alert("❌ Las inscripciones de nuevas quinielas han sido cerradas por el administrador.");
        setIsSavingDraft(false);
        return;
      }

      const { error } = await supabase
        .from("user_quinielas")
        .upsert({
          user_id: session.user.id,
          predictions: predictions,
          knockout_predictions: knockoutPredictions,
          status: "draft",
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) {
        console.error("Supabase Error:", error);
        alert(`❌ Error al guardar borrador: ${error.message}`);
        setIsSavingDraft(false);
        return;
      }

      alert("💾 ¡Borrador guardado exitosamente! Puedes salir y regresar después para completarla.");
    } catch (err) {
      console.error(err);
      alert("❌ Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Lógica de Guardado en Base de Datos (Supabase)
  const handleSaveQuiniela = async () => {
    if (!allGroupsFilled || !allKnockoutFilled || hasKnockoutTies) return;
    
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        alert("❌ Error: Debes iniciar sesión para registrar tu quiniela.");
        setIsSaving(false);
        return;
      }

      // Si las inscripciones/ediciones están bloqueadas, denegar la acción de guardar
      const { data: settings } = await supabase
        .from("system_settings")
        .select("*");
      
      let isRegBlocked = false;
      let isEditsBlocked = false;
      let isEditsKnockoutBlocked = false;
      if (settings) {
        const regSetting = settings.find((s) => s.key === "block_registrations");
        const editSetting = settings.find((s) => s.key === "block_edits");
        const editKnockoutSetting = settings.find((s) => s.key === "block_edits_knockout");
        isRegBlocked = !!regSetting?.value?.enabled;
        isEditsBlocked = !!editSetting?.value?.enabled;
        isEditsKnockoutBlocked = !!editKnockoutSetting?.value?.enabled;
      }

      const isEditing = originalStatus !== null && originalStatus !== "draft";

      if (isEditing && isEditsBlocked && isEditsKnockoutBlocked) {
        alert("❌ Las modificaciones a las quinielas han sido cerradas por el administrador.");
        setIsSaving(false);
        return;
      }
      if (!isEditing && isRegBlocked) {
        alert("❌ Las inscripciones de nuevas quinielas han sido cerradas por el administrador.");
        setIsSaving(false);
        return;
      }

      // Si ya existía y estaba aprobada o pendiente, conservamos su estado
      // Si era borrador (draft) o nueva, se guarda como 'pending'
      const statusToSave = (originalStatus === "approved" || originalStatus === "pending")
        ? originalStatus
        : "pending";

      const { error } = await supabase
        .from("user_quinielas")
        .upsert({
          user_id: session.user.id,
          predictions: predictions,
          knockout_predictions: knockoutPredictions,
          status: statusToSave,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) {
        console.error("Supabase Error:", error);
        alert(`❌ Error al guardar en base de datos: ${error.message}`);
        setIsSaving(false);
        return;
      }

      alert(isEditing ? "💾 ¡Quiniela actualizada exitosamente!" : "🎉 ¡Quiniela inscrita exitosamente!");
      router.push("/");
    } catch (err) {
      console.error(err);
      alert("❌ Ocurrió un error inesperado al procesar la solicitud.");
      setIsSaving(false);
    }
  };

  if (registrationStatus === "loading") {
    return (
      <div className="max-w-7xl mx-auto py-32 text-center animate-in fade-in duration-500">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-content-muted font-medium">Verificando estado de tu inscripción...</p>
      </div>
    );
  }

  if (registrationStatus === "registrations_closed") {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
          <UserX size={40} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-content mb-4 tracking-tight">Inscripciones Cerradas</h1>
        <p className="text-content-muted mb-8 text-lg">
          El administrador ha cerrado las inscripciones para este torneo. Ya no se aceptan nuevas quinielas.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-8 py-3.5 bg-panel hover:bg-card border border-line rounded-xl text-content font-bold transition-all shadow-sm"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  if (registrationStatus === "pending") {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/30">
          <Clock size={40} className="text-yellow-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-content mb-4 tracking-tight">Quiniela Pendiente de Aprobación</h1>
        <p className="text-content-muted mb-4 text-lg">
          Tu quiniela ha sido registrada exitosamente y está <strong className="text-yellow-500">pendiente de aprobación</strong> por parte del administrador.
        </p>
        <p className="text-content-muted mb-8">
          El administrador debe confirmar el pago de tu inscripción antes de que tu quiniela sea visible en el Hub y el Ranking.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-8 py-3.5 bg-panel hover:bg-card border border-line rounded-xl text-content font-bold transition-all shadow-sm"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  if (registrationStatus === "approved") {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand/30">
          <Lock size={40} className="text-brand" />
        </div>
        <h1 className="text-3xl font-extrabold text-content mb-4 tracking-tight">Quiniela Bloqueada</h1>
        <p className="text-content-muted mb-8 text-lg">
          Ya has inscrito oficialmente tu quiniela para este torneo. Por reglas del juego para evitar trampas, <strong>no se permiten modificaciones</strong> una vez registrada.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-8 py-3.5 bg-panel hover:bg-card border border-line rounded-xl text-content font-bold transition-all shadow-sm"
        >
          Ver mi Quiniela en el Hub
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="text-brand" size={28} />
            <h1 className="text-3xl font-extrabold text-content tracking-tight">Inscribir Quiniela</h1>
          </div>
          <p className="text-content-muted">
            Completa todos los marcadores de la fase de grupos y las eliminatorias para registrar tu quiniela.
          </p>
        </div>
        
        {/* Botón de relleno aleatorio dinámico */}
        {((step === "groups" && !blockEdits) || (step === "knockout" && !blockEditsKnockout)) && (
          <button
            onClick={step === "groups" ? fillRandomGroups : fillRandomKnockout}
            className="flex items-center gap-2 px-4 py-2 bg-panel hover:bg-card border border-line rounded-lg text-sm font-semibold text-content transition-colors shrink-0"
          >
            <Dices size={18} className="text-brand" />
            <span className="hidden sm:inline">Completar al Azar</span>
            <span className="sm:hidden">Al Azar</span>
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => setStep("groups")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            step === "groups"
              ? "bg-brand text-white shadow-[0_0_15px_rgba(0,176,107,0.3)]"
              : allGroupsFilled
              ? "bg-brand/20 text-brand border border-brand/30"
              : "bg-panel text-content-muted border border-line"
          }`}
        >
          {allGroupsFilled ? <Check size={16} /> : <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">1</span>}
          Fase de Grupos
        </button>
        <ChevronRight size={16} className="text-content-muted" />
        <button
          onClick={() => allGroupsFilled && setStep("knockout")}
          disabled={!allGroupsFilled}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            step === "knockout"
              ? "bg-brand text-white shadow-[0_0_15px_rgba(0,176,107,0.3)]"
              : !allGroupsFilled
              ? "bg-panel text-content-muted/50 border border-line cursor-not-allowed"
              : "bg-panel text-content-muted border border-line hover:text-content"
          }`}
        >
          <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">2</span>
          Eliminatorias
        </button>
      </div>

      {/* ===== STEP 1: FASE DE GRUPOS ===== */}
      {step === "groups" && (
        <>
          {blockEdits && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6 text-xs leading-relaxed flex items-center gap-3 animate-in fade-in duration-300">
              <span className="text-red-500 text-lg">🔒</span>
              <div className="text-content">
                <span className="font-bold text-red-500 block mb-0.5">Fase de Grupos Bloqueada:</span>
                El primer partido del mundial ha comenzado. Ya no se pueden editar los pronósticos de la fase de grupos.
              </div>
            </div>
          )}
          {/* Group Tabs */}
          <div className="relative">
            <div className="flex overflow-x-auto pb-3 gap-2 mb-6 hide-scrollbar">
              {GROUP_NAMES.map((g, idx) => {
                const completed = groupCompletionCount(g);
                const isFull = completed === 6;
                return (
                  <button
                    key={g}
                    onClick={() => setCurrentGroup(idx)}
                    className={`relative px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                      idx === currentGroup
                        ? "bg-brand text-white shadow-[0_0_12px_rgba(0,176,107,0.3)]"
                        : isFull
                        ? "bg-brand/10 text-brand border border-brand/30"
                        : "bg-panel text-content-muted hover:text-content border border-line"
                    }`}
                  >
                    Grupo {g}
                    {completed > 0 && (
                      <span className={`ml-1.5 text-[10px] ${idx === currentGroup ? "text-white/70" : "text-content-muted"}`}>
                        {completed}/6
                      </span>
                    )}
                    {isFull && idx !== currentGroup && (
                      <Check size={12} className="inline ml-1 text-brand" />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Gradiente de desplazamiento horizontal para móvil */}
            <div className="absolute right-0 top-0 bottom-3 w-12 pointer-events-none bg-gradient-to-l from-base to-transparent md:hidden"></div>
          </div>

          {/* Group Content: Matches + Standings */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Partidos (3 columnas) */}
            <div className="lg:col-span-3 space-y-4">
              <h2 className="text-lg font-bold text-content mb-2">
                Partidos Grupo {groupKey}
              </h2>
              {[1, 2, 3].map((matchday) => (
                <div key={matchday}>
                  <p className="text-xs text-content-muted uppercase tracking-wider font-semibold mb-3">
                    Jornada {matchday}
                  </p>
                  <div className="space-y-3">
                    {groupMatches
                      .filter((m) => m.matchday === matchday)
                      .map((match) => {
                        const home = TEAMS[match.homeTeam];
                        const away = TEAMS[match.awayTeam];
                        const pred = predictions[match.id];
                        return (
                          <div
                            key={match.id}
                            className="glass-card p-3 sm:p-4 flex items-center gap-2 sm:gap-3"
                          >
                            {/* Home */}
                            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                              <span className="font-medium text-content text-xs sm:text-sm text-right truncate">
                                {home.name}
                              </span>
                              <div className="shrink-0">
                                <Flag iso2={home.iso2} name={home.name} size="md" />
                              </div>
                            </div>

                            {/* Score Inputs */}
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                disabled={blockEdits}
                                value={pred?.homeGoals ?? ""}
                                onChange={(e) => {
                                  updatePrediction(match.id, "home", e.target.value);
                                  if (e.target.value !== "") focusNextInput(e.target);
                                }}
                                placeholder="-"
                                className="w-11 h-12 bg-base border-2 border-line rounded-lg text-center text-lg font-bold text-content focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <span className="text-content-muted font-bold text-sm">:</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                disabled={blockEdits}
                                value={pred?.awayGoals ?? ""}
                                onChange={(e) => {
                                  updatePrediction(match.id, "away", e.target.value);
                                  if (e.target.value !== "") focusNextInput(e.target);
                                }}
                                placeholder="-"
                                className="w-11 h-12 bg-base border-2 border-line rounded-lg text-center text-lg font-bold text-content focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>

                            {/* Away */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="shrink-0">
                                <Flag iso2={away.iso2} name={away.name} size="md" />
                              </div>
                              <span className="font-medium text-content text-xs sm:text-sm truncate">
                                {away.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla de Posiciones (2 columnas) */}
            <div className="lg:col-span-2">
              <div className="sticky top-4">
                <GroupStandings standings={standings} groupName={groupKey} />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-line gap-2">
            <button
              onClick={() => setCurrentGroup(Math.max(0, currentGroup - 1))}
              disabled={currentGroup === 0}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-content-muted hover:text-content disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Grupo Anterior</span>
              <span className="sm:hidden">Anterior</span>
            </button>

            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-panel hover:bg-card border border-line rounded-lg text-sm font-semibold text-content transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-wait"
            >
              <Save size={16} className="text-brand" />
              <span>Guardar Borrador</span>
            </button>

            {currentGroup < 11 ? (
              <button
                onClick={() => setCurrentGroup(currentGroup + 1)}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand/10 text-brand hover:bg-brand hover:text-white border border-brand/50 transition-colors"
              >
                <span className="hidden sm:inline">Grupo Siguiente</span>
                <span className="sm:hidden">Siguiente</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => allGroupsFilled && setStep("knockout")}
                disabled={!allGroupsFilled}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand text-white shadow-[0_0_15px_rgba(0,176,107,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Ir a Eliminatorias</span>
                <span className="sm:hidden">Siguiente</span>
                <ChevronRight size={18} />
              </button>
            )}
          </div>

          {allGroupsFilled && (
            <div className="mt-6 text-center animate-in fade-in duration-300">
              <button
                onClick={() => setStep("knockout")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand/15 border border-brand/40 hover:bg-brand hover:text-white rounded-xl text-brand font-bold text-sm transition-all shadow-[0_0_15px_rgba(0,176,107,0.15)] active:scale-95 cursor-pointer"
              >
                <span>Continuar a fase de eliminatorias</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== STEP 2: ELIMINATORIAS ===== */}
      {step === "knockout" && (
        <div className="space-y-8">
          <KnockoutBracket
            matches={ALL_KNOCKOUT_MATCHES}
            resolvedBracket={resolvedBracket}
            predictions={knockoutPredictions}
            readOnly={blockEditsKnockout}
            onUpdate={updateKnockoutPrediction}
          />

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-line gap-2">
            <button
              onClick={() => setStep("groups")}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-content-muted hover:text-content transition-colors"
            >
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Volver a Grupos</span>
              <span className="sm:hidden">Grupos</span>
            </button>

            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-panel hover:bg-card border border-line rounded-lg text-sm font-semibold text-content transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-wait"
            >
              <Save size={16} className="text-brand" />
              <span>Guardar Borrador</span>
            </button>

            <button
              disabled={!allGroupsFilled || !allKnockoutFilled || hasKnockoutTies || isSaving}
              onClick={handleSaveQuiniela}
              className={`flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-bold transition-colors ${
                !allGroupsFilled || !allKnockoutFilled
                  ? "bg-line/30 text-content-muted border border-line/50 cursor-not-allowed"
                  : hasKnockoutTies
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed"
                  : isSaving
                  ? "bg-brand/50 text-white cursor-wait"
                  : "bg-brand text-white shadow-[0_0_20px_rgba(0,176,107,0.4)] hover:bg-brand-hover"
              }`}
            >
              <Lock size={18} className={isSaving ? "animate-pulse" : ""} />
              {isSaving ? "Guardando..." : (!allGroupsFilled || !allKnockoutFilled) ? (
                <>
                  <span className="hidden sm:inline">Faltan {totalRemainingCount} pronósticos</span>
                  <span className="sm:hidden">{totalRemainingCount} restantes</span>
                </>
              ) : hasKnockoutTies ? (
                <>
                  <span className="hidden sm:inline">Corrige los empates</span>
                  <span className="sm:hidden">Empates</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">
                    {originalStatus === "approved" || originalStatus === "pending"
                      ? "Actualizar Mi Quiniela"
                      : "Inscribir Mi Quiniela"}
                  </span>
                  <span className="sm:hidden">
                    {originalStatus === "approved" || originalStatus === "pending"
                      ? "Actualizar"
                      : "Inscribir"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
