// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import { buildPracticeExamPdf, practiceExamDate } from '@/lib/practiceExamPdf';
import { EXAM_GENERATORS } from '@/lib/examGeneratorConfig';
import { getExamBank } from '@/lib/examQuestionBank';
import { openExamDocument } from '@/lib/questionBankExtractor';

const bank = getExamBank('qu328-final');
async function picture(height: number) {
  const canvas = createCanvas(1000, height); const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1000, height);
  ctx.fillStyle = 'black'; ctx.font = '24px Arial'; ctx.fillText('Enunciado y figura de prueba', 10, 30);
  ctx.strokeRect(10, 40, 980, height - 50);
  return canvas.encode('jpeg');
}
describe('PDF de examen generado', () => {
  it('usa la fecha de Lima incluso antes de la medianoche local', () => {
    expect(practiceExamDate(new Date('2026-11-24T03:00:00Z'))).toBe('23 de noviembre de 2026');
    expect(practiceExamDate(new Date('2026-11-24T05:00:00Z'))).toBe('24 de noviembre de 2026');
  });
  it('comparte página entre preguntas cortas y conserva encabezado y procedencia', async () => {
    const image = await picture(90);
    const bytes = await buildPracticeExamPdf(bank.questions.slice(0, 3), async () => image, bank, new Date('2026-11-24T03:00:00Z'));
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const document = await openExamDocument(bytes, true);
    try {
      const rendered = await document.page(1);
      const text = rendered.lines.map(l => l.text).join(' ');
      expect(text).toContain('23 de noviembre de 2026');
      expect(text).toContain('2026-2 (examen generado con IA de examenes pasados)');
      expect(text).toContain('Pregunta 3 de 3');
      expect(text).toContain('Procedencia de las preguntas');
      expect(text).toContain('no es un examen oficial');
    } finally { await document.close(); }
  }, 30000);
  it('pagina preguntas altas sin páginas vacías y mantiene las notas de Física', async () => {
    const image = await picture(1400);
    const questions = getExamBank('bfi01-pc1').questions.slice(0, 2).map(q => ({ ...q, gravity: 9.8, containsAnnotations: true }));
    const bytes = await buildPracticeExamPdf(questions, async () => image, EXAM_GENERATORS['bfi01-pc1']);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(3);
    const document = await openExamDocument(bytes, true);
    try {
      const rendered = await document.page(2);
      const text = rendered.lines.map(l => l.text).join(' ');
      expect(text).toContain('Pregunta 2 de 2');
      expect(text).toContain('9,8 m/s²');
      expect(text).toContain('anotaciones manuscritas');
    } finally { await document.close(); }
  }, 30000);
});
