import { Request, Response } from 'express'
import { z } from 'zod'
import { differenceInDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { sendSuccess, sendError, sendValidationError, sendNotFound, getPagination } from '../middleware/response'
import type { ProjectStatus, Priority } from '../types/index'

// ─── Validation Schemas ─────────────────────────────────

const createProjectSchema = z.strictObject({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  client_id: z.string().uuid().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).default('planning'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  team_members: z.array(z.string().uuid()).optional(),
})

const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
})

// ─── Helper Functions ───────────────────────────────────

const calculateProjectStats = (project: any) => {
  const tasks = project.tasks || []
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
  const delayedTasks = tasks.filter((t: any) => t.status === 'delayed').length
  const atRiskTasks = tasks.filter((t: any) => (t.risk_score || 0) >= 70).length
  
  const overallProgress = totalTasks > 0 
    ? Math.round(tasks.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / totalTasks) 
    : 0

  let daysRemaining = null
  if (project.end_date) {
    const remaining = differenceInDays(new Date(project.end_date), new Date())
    daysRemaining = remaining > 0 ? remaining : 0
  }

  return {
    totalTasks,
    completedTasks,
    delayedTasks,
    atRiskTasks,
    overallProgress,
    daysRemaining
  }
}

// ─── Controllers ────────────────────────────────────────

/**
 * @route GET /api/projects
 * @desc Get all projects for current manager
 */
export const getAll = async (req: Request, res: Response): Promise<void> => {
  const { status, priority, search, page, limit } = req.query
  const pagination = getPagination(req.query, 0) // We'll set total later
  const managerId = req.user?.id

  console.log('[Projects GetAll] User:', req.user)

  let query = supabase
    .from('projects')
    .select(`
      *,
      client:clients(id, company_name),
      manager:users!projects_manager_id_fkey(id, name, email, avatar_url),
      tasks(id, status, progress, risk_score)
    `, { count: 'exact' })

  // Filters
  if (managerId && req.user?.role === 'manager' && req.user?.department !== 'HR') {
    query = query.eq('manager_id', managerId)
  }
  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (search) query = query.ilike('name', `%${search}%`)

  query = query
    .range(pagination.offset, pagination.offset + pagination.limit - 1)
    .order('created_at', { ascending: false })

  const { data: projects, error, count } = await query

  if (error) {
    console.error('[Projects] Get all error:', error)
    sendError(res, 'Failed to fetch projects')
    return
  }

  // Calculate aggregated fields
  const enrichedProjects = projects?.map(p => {
    const stats = calculateProjectStats(p)
    const { tasks, ...projectData } = p
    return {
      ...projectData,
      total_tasks: stats.totalTasks,
      completed_tasks: stats.completedTasks,
      at_risk_tasks: stats.atRiskTasks,
      overall_progress: stats.overallProgress,
      days_remaining: stats.daysRemaining
    }
  }) || []

  pagination.meta.total = count || 0
  pagination.meta.total_pages = Math.ceil((count || 0) / pagination.limit)

  sendSuccess(res, enrichedProjects, undefined, 200, pagination.meta)
}

/**
 * @route GET /api/projects/:id
 * @desc Get single project details
 */
