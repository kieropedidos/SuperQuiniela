-- ============================================
-- Script: Agregar columnas "alias_name" y "has_paid" a user_quinielas
-- Descripción: Permite al admin etiquetar/nombrar quinielas y controlar el estado de pago.
-- ============================================

-- 1. Agregar columna alias_name (TEXT, nullable)
ALTER TABLE public.user_quinielas
ADD COLUMN IF NOT EXISTS alias_name TEXT;

-- 2. Agregar columna has_paid (BOOLEAN, defaults to false)
ALTER TABLE public.user_quinielas
ADD COLUMN IF NOT EXISTS has_paid BOOLEAN NOT NULL DEFAULT false;
