import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendAdminNotifications, type AdminNotificationEvent } from '@/lib/adminNotifications';

const tableByEvent = {
  review_pending: 'reviews',
  verification_pending: 'verification_submissions',
  contribution_pending: 'contribution_submissions',
} as const;

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 });
  const { eventType, eventId } = await request.json() as { eventType?: AdminNotificationEvent; eventId?: string };
  if (!eventType || !(eventType in tableByEvent) || !eventId) {
    return NextResponse.json({ error: 'Evento no válido.' }, { status: 400 });
  }
  const { data: record } = await db.from(tableByEvent[eventType])
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (!record) return NextResponse.json({ error: 'No se encontró la solicitud pendiente.' }, { status: 404 });

  await sendAdminNotifications(eventType, eventId);
  return NextResponse.json({ ok: true });
}
