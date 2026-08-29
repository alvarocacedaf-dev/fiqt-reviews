import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieItem = { name: string; value: string; options?: Record<string, unknown> };

const protectedPrefixes = ['/ciclos', '/cursos', '/profesores', '/verificacion', '/planchas', '/mis-matches', '/armar-horario', '/horario', '/admin'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. SALIDA RÁPIDA: Seguro de vida para evitar que archivos estáticos consulten la BD.
  // Cualquier petición a un archivo con extensión (ej. logo.svg, estilo.css) se deja pasar de inmediato.
  if (pathname.includes('.')) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies: CookieItem[]) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(data.user);
  
  const isProtected = protectedPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isProtected && !isLoggedIn) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/registro';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

// 2. MATCHER CORREGIDO: Le dice explícitamente a Vercel/Next.js que ignore las imágenes
export const config = { 
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)'
  ] 
};
