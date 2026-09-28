export const courseLaboratoryGuides: Record<string, string | null> = {
  BQU01: null,
  BQU02: null,
  QU216: null,
  QU427: null,
  QU518: null,
  QU428: null,
  QU328: null,
  QU338: null,
};

export function laboratoryGuideForCourse(courseCode?: string | null) {
  if (!courseCode || !(courseCode in courseLaboratoryGuides)) return undefined;
  return courseLaboratoryGuides[courseCode];
}
