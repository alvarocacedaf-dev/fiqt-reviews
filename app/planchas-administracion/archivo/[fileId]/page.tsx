import { AdminWorksheetViewer } from '@/components/AdminWorksheetViewer';

export default async function AdminWorksheetViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ fileId: string }>;
  searchParams: Promise<{ fileName?: string; mimeType?: string; title?: string }>;
}) {
  const [{ fileId }, query] = await Promise.all([params, searchParams]);
  const title = query.title?.trim() || 'Archivo académico';
  const fileName = query.fileName?.trim() || 'archivo';

  return (
    <AdminWorksheetViewer
      fileId={fileId}
      fileName={fileName}
      mimeType={query.mimeType?.trim() || ''}
      title={title}
    />
  );
}
