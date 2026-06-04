-- ============================================
-- Script: Agregar columna "status" a user_quinielas
-- Descripción: Permite al administrador aprobar/rechazar quinielas.
--   - 'pending': la quiniela fue inscrita pero NO aprobada aún.
--   - 'approved': el admin confirmó el pago y la aprobó.
-- ============================================

-- 1. Agregar la columna status con valor por defecto 'pending'
ALTER TABLE user_quinielas
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- 2. IMPORTANTE: Si ya tienes quinielas existentes que quieras marcar
--    como aprobadas automáticamente (retrocompatibilidad), ejecuta:
UPDATE user_quinielas SET status = 'approved' WHERE status = 'pending';

-- (Si prefieres que las existentes queden como 'pending' para aprobarlas
--  manualmente, comenta la línea de UPDATE anterior.)
