import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';

const adminMenuGroups = [
  {
    label: 'Moderación',
    links: [
      { href: '/admin/resenas', label: 'Reseñas' },
      { href: '/admin/resenas-observadas', label: 'Reseñas ya observadas' },
      { href: '/admin/verificaciones', label: 'Verificaciones' },
      { href: '/admin/reportes-chats', label: 'Reportes de los chats' },
    ],
  },
  {
    label: 'Usuarios',
    links: [
      { href: '/admin/cuentas-verificadas', label: 'Cuentas verificadas' },
      { href: '/admin/cursos-cuentas', label: 'Cursos de cuentas' },
    ],
  },
  {
    label: 'Planchas',
    links: [
      { href: '/admin/planchas', label: 'Planchas de usuarios' },
      { href: '/admin/planchas-administracion', label: 'Planchas de la administración' },
      { href: '/admin/matches-planchas', label: 'Matches de planchas' },
    ],
  },
  {
    label: 'Catálogo',
    links: [
      { href: '/admin/ciclos', label: 'Ciclos' },
      { href: '/admin/profesores', label: 'Profesores' },
      { href: '/admin/cursos', label: 'Cursos' },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <section className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="rounded-3xl bg-[#051530] p-5 text-white">
        <p className="font-black text-gold">ADMINISTRACIÓN</p>
        <nav className="mt-5 text-sm">
          <Link className="block" href="/admin">
            Resumen
          </Link>

          <div className="mt-5 grid gap-5">
            {adminMenuGroups.map((group) => (
              <section key={group.label} aria-labelledby={`admin-group-${group.label}`}>
                <p
                  id={`admin-group-${group.label}`}
                  className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-gold"
                >
                  {group.label}
                </p>
                <div className="grid gap-2.5 border-l border-white/15 pl-3">
                  {group.links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </nav>
      </aside>
      <div>{children}</div>
    </section>
  );
}
