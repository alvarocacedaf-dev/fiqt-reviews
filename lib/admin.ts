import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AdministrationRole = 'admin' | 'owner';

export function isAdministrationRole(role: string | null | undefined): role is AdministrationRole {
  return role === 'admin' || role === 'owner';
}

export async function requireAdmin() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (!isAdministrationRole(profile?.role)) redirect('/');
  return { db, user, role: profile.role, isOwner: profile.role === 'owner' };
}

export async function requireOwner() {
  const context = await requireAdmin();
  if (!context.isOwner) redirect('/admin');
  return context;
}
