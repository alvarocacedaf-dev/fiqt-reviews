import { ScheduleBlock } from './ScheduleBlock';
import { SCHEDULE_DAYS, type GeneratedSchedule } from '@/lib/schedule/types';

const GRID_START = 8 * 60;
const GRID_END = 22 * 60;
const PIXELS_PER_HOUR = 66;
const GRID_HEIGHT = ((GRID_END - GRID_START) / 60) * PIXELS_PER_HOUR;

export function ScheduleGrid({ schedule }: { schedule: GeneratedSchedule }) {
  const hours = Array.from({ length: (GRID_END - GRID_START) / 60 }, (_, index) => index + 8);

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#071a3d] shadow-inner">
      <div className="min-w-[1030px] p-3">
        <div className="grid grid-cols-[88px_repeat(6,minmax(0,1fr))]">
          <div className="border-b border-r border-white/10" />
          {SCHEDULE_DAYS.map((day) => <div className="border-b border-r border-white/10 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-white last:border-r-0" key={day}>{day}</div>)}

          <div className="relative border-r border-white/10" style={{ height: GRID_HEIGHT }}>
            {hours.map((hour) => (
              <div className="absolute left-0 right-0 border-t border-white/10 pr-3 pt-1 text-right text-[0.68rem] font-semibold text-blue-200" key={hour} style={{ top: (hour - 8) * PIXELS_PER_HOUR }}>
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {SCHEDULE_DAYS.map((day) => (
            <div className="relative border-r border-white/10 last:border-r-0" key={day} style={{ height: GRID_HEIGHT }}>
              {hours.map((hour) => <div className="absolute left-0 right-0 border-t border-white/10" key={hour} style={{ top: (hour - 8) * PIXELS_PER_HOUR }} />)}
              {schedule.blocks.filter((block) => block.day === day).map((block) => (
                <ScheduleBlock
                  block={block}
                  conflicts={schedule.conflicts}
                  gridStart={GRID_START}
                  isLocked={schedule.sections.some((section) => schedule.lockedSectionIds.includes(section.id) && section.blocks.some((item) => item.id === block.id))}
                  key={block.id}
                  pixelsPerHour={PIXELS_PER_HOUR}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
