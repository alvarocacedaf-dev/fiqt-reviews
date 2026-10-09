export function FolderDownloadButton({ url }: { url: string }) {
  return (
    <div className="mt-4">
      <a className="btn-primary inline-flex px-4 py-2.5 text-sm" download href={url}>
        Descargar carpeta ZIP
      </a>
    </div>
  );
}
