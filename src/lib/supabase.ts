import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from '../config';

// null when the app runs without Supabase settings (content preview only).
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

/** For code that only runs after sign-in, where Supabase must exist. */
export function db(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export const POST_IMAGE_BUCKET = 'post-images';

export function postImageUrl(path: string): string {
  return db().storage.from(POST_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
