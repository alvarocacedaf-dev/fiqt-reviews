import type { GeneratedSchedule } from '@/lib/schedule/types';

export function ConflictWarning({ schedule }: { schedule: GeneratedSchedule }) {
  if (schedule.conflicts.length === 0) {
    return <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">Sin cruces. Esta combinación es compatible.</p>;
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-black">Este horario tiene {schedule.conflictCount} {schedule.conflictCount === 1 ? 'cruce' : 'cruces'}:</p>
      <ul className="mt-1 space-y-1">
        {schedule.conflicts.map((conflict) => (
          <li key={`${conflict.day}-${conflict.startTime}-${conflict.blocks.map((block) => block.id).join('-')}`}>
            {conflict.day} {conflict.startTime}–{conflict.endTime} — {conflict.blocks[0].courseName} se cruza con {conflict.blocks[1].courseName}.
          </li>
        ))}
      </ul>
    </div>
  );
}
