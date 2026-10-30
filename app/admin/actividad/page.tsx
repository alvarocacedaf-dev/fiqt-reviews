import { requireOwner } from '@/lib/admin';
import { OwnerActivityDashboard } from '@/components/OwnerActivityDashboard';
export const dynamic = 'force-dynamic';
export default async function ActivityPage() {
  await requireOwner();
  return <OwnerActivityDashboard />;
}
