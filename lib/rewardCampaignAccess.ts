import { createAdminClient } from '@/lib/supabase/admin';

export const REWARD_CAMPAIGN_CODE = 'parciales-2026-10';

export async function hasRewardCampaignFullAccess(userId: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from('reward_campaign_full_access')
    .select('user_id')
    .eq('campaign_code', REWARD_CAMPAIGN_CODE)
    .eq('user_id', userId)
    .maybeSingle();

  return !error && Boolean(data);
}
