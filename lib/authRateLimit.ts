import 'server-only';

import { createHmac } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type AuthRateAction = 'registration' | 'password_recovery' | 'login_failure';

function getHashSecret() {
  const secret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error('Falta CRON_SECRET o SUPABASE_SERVICE_ROLE_KEY para proteger la autenticación.');
  }

  return secret;
}

function hashSubject(value: string) {
  return createHmac('sha256', getHashSecret()).update(value).digest('hex');
}

export function getAuthRateSubjects(request: Request, email: string) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwardedFor || request.headers.get('x-real-ip') || 'unknown';
  const normalizedEmail = email.trim().toLowerCase();

  return [
    hashSubject(`email:${normalizedEmail}`),
    hashSubject(`ip:${ip}`),
  ];
}

async function callLimitRpc(
  rpcName: 'assert_anonymous_action_rate_limit' | 'consume_anonymous_action_rate_limit' | 'clear_anonymous_action_rate_limit',
  action: AuthRateAction,
  subjectHash: string,
) {
  const db = createAdminClient();
  const { error } = await db.rpc(rpcName, {
    p_action: action,
    p_subject_hash: subjectHash,
  });

  if (error) throw error;
}

export async function assertAnonymousLimit(action: AuthRateAction, subjects: string[]) {
  for (const subject of subjects) {
    await callLimitRpc('assert_anonymous_action_rate_limit', action, subject);
  }
}

export async function consumeAnonymousLimit(action: AuthRateAction, subjects: string[]) {
  for (const subject of subjects) {
    await callLimitRpc('consume_anonymous_action_rate_limit', action, subject);
  }
}

export async function clearAnonymousLimit(action: AuthRateAction, subjects: string[]) {
  for (const subject of subjects) {
    await callLimitRpc('clear_anonymous_action_rate_limit', action, subject);
  }
}

export function isRateLimitError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String(error.message) : '';
  return message.toLowerCase().includes('demasiados intentos');
}

export function isSupabaseAuthRateLimitError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown; status?: unknown };
  const code = String(candidate.code ?? '').toLowerCase();
  const message = String(candidate.message ?? '').toLowerCase();
  return Number(candidate.status) === 429
    || code === 'over_request_rate_limit'
    || code === 'email_rate_limit_exceeded'
    || code === 'over_email_send_rate_limit'
    || message.includes('rate limit')
    || message.includes('too many requests');
}

export function rateLimitResponse(message: string) {
  return Response.json({ error: message }, { status: 429 });
}
