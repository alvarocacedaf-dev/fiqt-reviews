import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { BankQuestion } from '@/lib/examQuestionBank';
export async function buildPracticeExamPdf(questions: BankQuestion[], loadImage: (question: BankQuestion) => Promise<Uint8Array>) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle('Física I - PC1 - Examen de práctica');
  for (const [index, question] of questions.entries()) {
    const image = await pdf.embedJpg(Uint8Array.from(await loadImage(question)));
    const page = pdf.addPage([595.28, 841.89]);
    page.drawText('FIQT REVIEWS | FÍSICA I - PC1', { x: 40, y: 800, size: 15, font: bold, color: rgb(0.05, 0.15, 0.35) });
    page.drawText('Examen de práctica · Pregunta ' + (index + 1) + ' de ' + questions.length, { x: 40, y: 777, size: 11, font });
    page.drawText('Resuelve en una hoja aparte. Se conserva la numeración original del recorte.', { x: 40, y: 756, size: 9, font });
    page.drawText('Usa g = ' + String(question.gravity).replace('.', ',') + ' m/s² cuando sea necesario y el enunciado no indique otro valor.', { x: 40, y: 741, size: 9, font });
    const scale = Math.min(515 / image.width, 620 / image.height);
    const width = image.width * scale, height = image.height * scale;
    page.drawImage(image, { x: (595.28 - width) / 2, y: 720 - height, width, height });
    if (question.containsAnnotations) page.drawText('El documento original contiene anotaciones manuscritas.', { x: 40, y: 52, size: 9, font });
    page.drawText('Material de práctica; no es un examen oficial. Procedencia al final.', { x: 40, y: 35, size: 9, font });
  }
  let page = pdf.addPage([595.28, 841.89]); let y = 790;
  page.drawText('Procedencia de las preguntas', { x: 40, y, size: 17, font: bold }); y -= 35;
  for (const [index, q] of questions.entries()) {
    const text = (index + 1) + '. ' + q.sourceTitle + ' / pregunta original ' + q.originalNumber + ', ' + (q.sourcePages.length > 1 ? 'páginas ' : 'página ') + q.sourcePages.join(' y ');
    const words = text.split(' '); let line = '';
    for (const word of words) {
      if (font.widthOfTextAtSize(line + ' ' + word, 10) > 510) {
        page.drawText(line, { x: 40, y, size: 10, font }); y -= 15; line = word;
      } else line = line ? line + ' ' + word : word;
    }
    page.drawText(line, { x: 40, y, size: 10, font }); y -= 30;
    if (y < 100) { page = pdf.addPage([595.28, 841.89]); y = 790; }
  }
  return pdf.save();
}
