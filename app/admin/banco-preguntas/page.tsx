import { requireOwner } from '@/lib/admin';
import { QuestionBankManager } from '@/components/QuestionBankManager';
export const dynamic = 'force-dynamic';
export default async function QuestionBankPage() {
  await requireOwner();
  return <QuestionBankManager />;
}
