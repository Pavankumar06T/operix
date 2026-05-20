import { ShieldAlert } from 'lucide-react';
import { LineChart, Line, Area, ResponsiveContainer, AreaChart } from 'recharts';
import RiskScoreGauge from '../shared/RiskScoreGauge';
import { useAuthStore } from '../../stores/authStore';
import type { WeekData } from '../../types';

interface BurnoutCardProps {
  employeeId: string;
  employeeName: string;
  burnoutScore?: number;
  weekData?: WeekData[];
}

const MOCK_WEEK_DATA: WeekData[] = [
  { weekStart: '', weekEnd: '', tasksAssigned: 5, tasksCompleted: 4, completionRate: 0.85 },
  { weekStart: '', weekEnd: '', tasksAssigned: 6, tasksCompleted: 4, completionRate: 0.72 },
  { weekStart: '', weekEnd: '', tasksAssigned: 7, tasksCompleted: 4, completionRate: 0.58 },
  { weekStart: '', weekEnd: '', tasksAssigned: 8, tasksCompleted: 4, completionRate: 0.52 },
];

function getBurnoutLevel(score: number): { label: string; className: string } {
  if (score <= 30) return { label: 'Low Risk', className: 'bg-green-950 text-green-400' };
  if (score <= 55) return { label: 'Monitor Closely', className: 'bg-amber-950 text-amber-400' };
  if (score <= 75) return { label: 'Intervention Needed', className: 'bg-red-950 text-red-400' };
  return { label: 'Urgent Attention', className: 'bg-red-950 text-red-400' };
}

export default function BurnoutCard({ employeeId, employeeName, burnoutScore = 62, weekData }: BurnoutCardProps) {
  const { user } = useAuthStore();

  // Only visible to managers
  if (user && user.role !== 'manager') return null;

  const weeks = weekData || MOCK_WEEK_DATA;
  const score = burnoutScore;
  const level = getBurnoutLevel(score);

  const chartData = weeks.map((w, i) => ({
    week: `W${i + 1}`,
    rate: Math.round(w.completionRate * 100),
  }));

  const isDeclining = weeks.length >= 2 && weeks[weeks.length - 1].completionRate < weeks[0].completionRate;
  const lineColor = isDeclining ? '#EF4444' : '#22C55E';

  return (
    <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-purple-400" />
          <span className="text-sm font-semibold text-[#F8F8FF]">Wellbeing Analysis</span>
        </div>
        <span className="bg-purple-950 text-purple-400 text-[10px] px-2 py-0.5 rounded-full font-medium">
          Confidential
        </span>
      </div>

      {/* 4-Week Trend Chart */}
      <div className="mb-3">
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`burnout-fill-${employeeId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.12} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="rate"
              stroke={lineColor}
              strokeWidth={2}
              fill={`url(#burnout-fill-${employeeId})`}
              dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex justify-between px-2">
          {chartData.map((d) => (
            <span key={d.week} className="text-[10px] text-[#5A5A72]">{d.week}</span>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex items-center gap-4 mt-4">
        <RiskScoreGauge score={score} size="sm" />
        <div className="flex flex-col gap-1.5">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${level.className}`}>
            {level.label}
          </span>
          <p className="text-xs text-[#9898B0]">
            {employeeName}&apos;s completion rate has {isDeclining ? 'declined' : 'remained stable'} over 4 weeks
          </p>
        </div>
      </div>
    </div>
  );
}
