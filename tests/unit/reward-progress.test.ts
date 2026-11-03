import { describe, expect, it, vi } from 'vitest';
import { getRewardProgress } from '@/lib/rewardProgress';

const counts = vi.hoisted(() => ({ reviews: 0, worksheet_donations: 0 }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: keyof typeof counts) => ({
      select: () => ({ eq: () => ({ eq: () => Promise.resolve({ count: counts[table], error: null }) }) }),
    }),
  }),
}));

describe('contribuciones para recompensas', () => {
  it('no suma planchas antes de tener dos reseñas aprobadas', async () => {
    counts.reviews = 1;
    counts.worksheet_donations = 8;
    expect(await getRewardProgress('user')).toMatchObject({ approvedReviews: 1, donatedWorksheets: 0, total: 1 });
  });

  it.each([[2, 1, 3], [2, 6, 8], [2, 8, 10], [3, 5, 8]])('suma %i reseñas y %i planchas para alcanzar %i contribuciones', async (reviews, donations, total) => {
    counts.reviews = reviews;
    counts.worksheet_donations = donations;
    expect(await getRewardProgress('user')).toMatchObject({ approvedReviews: reviews, donatedWorksheets: donations, total });
  });
});
