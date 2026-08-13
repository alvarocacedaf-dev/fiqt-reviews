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

    if (!email) {
      return NextResponse.json({ error: 'Ingresa tu correo.' }, { status: 400 });
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
    console.error('Error al recuperar la contraseña:', error);
    return NextResponse.json({ error: 'No se pudo procesar la solicitud.' }, { status: 500 });
  }
}
