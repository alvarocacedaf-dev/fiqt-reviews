import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const bank = JSON.parse(await fs.readFile('data/question-banks/qu328-final.json', 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: bucket, error } = await db.storage.getBucket('admin-worksheets');
if (error || !bucket || bucket.public) throw new Error('Se requiere el bucket privado admin-worksheets.');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [index, question] of bank.questions.entries()) {
  const bytes = await fs.readFile(`tmp/organic-final/questions/${question.id}.jpg`);
  if (hash(bytes) !== question.sha256) throw new Error('Hash local inválido: ' + question.id);
  const { error: uploadError } = await db.storage.from('admin-worksheets').upload(question.assetPath, bytes, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;
  const { data, error: readError } = await db.storage.from('admin-worksheets').download(question.assetPath);
  if (readError || !data || hash(Buffer.from(await data.arrayBuffer())) !== question.sha256) throw new Error('Verificación remota fallida: ' + question.id);
  if ((index + 1) % 10 === 0) console.log(`${index + 1}/${bank.questions.length} verificadas`);
}
console.log(`${bank.questions.length} preguntas subidas y verificadas en almacenamiento privado.`);
