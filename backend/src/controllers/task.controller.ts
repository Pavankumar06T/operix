import { Request, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { emitToAll } from '../lib/socket'
import { sendSuccess, sendError, sendValidationError, sendNotFound, getPagination } from '../middleware/response'

// ─── Validation Schemas ─────────────────────────────────

const createTaskSchema = z.strictObject({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  project_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  deadline: z.string(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  estimated_hours: z.number().nonnegative().optional(),
  subtasks: z.array(z.string()).optional(),
})

const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['not_started', 'in_progress', 'completed', 'delayed', 'cancelled']).optional(),
  progress: z.number().min(0).max(100).optional(),
}).omit({ subtasks: true })

const updateProgressSchema = z.strictObject({
  progress: z.number().min(0).max(100),
  note: z.string().optional(),
  blocker: z.string().optional(),
  hours_spent: z.number().nonnegative().default(0),
})

// ─── Controllers ────────────────────────────────────────

/**
 * @route GET /api/tasks
 * @desc Get all tasks with filters
 */
export const getAll = async (req: Request, res: Response): Promise<void> => {
  const { status, priority, risk_level, project_id, assigned_to, search, sort, order } = req.query
  const pagination = getPagination(req.query, 0)

  let query = supabase
    .from('tasks')
    .select(`
      *,
      project:projects(id, name, status),
      assigned_user:users!tasks_assigned_to_fkey(id, name, avatar_url),
      subtasks(id)
    `, { count: 'exact' })

  // Apply filters
  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (project_id) query = query.eq('project_id', project_id)
  if (search) query = query.ilike('title', `%${search}%`)

  // Role based filtering (Security & Visibility)
  if (req.user?.role === 'employee') {
    query = query.eq('assigned_to', req.user.id)
  } else if (assigned_to) {
    query = query.eq('assigned_to', assigned_to)
  }

  // Risk level filter logic (custom)
  if (risk_level) {
    if (risk_level === 'high') query = query.gte('risk_score', 71)
    else if (risk_level === 'medium') query = query.gte('risk_score', 41).lte('risk_score', 70)
    else if (risk_level === 'low') query = query.lte('risk_score', 40)
  }

  // Sorting
  const sortColumn = (sort as string) || 'created_at'
  const isAscending = order === 'asc'
  query = query.order(sortColumn, { ascending: isAscending })

  // Pagination
  query = query.range(pagination.offset, pagination.offset + pagination.limit - 1)

  const { data: tasks, error, count } = await query

  if (error) {
    console.error('[Tasks] Get all error:', error)
    sendError(res, 'Failed to fetch tasks')
    return
  }

  const enrichedTasks = tasks?.map(t => {
    const { subtasks, ...rest } = t
    return {
      ...rest,
      subtasks_count: subtasks?.length || 0
    }
  }) || []

  pagination.meta.total = count || 0
  pagination.meta.total_pages = Math.ceil((count || 0) / pagination.limit)

  sendSuccess(res, enrichedTasks, undefined, 200, pagination.meta)
}

/**
 * @route GET /api/tasks/:id
 * @desc Get single task details
 */
