export interface User {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'employee' | 'client';
  is_active: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  start_date: string;
  end_date: string;
  manager_id: string;
  progress?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  risk_score: number;
  deadline: string;
  assigned_to: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  users?: { name: string; email: string };
  projects?: { name: string };
}

export interface Alert {
  id: string;
  task_id: string | null;
  project_id: string | null;
  manager_id: string;
  type: 'delay_risk' | 'overdue' | 'burnout' | 'milestone' | 'client_feedback';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  is_resolved: boolean;
  is_seen: boolean;
  created_at: string;
}

export interface BurnoutSignal {
  id: string;
  employee_id: string;
  burnout_score: number;
  is_flagged: boolean;
  week_data: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface DashboardStats {
  activeProjects: number;
  tasksAtRisk: number;
  teamEfficiency: number;
  alertsToday: number;
  projectsTrend: string;
  riskTrend: string;
  efficiencyTrend: string;
  alertsBreakdown: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  tasksTotal: number;
  tasksCompleted: number;
  workloadPercent: number;
}

export interface WeeklyActivity {
  day: string;
  completed: number;
  delayed: number;
}

export interface WeekData {
  weekStart: string;
  weekEnd: string;
  tasksAssigned: number;
  tasksCompleted: number;
  completionRate: number;
}

export type StatusVariant = 'not_started' | 'in_progress' | 'completed' | 'at_risk' | 'overdue' | 'high' | 'medium' | 'low' | 'critical' | 'delayed';

export type AlertType = 'delay_risk' | 'overdue' | 'burnout' | 'milestone' | 'client_feedback';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
