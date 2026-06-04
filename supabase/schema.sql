-- =====================================================================
-- SCHEMA.SQL - PLATAFORMA DE QUINIELAS MUNDIALISTAS (SUPABASE/POSTGRESQL)
-- =====================================================================

-- Habilitar extensión para generar UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 1. TABLA: PROFILES
-- =====================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    total_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice optimizado para ranking de usuarios en orden descendente
CREATE INDEX idx_profiles_total_points_desc ON public.profiles (total_points DESC);

-- =====================================================================
-- 2. TABLA: MATCHES
-- =====================================================================
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE NOT NULL,
    stage TEXT NOT NULL, -- 'group', 'r16', 'qf', 'sf', 'final'
    group_letter TEXT, -- Nullable para fases de eliminación directa
    real_home_score INTEGER DEFAULT NULL,
    real_away_score INTEGER DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'finished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por fecha y estado de partidos
CREATE INDEX idx_matches_date_status ON public.matches (match_date, status);

-- =====================================================================
-- 3. TABLA: MATCH_PREDICTIONS
-- =====================================================================
CREATE TABLE public.match_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    pred_home_score INTEGER NOT NULL CHECK (pred_home_score >= 0),
    pred_away_score INTEGER NOT NULL CHECK (pred_away_score >= 0),
    points_earned INTEGER NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_match UNIQUE (user_id, match_id)
);

-- =====================================================================
-- 4. TABLA: GROUP_PREDICTIONS
-- =====================================================================
CREATE TABLE public.group_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_letter TEXT NOT NULL,
    predicted_first_place_id TEXT NOT NULL, -- ID/Nombre del equipo clasificado en 1er lugar
    predicted_second_place_id TEXT NOT NULL, -- ID/Nombre del equipo clasificado en 2do lugar
    points_earned INTEGER NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_group UNIQUE (user_id, group_letter)
);

-- =====================================================================
-- 5. TABLA: PODIUM_PREDICTIONS
-- =====================================================================
CREATE TABLE public.podium_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE, -- Un podio único por usuario
    first_place_id TEXT NOT NULL,
    second_place_id TEXT NOT NULL,
    third_place_id TEXT NOT NULL,
    fourth_place_id TEXT NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- TRIGGER POSTGRESQL: BLOQUEO GLOBAL DE PREDICCIONES (LOCKDOWN)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.check_predictions_lockdown()
