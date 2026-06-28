import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieItem = { name: string; value: string; options?: Record<string, unknown> };

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next');
  const redirectPath = next?.startsWith('/') && !next.startsWith('//') ? next : '/ciclos';
  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: (cookies: CookieItem[]) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) }
  });
  const code = request.nextUrl.searchParams.get('code');
  if (code) await supabase.auth.exchangeCodeForSession(code);
  return response;
}
