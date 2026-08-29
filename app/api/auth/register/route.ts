import { NextResponse } from 'next/server';
import {
  consumeAnonymousLimit,
  getAuthRateSubjects,
  isRateLimitError,
  isSupabaseAuthRateLimitError,
  rateLimitResponse,
} from '@/lib/authRateLimit';
import { createClient } from '@/lib/supabase/server';
import { getRequestId, observeError, requestIdHeaders } from '@/lib/observability';
import { normalizeEmail, validateRegistrationInput } from '@/lib/validation';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const fullName = String(body.fullName || '').trim();
    const validationError = validateRegistrationInput({ email, password, fullName });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const subjects = getAuthRateSubjects(request, email);
    // El límite se aplica por correo. No se comparte entre alumnos que usan la misma red/IP.
    await consumeAnonymousLimit('registration', subjects.slice(0, 1));

    const db = await createClient();
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: new URL('/auth/callback', request.url).toString(),
      },
    });

    if (error) {
      if (isSupabaseAuthRateLimitError(error)) {
        return rateLimitResponse('Se alcanzó temporalmente el límite de creación o envío de correos. Espera unos minutos antes de volver a intentarlo.');
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, requiresEmailConfirmation: !data.session });
  } catch (error) {
    if (isRateLimitError(error)) {
      return rateLimitResponse('Alcanzaste el límite de registros. Espera una hora antes de volver a intentar.');
    }
    observeError('auth.registration.failed', error, { requestId, provider: 'supabase' });
    return NextResponse.json(
      { error: 'No se pudo crear la cuenta.', requestId },
      { status: 500, headers: requestIdHeaders(requestId) },
    );
  }
}
