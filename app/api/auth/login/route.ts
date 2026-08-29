import { NextResponse } from 'next/server';
import {
  assertAnonymousLimit,
  clearAnonymousLimit,
  consumeAnonymousLimit,
  getAuthRateSubjects,
  isRateLimitError,
  isSupabaseAuthRateLimitError,
  rateLimitResponse,
} from '@/lib/authRateLimit';
import { createClient } from '@/lib/supabase/server';
import { getRequestId, observeError, requestIdHeaders } from '@/lib/observability';
import { normalizeEmail, validateLoginInput } from '@/lib/validation';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const validationError = validateLoginInput({ email, password });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const subjects = getAuthRateSubjects(request, email);
    const emailSubject = subjects.slice(0, 1);
    await assertAnonymousLimit('login_failure', emailSubject);

    const db = await createClient();
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[auth] ${requestId}: llamando signInWithPassword una vez`);
    }
    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      if (isSupabaseAuthRateLimitError(error)) {
        return rateLimitResponse('Hay demasiados intentos de inicio de sesión. Espera unos minutos antes de volver a intentarlo.');
      }
      try {
        await consumeAnonymousLimit('login_failure', emailSubject);
      } catch (limitError) {
        if (isRateLimitError(limitError)) {
          return rateLimitResponse('Demasiados intentos incorrectos. Espera 15 minutos antes de volver a intentar.');
        }
        throw limitError;
      }

      return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 400 });
    }

    // Un inicio correcto limpia el contador individual de este correo.
    await clearAnonymousLimit('login_failure', emailSubject);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isRateLimitError(error)) {
      return rateLimitResponse('Demasiados intentos incorrectos. Espera 15 minutos antes de volver a intentar.');
    }
    observeError('auth.login.failed', error, { requestId, provider: 'supabase' });
    return NextResponse.json(
      { error: 'No se pudo iniciar sesión.', requestId },
      { status: 500, headers: requestIdHeaders(requestId) },
    );
  }
}
