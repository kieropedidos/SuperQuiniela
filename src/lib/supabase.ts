import { createClient } from '@supabase/supabase-js';

// Validar la presencia de variables de entorno críticas en tiempo de desarrollo
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'ADVERTENCIA: Las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas. ' +
    'Por favor, añádelas a tu archivo .env.local para permitir la conexión de base de datos.'
  );
}

/**
 * Cliente de Supabase estándar para operaciones del cliente y del servidor.
 * En Server Actions de Next.js, este cliente interactuará de forma segura con la base de datos de Supabase.
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
