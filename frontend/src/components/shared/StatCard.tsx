import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  trend?: string;
  trendDirection?: 'up' | 'down';
  trendIsPositive?: boolean;
  bottomContent?: ReactNode;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  trend,
  trendDirection = 'up',
  trendIsPositive = true,
  bottomContent,
}: StatCardProps) {
  const TrendIcon = trendDirection === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trendIsPositive ? '#22C55E' : '#EF4444';

  return (
    <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <span className="text-sm text-[#9898B0]">{title}</span>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${iconColor}26` }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
      </div>

      <div className="text-3xl font-bold font-mono" style={{ color: iconColor === '#22C55E' ? iconColor : '#F8F8FF' }}>
        {value}
      </div>

      {bottomContent && <div>{bottomContent}</div>}

      {trend && (
        <div className="flex items-center gap-1.5">
          <TrendIcon size={14} style={{ color: trendColor }} />
          <span className="text-xs" style={{ color: trendColor }}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}
