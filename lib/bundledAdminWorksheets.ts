type CourseReference = {
  id: string;
  code: string | null;
};

const bundledAdminWorksheets = [
  {
    id: 'bundled:pi140-practica-calificada-1-y-2-2024-3',
    courseCode: 'PI140',
    title: 'Práctica calificada 1 y 2 de Fenómenos de Transporte 2024-3 — Emma A. Alvarez Núñez',
    exam_type: 'practice' as const,
    academic_term: '2024-3',
    file_name: 'Práctica calificada 1 y 2 de Fenómenos de Transporte 2024-3 - Emma A. Alvarez Núñez.pdf',
    mime_type: 'application/pdf',
    file_size: 261_754,
    created_at: '2026-10-05T00:00:00-05:00',
    signed_url: '/planchas/pi140-practica-calificada-1-y-2-2024-3-emma-alvarez-nunez.pdf',
    storage_provider: 'public' as const,
  },
  {
    id: 'bundled:pi111-practica-calificada-1-banco-ejercicios-profesor',
    courseCode: 'PI111',
    title: 'Práctica calificada 1 de Balance de Materia y Energía 0000 — Banco de ejercicios del profesor de la cruz (de acá viene)',
    exam_type: 'practice' as const,
    academic_term: '0000',
    file_name: 'Práctica calificada 1 de Balance de Materia y Energía 0000 - Banco de ejercicios del profesor de la cruz (de acá viene).pdf',
    mime_type: 'application/pdf',
    file_size: 2_964_766,
    created_at: '2026-10-12T00:00:00-05:00',
    signed_url: '/planchas/pi111-practica-calificada-1-banco-ejercicios-profesor.pdf',
    storage_provider: 'public' as const,
  },
  {
    id: 'bundled:pi111-practica-calificada-2-banco-ejercicios-profesor',
    courseCode: 'PI111',
    title: 'Práctica calificada 2 de Balance de Materia y Energía 0000 — Banco de ejercicios del profesor de la cruz (de acá viene)',
    exam_type: 'practice' as const,
    academic_term: '0000',
    file_name: 'Práctica calificada 2 de Balance de Materia y Energía 0000 - Banco de ejercicios del profesor de la cruz (de acá viene).pdf',
    mime_type: 'application/pdf',
    file_size: 6_239_868,
    created_at: '2026-10-12T00:00:00-05:00',
    signed_url: '/planchas/pi111-practica-calificada-2-banco-ejercicios-profesor.pdf',
    storage_provider: 'public' as const,
  },
];

export function resolveBundledAdminWorksheets(courses: CourseReference[]) {
  return bundledAdminWorksheets.flatMap(worksheet => {
    const course = courses.find(item => item.code === worksheet.courseCode);
    if (!course) return [];
    const { courseCode: _courseCode, ...file } = worksheet;
    return [{ ...file, course_id: course.id }];
  });
}
