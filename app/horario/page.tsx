import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export const metadata = {
  title: 'Armar mi horario | FIQT Reviews',
};

export default function SchedulePage() {
  return (
    <section className="panel mx-auto w-full max-w-3xl text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-royal">
        <Icon className="h-7 w-7" name="calendar" />
      </span>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-royal">Nueva herramienta</p>
      <h1 className="mt-2 text-3xl font-black text-ink sm:text-4xl">Armar mi horario</h1>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
        Aquí podrás organizar tus cursos y construir tu horario académico. Esta herramienta será desarrollada próximamente.
      </p>
      <Link className="btn-secondary mt-6 gap-2" href="/ciclos">
        <Icon className="h-4 w-4" name="arrow-left" />
        Volver a la ruta académica
      </Link>
    </section>
  );
}
