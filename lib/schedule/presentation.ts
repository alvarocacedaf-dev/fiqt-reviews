const COLORS = ['#fcd34d', '#93c5fd', '#c4b5fd', '#6ee7b7', '#fda4af', '#fdba74', '#67e8f9', '#f0abfc', '#bef264', '#cbd5e1', '#a5b4fc', '#f9a8d4'];

// Assign by the sorted course set, not by a hash that can collide.
// All alternatives contain the same courses, so their colors stay consistent.
export function courseColors(blocks: { courseId: string }[]): Record<string, string> {
  const ids = [...new Set(blocks.map(block => block.courseId))].sort();
  return Object.fromEntries(ids.map((id, index) => [
    id, index < COLORS.length ? COLORS[index] : `hsl(${((index - COLORS.length) * 137.508 + 17) % 360} 65% 78%)`,
  ]));
}

export function scheduleTitle(position?: number | null) {
  return position && Number.isInteger(position) && position > 0 ? `Horario ${position}` : 'Mi horario guardado';
}
