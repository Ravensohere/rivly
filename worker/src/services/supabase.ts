import { createClient } from '@supabase/supabase-js';
import { Bindings } from '../types';

/**
 * Create a Supabase client with service role key
 */
export function createSupabaseClient(env: Bindings) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Create a Supabase client with anon key
 */
export function createSupabaseAnonClient(env: Bindings) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
