-- =====================================================================
-- SCHEMA_JSON.SQL - TABLA OPTIMIZADA PARA QUINIELAS (JSONB)
-- =====================================================================

-- 1. Crear la tabla para guardar la quiniela completa de cada usuario
CREATE TABLE public.user_quinielas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    predictions JSONB NOT NULL DEFAULT '{}'::jsonb,
    knockout_predictions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_quiniela UNIQUE (user_id)
);

-- 2. Habilitar Seguridad (RLS)
ALTER TABLE public.user_quinielas ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (RLS)
-- Los usuarios pueden ver todas las quinielas (para el feed/comparador)
CREATE POLICY "Permitir lectura pública de quinielas" 
    ON public.user_quinielas FOR SELECT 
    USING (true);

-- Los usuarios solo pueden insertar su propia quiniela
CREATE POLICY "Permitir insercion a dueños" 
    ON public.user_quinielas FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Los usuarios solo pueden actualizar su propia quiniela
CREATE POLICY "Permitir actualizacion a dueños" 
    ON public.user_quinielas FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Trigger para actualizar el timestamp de 'updated_at'
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_quinielas_modtime
    BEFORE UPDATE ON public.user_quinielas
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
