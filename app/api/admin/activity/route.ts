import { getAdminApiContext } from '@/lib/adminApi';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' };
  const context = await getAdminApiContext();
  if ('error' in context) return Response.json({ error: context.error }, { status: context.status, headers });
  if (!context.isOwner) return Response.json({ error: 'Solo el propietario puede consultar la actividad.' }, { status: 403, headers });
  const url = new URL(request.url);
  const days = Number(url.searchParams.get('days') ?? 7);
  const minutes = Number(url.searchParams.get('minutes') ?? 30);
  if (![1,7,30].includes(days) || ![5,30].includes(minutes)) return Response.json({ error: 'Periodo inválido.' }, { status: 400, headers });
  // Use the authenticated owner session, not service_role: the RPC also checks is_owner().
  const { data, error } = await context.db.rpc('owner_activity_snapshot', { p_days: days, p_minutes: minutes });
  if (error) return Response.json({ error: 'No se pudo consultar la actividad. Intenta actualizar.' }, { status: 503, headers });
  return Response.json(data, { headers });
}
