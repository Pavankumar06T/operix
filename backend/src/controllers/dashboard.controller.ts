import { Request, Response } from 'express'
import { subDays, startOfDay, endOfDay, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { sendSuccess, sendError } from '../middleware/response'

/**
 * @route GET /api/dashboard
 * @desc Get all dashboard data combined
 */
export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  const managerId = req.user?.id
  const isHR = req.user?.department === 'HR'
  
  console.log('[Dashboard] User:', req.user)

  // 1. Stats
  let activeProjectsQuery = supabase
    .from('projects').select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  if (!isHR) activeProjectsQuery = activeProjectsQuery.eq('manager_id', managerId)
  const { count: activeProjects } = await activeProjectsQuery

  let managerProjectsQuery = supabase
    .from('projects').select('id')
  if (!isHR) managerProjectsQuery = managerProjectsQuery.eq('manager_id', managerId)
  const { data: managerProjects } = await managerProjectsQuery
  const projectIds = managerProjects?.map(p => p.id) || []

  let atRiskTasks = 0
  let highRiskTasks: any[] = []
  if (projectIds.length > 0) {
    const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true })
      .in('project_id', projectIds).gte('risk_score', 70)
    atRiskTasks = count || 0

    const { data: hrTasks } = await supabase.from('tasks').select('*')
      .in('project_id', projectIds).gte('risk_score', 70).limit(5)
    highRiskTasks = hrTasks || []
  }

  let alertsQuery = supabase.from('alerts').select('*', { count: 'exact', head: true })
    .gte('created_at', startOfDay(new Date()).toISOString())
  if (!isHR) alertsQuery = alertsQuery.eq('manager_id', managerId)
  const { count: alertsToday } = await alertsQuery

  let teamEfficiency = 0
  let completedTasks = 0
  if (projectIds.length > 0) {
    const { data: allTasks } = await supabase.from('tasks').select('status, progress').in('project_id', projectIds)
    if (allTasks && allTasks.length > 0) {
      completedTasks = allTasks.filter((t: any) => t.status === 'completed').length
      const avgProgress = allTasks.reduce((acc: number, t: any) => acc + (t.progress || 0), 0) / allTasks.length
      teamEfficiency = Math.round(avgProgress)
    }
  }

  const stats = {
    active_projects: activeProjects || 0,
    at_risk_tasks: atRiskTasks,
    alerts_today: alertsToday || 0,
    team_efficiency: teamEfficiency,
    completed_tasks: completedTasks
  }

  // 2. Activity Data
  const last7Days = Array.from({ length: 7 }).map((_, i) => ({
    date: startOfDay(subDays(new Date(), 6 - i)).toISOString(),
    completed: 0,
    assigned: 0
  }))

  let teamWorkload: any[] = []

  if (projectIds.length > 0) {
    const { data: tasksData } = await supabase
      .from('tasks')
      .select(`
        id, status, created_at, updated_at, assigned_to,
        users!tasks_assigned_to_fkey (id, name)
      `)
      .in('project_id', projectIds)

    if (tasksData) {
      // Process Weekly Activity
      tasksData.forEach((task: any) => {
        const createdDate = startOfDay(new Date(task.created_at)).toISOString()
        const createdDay = last7Days.find(d => d.date === createdDate)
        if (createdDay) createdDay.assigned++

        if (task.status === 'completed') {
          const completedDate = startOfDay(new Date(task.updated_at)).toISOString()
          const completedDay = last7Days.find(d => d.date === completedDate)
          if (completedDay) completedDay.completed++
        }
      })

      // Process Team Workload (Active Tasks)
      const userTaskCounts: Record<string, { id: string, name: string, count: number }> = {}
      
      tasksData.forEach((t: any) => {
        if (!t.assigned_to || t.status === 'completed') return
        if (!userTaskCounts[t.assigned_to]) {
          // Supabase join sometimes returns an array or an object
          const userName = Array.isArray(t.users) ? t.users[0]?.name : t.users?.name
          userTaskCounts[t.assigned_to] = {
            id: t.assigned_to,
            name: userName || 'Team Member',
            count: 0
          }
        }
        userTaskCounts[t.assigned_to].count++
      })

      // Calculate Workload (Assuming 8 tasks = 100% capacity)
      teamWorkload = Object.values(userTaskCounts).map(u => ({
        id: u.id,
        name: u.name,
        active_tasks: u.count,
        workload_percent: Math.min(Math.round((u.count / 8) * 100), 100)
      }))
    }
  }

  sendSuccess(res, {
    stats,
    activityData: last7Days,
    highRiskTasks,
    teamWorkload
  })
}

