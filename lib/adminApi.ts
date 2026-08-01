import { createClient } from '@/lib/supabase/server';

export async function getAdminApiContext() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Debes iniciar sesión.', status: 401 } as const;

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return { error: 'No tienes permisos de administrador.', status: 403 } as const;
  }

  return { db, user } as const;
}
