import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRewardProgress } from '@/lib/rewardProgress';
import { hasRewardCampaignFullAccess } from '@/lib/rewardCampaignAccess';
import { REWARD_THRESHOLDS } from '@/lib/rewardThresholds';
import { physicsPC1Bank } from '@/lib/examQuestionBank';
export async function physicsExamAccess() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return 401;
  const admin = createAdminClient();
  const [{ data: profile }, progress, campaign, { data: unlock }] = await Promise.all([
    admin.from('profiles').select('role').eq('id', user.id).single(),
    getRewardProgress(user.id), hasRewardCampaignFullAccess(user.id),
    admin.from('admin_worksheet_course_unlocks').select('course_id').eq('user_id', user.id).eq('course_id', physicsPC1Bank.courseId).maybeSingle(),
  ]);
  return profile?.role === 'owner' || campaign || progress.total >= REWARD_THRESHOLDS.allAdminCourses || unlock ? 200 : 403;
}
