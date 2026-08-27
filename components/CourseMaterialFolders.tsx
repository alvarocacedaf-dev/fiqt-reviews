import { Icon } from '@/components/ui/Icon';

export type CourseMaterialFile = {
  id: string;
  title: string;
  material_type: 'books' | 'guided_practice' | 'classes' | 'other';
  academic_term: string | null;
  file_name: string;
  mime_type: string | null;
  file_size: number;
  created_at: string;
  signed_url: string | null;
};

const CATEGORIES: { type: CourseMaterialFile['material_type']; label: string; description: string }[] = [
  { type: 'books', label: 'Libros', description: 'Libros y textos de consulta del curso.' },
  { type: 'guided_practice', label: 'Prácticas dirigidas', description: 'Ejercicios, problemas y prácticas desarrolladas.' },
  { type: 'classes', label: 'Clases', description: 'Diapositivas, separatas y apuntes de clase.' },
  { type: 'other', label: 'Otros', description: 'Material complementario y archivos adicionales.' },
];

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

const titleCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

function materialOrder(file: CourseMaterialFile) {
  const title = file.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const collection = title.includes('sears') || title.includes('zemansky')
    ? 0
    : title.includes('serway') ? 1 : 2;
  const solutionManual = title.includes('solucionario') ? 1 : 0;
  const volume = Number(title.match(/\bvol(?:umen)?\.?\s*-?\s*(\d+)/)?.[1] ?? Number.MAX_SAFE_INTEGER);

  return { collection, solutionManual, volume, title };
}

function compareMaterials(left: CourseMaterialFile, right: CourseMaterialFile) {
  const leftOrder = materialOrder(left);
  const rightOrder = materialOrder(right);

  return leftOrder.collection - rightOrder.collection
    || leftOrder.solutionManual - rightOrder.solutionManual
    || leftOrder.volume - rightOrder.volume
    || titleCollator.compare(leftOrder.title, rightOrder.title);
}

export function CourseMaterialFolders({ files }: { files: CourseMaterialFile[] }) {
  return (
    <div className="space-y-3">
      {CATEGORIES.map(category => {
        const categoryFiles = files
          .filter(file => file.material_type === category.type)
          .sort(compareMaterials);
        return (
          <details className="group overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm" key={category.type}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-blue-50 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-royal">
                  <Icon className="h-5 w-5" name={category.type === 'books' ? 'library' : 'folder'} />
                </span>
                <span className="min-w-0">
                  <span className="block font-black text-ink">{category.label}</span>
                  <span className="block text-xs text-slate-500">{category.description} · {categoryFiles.length} archivo{categoryFiles.length === 1 ? '' : 's'}</span>
                </span>
              </span>
              <Icon className="h-5 w-5 text-royal transition group-open:rotate-180" name="chevron-down" />
            </summary>

            <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
              {categoryFiles.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {categoryFiles.map(file => (
                    <article className="rounded-2xl border border-slate-200 bg-white p-4" key={file.id}>
                      <h3 className="break-words text-sm font-black text-ink">{file.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{formatBytes(file.file_size)}{file.academic_term ? ` · ${file.academic_term}` : ''}</p>
                      {file.signed_url ? (
                        <a className="btn-secondary mt-3 gap-2 px-3 py-2 text-xs" href={file.signed_url} rel="noreferrer" target="_blank">
                          <Icon className="h-4 w-4" name="file" /> Abrir archivo
                        </a>
                      ) : (
                        <span className="mt-3 inline-block rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">No disponible</span>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-white p-5 text-center text-sm text-slate-500">Todavía no se agregaron archivos en esta carpeta.</p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
