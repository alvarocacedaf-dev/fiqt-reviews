import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';

type PushSubscriptionBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function GET() {
  const context = await getAdminApiContext();
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const { count } = await context.db.from('admin_push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', context.user.id)
    .eq('enabled', true);
  return NextResponse.json({ configured: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY), subscribed: Boolean(count) });
}

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const body = await request.json() as PushSubscriptionBody;
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return NextResponse.json({ error: 'La suscripción del dispositivo está incompleta.' }, { status: 400 });
  }
  const { error } = await context.db.from('admin_push_subscriptions').upsert({
    user_id: context.user.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth_secret: body.keys.auth,
    user_agent: request.headers.get('user-agent'),
    enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  if (error) return NextResponse.json({ error: 'No se pudo registrar este dispositivo.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const { endpoint } = await request.json() as { endpoint?: string };
  if (endpoint) {
    await context.db.from('admin_push_subscriptions').delete().eq('user_id', context.user.id).eq('endpoint', endpoint);
  }
  return NextResponse.json({ ok: true });
}
