-- ============================================
-- Script: Agregar columna "allow_edit" a user_quinielas
-- Descripción: Permite al admin dar permisos individuales a ciertos usuarios para que puedan editar sus quinielas incluso si ya cerraron las inscripciones o se bloquearon las ediciones.
-- ============================================

-- 1. Agregar columna allow_edit (BOOLEAN, defaults to false)
ALTER TABLE public.user_quinielas
ADD COLUMN IF NOT EXISTS allow_edit BOOLEAN NOT NULL DEFAULT false;

-- 2. Asegurar política RLS para administradores
DROP POLICY IF EXISTS "Permitir gestión total a administradores sobre quinielas" ON public.user_quinielas;
CREATE POLICY "Permitir gestión total a administradores sobre quinielas"
    ON public.user_quinielas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND (profiles.is_admin = TRUE OR LOWER(profiles.username) = 'vicdaddy')
        )
    );
