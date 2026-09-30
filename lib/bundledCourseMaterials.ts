export type BundledCourseMaterial = {
  id: string;
  courseCodes: string[];
  title: string;
  description: string;
  materialType: 'books' | 'guided_practice' | 'classes' | 'other';
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileType: 'PDF' | 'DOCX' | 'ZIP';
  contents: string;
  downloadLabel: string;
  professorIds?: string[];
  professorNames?: string[];
};

export const bundledCourseMaterials: BundledCourseMaterial[] = [
  {
    id: 'fisica-iii-carhuancho-material-teorico',
    courseCodes: ['BFI03'],
    title: 'Material teórico de Física III',
    description: 'Colección de temas compartidos para complementar el estudio del curso.',
    materialType: 'classes',
    fileUrl: '/materiales/fisica-iii-carhuancho-material-teorico.zip',
    fileName: 'Fisica-III-Carhuancho-material-teorico.zip',
    mimeType: 'application/zip',
    fileSize: 28_360_628,
    fileType: 'ZIP',
    contents: '12 documentos PDF',
    downloadLabel: 'Descargar carpeta ZIP',
    professorIds: ['b44d0eec-61bf-4f5d-920c-070dfd18389d'],
  },
  {
    id: 'hugo-medina-guzman-fisica-1-2-3-4',
    courseCodes: ['BFI01', 'BFI03'],
    title: 'Física de Hugo Medina Guzmán',
    description: 'Libro de consulta que reúne contenidos de Física 1, 2, 3 y 4.',
    materialType: 'books',
    fileUrl: '/materiales/hugo-medina-guzman-fisica-1-2-3-4.pdf',
    fileName: 'Hugo-Medina-Guzman-Fisica-1-2-3-4.pdf',
    mimeType: 'application/pdf',
    fileSize: 23_845_786,
    fileType: 'PDF',
    contents: '1 documento PDF',
    downloadLabel: 'Descargar documento PDF',
    professorNames: ['Huamán Pérez, Fernando'],
  },
  {
    id: 'pi524-teoria-de-errores',
    courseCodes: ['PI524'],
    title: 'Teoría de errores',
    description: 'Material complementario de Métodos Numéricos para Ingeniería Química.',
    materialType: 'other',
    fileUrl: '/materiales/pi524-teoria-de-errores.pdf',
    fileName: 'PI524-Teoria-de-errores.pdf',
    mimeType: 'application/pdf',
    fileSize: 2_195_072,
    fileType: 'PDF',
    contents: '1 documento PDF',
    downloadLabel: 'Abrir archivo',
  },
  {
    id: 'pi524-newton-raphson-davila',
    courseCodes: ['PI524'],
    title: 'Newton-Raphson — Dávila',
    description: 'Material complementario de Métodos Numéricos para Ingeniería Química.',
    materialType: 'other',
    fileUrl: '/materiales/pi524-newton-raphson-davila.pdf',
    fileName: 'PI524-Newton-Raphson-Davila.pdf',
    mimeType: 'application/pdf',
    fileSize: 926_167,
    fileType: 'PDF',
    contents: '1 documento PDF',
    downloadLabel: 'Abrir archivo',
  },
  {
    id: 'pi524-ecuaciones-no-lineales-metodos-cerrados-davila-parte-1',
    courseCodes: ['PI524'],
    title: 'Ecuaciones no lineales: métodos cerrados — Dávila (parte 1)',
    description: 'Material complementario de Métodos Numéricos para Ingeniería Química.',
    materialType: 'other',
    fileUrl: '/materiales/pi524-ecuaciones-no-lineales-metodos-cerrados-davila-parte-1.pdf',
    fileName: 'PI524-Ecuaciones-no-lineales-metodos-cerrados-Davila-parte-1.pdf',
    mimeType: 'application/pdf',
    fileSize: 461_736,
    fileType: 'PDF',
    contents: '1 documento PDF',
    downloadLabel: 'Abrir archivo',
  },
  {
    id: 'pi524-metodos-cerrados-casos-aplicativos-davila',
    courseCodes: ['PI524'],
    title: 'Métodos cerrados: casos aplicativos — Dávila',
    description: 'Material complementario de Métodos Numéricos para Ingeniería Química.',
    materialType: 'other',
    fileUrl: '/materiales/pi524-metodos-cerrados-casos-aplicativos-davila.pdf',
    fileName: 'PI524-Metodos-cerrados-casos-aplicativos-Davila.pdf',
    mimeType: 'application/pdf',
    fileSize: 697_809,
    fileType: 'PDF',
    contents: '1 documento PDF',
    downloadLabel: 'Abrir archivo',
  },
  {
    id: 'pi524-metodo-de-la-secante-davila',
    courseCodes: ['PI524'],
    title: 'Método de la secante — Dávila',
    description: 'Material complementario de Métodos Numéricos para Ingeniería Química.',
    materialType: 'other',
    fileUrl: '/materiales/pi524-metodo-de-la-secante-davila.pdf',
    fileName: 'PI524-Metodo-de-la-secante-Davila.pdf',
    mimeType: 'application/pdf',
    fileSize: 1_188_912,
    fileType: 'PDF',
    contents: '1 documento PDF',
    downloadLabel: 'Abrir archivo',
  },
  {
    id: 'pi524-ecuaciones-no-lineales-metodos-cerrados-davila-parte-2',
    courseCodes: ['PI524'],
    title: 'Ecuaciones no lineales: métodos cerrados — Dávila (parte 2)',
    description: 'Material complementario de Métodos Numéricos para Ingeniería Química.',
    materialType: 'other',
    fileUrl: '/materiales/pi524-ecuaciones-no-lineales-metodos-cerrados-davila-parte-2.pdf',
    fileName: 'PI524-Ecuaciones-no-lineales-metodos-cerrados-Davila-parte-2.pdf',
    mimeType: 'application/pdf',
    fileSize: 1_728_584,
    fileType: 'PDF',
    contents: '1 documento PDF',
    downloadLabel: 'Abrir archivo',
  },
  {
    id: 'qu428-problemas-sistemas-ternarios-parte-1',
    courseCodes: ['QU428'],
    title: 'Problemas de sistemas ternarios — parte 1',
    description: 'Material complementario de Fisicoquímica II.',
    materialType: 'other',
    fileUrl: '/materiales/qu428-problemas-sistemas-ternarios-parte-1.pdf',
    fileName: 'QU428-Problemas-sistemas-ternarios-parte-1.pdf',
    mimeType: 'application/pdf',
    fileSize: 337_869,
    fileType: 'PDF',
    contents: '1 documento PDF',
    downloadLabel: 'Abrir archivo',
  },
  {
    id: 'qu428-problemas-sistemas-ternarios-parte-2',
    courseCodes: ['QU428'],
    title: 'Problemas de sistemas ternarios — parte 2',
    description: 'Material complementario de Fisicoquímica II.',
    materialType: 'other',
    fileUrl: '/materiales/qu428-problemas-sistemas-ternarios-parte-2.pdf',
    fileName: 'QU428-Problemas-sistemas-ternarios-parte-2.pdf',
    mimeType: 'application/pdf',
    fileSize: 175_199,
    fileType: 'PDF',
    contents: '1 documento PDF',
    downloadLabel: 'Abrir archivo',
  },
  {
    id: 'qu428-problemas-sistemas-binarios-y-ternarios',
    courseCodes: ['QU428'],
    title: 'Problemas de sistemas binarios y ternarios',
    description: 'Material complementario de Fisicoquímica II.',
    materialType: 'other',
    fileUrl: '/materiales/qu428-problemas-sistemas-binarios-y-ternarios.docx',
    fileName: 'QU428-Problemas-sistemas-binarios-y-ternarios.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 42_750,
    fileType: 'DOCX',
    contents: '1 documento Word',
    downloadLabel: 'Abrir archivo',
  },
  {
    id: 'qu428-problemas-sistemas-binarios',
    courseCodes: ['QU428'],
    title: 'Problemas de sistemas binarios',
    description: 'Material complementario de Fisicoquímica II.',
    materialType: 'other',
    fileUrl: '/materiales/qu428-problemas-sistemas-binarios.docx',
    fileName: 'QU428-Problemas-sistemas-binarios.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 121_305,
    fileType: 'DOCX',
    contents: '1 documento Word',
    downloadLabel: 'Abrir archivo',
  },
];

export function getBundledMaterialsForCourse(courseCode: string | null | undefined) {
  if (!courseCode) return [];
  return bundledCourseMaterials.filter(material => material.courseCodes.includes(courseCode));
}

export function getBundledMaterialForProfessor(professorId: string, professorName: string) {
  return bundledCourseMaterials.find(material =>
    material.professorIds?.includes(professorId) || material.professorNames?.includes(professorName),
  );
}