/**
 * @route GET /api/dashboard/stats
 * @desc Get aggregated stats for the dashboard
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  const managerId = req.user?.id
  const isHR = req.user?.department === 'HR'

  // 1. Active Projects Count
  let activeProjectsQuery = supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  if (!isHR) activeProjectsQuery = activeProjectsQuery.eq('manager_id', managerId)
  const { count: activeProjects } = await activeProjectsQuery

  // 2. At Risk Tasks Count (Tasks belonging to manager's projects)
  let managerProjectsQuery = supabase.from('projects').select('id')
  if (!isHR) managerProjectsQuery = managerProjectsQuery.eq('manager_id', managerId)
  const { data: managerProjects } = await managerProjectsQuery
  
  const projectIds = managerProjects?.map(p => p.id) || []

  let atRiskTasks = 0
  if (projectIds.length > 0) {
    const { count, error: err2 } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('project_id', projectIds)
      .gte('risk_score', 70)
    
    if (!err2) atRiskTasks = count || 0
  }

  // 3. Alerts Today Count
  const todayStart = startOfDay(new Date()).toISOString()
  const todayEnd = endOfDay(new Date()).toISOString()

  let alertsQuery = supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd)
  if (!isHR) alertsQuery = alertsQuery.eq('manager_id', managerId)
  const { count: alertsToday } = await alertsQuery

  // 4. Team Efficiency Average (Mocked or aggregated)
  const teamEfficiency = 85

  sendSuccess(res, {
    active_projects: activeProjects || 0,
    at_risk_tasks: atRiskTasks,
    alerts_today: alertsToday || 0,
    team_efficiency: teamEfficiency
  })
}

/**
 * @route GET /api/dashboard/weekly-activity
 * @desc Get task completions vs delays over the last 7 days
 */
export const getWeeklyActivity = async (req: Request, res: Response): Promise<void> => {
  const managerId = req.user?.id
  const isHR = req.user?.department === 'HR'
  
  console.log('[WeeklyActivity] User:', req.user)

  let managerProjectsQuery = supabase.from('projects').select('id')
  if (!isHR) managerProjectsQuery = managerProjectsQuery.eq('manager_id', managerId)
  const { data: managerProjects } = await managerProjectsQuery
  
  const projectIds = managerProjects?.map(p => p.id) || []

  // Generate last 7 days array
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i)
    return {
      date: startOfDay(d).toISOString(),
      label: format(d, 'EEE'), // Mon, Tue, etc.
      completed: 0,
      delayed: 0
    }
  })

  if (projectIds.length === 0) {
    sendSuccess(res, last7Days)
    return
  }

  // Get tasks updated in the last 7 days for these projects
  const sevenDaysAgo = last7Days[0].date

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('status, updated_at')
    .in('project_id', projectIds)
    .gte('updated_at', sevenDaysAgo)
    .in('status', ['completed', 'delayed'])

  if (error) {
    console.error('[Dashboard] Weekly activity error:', error)
    sendError(res, 'Failed to fetch weekly activity')
    return
  }

  tasks?.forEach(task => {
    const taskDate = startOfDay(new Date(task.updated_at)).toISOString()
    const dayData = last7Days.find(d => d.date === taskDate)
    
    if (dayData) {
      if (task.status === 'completed') dayData.completed++
      if (task.status === 'delayed') dayData.delayed++
    }
  })

  sendSuccess(res, last7Days)
}
