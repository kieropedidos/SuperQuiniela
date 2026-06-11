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
import { calculateUserPoints } from "@/scoringEngine";
import { ALL_GROUP_MATCHES, ALL_KNOCKOUT_MATCHES } from "@/lib/worldCupData";

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string>("Cargando...");
  const [points, setPoints] = useState<number>(0);
  const [quinielaStatus, setQuinielaStatus] = useState<string | null>(null);
  const [blockEdits, setBlockEdits] = useState<boolean>(false);
  const [blockEditsKnockout, setBlockEditsKnockout] = useState<boolean>(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data: settings } = await supabase
          .from("system_settings")
          .select("*");
        if (settings) {
          const editSetting = settings.find((s) => s.key === "block_edits");
          const editKnockoutSetting = settings.find((s) => s.key === "block_edits_knockout");
          setBlockEdits(!!editSetting?.value?.enabled);
          setBlockEditsKnockout(!!editKnockoutSetting?.value?.enabled);
        }
      } catch (err) {
        console.error("Error al cargar configuración en Sidebar:", err);
      }
    }
    fetchSettings();

    async function fetchPoints(userId: string) {
      try {
        // 1. Obtener la quiniela del usuario
        const { data: userQ } = await supabase
          .from("user_quinielas")
          .select("predictions, knockout_predictions, status")
          .eq("user_id", userId)
          .maybeSingle();
          
        if (!userQ) {
          setPoints(0);
          setQuinielaStatus(null);
          return;
        }
        
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
        setQuinielaStatus(effectiveStatus);
        
        if (effectiveStatus === "draft") {
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
        
        // 3. Calcular puntos en tiempo real
        const scoring = calculateUserPoints(
          userQ.predictions || {},
          userQ.knockout_predictions || {},
          officialMatches
        );
        
        setPoints(scoring.totalPoints);
      } catch (err) {
        console.error("Error al calcular puntos en Sidebar:", err);
        setPoints(0);
        setQuinielaStatus(null);
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
        setQuinielaStatus(null);
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
        setQuinielaStatus(null);
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
        <Link href="/inscribir" className="w-full mb-6 btn-primary text-center block text-sm">
          {user ? (
            quinielaStatus === "draft" ? "Completa tu quiniela" :
            quinielaStatus === null ? "Registra tu quiniela" :
            (blockEdits && blockEditsKnockout) ? "Ver Mi Quiniela" : "Editar Mi Quiniela"
          ) : (
            "Inscribir Quiniela"
          )}
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
