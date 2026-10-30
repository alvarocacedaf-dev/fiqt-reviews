import { describe, expect, it } from 'vitest';
import { REWARD_THRESHOLDS } from '@/lib/rewardThresholds';

describe('ruta de recompensas', () => {
  it('habilita la comunidad antes que el primer curso administrativo', () => {
    expect(REWARD_THRESHOLDS).toEqual({
      reviews: 2,
      worksheetsCommunity: 3,
      oneAdminCourse: 6,
      twoAdminCourses: 8,
      allAdminCourses: 10,
    });
    expect(REWARD_THRESHOLDS.worksheetsCommunity).toBeLessThan(REWARD_THRESHOLDS.oneAdminCourse);
  });
});
