import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';
import { useWeeklyActivity } from '../../hooks/useDashboard';
import ChartTooltip from '../shared/ChartTooltip';

export default function WeeklyActivityChart() {
  const { data: activity } = useWeeklyActivity();
  const chartData = activity || [];

  return (
    <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 flex-1">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#F8F8FF]">This Week&apos;s Activity</h3>
        <p className="text-xs text-[#9898B0] mt-0.5">Tasks completed vs delayed per day</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <defs>
            <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" horizontal={true} vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#9898B0', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: '#9898B0', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="completed"
            stroke="#22C55E"
            strokeWidth={2}
            fill="url(#completedGradient)"
            dot={{ r: 4, fill: '#22C55E', strokeWidth: 0 }}
            name="Completed"
            isAnimationActive={true}
            animationDuration={800}
          />
          <Area
            type="monotone"
            dataKey="delayed"
            stroke="#EF4444"
            strokeWidth={2}
            fill="transparent"
            dot={{ r: 4, fill: '#EF4444', strokeWidth: 0 }}
            name="Delayed"
            isAnimationActive={true}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span className="text-xs text-[#22C55E]">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
          <span className="text-xs text-[#EF4444]">Delayed</span>
        </div>
      </div>
    </div>
  );
}
