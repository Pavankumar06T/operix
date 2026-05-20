import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import type { DashboardStats, Task, TeamMember, Project, WeeklyActivity } from '../types';

// ══════════════════════════════════════
// MOCK DATA — used when API is unavailable
// ══════════════════════════════════════

const MOCK_STATS: DashboardStats = {
  activeProjects: 6,
  tasksAtRisk: 4,
  teamEfficiency: 74,
  alertsToday: 3,
  projectsTrend: '+2 this month',
  riskTrend: '+1 vs last week',
  efficiencyTrend: 'vs 68% last week',
  alertsBreakdown: '1 critical, 2 high',
};

const MOCK_RISK_TASKS: Task[] = [
  { id: '1', title: 'Payment Gateway Integration', description: '', status: 'in_progress', priority: 'high', progress: 35, risk_score: 92, deadline: '2026-05-24', assigned_to: 'u1', project_id: 'p1', created_at: '2026-05-01', updated_at: '2026-05-19', users: { name: 'Ravi Kumar', email: 'ravi@kaisenspark.com' }, projects: { name: 'FinTech Portal' } },
  { id: '2', title: 'Dashboard Analytics Module', description: '', status: 'in_progress', priority: 'critical', progress: 20, risk_score: 85, deadline: '2026-05-25', assigned_to: 'u2', project_id: 'p2', created_at: '2026-05-02', updated_at: '2026-05-18', users: { name: 'Priya Sharma', email: 'priya@kaisenspark.com' }, projects: { name: 'ERP System' } },
  { id: '3', title: 'API Rate Limiting', description: '', status: 'not_started', priority: 'medium', progress: 0, risk_score: 78, deadline: '2026-05-26', assigned_to: 'u3', project_id: 'p1', created_at: '2026-05-05', updated_at: '2026-05-17', users: { name: 'Amit Patel', email: 'amit@kaisenspark.com' }, projects: { name: 'FinTech Portal' } },
  { id: '4', title: 'User Authentication Refactor', description: '', status: 'in_progress', priority: 'high', progress: 45, risk_score: 71, deadline: '2026-05-28', assigned_to: 'u4', project_id: 'p3', created_at: '2026-05-03', updated_at: '2026-05-19', users: { name: 'Sneha Reddy', email: 'sneha@kaisenspark.com' }, projects: { name: 'CloudSync App' } },
  { id: '5', title: 'Email Notification System', description: '', status: 'in_progress', priority: 'medium', progress: 60, risk_score: 55, deadline: '2026-05-30', assigned_to: 'u5', project_id: 'p2', created_at: '2026-05-04', updated_at: '2026-05-19', users: { name: 'Vikram Singh', email: 'vikram@kaisenspark.com' }, projects: { name: 'ERP System' } },
  { id: '6', title: 'Mobile Push Notifications', description: '', status: 'in_progress', priority: 'low', progress: 70, risk_score: 38, deadline: '2026-06-05', assigned_to: 'u6', project_id: 'p3', created_at: '2026-05-06', updated_at: '2026-05-18', users: { name: 'Neha Gupta', email: 'neha@kaisenspark.com' }, projects: { name: 'CloudSync App' } },
];

const MOCK_TEAM: TeamMember[] = [
  { id: 'u1', name: 'Ravi Kumar', email: 'ravi@kaisenspark.com', role: 'Senior Developer', tasksTotal: 8, tasksCompleted: 5, workloadPercent: 88 },
  { id: 'u2', name: 'Priya Sharma', email: 'priya@kaisenspark.com', role: 'Full Stack Developer', tasksTotal: 6, tasksCompleted: 3, workloadPercent: 75 },
  { id: 'u3', name: 'Amit Patel', email: 'amit@kaisenspark.com', role: 'Backend Developer', tasksTotal: 5, tasksCompleted: 4, workloadPercent: 62 },
  { id: 'u4', name: 'Sneha Reddy', email: 'sneha@kaisenspark.com', role: 'Frontend Developer', tasksTotal: 7, tasksCompleted: 5, workloadPercent: 71 },
  { id: 'u5', name: 'Vikram Singh', email: 'vikram@kaisenspark.com', role: 'DevOps Engineer', tasksTotal: 4, tasksCompleted: 3, workloadPercent: 50 },
  { id: 'u6', name: 'Neha Gupta', email: 'neha@kaisenspark.com', role: 'UI/UX Developer', tasksTotal: 5, tasksCompleted: 4, workloadPercent: 45 },
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'FinTech Portal', description: '', status: 'active', start_date: '2026-03-01', end_date: '2026-07-15', manager_id: 'm1', progress: 65 },
  { id: 'p2', name: 'ERP System', description: '', status: 'active', start_date: '2026-02-15', end_date: '2026-08-30', manager_id: 'm1', progress: 42 },
  { id: 'p3', name: 'CloudSync App', description: '', status: 'active', start_date: '2026-04-01', end_date: '2026-06-30', manager_id: 'm1', progress: 78 },
  { id: 'p4', name: 'AI Analytics Engine', description: '', status: 'active', start_date: '2026-05-01', end_date: '2026-09-30', manager_id: 'm1', progress: 18 },
  { id: 'p5', name: 'Client Portal v2', description: '', status: 'active', start_date: '2026-01-15', end_date: '2026-06-15', manager_id: 'm1', progress: 91 },
];

const MOCK_WEEKLY: WeeklyActivity[] = [
  { day: 'Mon', completed: 5, delayed: 1 },
  { day: 'Tue', completed: 8, delayed: 2 },
  { day: 'Wed', completed: 6, delayed: 1 },
  { day: 'Thu', completed: 9, delayed: 3 },
  { day: 'Fri', completed: 7, delayed: 1 },
  { day: 'Sat', completed: 3, delayed: 0 },
  { day: 'Sun', completed: 1, delayed: 0 },
];

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const { data } = await api.get<DashboardStats>('/api/dashboard/stats');
        return data;
      } catch {
        return MOCK_STATS;
      }
    },
  });
}

export function useRiskTasks() {
  return useQuery<Task[]>({
    queryKey: ['risk-tasks'],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ tasks: Task[] }>('/api/tasks', {
          params: { risk_gte: 50, sort: 'risk_score', order: 'desc' },
        });
        return data.tasks;
      } catch {
        return MOCK_RISK_TASKS;
      }
    },
  });
}

export function useTeamWorkload() {
  return useQuery<TeamMember[]>({
    queryKey: ['team-workload'],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ team: TeamMember[] }>('/api/team/workload');
        return data.team;
      } catch {
        return MOCK_TEAM;
      }
    },
  });
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ projects: Project[] }>('/api/projects');
        return data.projects;
      } catch {
        return MOCK_PROJECTS;
      }
    },
  });
}

export function useWeeklyActivity() {
  return useQuery<WeeklyActivity[]>({
    queryKey: ['weekly-activity'],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ activity: WeeklyActivity[] }>('/api/dashboard/weekly-activity');
        return data.activity;
      } catch {
        return MOCK_WEEKLY;
      }
    },
  });
}
