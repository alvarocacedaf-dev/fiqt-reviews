import { createAdminClient } from '@/lib/supabase/admin';
import { REWARD_THRESHOLDS } from '@/lib/rewardThresholds';

export async function getRewardProgress(userId: string) {
  const db = createAdminClient();
  const [{ count: reviewCount, error: reviewError }, { count: donationCount, error: donationError }] = await Promise.all([
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'approved'),
    db.from('worksheet_donations').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'approved'),
  ]);
  const approvedReviews = reviewCount ?? 0;
  const donatedWorksheets = approvedReviews >= REWARD_THRESHOLDS.worksheetsCommunity ? donationCount ?? 0 : 0;
  return { approvedReviews, donatedWorksheets, total: approvedReviews + donatedWorksheets, error: reviewError || donationError };
}
