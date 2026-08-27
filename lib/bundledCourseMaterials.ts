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
  fileType: 'PDF' | 'ZIP';
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
