// ═══════════════════════════════════════════════════════
// OPERIX — Complete TypeScript Type Definitions
// ═══════════════════════════════════════════════════════

// ─── Enum-like Union Types ──────────────────────────────

export type UserRole = 'manager' | 'employee' | 'client'

export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled'

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'delayed'
  | 'cancelled'

export type Priority = 'high' | 'medium' | 'low'

export type AlertType =
  | 'delay_risk'
  | 'overdue'
  | 'burnout'
  | 'milestone'
  | 'client_feedback'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export type BurnoutLevel = 'low' | 'medium' | 'high' | 'critical'

export type ChatRole = 'user' | 'assistant'

// ─── Database Entity Interfaces ─────────────────────────

export interface User {
  id: string
  name: string
  email: string
  password_hash: string
  role: UserRole
  avatar_url: string | null
  department: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** User without sensitive password_hash field */
export type SafeUser = Omit<User, 'password_hash'>

export interface Client {
  id: string
  user_id: string | null
  company_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  manager_id: string | null
  client_id: string | null
  status: ProjectStatus
  priority: Priority
  start_date: string | null
  end_date: string | null
  budget: number | null
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: string
  joined_at: string
}

export interface Task {
  id: string
  project_id: string | null
  title: string
  description: string | null
  assigned_to: string | null
  created_by: string | null
  deadline: string
  priority: Priority
  status: TaskStatus
  progress: number
  risk_score: number
  estimated_hours: number | null
  actual_hours: number
  created_at: string
  updated_at: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  completed_at: string | null
  created_at: string
}

export interface ProgressLog {
  id: string
  task_id: string
  logged_by: string | null
  progress: number
  note: string | null
  blocker: string | null
  hours_spent: number
  logged_at: string
}

export interface Alert {
  id: string
  task_id: string | null
  project_id: string | null
  manager_id: string | null
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  is_seen: boolean
  is_resolved: boolean
  created_at: string
}

export interface BurnoutSignal {
  id: string
  employee_id: string | null
  week_start: string
  tasks_assigned: number
  tasks_completed: number
  avg_progress_rate: number
  burnout_score: number
  burnout_level: string
  is_flagged: boolean
  week_data: WeekData | null
  created_at: string
}

export interface WeekData {
  weeks: Array<{
    weekStart: string
    tasksAssigned: number
    tasksCompleted: number
    completionRate: number
    avgDailyProgress: number
  }>
}

export interface WeeklyReport {
  id: string
  week_start: string
  week_end: string
  content: string
  summary: ReportSummary | null
  generated_by: string
  email_sent: boolean
  sent_at: string | null
  created_at: string
}

export interface ReportSummary {
  totalTasks: number
  completed: number
  delayed: number
  overdue: number
  avgEfficiency: number
  topRisks: string[]
}

export interface AiChat {
  id: string
  user_id: string | null
  role: ChatRole
  content: string
  created_at: string
}

export interface ClientFeedback {
  id: string
  client_id: string | null
  project_id: string | null
  message: string
  rating: number | null
  created_at: string
}

export interface FileUpload {
  id: string
  task_id: string | null
  project_id: string | null
  uploaded_by: string | null
  file_name: string
  file_url: string
  file_size: number | null
  file_type: string | null
  created_at: string
}

// ─── Extended / Computed Interfaces ─────────────────────

export interface ProjectWithStats extends Project {
  manager: SafeUser | null
  client: Client | null
  total_tasks: number
  completed_tasks: number
  at_risk_tasks: number
  overall_progress: number
  days_remaining: number | null
  team_members: SafeUser[]
}

export interface TaskWithRelations extends Task {
  assigned_user: SafeUser | null
  created_user: SafeUser | null
  project: Pick<Project, 'id' | 'name' | 'status'> | null
  subtasks: Subtask[]
  recent_logs: ProgressLog[]
}

export interface TeamMember extends SafeUser {
  tasks_assigned: number
  tasks_completed: number
  efficiency_score: number
  current_workload: number
  workload_percent: number
  burnout_score: number | null
  burnout_level: BurnoutLevel | null
  is_flagged: boolean
}

export interface DashboardStats {
  active_projects: number
  at_risk_tasks: number
  team_efficiency: number
  alerts_today: number
  total_tasks: number
  completed_tasks: number
  overdue_tasks: number
  team_size: number
}

export interface WorkloadData {
  employee: SafeUser
  current_tasks: number
  max_capacity: number
  workload_percent: number
  trend: 'increasing' | 'stable' | 'decreasing'
}

export interface PerformanceWeek {
  week_start: string
  tasks_assigned: number
  tasks_completed: number
  completion_rate: number
  avg_progress_rate: number
}

export interface RiskEngineResult {
  tasks_analyzed: number
  risks_detected: number
  alerts_created: number
  emails_sent: number
  overdue_updated: number
  timestamp: string
}

export interface BurnoutEngineResult {
  employees_analyzed: number
  flagged: number
  alerts_created: number
  emails_sent: number
  timestamp: string
}

// ─── API Request Types ──────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  role: UserRole
  department?: string
  phone?: string
  company_name?: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
  client_id?: string
  status?: ProjectStatus
  priority?: Priority
  start_date?: string
  end_date?: string
  budget?: number
  team_members?: string[]
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  client_id?: string | null
  status?: ProjectStatus
  priority?: Priority
  start_date?: string | null
  end_date?: string | null
  budget?: number | null
}

export interface CreateTaskRequest {
  project_id?: string
  title: string
  description?: string
  assigned_to?: string
  deadline: string
  priority?: Priority
  estimated_hours?: number
  subtasks?: string[]
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  assigned_to?: string | null
  deadline?: string
  priority?: Priority
  status?: TaskStatus
  estimated_hours?: number | null
}

export interface UpdateProgressRequest {
  progress: number
  note?: string
  blocker?: string
  hours_spent?: number
}

export interface AiChatRequest {
  question: string
}

export interface ClientFeedbackRequest {
  project_id: string
  message: string
  rating: number
}

// ─── API Response Types ─────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  code?: string
  timestamp?: string
  pagination?: PaginationMeta
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface AuthResponse {
  user: SafeUser
  access_token: string
  refresh_token: string
}

export interface AiChatResponse {
  answer: string
  timestamp: string
}

// ─── JWT Payload ────────────────────────────────────────

export interface JwtPayload {
  id: string
  email: string
  role: UserRole
  name: string
  iat?: number
  exp?: number
}

export interface JwtRefreshPayload {
  id: string
  iat?: number
  exp?: number
}

// ─── Query Filter Types ────────────────────────────────

export interface TaskFilters {
  status?: TaskStatus
  priority?: Priority
  risk_level?: 'low' | 'medium' | 'high'
  project_id?: string
  assigned_to?: string
  search?: string
  sort?: 'deadline' | 'risk_score' | 'created_at' | 'priority'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
  risk_gte?: number
}

export interface ProjectFilters {
  status?: ProjectStatus
  priority?: Priority
  search?: string
  sort?: 'created_at' | 'end_date' | 'name'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface AlertFilters {
  type?: AlertType
  severity?: AlertSeverity
  is_seen?: boolean
  is_resolved?: boolean
  page?: number
  limit?: number
}
