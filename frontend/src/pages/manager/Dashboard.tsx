import { FolderKanban, AlertTriangle, Zap, Bell } from 'lucide-react';
import StatCard from '../../components/shared/StatCard';
import TaskRiskBoard from '../../components/dashboard/TaskRiskBoard';
import TeamWorkload from '../../components/dashboard/TeamWorkload';
import ProjectProgressChart from '../../components/dashboard/ProjectProgressChart';
import WeeklyActivityChart from '../../components/dashboard/WeeklyActivityChart';
import RecentAlerts from '../../components/dashboard/RecentAlerts';
import { useDashboardStats } from '../../hooks/useDashboard';

export default function Dashboard() {
  const { data: stats } = useDashboardStats();
  const s = stats || {
    activeProjects: 0,
    tasksAtRisk: 0,
    teamEfficiency: 0,
    alertsToday: 0,
    projectsTrend: '',
    riskTrend: '',
    efficiencyTrend: '',
    alertsBreakdown: '',
  };

  return (
    <div className="p-6 bg-[#0A0A0F] min-h-full flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-[#F8F8FF]">Dashboard</h1>
        <p className="text-sm text-[#9898B0] mt-0.5">Welcome back. Here&apos;s your operations overview.</p>
      </div>

      {/* ROW 1: Four Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Projects"
          value={s.activeProjects}
          icon={FolderKanban}
          iconColor="#4F6EF7"
          trend={s.projectsTrend || '+2 this month'}
          trendDirection="up"
          trendIsPositive={true}
        />
        <StatCard
          title="Tasks At Risk"
          value={s.tasksAtRisk}
          icon={AlertTriangle}
          iconColor="#F59E0B"
          trend={s.riskTrend || '+1 vs last week'}
          trendDirection="up"
          trendIsPositive={false}
        />
        <StatCard
          title="Team Efficiency"
          value={`${s.teamEfficiency}%`}
          icon={Zap}
          iconColor="#22C55E"
          trend={s.efficiencyTrend || 'vs 68% last week'}
          trendDirection="up"
          trendIsPositive={true}
          bottomContent={
            <div className="w-full h-1.5 rounded-full bg-[#2A2A3A]">
              <div
                className="h-full rounded-full bg-[#22C55E] transition-all duration-700"
                style={{ width: `${s.teamEfficiency}%` }}
              />
            </div>
          }
        />
        <StatCard
          title="Alerts Today"
          value={s.alertsToday}
          icon={Bell}
          iconColor="#EF4444"
          trend={s.alertsBreakdown || '1 critical, 2 high'}
          trendDirection="up"
          trendIsPositive={false}
        />
      </div>

      {/* ROW 2: Risk Board + Team Workload */}
      <div className="flex gap-6 flex-col lg:flex-row">
        <TaskRiskBoard />
        <TeamWorkload />
      </div>

      {/* ROW 3: Charts */}
      <div className="flex gap-6 flex-col lg:flex-row">
        <ProjectProgressChart />
        <WeeklyActivityChart />
      </div>

      {/* ROW 4: Recent Alerts */}
      <RecentAlerts />
    </div>
  );
}
