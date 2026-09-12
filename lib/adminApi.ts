import { createClient } from '@/lib/supabase/server';
import { isAdministrationRole } from '@/lib/admin';

export async function getAdminApiContext() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Debes iniciar sesión.', status: 401 } as const;

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (!isAdministrationRole(profile?.role)) {
    return { error: 'No tienes permisos de administrador.', status: 403 } as const;
  }

  return { db, user, role: profile.role, isOwner: profile.role === 'owner' } as const;
}