export const getSingle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(id, name, status),
      assigned_user:users!tasks_assigned_to_fkey(id, name, avatar_url),
      created_user:users!tasks_created_by_fkey(id, name, avatar_url),
      subtasks(*),
      recent_logs:progress_logs(*, logged_by_user:users!progress_logs_logged_by_fkey(id, name, avatar_url))
    `)
    .eq('id', id)
    .single()

  if (error || !task) {
    sendNotFound(res, 'Task')
    return
  }

  sendSuccess(res, task)
}

/**
 * @route POST /api/tasks
 * @desc Create new task
 */
export const createTask = async (req: Request, res: Response): Promise<void> => {
  const parsed = createTaskSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })))
    return
  }

  const { subtasks, ...taskData } = parsed.data
  const createdBy = req.user?.id

  const { data: newTask, error: taskError } = await supabase
    .from('tasks')
    .insert({
      ...taskData,
      created_by: createdBy,
    })
    .select()
    .single()

  if (taskError || !newTask) {
    console.error('[Tasks] Create error:', taskError)
    sendError(res, 'Failed to create task')
    return
  }

  // Insert subtasks if any
  let createdSubtasks = []
  if (subtasks && subtasks.length > 0) {
    const subtaskInserts = subtasks.map(title => ({
      task_id: newTask.id,
      title,
    }))

    const { data: insertedSubtasks, error: subtaskError } = await supabase
      .from('subtasks')
      .insert(subtaskInserts)
      .select()

    if (!subtaskError) {
      createdSubtasks = insertedSubtasks || []
    }
  }

  sendSuccess(res, { ...newTask, subtasks: createdSubtasks }, 'Task created successfully', 201)
}

/**
 * @route PUT /api/tasks/:id
 * @desc Update a task
 */
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const parsed = updateTaskSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })))
    return
  }

  const { data: updatedTask, error } = await supabase
    .from('tasks')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error || !updatedTask) {
    sendError(res, 'Failed to update task')
    return
  }

  sendSuccess(res, updatedTask, 'Task updated successfully')
}

/**
 * @route DELETE /api/tasks/:id
 * @desc Delete a task
 */
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    sendError(res, 'Failed to delete task')
    return
  }

  sendSuccess(res, null, 'Task deleted successfully')
}

/**
 * @route PUT /api/tasks/:id/progress
 * @desc Employee updates task progress
 */
export const updateProgress = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const userId = req.user?.id

  const parsed = updateProgressSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })))
    return
  }

  const { progress, note, blocker, hours_spent } = parsed.data

  // Fetch current task
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('status, progress, actual_hours')
    .eq('id', id)
    .single()

  if (fetchError || !task) {
    sendNotFound(res, 'Task')
    return
  }

  // Determine new status
  let newStatus = task.status
  if (progress === 100) {
    newStatus = 'completed'
  } else if (progress > 0 && task.status === 'not_started') {
    newStatus = 'in_progress'
  }

  const newActualHours = (task.actual_hours || 0) + hours_spent

  // Update Task
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({
      progress,
      status: newStatus,
      actual_hours: newActualHours
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError || !updatedTask) {
    sendError(res, 'Failed to update task progress')
    return
  }

  // Insert Progress Log
  const { error: logError } = await supabase
    .from('progress_logs')
    .insert({
      task_id: id,
      logged_by: userId,
      progress,
      note,
      blocker,
      hours_spent
    })

  if (logError) {
    console.error('[Tasks] Log insert error:', logError)
  }

  // Recalculate Risk Score
  // Note: For now we'll trigger riskEngine recalculation asynchronously
  // await runRiskEngine(id) // To be implemented in B13

  // Emit socket event
  emitToAll('task:progress_updated', { taskId: id, progress, status: newStatus })

  sendSuccess(res, updatedTask, 'Progress updated successfully')
}

/**
 * @route GET /api/tasks/my-tasks
 * @desc Get tasks assigned to the current employee
 */
export const getMyTasks = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(id, name, status)
    `)
    .eq('assigned_to', userId)
    .order('deadline', { ascending: true })

  if (error) {
    sendError(res, 'Failed to fetch my tasks')
    return
  }

  sendSuccess(res, tasks || [])
}

/**
 * @route GET /api/tasks/:id/logs
 * @desc Get progress history
 */
export const getTaskLogs = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { data: logs, error } = await supabase
    .from('progress_logs')
    .select(`
      *,
      logged_by_user:users!progress_logs_logged_by_fkey(id, name, avatar_url)
    `)
    .eq('task_id', id)
    .order('logged_at', { ascending: false })

  if (error) {
    sendError(res, 'Failed to fetch task logs')
    return
  }

  sendSuccess(res, logs || [])
}
