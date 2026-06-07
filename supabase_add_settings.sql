-- =====================================================================
-- SUPABASE_ADD_SETTINGS.SQL - TABLA DE CONFIGURACIONES GLOBALES
-- =====================================================================

-- 1. Crear la tabla para configuraciones generales del sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (RLS)
-- Cualquier usuario (incluso no autenticado) puede leer la configuración de visibilidad
DROP POLICY IF EXISTS "Permitir lectura pública de configuraciones" ON public.system_settings;
CREATE POLICY "Permitir lectura pública de configuraciones"
    ON public.system_settings FOR SELECT
    USING (true);

-- Solo administradores (is_admin = TRUE o username = 'vicdaddy') pueden realizar cambios
DROP POLICY IF EXISTS "Permitir gestión total a administradores" ON public.system_settings;
CREATE POLICY "Permitir gestión total a administradores"
    ON public.system_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND (profiles.is_admin = TRUE OR LOWER(profiles.username) = 'vicdaddy')
        )
    );

-- 4. Insertar el ajuste por defecto para visibilidad de quinielas (oculto por defecto)
INSERT INTO public.system_settings (key, value)
VALUES ('quinielas_visible', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
