import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/demo';

export async function Header() {
  let isLoggedIn = false;

  if (isSupabaseConfigured) {
    const db = await createClient();
    const { data } = await db.auth.getUser();
    isLoggedIn = Boolean(data.user);
  }

  return (
    <header className="border-b border-white/15 bg-[#071a3d]/70 text-white backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-black tracking-tight">
          FIQT <span className="text-gold">Reviews</span>
        </Link>
        <div className="flex gap-4 text-sm font-semibold">
          {isLoggedIn ? (
            <>
              <Link href="/ciclos">Explorar</Link>
              <Link href="/verificacion">Verificación</Link>
            </>
          ) : (
            <>
              <Link href="/registro">Crear cuenta</Link>
              <Link href="/login">Ingresar</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
