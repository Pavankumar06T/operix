import { Clock, AlertTriangle, Heart, Trophy, MessageSquare } from 'lucide-react';
import { useAlerts, useMarkAllRead } from '../../hooks/useAlerts';
import StatusBadge from '../shared/StatusBadge';
import { formatRelativeTime } from '../../lib/utils';
import type { AlertType, Severity, StatusVariant } from '../../types';

const ALERT_ICONS: Record<AlertType, { icon: typeof Clock; bg: string; text: string }> = {
  delay_risk: { icon: Clock, bg: 'bg-amber-950', text: 'text-amber-400' },
  overdue: { icon: AlertTriangle, bg: 'bg-red-950', text: 'text-red-400' },
  burnout: { icon: Heart, bg: 'bg-purple-950', text: 'text-purple-400' },
  milestone: { icon: Trophy, bg: 'bg-green-950', text: 'text-green-400' },
  client_feedback: { icon: MessageSquare, bg: 'bg-blue-950', text: 'text-blue-400' },
};

const ALERT_BORDER_COLORS: Record<AlertType, string> = {
  delay_risk: 'border-amber-400',
  overdue: 'border-red-400',
  burnout: 'border-purple-400',
  milestone: 'border-green-400',
  client_feedback: 'border-blue-400',
};

export default function RecentAlerts() {
  const { data: alerts } = useAlerts();
  const markAllRead = useMarkAllRead();
  const alertList = alerts || [];

  return (
    <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-[#F8F8FF]">Recent Alerts</h3>
        <button
          onClick={() => markAllRead.mutate()}
          className="text-xs text-[#9898B0] hover:text-[#F8F8FF] transition-colors"
        >
          Mark all read
        </button>
      </div>

      <div className="flex flex-col">
        {alertList.map((alert, index) => {
          const config = ALERT_ICONS[alert.type];
          const Icon = config.icon;
          const borderColor = ALERT_BORDER_COLORS[alert.type];

          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 py-4 ${index < alertList.length - 1 ? 'border-b border-[#2A2A3A]' : ''} ${!alert.is_seen ? `border-l-2 ${borderColor} pl-3 -ml-px` : ''}`}
            >
              <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${config.bg}`}>
                <Icon size={15} className={config.text} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F8F8FF]">{alert.title}</p>
                <p className="text-xs text-[#9898B0] line-clamp-2 mt-0.5">{alert.message}</p>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <StatusBadge label={alert.severity} variant={alert.severity as StatusVariant} />
                <span className="text-[10px] text-[#5A5A72]">{formatRelativeTime(alert.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
