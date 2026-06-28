import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/demo';

function UserIcon() {
  return (
    <span className="relative inline-flex h-9 w-11 shrink-0 items-end" aria-hidden="true">
      <span className="absolute bottom-1 left-0 h-6 w-6 rounded-full border-2 border-white/80 bg-gradient-to-br from-lime-300 to-green-500 shadow-sm" />
      <span className="absolute bottom-0 left-1 h-4 w-6 rounded-t-full border-2 border-white/80 bg-gradient-to-br from-lime-300 to-green-500 shadow-sm" />
      <span className="absolute bottom-1 right-0 h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-cyan-200 via-sky-400 to-blue-600 shadow" />
      <span className="absolute bottom-0 right-0 h-5 w-8 rounded-t-full border-2 border-white bg-gradient-to-br from-cyan-200 via-sky-400 to-blue-600 shadow" />
    </span>
  );
}

function firstDisplayName(name?: string | null, email?: string | null) {
  const cleanName = name?.trim();
  if (cleanName) return cleanName.split(/\s+/).slice(0, 2).join(' ');
  return email?.split('@')[0] ?? 'Usuario';
}

export async function Header() {
  let userName = '';
  let isLoggedIn = false;

  if (isSupabaseConfigured) {
    const db = await createClient();
    const { data } = await db.auth.getUser();
    const user = data.user;
    isLoggedIn = Boolean(user);

    if (user) {
      const { data: profile } = await db.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      userName = firstDisplayName(profile?.full_name ?? user.user_metadata?.full_name, user.email);
    }
  }

  async function signOut() {
    'use server';

    const db = await createClient();
    await db.auth.signOut();
    redirect('/');
  }

  return (
    <header className="border-b border-white/15 bg-[#071a3d]/70 text-white backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="text-lg font-black tracking-tight">
            FIQT <span className="text-gold">Reviews</span>
          </div>

          {isLoggedIn && (
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
              <UserIcon />
              <span className="max-w-40 truncate text-sm font-bold">{userName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm font-semibold">
          {isLoggedIn ? (
            <>
              <a href="/ciclos">Ruta académica</a>
              <a href="/verificacion">Verificación</a>
              <form action={signOut}>
                <button className="font-semibold text-white transition hover:text-gold">
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <a href="/registro">Crear cuenta</a>
              <a href="/login">Ingresar</a>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
