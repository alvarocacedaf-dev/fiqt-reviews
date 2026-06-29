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

function NavIcon({ type }: { type: 'academic' | 'verification' | 'logout' }) {
  if (type === 'academic') {
    return (
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 10 12 5 2 10l10 5 10-5Z" />
        <path d="M6 12v5c3.5 2.5 8.5 2.5 12 0v-5" />
        <path d="M22 10v5" />
      </svg>
    );
  }

  if (type === 'verification') {
    return (
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3 19 6v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
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

        <div className="flex items-center gap-5 text-sm font-semibold">
          {isLoggedIn ? (
            <>
              <a className="inline-flex items-center gap-2 transition hover:text-gold" href="/ciclos">
                <NavIcon type="academic" />
                Ruta académica
              </a>
              <a className="inline-flex items-center gap-2 transition hover:text-gold" href="/verificacion">
                <NavIcon type="verification" />
                Verificación
              </a>
              <form action={signOut}>
                <button className="inline-flex items-center gap-2 font-semibold text-white transition hover:text-gold">
                  <NavIcon type="logout" />
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
