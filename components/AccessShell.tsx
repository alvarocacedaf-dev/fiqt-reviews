import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

type AccessShellProps = {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  mode: 'login' | 'register';
  title: string;
};

const content = {
  login: {
    eyebrow: 'Tu comunidad académica',
    heading: 'Vuelve a tus cursos, reseñas y planchas.',
    copy: 'Continúa explorando experiencias reales de estudiantes FIQT en un espacio moderado y responsable.',
    benefits: ['Consulta profesores y cursos', 'Revisa tus matches de planchas', 'Acceso protegido con tu cuenta UNI'],
  },
  register: {
    eyebrow: 'Acceso exclusivo UNI',
    heading: 'Tu experiencia puede orientar a toda la comunidad.',
    copy: 'Crea tu perfil estudiantil y participa de forma responsable en FIQT Reviews/Planchas.',
    benefits: ['Correo institucional obligatorio', 'Reseñas sujetas a moderación', 'Información académica, nunca datos privados'],
  },
};

export function AccessShell({ children, description, footer, mode, title }: AccessShellProps) {
  const presentation = content[mode];

  return (
    <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl lg:min-h-[610px] lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
      <aside className="relative overflow-hidden bg-[#071a3d] p-7 text-white sm:p-10 lg:p-12">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.15em] text-gold">
              <Icon className="h-4 w-4" name="shield" /> {presentation.eyebrow}
            </span>
            <h2 className="mt-6 max-w-md text-3xl font-extrabold leading-tight sm:text-4xl">{presentation.heading}</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-blue-100/80 sm:text-base">{presentation.copy}</p>
          </div>

          <ul className="mt-8 space-y-3 text-sm font-semibold text-blue-50">
            {presentation.benefits.map(benefit => (
              <li className="flex items-center gap-3" key={benefit}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <Icon className="h-4 w-4" name="check" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex flex-col justify-center bg-white p-7 sm:p-10 lg:p-12">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-royal">
          FIQT Reviews/Planchas
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">{title}</h1>
        <p className="mb-7 mt-2 text-sm leading-6 text-slate-600">{description}</p>
        {children}
        <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm">{footer}</div>
      </div>
    </section>
  );
}
