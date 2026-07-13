'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const tags = [
  'Explica claro',
  'Resuelve dudas',
  'Es puntual',
  'Evalúa de forma justa',
  'Da buenos ejemplos',
  'Motiva a estudiar',
  'Es ordenado con el curso',
  'Avanza muy rápido',
  'Sus exámenes son difíciles',
  'Deja bastante carga académica',
  'No se le entiende mucho',
  'Falta mucho',
  'No sube notas a tiempo',
  'No resuelve muchas dudas'
];

const forbidden = /\b(corrupto|corrupta|acosador|acosadora|ladr[oó]n|ladrona|idiota|imb[eé]cil|mierda|puta|maric[oó]n)\b/i;

const ratings = [
  ['clarity_rating', 'Claridad al explicar'],
  ['difficulty_rating', 'Dificultad del curso'],
  ['fairness_rating', 'Justicia al evaluar'],
  ['treatment_rating', 'Trato al alumno'],
  ['workload_rating', 'Carga académica']
] as const;

export function ReviewForm({ professorId, courseId }: { professorId: string; courseId: string }) {
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  async function submit(form: FormData) {
    const comment = String(form.get('comment') || '');

    if (forbidden.test(comment)) {
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

    const payload = Object.fromEntries(ratings.map(([key]) => [key, Number(form.get(key))]));
    const { error } = await db.from('reviews').insert({
      ...payload,
      user_id: user.id,
      professor_id: professorId,
      course_id: courseId,
      recommendation: form.get('recommendation'),
      selected_tags: selected,
      comment,
      status: 'pending'
    });

    setMessage(error ? error.message : 'Gracias. Tu reseña quedó pendiente de moderación.');
  }

  return (
    <form action={submit} className="space-y-6">
      <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-950">
        Solo puedes reseñar si este curso fue verificado en tu cuenta. La reseña será revisada antes de hacerse pública.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {ratings.map(([key, label]) => (
          <label key={key} className="text-sm font-semibold">
            {label}
            <select name={key} defaultValue="5" className="input mt-1">
              <option value="1">1 — Muy bajo</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5 — Muy alto</option>
            </select>
          </label>
        ))}
      </div>

      <fieldset>
        <legend className="font-bold">Recomendación general</legend>
        <div className="mt-2 flex gap-4">
          <label><input required type="radio" name="recommendation" value="like" /> Lo recomiendo</label>
          <label><input required type="radio" name="recommendation" value="dislike" /> No lo recomiendo</label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-bold">Etiquetas</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map(tag => (
            <button
              type="button"
              onClick={() => setSelected(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])}
              key={tag}
              className={`rounded-full px-3 py-1.5 text-sm ${selected.includes(tag) ? 'bg-royal text-white' : 'bg-blue-50 text-royal'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block font-bold">
        Comentario corto
        <textarea
          required
          maxLength={600}
          name="comment"
          className="input mt-2 min-h-28"
          placeholder="Describe tu experiencia de manera respetuosa, sin insultos ni acusaciones personales."
        />
      </label>

      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{message}</p>}

      <button className="btn-primary">Enviar a moderación</button>
    </form>
  );
}
