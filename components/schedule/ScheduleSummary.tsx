import type { GeneratedSchedule } from '@/lib/schedule/types';

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

export function ScheduleSummary({ schedule }: { schedule: GeneratedSchedule }) {
  const metrics = [
    { label: 'Cruces', value: String(schedule.conflictCount), warning: schedule.conflictCount > 0 },
    { label: 'Minutos cruzados', value: formatMinutes(schedule.conflictMinutes), warning: schedule.conflictMinutes > 0 },
    { label: 'Huecos', value: formatMinutes(schedule.gapMinutes), warning: false },
    { label: 'Días en la UNI', value: String(schedule.attendanceDays), warning: false },
    { label: 'Secciones fijas', value: String(schedule.lockedSectionIds.length), warning: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
      {metrics.map((metric) => (
        <div className={`rounded-xl border px-3 py-2.5 ${metric.warning ? 'border-red-200 bg-red-50' : 'border-white/10 bg-white/10'}`} key={metric.label}>
          <span className={`block text-[0.68rem] font-bold uppercase tracking-wide ${metric.warning ? 'text-red-600' : 'text-blue-100'}`}>{metric.label}</span>
          <strong className={`mt-0.5 block text-lg ${metric.warning ? 'text-red-700' : 'text-white'}`}>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}
