'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';

type AdminLink = { href: string; icon: IconName; label: string };

const menuGroups: { label: string; links: AdminLink[] }[] = [
  {
    label: 'Moderación',
    links: [
      { href: '/admin/resenas', icon: 'star', label: 'Reseñas' },
      { href: '/admin/resenas-observadas', icon: 'check', label: 'Reseñas observadas' },
      { href: '/admin/verificaciones', icon: 'verification', label: 'Verificaciones' },
      { href: '/admin/reportes-chats', icon: 'chat', label: 'Reportes de chats' },
    ],
  },
  {
    label: 'Usuarios',
    links: [
      { href: '/admin/cuentas-verificadas', icon: 'users', label: 'Cuentas verificadas' },
      { href: '/admin/cursos-cuentas', icon: 'academic', label: 'Cursos de cuentas' },
      { href: '/admin/yapes', icon: 'attachment', label: 'Yapes' },
    ],
  },
  {
    label: 'Planchas',
    links: [
      { href: '/admin/planchas', icon: 'file', label: 'Planchas de usuarios' },
      { href: '/admin/planchas-administracion', icon: 'library', label: 'Administrar planchas' },
      { href: '/admin/materiales-cursos', icon: 'folder-open', label: 'Materiales de los cursos' },
      { href: '/admin/matches-planchas', icon: 'exchange', label: 'Matches de planchas' },
    ],
  },
  {
    label: 'Catálogo',
    links: [
      { href: '/admin/ciclos', icon: 'layers', label: 'Ciclos' },
      { href: '/admin/profesores', icon: 'user', label: 'Profesores' },
      { href: '/admin/cursos', icon: 'academic', label: 'Cursos' },
    ],
  },
];

const allLinks = [
  { href: '/admin', icon: 'dashboard' as IconName, label: 'Resumen' },
  ...menuGroups.flatMap(group => group.links),
];

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = allLinks.find(link => isActive(pathname, link.href));

  return (
    <section className="grid items-start gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#051530] text-white shadow-lg md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-ink">
              <Icon className="h-5 w-5" name="shield" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gold">FIQT Reviews</p>
              <p className="font-black">Administración</p>
            </div>
          </div>
        </div>

        <nav aria-label="Navegación administrativa" className="p-3 text-sm">
          <AdminMenuLink href="/admin" icon="dashboard" label="Resumen" pathname={pathname} />
          <div className="mt-4 grid gap-4">
            {menuGroups.map(group => (
              <section key={group.label} aria-labelledby={`admin-group-${group.label}`}>
                <p id={`admin-group-${group.label}`} className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {group.label}
                </p>
                <div className="grid gap-1">
                  {group.links.map(link => (
                    <AdminMenuLink key={link.href} {...link} pathname={pathname} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </nav>
      </aside>

      <div className="min-w-0">
        <nav aria-label="Ruta de navegación" className="mb-4 flex items-center gap-2 px-1 text-sm text-slate-300">
          <Link className="font-semibold transition hover:text-white" href="/admin">Administración</Link>
          {current?.href !== '/admin' && (
            <>
              <span aria-hidden="true" className="text-slate-500">/</span>
              <span aria-current="page" className="font-bold text-white">{current?.label ?? 'Sección'}</span>
            </>
          )}
        </nav>
        {children}
      </div>
    </section>
  );
}

function AdminMenuLink({ href, icon, label, pathname }: AdminLink & { pathname: string }) {
  const active = isActive(pathname, href);
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-bold transition ${
        active
          ? 'bg-white text-ink shadow-sm'
          : 'text-slate-200 hover:bg-white/10 hover:text-white'
      }`}
      href={href}
    >
      <Icon className={`h-4 w-4 ${active ? 'text-royal' : 'text-slate-400'}`} name={icon} />
      <span>{label}</span>
    </Link>
  );
}