export const getSingle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(id, company_name, contact_name, contact_email),
      manager:users!projects_manager_id_fkey(id, name, email, avatar_url),
      tasks(id, title, description, estimated_hours, status, priority, progress, risk_score, deadline, assigned_to:users!tasks_assigned_to_fkey(id, name, avatar_url)),
      project_members(role, joined_at, user:users!project_members_user_id_fkey(id, name, email, role, avatar_url, department))
    `)
    .eq('id', id)
    .single()

  if (error || !project) {
    sendNotFound(res, 'Project')
    return
  }

  const stats = calculateProjectStats(project)
  const teamMembers = project.project_members?.map((pm: any) => ({
    ...pm.user,
    project_role: pm.role,
    joined_at: pm.joined_at
  })) || []

  sendSuccess(res, {
    ...project,
    stats,
    team_members: teamMembers
  })
}

/**
 * @route POST /api/projects
 * @desc Create new project
 */
export const createProject = async (req: Request, res: Response): Promise<void> => {
  const parsed = createProjectSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })))
    return
  }

  const { team_members, ...projectData } = parsed.data
  const managerId = req.user?.id

  // 1. Create Project
  const { data: newProject, error: projectError } = await supabase
    .from('projects')
    .insert({
      ...projectData,
      manager_id: managerId,
    })
    .select()
    .single()

  if (projectError || !newProject) {
    console.error('[Projects] Create error:', projectError)
    sendError(res, 'Failed to create project')
    return
  }

  // 2. Add Team Members
  if (team_members && team_members.length > 0) {
    const membersToInsert = team_members.map(userId => ({
      project_id: newProject.id,
      user_id: userId,
      role: 'member'
    }))

    const { error: membersError } = await supabase
      .from('project_members')
      .insert(membersToInsert)

    if (membersError) {
      console.error('[Projects] Create members error:', membersError)
      // We continue since project was created, but log error
    }
  }

  sendSuccess(res, newProject, 'Project created successfully', 201)
}

/**
 * @route PUT /api/projects/:id
 * @desc Update a project
 */
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  
  const parsed = updateProjectSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })))
    return
  }

  const { data: updatedProject, error } = await supabase
    .from('projects')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error || !updatedProject) {
    sendError(res, 'Failed to update project')
    return
  }

  sendSuccess(res, updatedProject, 'Project updated successfully')
}

/**
 * @route DELETE /api/projects/:id
 * @desc Delete a project
 */
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    sendError(res, 'Failed to delete project')
    return
  }

  sendSuccess(res, null, 'Project deleted successfully')
}

/**
 * @route GET /api/projects/:id/tasks
 */
export const getProjectTasks = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_to:users!tasks_assigned_to_fkey(id, name, avatar_url)
    `)
    .eq('project_id', id)
    .order('deadline', { ascending: true })

  if (error) {
    sendError(res, 'Failed to fetch tasks')
    return
  }

  sendSuccess(res, tasks || [])
}

/**
 * @route GET /api/projects/:id/members
 */
export const getProjectMembers = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { data: members, error } = await supabase
    .from('project_members')
    .select(`
      role,
      joined_at,
      user:users!project_members_user_id_fkey(id, name, email, role, avatar_url, department)
    `)
    .eq('project_id', id)

  if (error) {
    sendError(res, 'Failed to fetch project members')
    return
  }

  const formattedMembers = members?.map(m => ({
    ...(m.user as any),
    project_role: m.role,
    joined_at: m.joined_at
  })) || []

  sendSuccess(res, formattedMembers)
}

/**
 * @route POST /api/projects/:id/members
 */
export const addProjectMember = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { userId, role = 'member' } = req.body

  if (!userId) {
    sendError(res, 'userId is required', 'VALIDATION_ERROR', 400)
    return
  }

  const { data, error } = await supabase
    .from('project_members')
    .insert({
      project_id: id,
      user_id: userId,
      role
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique violation
      sendError(res, 'User is already a member of this project', 'ALREADY_MEMBER', 409)
      return
    }
    sendError(res, 'Failed to add member')
    return
  }

  sendSuccess(res, data, 'Member added successfully')
}

/**
 * @route DELETE /api/projects/:id/members/:userId
 */
export const removeProjectMember = async (req: Request, res: Response): Promise<void> => {
  const { id, userId } = req.params

  const { error } = await supabase
    .from('project_members')
    .delete()
    .match({ project_id: id, user_id: userId })

  if (error) {
    sendError(res, 'Failed to remove member')
    return
  }

  sendSuccess(res, null, 'Member removed successfully')
}

/**
 * @route GET /api/projects/:id/stats
 */
export const getProjectStats = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      end_date,
      tasks(id, status, progress, risk_score)
    `)
    .eq('id', id)
    .single()

  if (error || !project) {
    sendNotFound(res, 'Project')
    return
  }

  const stats = calculateProjectStats(project)

  // In a real scenario, teamEfficiency and weeklyProgress would require more complex queries
  // Mocking them slightly here for the stat endpoints 
  // (we will implement proper weekly progress in Task controller or use progress_logs)
  
  sendSuccess(res, {
    ...stats,
    teamEfficiency: 85, // Placeholder, usually computed via tasks completed / tasks assigned
    weeklyProgress: [] // Placeholder
  })
}
