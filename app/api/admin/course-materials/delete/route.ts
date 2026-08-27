import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';
import { deleteB2Object } from '@/lib/b2';
import { deleteR2Object } from '@/lib/r2';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });

  try {
    const { fileId } = await request.json() as { fileId?: string };
    if (!fileId) return NextResponse.json({ error: 'Falta el archivo que se eliminará.' }, { status: 400 });
    const { data: file, error: findError } = await context.db.from('course_materials').select('id,file_path,storage_provider').eq('id', fileId).single();
    if (findError || !file) return NextResponse.json({ error: 'No se encontró el material.' }, { status: 404 });
    if (file.storage_provider === 'b2') await deleteB2Object(file.file_path);
    else if (file.storage_provider === 'r2') await deleteR2Object(file.file_path);
    else return NextResponse.json({ error: 'El proveedor de este archivo no es compatible.' }, { status: 409 });
    const { error: deleteError } = await context.db.from('course_materials').delete().eq('id', file.id);
    if (deleteError) throw new Error(deleteError.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo eliminar el material.' }, { status: 500 });
  }
}
