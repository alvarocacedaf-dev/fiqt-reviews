export const EXAM_GENERATORS = {
  'bfi01-pc1': {
    key: 'bfi01-pc1', courseId: '5d448bf9-7246-4153-890e-c57283f0a254',
    courseName: 'Física I', assessmentName: 'Práctica calificada 1',
    generatedTitle: 'Práctica calificada 1 generada', pdfLabel: 'Física I - PC1',
    filename: 'Fisica-I-PC1-examen-de-practica.pdf', physics: true,
  },
  'bfi01-pc2': {
    key: 'bfi01-pc2', courseId: '5d448bf9-7246-4153-890e-c57283f0a254',
    courseName: 'Física I', assessmentName: 'Práctica calificada 2',
    generatedTitle: 'Práctica calificada 2 generada', pdfLabel: 'Física I - PC2',
    filename: 'Fisica-I-PC2-examen-de-practica.pdf', physics: true,
  },
  'qu328-final': {
    key: 'qu328-final', courseId: 'd0d588a3-9e52-4531-8e9a-75442c6f503e',
    courseName: 'Química Orgánica I', assessmentName: 'Examen final',
    generatedTitle: 'Examen final generado', pdfLabel: 'Química Orgánica I - Final',
    filename: 'Quimica-Organica-I-final-de-practica.pdf', physics: false,
  },
} as const;
export type ExamGeneratorKey = keyof typeof EXAM_GENERATORS;
export type ExamGeneratorConfig = (typeof EXAM_GENERATORS)[ExamGeneratorKey];

export function examGeneratorKey(params: { bank?: string | null; practice?: string | null }): ExamGeneratorKey | null {
  if (params.bank != null) return Object.hasOwn(EXAM_GENERATORS, params.bank) ? params.bank as ExamGeneratorKey : null;
  return params.practice === '2' ? 'bfi01-pc2' : 'bfi01-pc1';
}
