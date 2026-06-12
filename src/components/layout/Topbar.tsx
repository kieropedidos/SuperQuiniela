"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { calculateUserPoints } from "@/scoringEngine";
import { Menu, X, ScrollText, Settings, ShieldCheck, User, Trophy } from "lucide-react";

export default function Topbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsername(session?.user?.user_metadata?.username || "");
      setUserId(session?.user?.id || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUsername(session?.user?.user_metadata?.username || "");
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch user points and rank
  useEffect(() => {
    if (!userId) return;

    async function fetchRank() {
      try {
        // Fetch all approved quinielas
        const { data: quinielasData } = await supabase
          .from("user_quinielas")
          .select("user_id, predictions, knockout_predictions")
          .eq("status", "approved");

        // Fetch official matches
        const { data: officialMatchesData } = await supabase
          .from("official_matches")
          .select("*");

        const officialMatches = officialMatchesData || [];
        const quinielas = quinielasData || [];
        setTotalParticipants(quinielas.length);

        // Calculate points for all users
        const allScores = quinielas.map((row: any) => {
          const scoring = calculateUserPoints(
            row.predictions || {},
            row.knockout_predictions || {},
            officialMatches
          );
          return { userId: row.user_id, points: scoring.totalPoints };
        });

        // Sort descending
        allScores.sort((a, b) => b.points - a.points);

        // Dense ranking: users with same points share the same rank
        let currentRank = 1;
        for (let i = 0; i < allScores.length; i++) {
          if (i > 0 && allScores[i].points < allScores[i - 1].points) {
            currentRank = i + 1;
          }
          if (allScores[i].userId === userId) {
            setUserPoints(allScores[i].points);
            setUserRank(currentRank);
            break;
          }
        }
      } catch (err) {
        console.error("Error fetching rank:", err);
      }
    }

    fetchRank();
  }, [userId]);

  // Cerrar el menú automáticamente al cambiar de página
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isAdmin = username.toLowerCase() === "vicdaddy";

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-2 bg-panel border-b border-line sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <img 
            src="/logo-mundial.png" 
            alt="Mundial 2026 Logo" 
            className="h-8 w-auto object-contain shrink-0" 
          />
          <span className="text-lg font-bold text-brand tracking-tight">Quiniela 2026</span>
        </Link>
        <div className="flex items-center gap-2">
          {/* User Points & Rank Badge */}
          {userRank !== null && userPoints !== null && (
            <Link
              href="/leaderboard"
              className="flex items-center gap-1.5 bg-base/80 border border-line/60 rounded-lg px-2 py-1 hover:border-brand/40 transition-colors"
            >
              <div className="flex items-center gap-1">
                <Trophy size={12} className="text-yellow-500" />
                <span className="text-[11px] font-black text-content">#{userRank}</span>
              </div>
              <div className="w-px h-3 bg-line/60"></div>
              <span className="text-[11px] font-bold text-brand">{userPoints} pts</span>
            </Link>
          )}
          <button 
            onClick={() => setIsOpen(true)}
            className="p-2 -mr-2 text-content-muted hover:text-content hover:bg-card rounded-md transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Menú Deslizante (Drawer) para móviles */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex justify-end">
          {/* Fondo oscuro desenfocado */}
          <div 
            className="absolute inset-0 bg-base/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Panel Lateral Derecho */}
          <div className="relative w-64 h-full bg-panel border-l border-line flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-line">
              <div className="flex items-center gap-2 px-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center border border-brand/50 shrink-0">
                  <span className="text-brand font-bold text-sm">
                    {username ? username.charAt(0).toUpperCase() : <User size={14} />}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-content text-sm truncate">{username || "Menú"}</span>
                  {userRank !== null && userPoints !== null && (
                    <span className="text-[10px] text-brand font-bold">
                      #{userRank} de {totalParticipants} · {userPoints} pts
                    </span>
                  )}
                  {username && (
                    <button
                      onClick={handleLogout}
                      className="text-[10px] text-red-400 hover:text-red-500 font-semibold text-left mt-0.5 active:scale-95 transition-transform"
                    >
                      Cerrar Sesión
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 text-content-muted hover:text-white hover:bg-card rounded-md transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <Link 
                href="/rules" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-content-muted hover:text-content hover:bg-card transition-colors"
              >
                <ScrollText size={18} /> Reglas y Puntos
              </Link>
              
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="flex items-center gap-3 px-4 py-3 mt-4 rounded-lg text-sm font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors border border-red-500/20"
                >
                  <ShieldCheck size={18} /> Cargar Resultados
                </Link>
              )}
            </nav>

            <div className="p-4 border-t border-line">
              <Link 
                href="/settings" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-content-muted hover:text-content hover:bg-card transition-colors"
              >
                <Settings size={18} /> Configuración
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
