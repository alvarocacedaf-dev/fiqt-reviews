export type QuestionRegion = { page: number; left: number; top: number; width: number; height: number };
export type QuestionPage = { page: number; path: string; width: number; height: number; lines: { text: string; x: number; y: number }[] };

// Coordinates are fractions of the original page, not of the on-screen thumbnail.
export function validateRegions(value: unknown, pages: QuestionPage[]): QuestionRegion[] {
  if (!Array.isArray(value) || !value.length || value.length > 8) throw new Error('Selecciona entre 1 y 8 recortes.');
  return value.map(r => {
    if (!r || !Number.isInteger(r.page) || !pages.some(p => p.page === r.page)
      || !['left', 'top', 'width', 'height'].every(k => typeof r[k] === 'number' && Number.isFinite(r[k]))
      || r.left < 0 || r.top < 0 || r.width <= 0 || r.height <= 0
      || r.left + r.width > 1.00001 || r.top + r.height > 1.00001) throw new Error('El recorte está fuera de la página.');
    return { page: r.page, left: r.left, top: r.top, width: r.width, height: r.height };
  });
}

// These are suggestions only. Subparts, columns, handwritten answers and missing
// numbers require visual review; nothing produced here is published automatically.
export function suggestQuestions(pages: QuestionPage[]) {
  const starts: { page: number; top: number; number: number; text: string }[] = [];
  for (const p of pages) for (const line of [...p.lines].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const m = line.text.match(/^\s*(?:(?:pregunta|problema|ejercicio)\s*)?(\d{1,2})\s*[.)\-:]/i);
    const number = Number(m?.[1]);
    if (m && number >= 1 && number <= 30 && line.x < .35
      && !starts.some(s => s.page === p.page && Math.abs(s.top - line.y) < .015)) {
      starts.push({ page: p.page, top: Math.max(0, line.y - .008), number, text: line.text });
    }
  }
  return starts.map((start, i) => {
    const next = starts[i + 1];
    const regions = pages.filter(p => p.page >= start.page && (!next || p.page <= next.page)).flatMap(p => {
      const top = p.page === start.page ? start.top : .02;
      const bottom = next?.page === p.page ? next.top : .97;
      return bottom - top > .015 ? [{ page: p.page, left: .02, top, width: .96, height: bottom - top }] : [];
    });
    return { number: start.number, text: start.text, regions };
  }).filter(q => q.regions.length && q.regions.length <= 8).slice(0, 60);
}
