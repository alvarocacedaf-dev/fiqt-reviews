import scheduleData from '@/data/schedule-2026-2.json';
import { ScheduleBuilderPage } from '@/components/schedule/ScheduleBuilderPage';
import type { CourseSection } from '@/lib/schedule/types';

export const metadata = {
  title: 'Armar mi horario | FIQT Reviews',
  description: 'Genera y compara horarios académicos con la carga oficial FIQT 2026-2.',
};

export default function BuildSchedulePage() {
  return <ScheduleBuilderPage sections={scheduleData.sections as CourseSection[]} />;
}
