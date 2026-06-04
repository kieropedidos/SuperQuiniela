"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Menu, X, ScrollText, Settings, ShieldCheck, User } from "lucide-react";

export default function Topbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsername(session?.user?.user_metadata?.username || "");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUsername(session?.user?.user_metadata?.username || "");
    });
    return () => subscription.unsubscribe();
  }, []);

  // Cerrar el menú automáticamente al cambiar de página
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isAdmin = username.toLowerCase() === "vicdaddy";

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-panel border-b border-line sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-brand tracking-tight">Quiniela Pro</h1>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 -mr-2 text-content-muted hover:text-content hover:bg-card rounded-md transition-colors"
        >
          <Menu size={24} />
        </button>
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
                <span className="font-bold text-content text-sm truncate">{username || "Menú"}</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 text-content-muted hover:text-white hover:bg-card rounded-md transition-colors"
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
