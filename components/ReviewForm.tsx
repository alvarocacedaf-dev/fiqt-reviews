'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { containsForbiddenReviewLanguage } from '@/lib/validation';

const positiveTags = [
  'Explica claro',
  'Resuelve dudas',
  'Es puntual',
  'Evalúa de forma justa',
  'Da buenos ejemplos',
  'Motiva a estudiar',
  'Es ordenado con el curso',
  'Explica muy bien sus temas y lo hace de forma interesante',
];

const negativeTags = [
  'Avanza muy rápido',
  'Sus exámenes son difíciles',
  'No se le entiende mucho',
  'Falta a clases con frecuencia',
  'Se demora en subir las notas',
  'No resuelve muchas dudas',
  'Solo lee las PPTs',
  'Sus evaluaciones no se sienten coherentes con lo enseñado',
];

const ratingQuestions = [
  {
    key: 'clarity_rating',
    title: 'Claridad al explicar',
    question: '¿Qué tan claro fue el profesor al explicar los temas del curso?',
    low: '1 = Nada claro',
    high: '10 = Muy claro',
  },
  {
    key: 'difficulty_rating',
    title: 'Dificultad de las evaluaciones',
    question: '¿Qué tan difíciles fueron sus evaluaciones?',
    help: 'Considera prácticas, controles, parciales, finales, informes o exposiciones.',
    low: '1 = Muy fáciles',
    high: '10 = Muy difíciles',
  },
  {
    key: 'fairness_rating',
    title: 'Justicia al evaluar',
    question: '¿El profesor considera la resolución del ejercicio? ¿Qué tan justa y coherente fue su forma de calificar?',
    low: '1 = Nada justa',
    high: '10 = Muy justa',
  },
  {
    key: 'workload_rating',
    title: 'Carga fuera de clase',
    question: '¿Deja trabajos extensos fuera del horario de clase?',
    low: '1 = Muy poca carga',
    high: '10 = Muchísima carga',
  },
  {
    key: 'treatment_rating',
    title: 'Trato al alumno',
    question: 'Si le haces preguntas, ¿el profesor responde amablemente o de forma soberbia?',
    low: '1 = Trato muy malo',
    high: '10 = Trato muy bueno',
  },
  {
    key: 'course_demand_rating',
    title: 'Exigencia del curso con este profesor',
    question: '¿Qué tan exigente fue llevar el curso con este profesor?',
    help: 'Una calificación de 10 significa que el curso se te hizo muy difícil.',
    low: '1 = Poco exigente',
    high: '10 = Muy exigente',
  },
] as const;

type RatingKey = (typeof ratingQuestions)[number]['key'];

