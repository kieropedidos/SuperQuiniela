"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy } from "lucide-react";

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Verificar si el usuario ya tiene sesión
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsOpen(true);
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || username.length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsLoading(true);
    setError("");

    // Truco: Generar correo falso único basado en el Nick
    const cleanNick = username.toLowerCase().replace(/[^a-z0-9]/g, "");
    const dummyEmail = `${cleanNick}@quiniela.local`;

    // 1. Intentar registrar al usuario
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: dummyEmail,
      password: password,
      options: {
        data: {
          username: username.trim(),
        },
      },
    });

    if (signUpError) {
      console.error("Detalle de signUpError:", signUpError);
      
      // Si ya está registrado, intentamos iniciar sesión
      const isAlreadyRegistered = 
        signUpError.message.toLowerCase().includes("already registered") || 
        signUpError.message.toLowerCase().includes("user already exists");

      if (isAlreadyRegistered) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: dummyEmail,
          password: password,
        });

        if (signInError) {
          console.error("Detalle de signInError:", signInError);
          if (signInError.message.toLowerCase().includes("email not confirmed")) {
            setError("❌ Supabase bloqueó el acceso. Ve a Supabase > Authentication > Providers > Email y DESACTIVA 'Confirm email'.");
          } else {
            setError("Contraseña incorrecta para este nombre de usuario.");
          }
          setIsLoading(false);
          return;
        }
      } else {
        setError(`Error de registro: ${signUpError.message}`);
        setIsLoading(false);
        return;
      }
    } else if (signUpData?.user && !signUpData?.session) {
      setError("❌ Supabase exige confirmación. Ve a Supabase > Authentication > Providers > Email y DESACTIVA 'Confirm email'.");
      setIsLoading(false);
      return;
    }

    // Éxito en registro o login
    setIsOpen(false);
    window.location.reload();
  };

  if (!isOpen || isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-base/80 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md p-8 border border-brand/30 shadow-[0_0_40px_rgba(0,176,107,0.15)] transform transition-all">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mb-4 border border-brand/20">
            <Trophy size={32} />
          </div>
          <h2 className="text-2xl font-bold text-content tracking-tight">Únete a la Quiniela</h2>
          <p className="text-content-muted mt-2 text-sm leading-relaxed">
            Ingresa tu apodo para jugar. Si es tu primera vez te registrarás; si ya tienes cuenta, iniciarás sesión para cargar y guardar tus datos.
          </p>
          
          <div className="w-full mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-content-muted mb-2">
                Nombre de Usuario (Nick)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: Goleador99"
                className="w-full bg-base border border-line rounded-lg px-4 py-3 text-content focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-content-muted/50"
                maxLength={20}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-content-muted mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-base border border-line rounded-lg px-4 py-3 text-content focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-content-muted/50"
                minLength={6}
                required
              />
            </div>

            {error && <p className="text-red-400 text-xs mt-2 font-medium">{error}</p>}
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <button
            type="submit"
            disabled={isLoading || !username.trim()}
            className="w-full btn-primary py-3 text-lg font-bold shadow-[0_0_15px_rgba(0,176,107,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Entrando..." : "Empezar a Jugar"}
          </button>
        </form>

      </div>
    </div>
  );
}
