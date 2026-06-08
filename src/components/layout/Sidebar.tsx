"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import {
  Trophy,
  Target,
  Users,
  ScrollText,
  History,
  Settings,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { calculateMatchPoints, calculateTournamentBonuses } from "@/scoringEngine";

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string>("Cargando...");
  const [points, setPoints] = useState<number>(0);

  useEffect(() => {
    async function fetchPoints(userId: string) {
      try {
        // 1. Obtener la quiniela del usuario (si está aprobada o pendiente)
        const { data: userQ } = await supabase
          .from("user_quinielas")
          .select("predictions, knockout_predictions, status")
          .eq("user_id", userId)
          .single();
          
        if (!userQ || userQ.status === "draft") {
          setPoints(0);
          return;
        }
        
        // 2. Obtener los partidos oficiales reales
        const { data: officialMatches } = await supabase
          .from("official_matches")
          .select("*");
          
        if (!officialMatches) {
          setPoints(0);
          return;
        }
        
        // 3. Calcular puntos de partidos
        let total = 0;
        officialMatches.forEach((om) => {
          const pred = userQ.predictions?.[om.match_id] || userQ.knockout_predictions?.[om.match_id];
          if (pred && pred.homeGoals !== null && pred.awayGoals !== null) {
            total += calculateMatchPoints(
              pred.homeGoals,
              pred.awayGoals,
              om.home_goals,
              om.away_goals
            );
          }
        });
        
        // 4. Calcular puntos de bonos
        const bonuses = calculateTournamentBonuses(
          userQ.predictions || {},
          userQ.knockout_predictions || {},
          officialMatches
        );
        total += bonuses.total;
        
        setPoints(total);
      } catch (err) {
        console.error("Error al calcular puntos en Sidebar:", err);
        setPoints(0);
      }
    }

    // Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.user_metadata?.username) {
        setUsername(session.user.user_metadata.username);
        fetchPoints(session.user.id);
      } else if (!session) {
        setUsername("Invitado");
      }
    });

    // Suscribirse a cambios (ej. login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.user_metadata?.username) {
        setUsername(session.user.user_metadata.username);
        fetchPoints(session.user.id);
      } else if (!session) {
        setUsername("Invitado");
        setPoints(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initial = username !== "Cargando..." ? username.charAt(0).toUpperCase() : "U";

  const isAdmin = username.toLowerCase() === "vicdaddy";

  const mainLinks = [
    { name: "Pronósticos", href: "/", icon: Target },
    { name: "Ranking", href: "/leaderboard", icon: Trophy },
    { name: "Reglas", href: "/rules", icon: ScrollText },
  ];

  if (isAdmin) {
    mainLinks.push({ name: "Cargar Resultados", href: "/admin", icon: ShieldCheck });
  }

  const footerLinks = [
    { name: "Configuración", href: "/settings", icon: Settings },
    { name: "Soporte", href: "/support", icon: HelpCircle },
  ];

  return (
    <aside className="w-64 bg-panel border-r border-line hidden md:flex flex-col h-full overflow-y-auto">
      {/* Branding */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <img 
            src="/logo-mundial.png" 
            alt="Mundial 2026 Logo" 
            className="h-10 w-auto object-contain shrink-0" 
          />
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-brand tracking-tight">Quiniela 2026</h1>
            <p className="text-[10px] text-content-muted mt-0.5 uppercase tracking-wider">Edición Mundial</p>
          </div>
        </Link>
      </div>

      {/* Profile Section */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center border border-brand/50 shrink-0">
          <span className="text-brand font-bold text-sm">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-content truncate" title={username}>
            {username}
          </p>
          <p className="text-xs text-brand mt-0.5 font-medium">{points} Puntos</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {mainLinks.map((link) => {
          const isActive = pathname === link.href || (pathname === '/' && link.href === '/predictions');
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand/10 text-brand border border-brand/20"
                  : "text-content-muted hover:text-content hover:bg-card"
              }`}
            >
              <Icon size={18} className={isActive ? "text-brand" : "text-content-muted"} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Navigation */}
      <div className="p-4 mt-auto">
        <Link href="/inscribir" className="w-full mb-6 btn-primary text-center block">
          Inscribir Quiniela
        </Link>

        <div className="space-y-1">
          {footerLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-content-muted hover:text-content hover:bg-card transition-colors"
              >
                <Icon size={16} />
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
