import Image from 'next/image';
import { VerificationForm } from '@/components/VerificationForm';

const steps = [
  {
    title: 'Ingresa a Cursos Matriculados',
    description: 'En INTRALU abre Información Académica y selecciona la opción Cursos Matriculados.',
    image: '/verification-guide/01-cursos-matriculados.png',
    width: 282,
    height: 658,
    alt: 'Menú de INTRALU con la opción Cursos Matriculados seleccionada',
  },
  {
    title: 'Selecciona el ciclo académico',
    description: 'Elige el ciclo en el que llevaste el curso que deseas verificar.',
    image: '/verification-guide/02-ciclo-academico.png',
    width: 179,
    height: 353,
    alt: 'Selector de ciclo académico de INTRALU',
  },
  {
    title: 'Pulsa Imprimir Boleta',
    description: 'Desplázate hasta la parte inferior de la lista de cursos y selecciona Imprimir Boleta.',
    image: '/verification-guide/03-imprimir-boleta.png',
    width: 1475,
    height: 485,
    alt: 'Lista de cursos matriculados con el botón Imprimir Boleta',
  },
  {
    title: 'Recorta la evidencia',
    description: 'Deja visibles tu código universitario, tu nombre, el curso y el profesor correspondiente. Oculta únicamente los datos que no sean necesarios.',
    image: '/verification-guide/04-boleta-recortada.jpeg',
    width: 900,
    height: 689,
    alt: 'Ejemplo de una boleta recortada que muestra cursos y profesores',
  },
];

export default function VerificationPage() {
  return (
    <section className="panel mx-auto max-w-5xl">
      <p className="text-sm font-bold text-royal">VERIFICACIÓN ACADÉMICA</p>
      <h1 className="mt-1 text-3xl font-black text-ink">Verifica los cursos que llevaste</h1>
      <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        Para tu verificación, envía una imagen que demuestre que llevaste el curso con el profesor correspondiente. Sigue esta guía para obtenerla desde INTRALU.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {steps.map((step, index) => (
          <article key={step.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-royal text-sm font-black text-white">{index + 1}</span>
                <div>
                  <h2 className="font-black text-ink">{step.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                </div>
              </div>
            </div>
            <div className="flex min-h-72 items-center justify-center border-t border-slate-200 bg-slate-100 p-4">
              <Image
                src={step.image}
                width={step.width}
                height={step.height}
                alt={step.alt}
                className="max-h-80 w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-blue-50 p-5 text-sm leading-6 text-blue-950">
        <strong>Antes de enviarla:</strong> comprueba que se lean tu código universitario, tu nombre, el curso y el profesor. Oculta notas, promedios y cualquier otro dato personal que no sea necesario. La evidencia será privada y solo se utilizará para la verificación.
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-black text-ink">Envía tu evidencia</h2>
        <p className="mt-2 text-sm text-slate-600">El administrador revisará la imagen y seleccionará únicamente los cursos y profesores que se puedan comprobar.</p>
        <div className="mt-5"><VerificationForm /></div>
      </div>
    </section>
  );
}
