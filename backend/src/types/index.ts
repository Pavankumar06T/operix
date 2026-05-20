// ══════════════════════════════════════════════════════════
// KaisenFlow — Complete TypeScript Type Definitions
// ══════════════════════════════════════════════════════════

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'employee' | 'client';
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  start_date: string;
  end_date: string;
  manager_id: string;
  client_id: string | null;
  created_at: string;
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
  projects?: { name: string; manager_id: string };
}

export interface ProgressLog {
  id: string;
  task_id: string;
  logged_by: string;
  progress: number;
  notes: string;
  logged_at: string;
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
  week_start: string;
  tasks_assigned: number;
  tasks_completed: number;
  avg_progress_rate: number;
  burnout_score: number;
  is_flagged: boolean;
  week_data: string;
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  content: string;
  summary: string;
  email_sent: boolean;
  sent_at: string | null;
  generated_by: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface RiskEngineSummary {
  totalTasksChecked: number;
  tasksAtRisk: number;
  tasksCritical: number;
  tasksOverdue: number;
  alertsCreated: number;
  executionTime: string;
  timestamp: Date;
}

export interface WeekData {
  weekStart: string;
  weekEnd: string;
  tasksAssigned: number;
  tasksCompleted: number;
  avgProgressRate: number;
  completionRate: number;
}

export interface BurnoutAnalysis {
  employeeId: string;
  employeeName: string;
  burnoutScore: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  weeks: WeekData[];
  isFlagged: boolean;
}

export interface TeamEfficiency {
  employeeId: string;
  employeeName: string;
  tasksAssigned: number;
  tasksCompleted: number;
  efficiencyScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ReportData {
  taskStats: TaskStats;
  employeePerformance: EmployeePerformance[];
  projectHealth: ProjectHealth[];
  alertStats: AlertStats;
  topRisks: TopRisk[];
  burnoutSummary: BurnoutSummary;
}

export interface TaskStats {
  totalAssigned: number;
  completed: number;
  delayed: number;
  newlyOverdue: number;
  completionRate: string;
}

export interface AlertStats {
  totalGenerated: number;
  critical: number;
  high: number;
  resolved: number;
}

export interface TopRisk {
  title: string;
  riskScore: number;
  assignedTo: string;
  deadline: string;
  project: string;
}

export interface BurnoutSummary {
  employeesFlagged: number;
  avgTeamBurnoutScore: number;
}

export interface EmployeePerformance {
  name: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksDelayed: number;
  avgProgress: number;
  efficiencyScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ProjectHealth {
  name: string;
  progressThisWeek: number;
  currentCompletion: number;
  tasksAtRisk: number;
  status: string;
  daysUntilDeadline: number;
}

export interface AIResponse {
  answer: string;
  tokensUsed: number;
  timestamp: Date;
}

export interface ReportResult {
  reportId: string;
  emailsSent: number;
  weekPeriod: { start: Date; end: Date };
  generatedAt: Date;
}

export interface AuthPayload {
  userId: string;
  role: 'manager' | 'employee' | 'client';
  email: string;
}

export interface ReportEmailData {
  managerName: string;
  period: string;
  reportContent: string;
  taskStats: TaskStats;
  topRisks: TopRisk[];
}
