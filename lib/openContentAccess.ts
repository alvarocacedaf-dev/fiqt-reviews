import { isSupabaseConfigured } from '@/lib/demo';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

// The same authenticated database switch controls the UI, downloads and community RLS.
// Missing migration or an unavailable database must never grant access.
export const hasOpenContentAccess = cache(async (): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;
  const db = await createClient();
  const { data, error } = await db.rpc('has_open_content_access');
  return !error && data === true;
});
