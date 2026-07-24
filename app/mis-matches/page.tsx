import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function MyMatchesPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/login?next=/mis-matches');

  const [{ data: profile }, { count: approvedReviewCount }] = await Promise.all([
    db.from('profiles').select('role').eq('id', user.id).single(),
    db
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'approved'),
  ]);

  const hasAccess = profile?.role === 'admin' || (approvedReviewCount ?? 0) >= 18;
  if (!hasAccess) redirect('/ciclos');

  return null;
}
