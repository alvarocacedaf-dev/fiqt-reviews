import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ACTIVITY_EVENTS, activitySection, UUID_PATTERN } from '@/lib/activity';

export const dynamic = 'force-dynamic';
const COOKIE = 'fiqt-activity';
function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update('site-activity:' + value).digest('hex');
}
function visitorCookie(value: string | undefined, secret: string) {
  const [id = '', signature = ''] = (value ?? '').split('.');
  const expected = sign(id, secret);
  return UUID_PATTERN.test(id) && signature.length === expected.length
    && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? id : randomUUID();
}
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403, headers });
  }
  if (Number(request.headers.get('content-length')) > 16000) return new NextResponse(null, { status: 413, headers });
  try {
    const raw = await request.text();
    if (raw.length > 16000) return new NextResponse(null, { status: 413, headers });
    const body = JSON.parse(raw);
    const section = typeof body.path === 'string' ? activitySection(body.path) : null;
    if (!UUID_PATTERN.test(body.tab ?? '') || !section || typeof body.active !== 'boolean' || !Array.isArray(body.events) || body.events.length > 20) {
      return new NextResponse(null, { status: 400, headers });
    }
    const events = body.events.map((item: { id?: string; event?: string; path?: string }) => {
      if (!UUID_PATTERN.test(item.id ?? '') || !ACTIVITY_EVENTS.includes(item.event as typeof ACTIVITY_EVENTS[number]) || typeof item.path !== 'string') throw new Error('Invalid event');
      const eventSection = activitySection(item.path);
      if (!eventSection) throw new Error('Invalid section');
      return { id: item.id, event: item.event, section: eventSection };
    });
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) return new NextResponse(null, { status: 503, headers });
    const visitor = visitorCookie(request.cookies.get(COOKIE)?.value, secret);
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    const { data, error } = await createAdminClient().rpc('record_site_activity', {
      p_session: sign(visitor + ':' + body.tab, secret), p_visitor: visitor,
      p_user: user?.id ?? null, p_section: section, p_active: body.active, p_events: events,
    });
    if (error) return new NextResponse(null, { status: 503, headers });
    const response = NextResponse.json({ accepted: data === true }, { status: data === true ? 200 : 429, headers });
    response.cookies.set(COOKIE, visitor + '.' + sign(visitor, secret), {
      httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 30 * 86400,
    });
    return response;
  } catch {
    return new NextResponse(null, { status: 400, headers });
  }
}
