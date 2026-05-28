import { Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { sendSuccess, sendError } from '../middleware/response'

/**
 * @route GET /api/employee/portal
 * @desc Get comprehensive project and team overview for an employee
 */
export const getEmployeePortal = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id

    // 1. Find all distinct projects this employee has tasks in
    const { data: myTasks, error: taskErr } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('assigned_to', userId)

    if (taskErr) throw taskErr

    // Extract unique project IDs
    const projectIds = [...new Set(myTasks?.map(t => t.project_id).filter(Boolean))]

    if (projectIds.length === 0) {
      sendSuccess(res, { projects: [] })
      return
    }

    // 2. Fetch those projects
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select(`
        id, name, description, status, start_date, end_date,
        tasks(status, progress)
      `)
      .in('id', projectIds)

    if (projErr) throw projErr

    // 3. Fetch all tasks within those projects (for team visibility)
    const { data: teamTasks, error: teamTaskErr } = await supabase
      .from('tasks')
      .select(`
        id, title, status, progress, project_id, priority, assigned_to,
        assigned_user:users!tasks_assigned_to_fkey(id, name, avatar_url)
      `)
      .in('project_id', projectIds)
      .neq('status', 'completed') // Usually we only want to show active/pending tasks in team view
      .order('progress', { ascending: false })

    if (teamTaskErr) throw teamTaskErr

    // 4. Map active team tasks into their respective projects and calculate overall progress
    const formattedProjects = projects?.map(p => {
      // Calculate overall progress manually
      const allTasks = p.tasks || []
      const totalTasks = allTasks.length
      const overallProgress = totalTasks > 0 
        ? Math.round(allTasks.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / totalTasks) 
        : 0

      // Remove the raw tasks array from the output
      const { tasks, ...cleanProject } = p

      return {
        ...cleanProject,
        overall_progress: overallProgress,
        active_tasks: teamTasks?.filter(t => t.project_id === p.id).map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        progress: t.progress,
        priority: t.priority,
        assigned_to: t.assigned_user ? {
          name: Array.isArray(t.assigned_user) ? t.assigned_user[0]?.name : t.assigned_user.name,
          initials: (Array.isArray(t.assigned_user) ? t.assigned_user[0]?.name : t.assigned_user.name)?.split(' ').map((n: string) => n[0]).join('') || '?',
          avatar: Array.isArray(t.assigned_user) ? t.assigned_user[0]?.avatar_url : t.assigned_user.avatar_url
        } : null
      })) || []
    }
  })

    sendSuccess(res, { projects: formattedProjects })
  } catch (error: any) {
    console.error('getEmployeePortal Error:', error)
    sendError(res, 'Failed to fetch employee portal data', 'SERVER_ERROR', 500)
  }
}
