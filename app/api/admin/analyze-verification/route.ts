import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { matchOcrCatalog } from '@/lib/ocrMatch';

export const runtime = 'nodejs';
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

function cleanProcessDetails(value: string) {
  return value
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line
      && !line.startsWith('Creating model:')
      && !line.startsWith('Model files already exist.'))
    .slice(-4)
    .join(' ');
}

type Relation = { name: string; code: string | null } | { name: string; code: string | null }[] | null;
type ProfessorRelation = { full_name: string } | { full_name: string }[] | null;

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 });

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Acceso administrativo requerido.' }, { status: 403 });
  }

  const { submissionId } = await request.json() as { submissionId?: string };
  if (!submissionId) return NextResponse.json({ error: 'Falta la solicitud.' }, { status: 400 });

  const { data: submission } = await db
    .from('verification_submissions')
    .select('file_url')
    .eq('id', submissionId)
    .eq('status', 'pending')
    .single();
  if (!submission) return NextResponse.json({ error: 'No se encontró la evidencia pendiente.' }, { status: 404 });

  const { data: file, error: downloadError } = await db.storage.from('verification-evidence').download(submission.file_url);
  if (downloadError || !file) return NextResponse.json({ error: 'No se pudo descargar la evidencia privada.' }, { status: 500 });

  const workspace = await mkdtemp(path.join(tmpdir(), 'fiqt-ocr-'));
  const extension = path.extname(submission.file_url) || '.png';
  const inputPath = path.join(workspace, `evidence${extension}`);
  const outputPath = path.join(workspace, 'result.json');

  try {
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    const python = process.env.OCR_PYTHON_PATH || path.join(process.cwd(), '.ocr-venv', 'Scripts', 'python.exe');
    const script = path.join(process.cwd(), 'work', 'ocr_extract.py');
    const runOcr = () => execFileAsync(python, [script, inputPath, outputPath], {
      timeout: 300_000,
      windowsHide: true,
      maxBuffer: 10_000_000,
      env: {
        ...process.env,
        HOME: process.cwd(),
        USERPROFILE: process.cwd(),
        // La distribución de PaddlePaddle instalada en Windows usa OpenBLAS.
        // OpenBLAS no admite este flujo con varios hilos y termina el proceso
        // con 0xC0000005, así que el OCR debe ejecutarse con un solo hilo.
        OMP_NUM_THREADS: '1',
        FLAGS_use_mkldnn: '0',
        // Los modelos ya están guardados localmente; no comprueba servidores externos.
        PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK: 'True',
      },
    });

    try {
      await runOcr();
    } catch (firstError) {
      // Paddle puede fallar de manera transitoria mientras inicializa un modelo en caché.
      // Se reintenta una sola vez; nunca se elimina ni descarga un modelo automáticamente.
      console.warn('OCR local: primer intento fallido, reintentando una vez.', firstError);
      await runOcr();
    }
    const result = JSON.parse(await readFile(outputPath, 'utf8')) as { lines?: string[] };
    const lines = result.lines ?? [];

    const { data: rawLinks } = await db
      .from('course_professors')
      .select('course_id,professor_id,courses(name,code),professors(full_name)');
    const catalog = (rawLinks ?? []).flatMap((link: { course_id: string; professor_id: string; courses: Relation; professors: ProfessorRelation }) => {
      const course = first(link.courses);
      const professor = first(link.professors);
      return course && professor ? [{
        courseId: link.course_id,
        professorId: link.professor_id,
        courseCode: course.code,
        professorName: professor.full_name,
      }] : [];
    });

    const matches = matchOcrCatalog(lines, catalog);
    return NextResponse.json({
      matches,
      lines,
      message: matches.length
        ? undefined
        : `El OCR leyó ${lines.length} fila(s), pero no pudo relacionarlas con el catálogo. Revisa manualmente.`,
    });
  } catch (error) {
    const processError = error as Error & { stderr?: string };
    const details = cleanProcessDetails(`${processError.message || ''}\n${processError.stderr || ''}`);
    console.error('OCR local:', processError);
    return NextResponse.json({
      error: `El OCR local encontró un problema. ${details || 'Revisa la terminal del servidor.'}`,
    }, { status: 500 });
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
