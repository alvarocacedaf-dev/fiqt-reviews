import type { SVGProps } from 'react';

export type IconName =
  | 'academic'
  | 'arrow-left'
  | 'arrow-right'
  | 'attachment'
  | 'check'
  | 'chevron-down'
  | 'close'
  | 'file'
  | 'folder'
  | 'folder-open'
  | 'lock'
  | 'logout'
  | 'unlock'
  | 'verification'
  | 'verified';

const paths: Record<IconName, React.ReactNode> = {
  academic: <><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c3.5 2.5 8.5 2.5 12 0v-5" /><path d="M22 10v5" /></>,
  'arrow-left': <><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></>,
  'arrow-right': <><path d="m9 18 6-6-6-6" /><path d="M5 12h10" /></>,
  attachment: <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 0 1-2.8-2.8l8.9-8.9" />,
  check: <path d="m5 12 4 4L19 6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>,
  folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  'folder-open': <><path d="M3 8V6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v2" /><path d="M3 10h19l-3 10H5Z" /></>,
  lock: <><rect width="16" height="11" x="4" y="11" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  logout: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></>,
  unlock: <><rect width="16" height="11" x="4" y="11" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></>,
  verification: <><path d="M12 3 19 6v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-5" /></>,
  verified: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /><path d="m9 10 2 2 4-4" /></>,
};

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName;
  title?: string;
};

export function Icon({ className = 'h-5 w-5', name, title, ...props }: IconProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={`shrink-0 ${className}`}
      fill="none"
      role={title ? 'img' : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      {title && <title>{title}</title>}
      {paths[name]}
    </svg>
  );
}
