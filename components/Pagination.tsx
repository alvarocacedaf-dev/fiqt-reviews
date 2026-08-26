import Link from 'next/link';
import { getTotalPages } from '@/lib/pagination';

type PaginationProps = {
  currentPage: number;
  pageSize: number;
  pathname: string;
  searchParams?: Record<string, string | undefined>;
  totalItems: number;
};

export function Pagination({
  currentPage,
  pageSize,
  pathname,
  searchParams = {},
  totalItems,
}: PaginationProps) {
  const totalPages = getTotalPages(totalItems, pageSize);
  if (totalPages <= 1) return null;

  const hrefFor = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== 'page') params.set(key, value);
    });
    params.set('page', String(page));
    return `${pathname}?${params.toString()}`;
  };

  return (
    <nav className="panel flex flex-wrap items-center justify-between gap-3 py-4" aria-label="Paginación">
      <p className="text-sm font-semibold text-slate-600">
        Página {currentPage} de {totalPages} · {totalItems} registros
      </p>
      <div className="flex gap-2">
        {currentPage > 1 ? (
          <Link className="btn-secondary" href={hrefFor(currentPage - 1)}>← Anterior</Link>
        ) : (
          <span className="btn-secondary cursor-not-allowed opacity-40">← Anterior</span>
        )}
        {currentPage < totalPages ? (
          <Link className="btn-secondary" href={hrefFor(currentPage + 1)}>Siguiente →</Link>
        ) : (
          <span className="btn-secondary cursor-not-allowed opacity-40">Siguiente →</span>
        )}
      </div>
    </nav>
  );
}
