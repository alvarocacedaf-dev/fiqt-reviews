import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import type { BankQuestion } from '@/lib/examQuestionBank';
import { EXAM_GENERATORS, type ExamGeneratorConfig } from '@/lib/examGeneratorConfig';
import crest from '@/data/question-banks/uni-crest.json';

const PAGE_WIDTH = 595.28, PAGE_HEIGHT = 841.89;
const MARGIN = 36, WIDTH = PAGE_WIDTH - MARGIN * 2, BOTTOM = 55;
export function practiceExamDate(date: Date) {
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
function lines(text: string, font: PDFFont, size: number, width = WIDTH) {
  const result: string[] = []; let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > width) { result.push(line); line = word; }
    else line = next;
  }
  if (line) result.push(line);
  return result;
}

export async function buildPracticeExamPdf(
  questions: BankQuestion[], loadImage: (question: BankQuestion) => Promise<Uint8Array>,
  config: ExamGeneratorConfig = EXAM_GENERATORS['bfi01-pc1'], generatedAt = new Date(),
) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const logo = await pdf.embedPng(crest.pngBase64);
  const ink = rgb(0.05, 0.15, 0.35);
  pdf.setTitle(config.pdfLabel + ' - Examen de práctica');
  pdf.setCreationDate(generatedAt);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const top = PAGE_HEIGHT - MARGIN;
  const textX = MARGIN + 80, textWidth = WIDTH - 90;
  let headerY = top - 16;
  const headerLine = (text: string, strong = false, size = 10) => {
    const face = strong ? serifBold : serif;
    for (const line of lines(text, face, size, textWidth)) {
      page.drawText(line, { x: textX, y: headerY, size, font: face }); headerY -= 13;
    }
  };
  headerLine('UNIVERSIDAD NACIONAL DE INGENIERÍA', true, 11);
  headerLine('FACULTAD DE INGENIERÍA QUÍMICA Y TEXTIL', true, 10);
  headerLine('DEPARTAMENTO ACADÉMICO DE CIENCIAS BÁSICAS', true, 10);
  headerLine(`${config.courseName} (${config.physics ? 'BFI01' : 'QU328'})`, true, 11);
  headerLine('Ciclo: 2026-2 (examen generado con IA de examenes pasados)');
  headerLine('Fecha: ' + practiceExamDate(generatedAt));
  headerLine('Tipo de prueba: ' + config.assessmentName.toUpperCase(), true);
  headerLine('Temas: selección de problemas de exámenes pasados del curso.');
  headerLine('Evaluación de práctica · Tiempo: libre');
  const separator = headerY + 3;
  page.drawLine({ start: { x: textX - 7, y: separator }, end: { x: PAGE_WIDTH - MARGIN, y: separator }, thickness: 0.6 });
  headerY -= 10;
  headerLine('INSTRUCCIONES: Desarrolla el procedimiento en una hoja aparte. Se conserva la numeración original de cada recorte.', false, 9);
  const headerBottom = headerY + 3;
  page.drawRectangle({ x: MARGIN, y: headerBottom, width: WIDTH, height: top - headerBottom, borderWidth: 0.7, borderColor: rgb(0, 0, 0) });
  page.drawLine({ start: { x: textX - 7, y: headerBottom }, end: { x: textX - 7, y: top }, thickness: 0.6 });
  page.drawImage(logo, { x: MARGIN + 8, y: headerBottom + (top - headerBottom - 75) / 2, width: 61, height: 75 });
  let y = headerBottom - 24;
  let pageHasQuestion = false;
  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawText(config.courseName + ' | ' + config.generatedTitle, { x: MARGIN, y: top - 10, size: 10, font: bold, color: ink });
    y = top - 32; pageHasQuestion = false;
  };

  for (const [index, question] of questions.entries()) {
    const image = await pdf.embedJpg(Uint8Array.from(await loadImage(question)));
    const notes: string[] = [];
    if (config.physics && question.gravity != null) notes.push('Usa g = ' + String(question.gravity).replace('.', ',') + ' m/s² si el enunciado no indica otro valor.');
    if (question.containsAnnotations) notes.push('El documento original contiene anotaciones manuscritas.');
    const noteHeight = notes.length * 12;
    // Keep a question intact; only very tall crops need scaling to fit a full page.
    let scale = WIDTH / image.width;
    const overhead = 20 + noteHeight;
    if (image.height * scale + overhead > y - BOTTOM && pageHasQuestion) newPage();
    scale = Math.min(scale, (y - BOTTOM - overhead) / image.height);
    const height = image.height * scale, width = image.width * scale;
    page.drawText(`Pregunta ${index + 1} de ${questions.length}`, { x: MARGIN, y, size: 9, font: bold, color: ink });
    y -= 16;
    page.drawImage(image, { x: MARGIN, y: y - height, width, height });
    y -= height + 4;
    for (const note of notes) {
      page.drawText(note, { x: MARGIN, y: y - 8, size: 8, font }); y -= 12;
    }
    y -= 16; pageHasQuestion = true;
  }

  const references = questions.map((q, index) => lines(`${index + 1}. ${q.sourceTitle} / pregunta original ${q.originalNumber}, ${q.sourcePages.length > 1 ? 'páginas' : 'página'} ${q.sourcePages.join(' y ')}`, font, 8));
  if (y - BOTTOM < 30 + (references[0]?.length ?? 0) * 11) newPage();
  page.drawText('Procedencia de las preguntas', { x: MARGIN, y, size: 11, font: bold, color: ink }); y -= 20;
  for (const reference of references) {
    for (const line of reference) {
      if (y < BOTTOM) newPage();
      page.drawText(line, { x: MARGIN, y, size: 8, font }); y -= 11;
    }
    y -= 5;
  }
  for (const [index, sheet] of pdf.getPages().entries()) {
    sheet.drawText('FIQT REVIEWS · Material de práctica; no es un examen oficial.', { x: MARGIN, y: 28, size: 8, font });
    sheet.drawText(`${index + 1} / ${pdf.getPageCount()}`, { x: PAGE_WIDTH - MARGIN - 28, y: 28, size: 8, font });
  }
  return pdf.save();
}
