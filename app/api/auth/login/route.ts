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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Completa el correo y la contraseña.' }, { status: 400 });
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
    console.error('Error al iniciar sesión:', error);
    return NextResponse.json({ error: 'No se pudo iniciar sesión.' }, { status: 500 });
  }
}