function RatingQuestion({
  item,
}: {
  item: (typeof ratingQuestions)[number];
}) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-5">
      <legend className="px-1 font-black text-ink">
        {item.title} <span className="text-red-600">*</span>
      </legend>
      <p className="mt-2 text-sm leading-6 text-slate-700">{item.question}</p>
      {'help' in item && item.help && (
        <p className="text-sm leading-6 text-slate-600">{item.help}</p>
      )}
      <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs font-semibold text-slate-600">
        <span>{item.low}</span>
        <span>{item.high}</span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, index) => index + 1).map(value => (
          <label
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-sm font-black text-royal transition hover:border-blue-300 hover:bg-blue-50 has-[:checked]:border-royal has-[:checked]:bg-royal has-[:checked]:text-white"
            key={value}
          >
            <span>{value}</span>
            <input
              aria-label={`${item.title}: ${value} de 10`}
              name={item.key satisfies RatingKey}
              required
              type="radio"
              value={value}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ReviewForm({ professorId, courseId }: { professorId: string; courseId: string }) {
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  function toggleTag(tag: string) {
    setSelected(current => (
      current.includes(tag)
        ? current.filter(item => item !== tag)
        : [...current, tag]
    ));
  }

  async function submit(form: FormData) {
    setMessage('');
    const comment = String(form.get('comment') || '').trim();

    if (containsForbiddenReviewLanguage(comment)) {
      return setMessage('Tu reseña debe enfocarse en la experiencia académica y mantener un lenguaje respetuoso.');
    }

    const db = createClient();
    const { data: { user } } = await db.auth.getUser();

    if (!user) return setMessage('Inicia sesión para poder reseñar.');

    const { data: verified } = await db
      .from('verified_course_professors')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('professor_id', professorId)
      .limit(1);
    if (!verified?.length) return setMessage('Este profesor y curso todavía no fueron verificados para tu cuenta.');

    const payload = Object.fromEntries(
      ratingQuestions.map(({ key }) => [key, Number(form.get(key))]),
    );
    const customTags = [
      String(form.get('positive_other') || '').trim(),
      String(form.get('negative_other') || '').trim(),
    ].filter(Boolean);
    const selectedTags = [...new Set([...selected, ...customTags])];

    const { error } = await db.from('reviews').insert({
      ...payload,
      user_id: user.id,
      professor_id: professorId,
      course_id: courseId,
      recommendation: form.get('recommendation'),
      selected_tags: selectedTags,
      comment,
      status: 'pending',
    });

    setMessage(error ? error.message : 'Gracias. Tu reseña quedó pendiente de moderación.');
  }

  return (
    <form action={submit} className="space-y-6">
      <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-950">
        Solo puedes reseñar si este curso fue verificado en tu cuenta. La reseña será revisada antes de hacerse pública.
      </p>

      <div className="space-y-4">
        {ratingQuestions.map(item => <RatingQuestion item={item} key={item.key} />)}
      </div>

      <fieldset className="rounded-2xl border border-slate-200 bg-white p-5">
        <legend className="px-1 font-black text-ink">
          ¿Recomendarías llevar este curso con este profesor? <span className="text-red-600">*</span>
        </legend>
        <div className="mt-3 flex flex-wrap gap-5">
          <label className="flex items-center gap-2">
            <input required type="radio" name="recommendation" value="like" />
            Lo recomiendo
          </label>
          <label className="flex items-center gap-2">
            <input required type="radio" name="recommendation" value="dislike" />
            No lo recomiendo
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-200 bg-white p-5">
        <legend className="px-1 font-black text-ink">Etiquetas positivas</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {positiveTags.map(tag => (
            <label className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950" key={tag}>
              <input
                checked={selected.includes(tag)}
                className="mt-0.5"
                onChange={() => toggleTag(tag)}
                type="checkbox"
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Otra etiqueta positiva
          <input className="input mt-1" maxLength={80} name="positive_other" placeholder="Escribe otra opción" />
        </label>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-200 bg-white p-5">
        <legend className="px-1 font-black text-ink">Etiquetas negativas</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {negativeTags.map(tag => (
            <label className="flex items-start gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-950" key={tag}>
              <input
                checked={selected.includes(tag)}
                className="mt-0.5"
                onChange={() => toggleTag(tag)}
                type="checkbox"
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Otra etiqueta negativa
          <input className="input mt-1" maxLength={80} name="negative_other" placeholder="Escribe otra opción" />
        </label>
      </fieldset>

      <label className="block rounded-2xl border border-slate-200 bg-white p-5 font-black text-ink">
        Comentario corto / comenta alguna experiencia con ese profesor <span className="text-red-600">*</span>
        <span className="mt-2 block text-sm font-normal leading-6 text-slate-600">
          Describe tu experiencia de manera respetuosa, sin insultos ni acusaciones personales. Enfócate en la experiencia académica.
        </span>
        <textarea
          required
          maxLength={600}
          name="comment"
          className="input mt-3 min-h-32"
          placeholder="Escribe aquí tu experiencia académica."
        />
      </label>

      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{message}</p>}

      <button className="btn-primary">Enviar a moderación</button>
    </form>
  );
}
