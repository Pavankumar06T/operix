import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useRiskTasks } from '../../hooks/useDashboard';
import StatusBadge from '../shared/StatusBadge';
import { getRiskColor, getInitials, getAvatarColor, getDeadlineColor } from '../../lib/utils';
import type { Task, StatusVariant } from '../../types';

function RiskBar({ score }: { score: number }) {
  const [width, setWidth] = useState(0);
  const color = getRiskColor(score);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 150);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex flex-col gap-1.5 w-16">
      <span className="text-sm font-bold font-mono" style={{ color }}>
        {score}
      </span>
      <div className="w-full h-1.5 rounded-full bg-[#2A2A3A]">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function TaskRiskBoard() {
  const { data: tasks } = useRiskTasks();
  const riskTasks = (tasks || []).filter((t) => t.risk_score >= 50).sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 flex-[3]">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#F8F8FF]">Task Risk Board</h3>
        <p className="text-xs text-[#9898B0] mt-0.5">Tasks requiring immediate attention</p>
      </div>

      {riskTasks.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle size={40} className="text-[#22C55E] mx-auto mb-3" />
          <p className="text-[#F8F8FF] font-medium">No tasks at risk right now</p>
          <p className="text-[#9898B0] text-sm mt-1">Your team is on track 🎉</p>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="flex items-center bg-[#1C1C28] rounded-lg px-3 py-3 mb-1">
            <span className="flex-[2] text-xs text-[#9898B0] font-medium uppercase tracking-[0.05em]">Task</span>
            <span className="flex-[1.5] text-xs text-[#9898B0] font-medium uppercase tracking-[0.05em]">Employee</span>
            <span className="flex-1 text-xs text-[#9898B0] font-medium uppercase tracking-[0.05em]">Project</span>
            <span className="flex-1 text-xs text-[#9898B0] font-medium uppercase tracking-[0.05em]">Deadline</span>
            <span className="w-16 text-xs text-[#9898B0] font-medium uppercase tracking-[0.05em]">Risk</span>
            <span className="w-20 text-xs text-[#9898B0] font-medium uppercase tracking-[0.05em]">Status</span>
            <span className="w-14 text-xs text-[#9898B0] font-medium uppercase tracking-[0.05em]">Action</span>
          </div>

          {/* Rows */}
          {riskTasks.map((task: Task) => {
            const dlColor = getDeadlineColor(task.deadline);
            const statusVariant: StatusVariant = task.risk_score >= 70 ? 'at_risk' : task.status as StatusVariant;

            return (
              <div
                key={task.id}
                className="flex items-center px-3 py-3.5 border-b border-[#2A2A3A] last:border-0 hover:bg-[#1A1A25] transition-colors"
              >
                <span className="flex-[2] text-sm text-[#F8F8FF] truncate pr-2">{task.title}</span>

                <div className="flex-[1.5] flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(task.users?.name || '') }}
                  >
                    {getInitials(task.users?.name || '?')}
                  </div>
                  <span className="text-sm text-[#F8F8FF] truncate">{task.users?.name || 'Unassigned'}</span>
                </div>

                <span className="flex-1 text-sm text-[#9898B0] truncate">{task.projects?.name || '—'}</span>

                <span className="flex-1 text-sm" style={{ color: dlColor }}>
                  {format(new Date(task.deadline), 'dd MMM yyyy')}
                </span>

                <div className="w-16">
                  <RiskBar score={task.risk_score} />
                </div>

                <div className="w-20">
                  <StatusBadge label={statusVariant.replace('_', ' ')} variant={statusVariant} />
                </div>

                <button className="w-14 text-xs text-[#4F6EF7] hover:text-[#A78BFA] transition-colors font-medium">
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
