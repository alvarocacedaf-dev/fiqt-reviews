export const SCHEDULE_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

export type Day = (typeof SCHEDULE_DAYS)[number];
export type ClassType = 'Teoría' | 'Práctica' | 'Laboratorio' | 'Práctica / Laboratorio';

export type ClassBlock = {
  id: string;
  courseId: string;
  courseName: string;
  section: string;
  professorName?: string;
  day: Day;
  startTime: string;
  endTime: string;
  type: ClassType;
};

export type CourseSection = {
  id: string;
  courseId: string;
  courseName: string;
  section: string;
  department: string;
  professors: string[];
  blocks: ClassBlock[];
};

export type ScheduleConflict = {
  day: Day;
  startTime: string;
  endTime: string;
  minutes: number;
  blocks: [ClassBlock, ClassBlock];
};

export type GeneratedSchedule = {
  id: string;
  sections: CourseSection[];
  blocks: ClassBlock[];
  conflicts: ScheduleConflict[];
  conflictCount: number;
  conflictMinutes: number;
  gapMinutes: number;
  attendanceDays: number;
  distributionMinutes: number;
  score: number;
};

export type ScheduleGenerationResult = {
  schedules: GeneratedSchedule[];
  exploredCombinations: number;
  truncated: boolean;
};
