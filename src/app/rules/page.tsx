"use client";

import { Lock, ShieldAlert, Trophy } from "lucide-react";

export default function RulesPage() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-brand drop-shadow-sm tracking-tight mb-2">Reglas y Puntuación</h1>
        <p className="text-content-muted text-lg leading-relaxed">
          Domina el sistema de puntos para escalar en el ranking. Tu camino a la gloria empieza entendiendo exactamente cómo cuenta cada pronóstico.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main Content (Match Points) */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">⚽</div>
            <h2 className="text-2xl font-bold text-content">Puntos por Partido</h2>
          </div>
          <p className="text-sm text-content-muted uppercase tracking-wider font-semibold mb-6">Fase de Grupos (90 Mins) y Eliminatorias (Partido Completo)</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            
            {/* Rule 1: Exact Score */}
            <div className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden group hover:border-brand/50 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center text-2xl font-bold mb-4 shadow-[0_0_15px_rgba(0,176,107,0.4)]">
                +5
              </div>
              <h3 className="font-bold text-content mb-2">Marcador Exacto</h3>
              <p className="text-sm text-content-muted">Predijiste 2-1,<br/>el resultado es 2-1.</p>
            </div>

            {/* Rule 2: Correct Result */}
            <div className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden group hover:border-yellow-500/50 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-14 h-14 rounded-full bg-transparent border-2 border-yellow-500 text-yellow-500 flex items-center justify-center text-xl font-bold mb-4">
                +3
              </div>
              <h3 className="font-bold text-content mb-2">Resultado Correcto</h3>
              <p className="text-sm text-content-muted">Predijiste 2-1,<br/>el resultado es 1-0.</p>
            </div>

            {/* Rule 3: Consolation */}
            <div className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden group hover:border-gray-400/50 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-b from-gray-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-14 h-14 rounded-full bg-transparent border border-line text-content-muted flex items-center justify-center text-xl font-bold mb-4">
                +1
              </div>
              <h3 className="font-bold text-content mb-2">Consuelo</h3>
              <p className="text-sm text-content-muted">Predijiste empate y hubo ganador (o viceversa).</p>
            </div>
            
          </div>

          {/* Aclaración sobre 0 puntos */}
          <div className="text-xs text-content-muted bg-panel border border-line rounded-xl p-4 mb-4 leading-relaxed">
            <span className="font-bold text-yellow-500">⚠️ Nota Importante:</span> Si pronosticas la victoria de un equipo y resulta ganador el equipo contrario, obtendrás <strong className="text-content">0 puntos</strong>. El punto de consuelo (+1) se otorga únicamente si predijiste un empate y ganó un equipo, o si predijiste un ganador y el partido terminó empatado (solo aplica a Fase de Grupos).
          </div>

          {/* Aclaración sobre Eliminatorias y Empates */}
          <div className="text-xs text-content-muted bg-panel border border-line rounded-xl p-4 mb-8 leading-relaxed">
            <span className="font-bold text-brand">⚔️ Regla de Eliminatorias:</span> En la fase de eliminatorias (desde Ronda de 32 en adelante), **el empate no está permitido**. Los pronósticos y resultados oficiales deben incluir los goles de la definición por penales si el partido va a esa instancia (el partido completo).
            <br />
            <span className="text-content-muted italic mt-1 block">Ejemplo: Si el partido termina 1-1 en cancha y 4-3 en tanda de penales, el resultado total oficial es 5-4. Debes ingresar 5-4 en tu quiniela para predecir el resultado exacto de ese partido.</span>
          </div>

          {/* Lockdown Policy Box */}
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShieldAlert size={120} />
            </div>
            <div className="flex gap-4 relative z-10">
              <div className="mt-1">
                <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
                  <Lock size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-400 mb-2">Política de Bloqueo</h3>
                <p className="text-content-muted leading-relaxed">
                  <strong className="text-content">TODOS los pronósticos deben ser guardados antes de que inicie el primer partido.</strong> Una vez que comience el torneo, todos los campos de texto serán bloqueados permanentemente por la base de datos. Sin excepciones, sin entradas tardías.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar (Tournament Bonuses) */}
        <div className="lg:w-80">
          <div className="glass-panel p-6 sticky top-8">
            <div className="flex items-center gap-2 mb-6 border-b border-line pb-4">
              <Trophy size={20} className="text-yellow-500" />
              <h2 className="text-xl font-bold text-content">Bonos del Torneo</h2>
            </div>

            <div className="space-y-6">
              
              <div className="relative pl-4 border-l-2 border-brand">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-brand text-sm">Fase de Grupos</h4>
                  <span className="bg-brand/20 text-brand text-xs font-bold px-2 py-0.5 rounded">+3 pts</span>
                </div>
                <p className="text-xs text-content-muted">Por posición exacta (1º al 3º) en cada grupo.</p>
              </div>

              <div className="relative pl-4 border-l-2 border-brand">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-brand text-sm">Podio Final</h4>
                  <span className="bg-brand/20 text-brand text-xs font-bold px-2 py-0.5 rounded">+5 pts</span>
                </div>
                <p className="text-xs text-content-muted">Por posición exacta (1º al 4º).</p>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
