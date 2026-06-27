import type { Course, Cycle, Professor } from '@/lib/types';
import { courseProfessorCatalog, professorNames } from '@/lib/professorCatalog';

export const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const demoCycles: Cycle[] = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  number: index + 1,
  name: `${['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo', 'Octavo', 'Noveno', 'Décimo'][index]} ciclo`
}));

export const demoCourses: Course[] = [
  { id: 'demo-bdi01', cycle_id: 1, code: 'BDI01', name: 'Dibujo en Ingeniería I', credits: 2 },
  { id: 'demo-bfi01', cycle_id: 1, code: 'BFI01', name: 'Física I', credits: 5 },
  { id: 'demo-bma01', cycle_id: 1, code: 'BMA01', name: 'Cálculo Diferencial', credits: 5 },
  { id: 'demo-bma03', cycle_id: 1, code: 'BMA03', name: 'Álgebra Lineal', credits: 4 },
  { id: 'demo-bqu01', cycle_id: 1, code: 'BQU01', name: 'Química I', credits: 5 },
  { id: 'demo-brc01', cycle_id: 1, code: 'BRC01', name: 'Redacción y Comunicación', credits: 2 },
  { id: 'demo-bdi02', cycle_id: 2, code: 'BDI02', name: 'Dibujo en Ingeniería II', credits: 3 },
  { id: 'demo-bfi02', cycle_id: 2, code: 'BFI02', name: 'Física II', credits: 5 },
  { id: 'demo-bma02', cycle_id: 2, code: 'BMA02', name: 'Cálculo Integral', credits: 5 },
  { id: 'demo-bma04', cycle_id: 2, code: 'BMA04', name: 'Matemáticas Básicas', credits: 4 },
  { id: 'demo-bqu02', cycle_id: 2, code: 'BQU02', name: 'Química II', credits: 5 },
  { id: 'demo-bef01', cycle_id: 3, code: 'BEF01', name: 'Ética y Filosofía Política', credits: 2 },
  { id: 'demo-beg01', cycle_id: 3, code: 'BEG01', name: 'Economía General', credits: 3 },
  { id: 'demo-bfi03', cycle_id: 3, code: 'BFI03', name: 'Física III', credits: 5 },
  { id: 'demo-bic01', cycle_id: 3, code: 'BIC01', name: 'Introducción a la Computación', credits: 2 },
  { id: 'demo-bma05', cycle_id: 3, code: 'BMA05', name: 'Matemática Superior I', credits: 4 },
  { id: 'demo-qu216', cycle_id: 3, code: 'QU216', name: 'Química Inorgánica', credits: 5 },
  { id: 'demo-bfi04', cycle_id: 4, code: 'BFI04', name: 'Tópicos Especiales en Física', credits: 3 },
  { id: 'demo-bma06', cycle_id: 4, code: 'BMA06', name: 'Matemática Superior II', credits: 4 },
  { id: 'demo-ep308', cycle_id: 4, code: 'EP308', name: 'Economía y Organización de la Empresa', credits: 3 },
  { id: 'demo-ma613', cycle_id: 4, code: 'MA613', name: 'Estadística Aplicada', credits: 4 },
  { id: 'demo-ma713', cycle_id: 4, code: 'MA713', name: 'Programación Digital', credits: 3 },
  { id: 'demo-qu427', cycle_id: 4, code: 'QU427', name: 'Fisicoquímica I', credits: 5 },
  { id: 'demo-pi111', cycle_id: 5, code: 'PI111', name: 'Balance de Materia y Energía', credits: 3 },
  { id: 'demo-pi524', cycle_id: 5, code: 'PI524', name: 'Métodos Numéricos para Ingeniería Química', credits: 4 },
  { id: 'demo-qu328', cycle_id: 5, code: 'QU328', name: 'Química Orgánica I', credits: 5 },
  { id: 'demo-qu428', cycle_id: 5, code: 'QU428', name: 'Fisicoquímica II', credits: 5 },
  { id: 'demo-qu518', cycle_id: 5, code: 'QU518', name: 'Análisis Químico', credits: 4 },
  { id: 'demo-bie01', cycle_id: 6, code: 'BIE01', name: 'Idioma Extranjero o Lengua Nativa en el Nivel Intermedio', credits: 2 },
  { id: 'demo-brn01', cycle_id: 6, code: 'BRN01', name: 'Realidad Nacional, Constitución y Derechos Humanos', credits: 3 },
  { id: 'demo-ec618', cycle_id: 6, code: 'EC618', name: 'Mecánica y Resistencia de los Materiales', credits: 3 },
  { id: 'demo-ee103', cycle_id: 6, code: 'EE103', name: 'Circuitos e Instalaciones Eléctricas Industriales', credits: 3 },
  { id: 'demo-pi140', cycle_id: 6, code: 'PI140', name: 'Fenómenos de Transporte', credits: 3 },
  { id: 'demo-pi216', cycle_id: 6, code: 'PI216', name: 'Termodinámica para Ingeniería Química I', credits: 3 },
  { id: 'demo-qu338', cycle_id: 6, code: 'QU338', name: 'Química Orgánica II', credits: 5 },
  { id: 'demo-pa113', cycle_id: 7, code: 'PA113', name: 'Ingeniería de Métodos I', credits: 4 },
  { id: 'demo-pa714', cycle_id: 7, code: 'PA714', name: 'Investigación de Operaciones I', credits: 3 },
  { id: 'demo-pi142', cycle_id: 7, code: 'PI142', name: 'Transferencia de Cantidad de Movimiento', credits: 3 },
  { id: 'demo-pi217', cycle_id: 7, code: 'PI217', name: 'Termodinámica para Ingeniería Química II', credits: 3 },
  { id: 'demo-pi318', cycle_id: 7, code: 'PI318', name: 'Industria de los Procesos Químicos', credits: 5 },
  { id: 'demo-pi514', cycle_id: 7, code: 'PI514', name: 'Ciencias de los Materiales', credits: 2 },
  { id: 'demo-pi520', cycle_id: 7, code: 'PI520', name: 'Recursos Químicos en la Biodiversidad', credits: 3 },
  { id: 'demo-bae01', cycle_id: 8, code: 'BAE01', name: 'Actividades Extracurriculares', credits: 1 },
  { id: 'demo-ep818', cycle_id: 8, code: 'EP818', name: 'Costos y Presupuestos', credits: 3 },
  { id: 'demo-pi143', cycle_id: 8, code: 'PI143', name: 'Transferencia de Calor', credits: 3 },
  { id: 'demo-pi144', cycle_id: 8, code: 'PI144', name: 'Transferencia de Masa', credits: 3 },
  { id: 'demo-pi146', cycle_id: 8, code: 'PI146', name: 'Operaciones en Ingeniería Química I', credits: 3 },
  { id: 'demo-pi225', cycle_id: 8, code: 'PI225', name: 'Cinética Química y Diseño de Reactores I', credits: 3 },
  { id: 'demo-pi521', cycle_id: 8, code: 'PI521', name: 'Introducción a la Bioingeniería', credits: 3 },
  { id: 'demo-pi135', cycle_id: 9, code: 'PI135', name: 'Laboratorio de Operaciones Unitarias I', credits: 2 },
  { id: 'demo-pi365', cycle_id: 9, code: 'PI365', name: 'Polímeros I', credits: 3 },
  { id: 'demo-pi415', cycle_id: 9, code: 'PI415', name: 'Instrumentos de Control', credits: 3 },
  { id: 'demo-pi510', cycle_id: 9, code: 'PI510', name: 'Economía de Procesos', credits: 3 },
  { id: 'demo-pi555', cycle_id: 9, code: 'PI555', name: 'Seguridad en Procesos Químicos Industriales', credits: 3 },
  { id: 'demo-pi911', cycle_id: 9, code: 'PI911', name: 'Gestión Tecnológica y Empresarial', credits: 4 },
  { id: 'demo-qt714', cycle_id: 9, code: 'QT714', name: 'Taller de Proyecto de Investigación', credits: 2 },
  { id: 'demo-pa136', cycle_id: 10, code: 'PA136', name: 'Planeamiento y Control de la Producción', credits: 4 },
  { id: 'demo-pi136', cycle_id: 10, code: 'PI136', name: 'Laboratorio de Operaciones Unitarias II', credits: 2 },
  { id: 'demo-pi426', cycle_id: 10, code: 'PI426', name: 'Simulación y Control de Procesos', credits: 4 },
  { id: 'demo-pi525', cycle_id: 10, code: 'PI525', name: 'Diseño de Plantas', credits: 4 },
  { id: 'demo-qt715', cycle_id: 10, code: 'QT715', name: 'Taller de Investigación', credits: 2 }
];

const professorIdByName = new Map(professorNames.map((name, index) => [name, `demo-prof-${index + 1}`]));
const courseIdByCode = new Map(demoCourses.map(course => [course.code, course.id]));

export const demoProfessors: Professor[] = professorNames.map(name => ({
  id: professorIdByName.get(name)!,
  full_name: name,
  photo_url: null,
  source_name: 'DIRCE UNI',
  source_url: null,
  is_active: true
}));

export const demoCourseProfessors = courseProfessorCatalog.flatMap(entry => {
  const courseId = courseIdByCode.get(entry.courseCode);
  if (!courseId) return [];
  return entry.professors.map(professorName => ({
    course_id: courseId,
    professor_id: professorIdByName.get(professorName)!
  }));
});
