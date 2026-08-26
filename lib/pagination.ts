export const DEFAULT_PAGE_SIZE = 25;

export function getPagination(pageValue?: string, pageSize = DEFAULT_PAGE_SIZE) {
  const parsed = Number.parseInt(pageValue || '1', 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return {
    page,
    pageSize,
    from: (page - 1) * pageSize,
    to: page * pageSize - 1,
  };
}

export function getTotalPages(totalItems: number, pageSize = DEFAULT_PAGE_SIZE) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}
