import { beforeEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), auth: vi.fn(), admin: vi.fn() }));
vi.mock('@/lib/demo', () => ({ isSupabaseConfigured: true }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ rpc: mocks.rpc, auth: { getUser: mocks.auth } }) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }));
import { hasOpenContentAccess } from '@/lib/openContentAccess';
import { physicsExamAccess } from '@/lib/physicsExamAccess';
import { hasReviewAccess } from '@/lib/data';
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ data: { user: { id:'student' } } }); mocks.rpc.mockResolvedValue({ data:true,error:null }); });
it('requires an explicit true result from the database', async () => {
  expect(await hasOpenContentAccess()).toBe(true);
  mocks.rpc.mockResolvedValue({ data:null,error:{message:'migration missing'} });
  expect(await hasOpenContentAccess()).toBe(false);
});
it('opens reviews and generators without querying or editing earned progress', async () => {
  expect(await physicsExamAccess()).toBe(200);
  expect(await hasReviewAccess()).toBe(true);
  expect(mocks.admin).not.toHaveBeenCalled();
});
it('never opens reviews or generators for anonymous visitors', async () => {
  mocks.auth.mockResolvedValue({ data:{user:null} });
  expect(await physicsExamAccess()).toBe(401);
  expect(await hasReviewAccess()).toBe(false);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
