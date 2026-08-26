import { Icon, type IconName } from '@/components/ui/Icon';

export function AdminEmptyState({
  description,
  icon = 'check',
  title,
}: {
  description: string;
  icon?: IconName;
  title: string;
}) {
  return (
    <div className="panel flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-royal">
        <Icon className="h-6 w-6" name={icon} />
      </span>
      <p className="mt-4 text-xl font-black text-ink">{title}</p>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
