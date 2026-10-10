export type PageResult<T> = {
  data: T[] | null;
  error?: { message?: string } | null;
};

export async function loadAllPaginatedRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000,
) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message || 'No se pudo cargar el catálogo completo.');
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
    from += pageSize;
  }
}

export function uniqueRowsBy<T>(rows: T[], keyFor: (row: T) => string) {
  return [...new Map(rows.map(row => [keyFor(row), row])).values()];
}
