import { describe, it, expect } from 'vitest';
import { suggestQuestions, validateRegions, type QuestionPage } from '@/lib/questionBankReview';
const pages: QuestionPage[] = [
  { page: 1, path: 'private/1.jpg', width: 1000, height: 1500, lines: [{ text: '1. Calcule la velocidad', x: .05, y: .2 }, { text: 'a) inciso', x: .1, y: .4 }] },
  { page: 2, path: 'private/2.jpg', width: 1000, height: 1500, lines: [{ text: 'continúa el inciso', x: .1, y: .1 }, { text: '2) Halle la energía', x: .05, y: .6 }] },
];
describe('borradores de preguntas', () => {
  it('conserva la continuación en otra página sin convertir incisos en preguntas', () => {
    const result = suggestQuestions(pages);
    expect(result).toHaveLength(2);
    expect(result[0].regions.map(r => r.page)).toEqual([1,2]);
    expect(result[0].regions[1].top + result[0].regions[1].height).toBeCloseTo(result[1].regions[0].top);
  });
  it('rechaza recortes inválidos y acepta páginas en orden de revisión', () => {
    for (const regions of [[], [{ page: 3, left: 0, top: 0, width: 1, height: 1 }], [{ page: 1, left: .8, top: 0, width: .4, height: 1 }], [{ page: 1, left: NaN, top: 0, width: 1, height: 1 }]]) expect(() => validateRegions(regions,pages)).toThrow();
    expect(validateRegions([{ page: 2, left: .1, top: .1, width: .8, height: .8 }],pages)).toHaveLength(1);
  });
});
