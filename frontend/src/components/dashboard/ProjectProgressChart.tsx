import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useProjects } from '../../hooks/useDashboard';
import ChartTooltip from '../shared/ChartTooltip';

export default function ProjectProgressChart() {
  const { data: projects } = useProjects();
  const chartData = (projects || []).map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    progress: p.progress || 0,
    fullName: p.name,
  }));

  return (
    <div className="rounded-xl border border-[#2A2A3A] bg-[#16161F] p-5 flex-1">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#F8F8FF]">Project Progress</h3>
        <p className="text-xs text-[#9898B0] mt-0.5">Overall completion by project</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F6EF7" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" horizontal={true} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#9898B0', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: '#9898B0', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(val: number) => `${val}%`}
          />
          <Tooltip
            content={<ChartTooltip formatter={(val: number) => `${val}%`} />}
            cursor={{ fill: 'rgba(42, 42, 58, 0.3)' }}
          />
          <Bar
            dataKey="progress"
            fill="url(#barGradient)"
            radius={[6, 6, 0, 0]}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
            name="Progress"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
