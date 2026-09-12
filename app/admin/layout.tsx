import { requireAdmin } from '@/lib/admin';
import { AdminShell } from '@/components/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isOwner } = await requireAdmin();

  return <AdminShell isOwner={isOwner}>{children}</AdminShell>;
}
