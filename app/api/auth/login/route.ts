import { NextResponse } from 'next/server';
import {
  assertAnonymousLimit,
  clearAnonymousLimit,
  consumeAnonymousLimit,
  getAuthRateSubjects,
  isRateLimitError,
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
    await assertAnonymousLimit('login_failure', subjects);

    const db = await createClient();
    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      try {
        await consumeAnonymousLimit('login_failure', subjects);
      } catch (limitError) {
        if (isRateLimitError(limitError)) {
          return rateLimitResponse('Demasiados intentos incorrectos. Espera 15 minutos antes de volver a intentar.');
        }
        throw limitError;
      }

      return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 400 });
    }

    // Un inicio correcto limpia el contador del correo, pero no el de la IP.
    // Así otra cuenta válida no puede reiniciar el bloqueo compartido de una IP atacante.
    await clearAnonymousLimit('login_failure', subjects.slice(0, 1));
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
