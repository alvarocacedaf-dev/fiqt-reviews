import { NextResponse } from 'next/server';
import {
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
    const fullName = String(body.fullName || '').trim();

    if (!email.endsWith('@uni.pe')) {
      return NextResponse.json({ error: 'Usa tu correo institucional @uni.pe.' }, { status: 400 });
    }
    if (password.length < 8 || !fullName) {
      return NextResponse.json({ error: 'Completa tu nombre y usa una contraseña de al menos 8 caracteres.' }, { status: 400 });
    }

    const subjects = getAuthRateSubjects(request, email);
    await consumeAnonymousLimit('registration', subjects);

    const db = await createClient();
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: new URL('/auth/callback', request.url).toString(),
      },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, requiresEmailConfirmation: !data.session });
  } catch (error) {
    if (isRateLimitError(error)) {
      return rateLimitResponse('Alcanzaste el límite de registros. Espera una hora antes de volver a intentar.');
    }
    console.error('Error al registrar la cuenta:', error);
    return NextResponse.json({ error: 'No se pudo crear la cuenta.' }, { status: 500 });
  }
}
