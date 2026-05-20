import type { StatusVariant } from '../../types';

interface StatusBadgeProps {
  label: string;
  variant: StatusVariant;
}

const variantStyles: Record<StatusVariant, string> = {
  not_started: 'bg-zinc-900 text-zinc-400',
  in_progress: 'bg-blue-950 text-blue-400',
  completed: 'bg-green-950 text-green-400',
  at_risk: 'bg-amber-950 text-amber-400',
  overdue: 'bg-red-950 text-red-400',
  delayed: 'bg-red-950 text-red-400',
  critical: 'bg-red-950 text-red-400',
  high: 'bg-red-950 text-red-400',
  medium: 'bg-amber-950 text-amber-400',
  low: 'bg-zinc-900 text-zinc-400',
};

export default function StatusBadge({ label, variant }: StatusBadgeProps) {
  const style = variantStyles[variant] || variantStyles.not_started;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${style}`}>
      {label}
    </span>
  );
}
