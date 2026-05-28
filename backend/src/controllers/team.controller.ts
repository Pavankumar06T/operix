import { Request, Response } from 'express'
import { startOfWeek, endOfWeek } from 'date-fns'
import { supabase } from '../lib/supabase'
import { sendSuccess, sendError, sendNotFound } from '../middleware/response'

// ─── Constants ──────────────────────────────────────────

const MAX_CAPACITY = 8 // Default max active tasks per employee

// ─── Helper Functions ───────────────────────────────────

const getWeekRange = () => {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString() // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString() // Sunday
  return { weekStart, weekEnd }
}

// ─── Controllers ────────────────────────────────────────

/**
 * @route GET /api/team
 * @desc Get all employees with their basic stats
 */
export const getAll = async (req: Request, res: Response): Promise<void> => {
  const { weekStart, weekEnd } = getWeekRange()

  // 1. Get employees
  const { data: employees, error: empError } = await supabase
    .from('users')
    .select('id, name, email, avatar_url, department, role, is_active, agreed_ctc')
    .eq('role', 'employee')
    .eq('is_active', true)

  if (empError || !employees) {
    sendError(res, 'Failed to fetch team members')
    return
  }

  // 2. For each employee, get tasks in the current week to calculate stats
  // We'll just fetch all relevant tasks and burnout signals and aggregate in memory
  // This is acceptable for a typical team size. For very large teams, this needs a DB View.

  const employeeIds = employees.map(e => e.id)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, assigned_to, status, created_at, progress')
    .in('assigned_to', employeeIds)

  const { data: burnoutSignals } = await supabase
    .from('burnout_signals')
    .select('employee_id, is_flagged, burnout_score')
    .in('employee_id', employeeIds)
    .order('created_at', { ascending: false })

  const enrichedTeam = employees.map(emp => {
    const empTasks = tasks?.filter(t => t.assigned_to === emp.id) || []
    
    const assignedTotal = empTasks.length
    const completedTotal = empTasks.filter(t => t.status === 'completed').length
    const activeTasks = empTasks.filter(t => t.status === 'not_started' || t.status === 'in_progress' || t.status === 'delayed').length
    
    const efficiencyScore = assignedTotal > 0 ? Math.round((completedTotal / assignedTotal) * 100) : 0
    const workloadPercent = Math.min(100, Math.round((activeTasks / MAX_CAPACITY) * 100))

    // Get latest burnout signal
    const latestSignal = burnoutSignals?.find(b => b.employee_id === emp.id)

    return {
      ...emp,
      tasks_assigned: assignedTotal,
      tasks_completed: completedTotal,
      efficiency_score: efficiencyScore > 100 ? 100 : efficiencyScore,
      current_workload: activeTasks,
      workload_percent: workloadPercent,
      burnout_score: latestSignal?.burnout_score || null,
      is_flagged: latestSignal?.is_flagged || false
    }
  })

  sendSuccess(res, enrichedTeam)
}

/**
 * @route GET /api/team/workload
 * @desc Get workload distribution for all employees
 */
export const getWorkload = async (req: Request, res: Response): Promise<void> => {
  const { data: employees, error: empError } = await supabase
    .from('users')
    .select('id, name, email, avatar_url, department, role')
    .eq('role', 'employee')
    .eq('is_active', true)

  if (empError || !employees) {
    sendError(res, 'Failed to fetch employees')
    return
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('assigned_to, status')
    .in('status', ['not_started', 'in_progress', 'delayed'])
    .in('assigned_to', employees.map(e => e.id))

  const workloadData = employees.map(emp => {
    const activeTasksCount = tasks?.filter(t => t.assigned_to === emp.id).length || 0
    const workloadPercent = Math.min(100, Math.round((activeTasksCount / MAX_CAPACITY) * 100))
    
    // Trend calculation would typically look at historical data. We'll return 'stable' as default.
    let trend = 'stable'
    if (workloadPercent > 80) trend = 'increasing'
    else if (workloadPercent < 30) trend = 'decreasing'

    return {
      employee: emp,
      current_tasks: activeTasksCount,
      max_capacity: MAX_CAPACITY,
      workload_percent: workloadPercent,
      trend
    }
  })

  sendSuccess(res, workloadData)
}

/**
 * @route GET /api/team/:id
 * @desc Get employee profile
 */
export const getEmployeeProfile = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const isHR = req.user?.department === 'HR'
  const isManager = req.user?.role === 'manager'

  const { data: employee, error } = await supabase
    .from('users')
    .select('id, name, email, avatar_url, department, role, created_at, agreed_ctc')
    .eq('id', id)
    .single()

  if (error || !employee) {
    sendNotFound(res, 'Employee')
    return
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('assigned_to', id)

  const activeTasksCount = tasks?.filter(t => ['not_started', 'in_progress', 'delayed'].includes(t.status)).length || 0
  const completedTasksCount = tasks?.filter(t => t.status === 'completed').length || 0

  let burnoutSignal = null
  if (isManager) {
    const { data: signal } = await supabase
      .from('burnout_signals')
      .select('*')
      .eq('employee_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (signal) burnoutSignal = signal
  }

  // Performance history (mocking last 8 weeks structure, but would typically come from a materialized view or logs)
  const performance_history: any[] = [] // Placeholder

  sendSuccess(res, {
    ...employee,
    current_active_tasks: activeTasksCount,
    completed_tasks_count: completedTasksCount,
    burnout_signal: burnoutSignal,
    performance_history
  })
}

/**
 * @route GET /api/team/:id/tasks
 * @desc Get tasks for specific employee
 */
export const getEmployeeTasks = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(id, name, status)
    `)
    .eq('assigned_to', id)
    .order('deadline', { ascending: true })

  if (error) {
    sendError(res, 'Failed to fetch employee tasks')
    return
  }

  sendSuccess(res, tasks || [])
}

/**
 * @route GET /api/team/:id/burnout
 * @desc Get detailed burnout data (manager only)
 */
export const getBurnoutData = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { data: signals, error } = await supabase
    .from('burnout_signals')
    .select('*')
    .eq('employee_id', id)
    .order('week_start', { ascending: false })
    .limit(12) // Last 12 weeks

  if (error) {
    sendError(res, 'Failed to fetch burnout data')
    return
  }

  sendSuccess(res, signals || [])
}

/**
 * @route GET /api/team/:id/performance
 * @desc Get employee performance history
 */
export const getPerformance = async (req: Request, res: Response): Promise<void> => {
  // Return mock/computed performance data
  sendSuccess(res, [])
}
