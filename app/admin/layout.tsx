import { requireAdmin } from '@/lib/admin';
import { AdminShell } from '@/components/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return <AdminShell>{children}</AdminShell>;
}