RETURNS TRIGGER AS $$
DECLARE
    first_match_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Obtener la fecha del partido más antiguo en el torneo
    SELECT MIN(match_date) INTO first_match_date FROM public.matches;

    -- Si no hay partidos registrados, permitimos cualquier inserción/edición
    IF first_match_date IS NULL THEN
        RETURN NEW;
    END IF;

    -- 2. Si la fecha y hora actual (NOW()) es mayor a la del partido más antiguo del torneo
    IF NOW() > first_match_date THEN
        
        -- Si la operación ocurre en MATCH_PREDICTIONS
        IF TG_TABLE_NAME = 'match_predictions' THEN
            IF TG_OP = 'INSERT' THEN
                RAISE EXCEPTION 'Lockdown activo: El torneo ya ha comenzado (%). No se permiten nuevas predicciones de partidos.', first_match_date;
            ELSIF TG_OP = 'UPDATE' THEN
                -- Bloquear si el usuario intenta modificar sus predicciones de goles o partidos
                IF NEW.pred_home_score IS DISTINCT FROM OLD.pred_home_score OR 
                   NEW.pred_away_score IS DISTINCT FROM OLD.pred_away_score OR
                   NEW.user_id IS DISTINCT FROM OLD.user_id OR
                   NEW.match_id IS DISTINCT FROM OLD.match_id THEN
                    RAISE EXCEPTION 'Lockdown activo: El torneo ya ha comenzado (%). No se permite modificar las predicciones.', first_match_date;
                END IF;
                -- Se permite actualizar 'points_earned' sin lanzar excepción
            END IF;
        
        -- Si la operación ocurre en GROUP_PREDICTIONS
        ELSIF TG_TABLE_NAME = 'group_predictions' THEN
            IF TG_OP = 'INSERT' THEN
                RAISE EXCEPTION 'Lockdown activo: El torneo ya ha comenzado (%). No se permiten nuevas predicciones de grupos.', first_match_date;
            ELSIF TG_OP = 'UPDATE' THEN
                -- Bloquear si el usuario intenta modificar sus equipos predichos
                IF NEW.predicted_first_place_id IS DISTINCT FROM OLD.predicted_first_place_id OR 
                   NEW.predicted_second_place_id IS DISTINCT FROM OLD.predicted_second_place_id OR
                   NEW.user_id IS DISTINCT FROM OLD.user_id OR
                   NEW.group_letter IS DISTINCT FROM OLD.group_letter THEN
                    RAISE EXCEPTION 'Lockdown activo: El torneo ya ha comenzado (%). No se permite modificar las predicciones de grupos.', first_match_date;
                END IF;
            END IF;

        -- Si la operación ocurre en PODIUM_PREDICTIONS
        ELSIF TG_TABLE_NAME = 'podium_predictions' THEN
            IF TG_OP = 'INSERT' THEN
                RAISE EXCEPTION 'Lockdown activo: El torneo ya ha comenzado (%). No se permiten nuevas predicciones de podio.', first_match_date;
            ELSIF TG_OP = 'UPDATE' THEN
                -- Bloquear si el usuario intenta modificar sus equipos del podio
                IF NEW.first_place_id IS DISTINCT FROM OLD.first_place_id OR 
                   NEW.second_place_id IS DISTINCT FROM OLD.second_place_id OR
                   NEW.third_place_id IS DISTINCT FROM OLD.third_place_id OR
                   NEW.fourth_place_id IS DISTINCT FROM OLD.fourth_place_id OR
                   NEW.user_id IS DISTINCT FROM OLD.user_id THEN
                    RAISE EXCEPTION 'Lockdown activo: El torneo ya ha comenzado (%). No se permite modificar las predicciones de podio.', first_match_date;
                END IF;
            END IF;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vinculación de Triggers
CREATE TRIGGER trigger_match_predictions_lockdown
    BEFORE INSERT OR UPDATE ON public.match_predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_predictions_lockdown();

CREATE TRIGGER trigger_group_predictions_lockdown
    BEFORE INSERT OR UPDATE ON public.group_predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_predictions_lockdown();

CREATE TRIGGER trigger_podium_predictions_lockdown
    BEFORE INSERT OR UPDATE ON public.podium_predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_predictions_lockdown();

-- =====================================================================
-- TRIGGER POSTGRESQL: CREACIÓN AUTOMÁTICA DE PERFILES
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin, total_points)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'usuario_' || substring(new.id::text from 1 for 8)),
    COALESCE((new.raw_user_meta_data->>'is_admin')::boolean, FALSE),
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS DE SEGURIDAD
-- =====================================================================

-- 1. Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podium_predictions ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para PROFILES
CREATE POLICY "Permitir lectura pública de perfiles" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Permitir actualización de su propio nombre de usuario" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- 3. Políticas para MATCHES
CREATE POLICY "Permitir lectura pública de partidos" 
    ON public.matches FOR SELECT 
    USING (true);

CREATE POLICY "Permitir gestión total a administradores" 
    ON public.matches FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
        )
    );

-- 4. Políticas para MATCH_PREDICTIONS
CREATE POLICY "Permitir usuarios ver sus propias predicciones" 
    ON public.match_predictions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Permitir usuarios gestionar sus propias predicciones" 
    ON public.match_predictions FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir lectura total a administradores sobre predicciones"
    ON public.match_predictions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
        )
    );

CREATE POLICY "Permitir actualización de puntos a administradores"
    ON public.match_predictions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
        )
    );

-- 5. Políticas para GROUP_PREDICTIONS
CREATE POLICY "Permitir usuarios ver sus propias predicciones de grupos" 
    ON public.group_predictions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Permitir usuarios gestionar sus propias predicciones de grupos" 
    ON public.group_predictions FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Políticas para PODIUM_PREDICTIONS
CREATE POLICY "Permitir usuarios ver sus propias predicciones de podio" 
    ON public.podium_predictions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Permitir usuarios gestionar sus propias predicciones de podio" 
    ON public.podium_predictions FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
