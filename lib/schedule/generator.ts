import { SCHEDULE_DAYS, type ClassBlock, type CourseSection, type Day, type GeneratedSchedule, type ScheduleConflict, type ScheduleGenerationResult } from './types';

const DEFAULT_BEAM_WIDTH = 600;

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function detectConflicts(blocks: ClassBlock[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  for (let leftIndex = 0; leftIndex < blocks.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < blocks.length; rightIndex += 1) {
      const left = blocks[leftIndex];
      const right = blocks[rightIndex];
      if (left.courseId === right.courseId || left.day !== right.day) continue;

      const overlapStart = Math.max(timeToMinutes(left.startTime), timeToMinutes(right.startTime));
      const overlapEnd = Math.min(timeToMinutes(left.endTime), timeToMinutes(right.endTime));
      if (overlapStart >= overlapEnd) continue;

      conflicts.push({
        day: left.day,
        startTime: minutesToTime(overlapStart),
        endTime: minutesToTime(overlapEnd),
        minutes: overlapEnd - overlapStart,
        blocks: [left, right],
      });
    }
  }

  return conflicts;
}

export function calculateConflictMinutes(conflicts: ScheduleConflict[]) {
  return conflicts.reduce((total, conflict) => total + conflict.minutes, 0);
}

export function calculateGaps(blocks: ClassBlock[]) {
  return SCHEDULE_DAYS.reduce((total, day) => {
    const dayBlocks = blocks
      .filter((block) => block.day === day)
      .sort((left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime));
    let dayTotal = 0;
    let latestEnd = 0;

    for (const block of dayBlocks) {
      const start = timeToMinutes(block.startTime);
      const end = timeToMinutes(block.endTime);
      if (latestEnd > 0 && start > latestEnd) dayTotal += start - latestEnd;
      latestEnd = Math.max(latestEnd, end);
    }
    return total + dayTotal;
  }, 0);
}

export function calculateAttendanceDays(blocks: ClassBlock[]) {
  return new Set(blocks.map((block) => block.day)).size;
}

function calculateDistributionMinutes(blocks: ClassBlock[]) {
  const dailyLoads = SCHEDULE_DAYS.map((day) => blocks
    .filter((block) => block.day === day)
    .reduce((total, block) => total + timeToMinutes(block.endTime) - timeToMinutes(block.startTime), 0))
    .filter(Boolean);
  if (dailyLoads.length === 0) return 0;
  return Math.max(...dailyLoads) - Math.min(...dailyLoads);
}

export function scoreSchedule(schedule: Pick<GeneratedSchedule, 'conflictCount' | 'conflictMinutes' | 'gapMinutes' | 'attendanceDays' | 'distributionMinutes'>) {
  return schedule.conflictCount * 10_000_000
    + schedule.conflictMinutes * 10_000
    + schedule.gapMinutes * 10
    + schedule.attendanceDays
    + schedule.distributionMinutes / 10_000;
}

function compareSchedules(left: GeneratedSchedule, right: GeneratedSchedule) {
  return left.conflictCount - right.conflictCount
    || left.conflictMinutes - right.conflictMinutes
    || left.gapMinutes - right.gapMinutes
    || left.attendanceDays - right.attendanceDays
    || left.distributionMinutes - right.distributionMinutes
    || left.id.localeCompare(right.id);
}

function buildSchedule(sections: CourseSection[]): GeneratedSchedule {
  const blocks = sections.flatMap((section) => section.blocks);
  const conflicts = detectConflicts(blocks);
  const result = {
    id: sections.map((section) => section.id).join('__'),
    sections,
    blocks,
    conflicts,
    conflictCount: conflicts.length,
    conflictMinutes: calculateConflictMinutes(conflicts),
    gapMinutes: calculateGaps(blocks),
    attendanceDays: calculateAttendanceDays(blocks),
    distributionMinutes: calculateDistributionMinutes(blocks),
    score: 0,
  };
  result.score = scoreSchedule(result);
  return result;
}

export function sortSchedules(schedules: GeneratedSchedule[]) {
  return [...schedules].sort(compareSchedules);
}

export function getTopSchedules(schedules: GeneratedSchedule[], limit = 3) {
  return sortSchedules(schedules).slice(0, limit);
}

export function generateScheduleCombinations(sectionGroups: CourseSection[][], beamWidth = DEFAULT_BEAM_WIDTH): ScheduleGenerationResult {
  if (sectionGroups.length === 0 || sectionGroups.some((group) => group.length === 0)) {
    return { schedules: [], exploredCombinations: 0, truncated: false };
  }

  let partials: CourseSection[][] = [[]];
  let exploredCombinations = 0;
  let truncated = false;

  for (const group of [...sectionGroups].sort((left, right) => left.length - right.length)) {
    const next: CourseSection[][] = [];
    for (const partial of partials) {
      for (const section of group) {
        next.push([...partial, section]);
        exploredCombinations += 1;
      }
    }

    if (next.length > beamWidth) {
      truncated = true;
      partials = next
        .map((sections) => ({ sections, schedule: buildSchedule(sections) }))
        .sort((left, right) => compareSchedules(left.schedule, right.schedule))
        .slice(0, beamWidth)
        .map((candidate) => candidate.sections);
    } else {
      partials = next;
    }
  }

  return {
    schedules: getTopSchedules(partials.map(buildSchedule)),
    exploredCombinations,
    truncated,
  };
}

export function blocksConflict(block: ClassBlock, conflicts: ScheduleConflict[]) {
  return conflicts.some((conflict) => conflict.blocks.some((candidate) => candidate.id === block.id));
}

export function formatDay(day: Day) {
  return day;
}
