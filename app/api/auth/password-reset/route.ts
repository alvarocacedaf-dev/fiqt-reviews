import { NextResponse } from 'next/server';
import {
  consumeAnonymousLimit,
  getAuthRateSubjects,
  isRateLimitError,
  rateLimitResponse,
} from '@/lib/authRateLimit';
import { createClient } from '@/lib/supabase/server';
import { getRequestId, observeError, requestIdHeaders } from '@/lib/observability';
import { normalizeEmail, validatePasswordResetInput } from '@/lib/validation';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const validationError = validatePasswordResetInput(email);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const subjects = getAuthRateSubjects(request, email);
    await consumeAnonymousLimit('password_recovery', subjects);

    const db = await createClient();
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: new URL('/recuperar-contrasena/nueva', request.url).toString(),
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isRateLimitError(error)) {
      return rateLimitResponse('Alcanzaste el límite de recuperaciones. Espera una hora antes de volver a intentar.');
    }
    observeError('auth.password_recovery.failed', error, { requestId, provider: 'supabase' });
    return NextResponse.json(
      { error: 'No se pudo procesar la solicitud.', requestId },
      { status: 500, headers: requestIdHeaders(requestId) },
    );
  }
}
