import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env.local');
const bank=JSON.parse(await fs.readFile('data/question-banks/bfi01-pc1.json','utf8'));
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const {data:bucket,error}=await db.storage.getBucket('admin-worksheets');
if(error || bucket.public) throw new Error('El banco requiere el bucket privado admin-worksheets.');
for(const q of bank.questions){
 const bytes=await fs.readFile('tmp/physics-pc1/questions/'+q.id+'.jpg');
 if(createHash('sha256').update(bytes).digest('hex')!==q.sha256)throw new Error('Hash inválido: '+q.id);
 const {error}=await db.storage.from('admin-worksheets').upload(q.assetPath,bytes,{contentType:'image/jpeg',upsert:true});
 if(error)throw error;
 const {data,error:readError}=await db.storage.from('admin-worksheets').download(q.assetPath);
 if(readError || createHash('sha256').update(Buffer.from(await data.arrayBuffer())).digest('hex')!==q.sha256)throw new Error('Verificación fallida: '+q.id);
}
console.log('Subidas y verificadas '+bank.questions.length+' preguntas en almacenamiento privado.');
