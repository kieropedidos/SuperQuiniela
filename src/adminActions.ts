"use server";

import { supabase } from "./lib/supabase";
import { calculateMatchPoints } from "./scoringEngine";

export interface ServerActionResponse {
  success: boolean;
  message: string;
  data?: {
    matchId: string;
    predictionsProcessed: number;
  };
}

/**
 * Server Action para cerrar un partido y calcular los puntos de todas las predicciones.
 * 
 * Flujo:
 * 1. Verifica la sesión actual de Supabase y comprueba que el usuario sea administrador.
 * 2. Actualiza los goles reales y el estado del partido a 'finished'.
 * 3. Obtiene todas las predicciones vinculadas al partido.
 * 4. Calcula los nuevos puntos usando 'scoringEngine.ts'.
 * 5. Realiza actualizaciones masivas (batch updates) para registrar los puntos de las predicciones
 *    y acumular el incremento (delta) en los perfiles de los usuarios correspondientes.
 * 
 * @param matchId ID único del partido a cerrar
 * @param realHomeScore Goles reales marcados por el equipo local
 * @param realAwayScore Goles reales marcados por el equipo visitante
 * @returns Objeto de respuesta indicando éxito o detalles de error
 */
export async function closeMatchAndCalculatePoints(
  matchId: string,
  realHomeScore: number,
  realAwayScore: number
): Promise<ServerActionResponse> {
  try {
    // 1. Verificar autenticación del usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        message: "No autorizado: Debes iniciar sesión para realizar esta operación.",
      };
    }

    // 2. Verificar rol de administrador en la tabla 'profiles'
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return {
        success: false,
        message: "Acceso denegado: Se requieren privilegios de administrador para realizar esta acción.",
      };
    }

    // 3. Actualizar el partido en la tabla 'matches'
    const { error: updateMatchError } = await supabase
      .from("matches")
      .update({
        real_home_score: realHomeScore,
        real_away_score: realAwayScore,
        status: "finished",
      })
      .eq("id", matchId);

    if (updateMatchError) {
      return {
        success: false,
        message: `Error al actualizar el partido: ${updateMatchError.message}`,
      };
    }

    // 4. Obtener todas las predicciones asociadas al partido
    const { data: predictions, error: fetchPredictionsError } = await supabase
      .from("match_predictions")
      .select("id, user_id, pred_home_score, pred_away_score, points_earned")
      .eq("match_id", matchId);

    if (fetchPredictionsError) {
      return {
        success: false,
        message: `Error al obtener las predicciones del partido: ${fetchPredictionsError.message}`,
      };
    }

    // Si no hay predicciones, finalizar con éxito temprano
    if (!predictions || predictions.length === 0) {
      return {
        success: true,
        message: "El partido fue cerrado con éxito, pero no había predicciones para calcular.",
        data: {
          matchId,
          predictionsProcessed: 0,
        },
      };
    }

    // 5. Calcular los nuevos puntos para cada predicción y preparar actualizaciones
    const predictionsToUpsert = [];
    const userDeltas: Record<string, number> = {};

    for (const pred of predictions) {
      const newPoints = calculateMatchPoints(
        pred.pred_home_score,
        pred.pred_away_score,
        realHomeScore,
        realAwayScore
      );

      // Calcular el cambio neto (delta) para el perfil del usuario
      // Esto nos cubre ante posibles correcciones manuales de marcadores en el futuro
      const oldPoints = pred.points_earned || 0;
      const delta = newPoints - oldPoints;

      predictionsToUpsert.push({
        id: pred.id,
        user_id: pred.user_id,
        match_id: matchId,
        pred_home_score: pred.pred_home_score,
        pred_away_score: pred.pred_away_score,
        points_earned: newPoints,
      });

      if (delta !== 0) {
        userDeltas[pred.user_id] = (userDeltas[pred.user_id] || 0) + delta;
      }
    }

    // 6. Actualización masiva (Batch Update) de match_predictions
    const { error: upsertPredsError } = await supabase
      .from("match_predictions")
      .upsert(predictionsToUpsert);

    if (upsertPredsError) {
      return {
        success: false,
        message: `Error al actualizar masivamente las predicciones: ${upsertPredsError.message}`,
      };
    }

    // 7. Actualización masiva (Batch Update) de profiles con los puntos acumulados
    const userIdsWithChanges = Object.keys(userDeltas);

    if (userIdsWithChanges.length > 0) {
      // Obtener los puntajes actuales de los usuarios con cambios
      const { data: userProfiles, error: fetchProfilesError } = await supabase
        .from("profiles")
        .select("id, total_points")
        .in("id", userIdsWithChanges);

      if (fetchProfilesError || !userProfiles) {
        return {
          success: false,
          message: `Error al recuperar perfiles de usuario para sumar puntos: ${
            fetchProfilesError?.message || "Perfiles vacíos"
          }`,
        };
      }

      // Preparar la actualización masiva de perfiles
      const profilesToUpsert = userProfiles.map((prof) => {
        const delta = userDeltas[prof.id] || 0;
        const currentPoints = prof.total_points || 0;
        return {
          id: prof.id,
          total_points: Math.max(0, currentPoints + delta), // Evitar puntos totales negativos por seguridad
        };
      });

      const { error: upsertProfilesError } = await supabase
        .from("profiles")
        .upsert(profilesToUpsert);

      if (upsertProfilesError) {
        return {
          success: false,
          message: `Error al actualizar los puntos totales de los usuarios: ${upsertProfilesError.message}`,
        };
      }
    }

    return {
      success: true,
      message: `El partido fue cerrado correctamente. Se recalcularon y actualizaron las predicciones y perfiles de ${predictions.length} usuario(s).`,
      data: {
        matchId,
        predictionsProcessed: predictions.length,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error interno inesperado: ${error.message || error}`,
    };
  }
}
