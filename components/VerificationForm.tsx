'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function VerificationForm() {
  const [message, setMessage] = useState('');

  async function submit(form: FormData) {
    const file = form.get('evidence') as File;
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();

    if (!user) return setMessage('Inicia sesión antes de enviar una evidencia.');
    if (!file?.size) return setMessage('Selecciona una imagen o PDF.');

    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await db.storage
      .from('verification-evidence')
      .upload(path, file, { upsert: false });

    if (uploadError) return setMessage(uploadError.message);

    const { error } = await db.from('verification_submissions').insert({
      user_id: user.id,
      file_url: path,
      status: 'pending',
    });

    if (error) {
      await db.storage.from('verification-evidence').remove([path]);
      return setMessage(error.message);
    }

    setMessage('Evidencia enviada. Quedó pendiente de revisión.');
  }

  return (
    <form action={submit} className="space-y-4">
      <label className="block font-semibold">
        Evidencia académica
        <input
          required
          accept="image/png,image/jpeg,application/pdf"
          name="evidence"
          type="file"
          className="mt-2 block w-full text-sm"
        />
      </label>
      {message && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-950">{message}</p>}
      <button className="btn-primary">Enviar para revisión</button>
    </form>
  );
}
