"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Settings, LogOut, User as UserIcon } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string>("Cargando...");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.user_metadata?.username) {
        setUsername(session.user.user_metadata.username);
      } else {
        setUsername("Invitado");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.user_metadata?.username) {
        setUsername(session.user.user_metadata.username);
      } else {
        setUsername("Invitado");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // La página principal detectará el logout y mostrará el AuthModal automáticamente
    window.location.href = "/";
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="text-brand" size={28} />
          <h1 className="text-3xl font-extrabold text-content tracking-tight">Configuración</h1>
        </div>
        <p className="text-content-muted">
          Administra tu perfil y preferencias de la cuenta.
        </p>
      </div>

      <div className="glass-panel p-6 space-y-8">
        {/* Profile Section */}
        <div>
          <h2 className="text-lg font-bold text-content mb-4 flex items-center gap-2">
            <UserIcon size={18} className="text-brand" /> Perfil Actual
          </h2>
          <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-line">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand/20 flex items-center justify-center border border-brand/50">
                <span className="text-brand font-bold text-xl">
                  {username !== "Cargando..." ? username.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
              <div>
                <p className="text-sm text-content-muted uppercase tracking-wider font-semibold mb-1">Nombre de Usuario</p>
                <p className="text-xl font-bold text-content">{username}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 font-semibold rounded-lg transition-colors"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
          <p className="text-xs text-content-muted mt-3">
            Al cerrar sesión, se te pedirá ingresar un nuevo Nick para crear una cuenta diferente.
          </p>
        </div>

        {/* System Settings Placeholders */}
        <div className="border-t border-line/50 pt-8">
          <h2 className="text-lg font-bold text-content mb-4">Preferencias</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-line opacity-50 cursor-not-allowed">
              <div>
                <p className="font-semibold text-content">Tema Oscuro</p>
                <p className="text-xs text-content-muted">Actualmente forzado por diseño premium.</p>
              </div>
              <div className="w-10 h-5 bg-brand rounded-full relative">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-line opacity-50 cursor-not-allowed">
              <div>
                <p className="font-semibold text-content">Notificaciones Push</p>
                <p className="text-xs text-content-muted">Recibe alertas sobre cierres de jornada.</p>
              </div>
              <div className="w-10 h-5 bg-line rounded-full relative">
                <div className="absolute left-1 top-1 w-3 h-3 bg-content-muted rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
