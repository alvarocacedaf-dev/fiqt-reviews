// @vitest-environment node
import { it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createCanvas } from '@napi-rs/canvas';
import { openExamDocument } from '@/lib/questionBankExtractor';
import { suggestQuestions } from '@/lib/questionBankReview';
it('renderiza un PDF conservando sus figuras y extrae sus números', async () => {
  const pdf = await PDFDocument.create(); const page = pdf.addPage([595,842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('1. Calcule la fuerza aplicada sobre el cuerpo mostrado en la figura.', { x: 40, y: 720, size: 14, font });
  page.drawRectangle({ x: 100, y: 600, width: 100, height: 50 });
  page.drawText('2. Calcule la velocidad de la particula usando las condiciones iniciales.', { x: 40, y: 400, size: 14, font });
  const document = await openExamDocument(await pdf.save(),true);
  try {
    const rendered = await document.page(1);
    expect(rendered.bytes.length).toBeGreaterThan(1000);
    expect(suggestQuestions([{ ...rendered, path: 'test.jpg' }])).toHaveLength(2);
  } finally { await document.close(); }
},30000);
it('lee con OCR una imagen sin descargar modelos externos', async () => {
  const canvas = createCanvas(1200,900); const ctx = canvas.getContext('2d');
  ctx.fillStyle='white';ctx.fillRect(0,0,1200,900);ctx.fillStyle='black';ctx.font='32px Arial';
  ctx.fillText('1. Calcule la velocidad del cuerpo.',60,150);
  ctx.fillText('2. Determine la fuerza aplicada.',60,500);
  const doc = await openExamDocument(await canvas.encode('jpeg'),false);
  try {
    const rendered = await doc.page(1);
    expect(rendered.lines.map(l=>l.text).join(' ')).toMatch(/velocidad/);
    expect(suggestQuestions([{...rendered,path:'test.jpg'}])).toHaveLength(2);
  } finally { await doc.close(); }
},60000);
