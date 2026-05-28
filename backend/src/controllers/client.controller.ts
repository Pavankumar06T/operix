import { Request, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { emitToManager } from '../lib/socket'
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../middleware/response'

// ─── Validation Schemas ─────────────────────────────────

const createClientSchema = z.strictObject({
  company_name: z.string().min(1, 'Company name is required'),
  contact_name: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
})

const submitFeedbackSchema = z.strictObject({
  project_id: z.string().uuid(),
  message: z.string().min(1, 'Feedback message is required'),
  rating: z.number().min(1).max(5),
})

const submitTokenSchema = z.strictObject({
  project_id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
})

// ─── Controllers ────────────────────────────────────────

/**
 * @route GET /api/clients
 * @desc Get all clients
 */
export const getAll = async (req: Request, res: Response): Promise<void> => {
  const { data: clients, error } = await supabase
    .from('clients')
    .select(`
      *,
      user:users!clients_user_id_fkey(id, name, email, is_active)
    `)
    .order('company_name', { ascending: true })

  if (error) {
    console.error('[Clients] Get all error:', error)
    sendError(res, 'Failed to fetch clients')
    return
  }

  sendSuccess(res, clients || [])
}

/**
 * @route POST /api/clients
 * @desc Create new client (Manager only)
 */
export const createClient = async (req: Request, res: Response): Promise<void> => {
  const parsed = createClientSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })))
    return
  }

  const { data: client, error } = await supabase
    .from('clients')
    .insert(parsed.data)
    .select()
    .single()

  if (error || !client) {
    sendError(res, 'Failed to create client')
    return
  }

  sendSuccess(res, client, 'Client created successfully', 201)
}

/**
 * @route GET /api/clients/:id
 * @desc Get client details
 */
export const getSingle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { data: client, error } = await supabase
    .from('clients')
    .select(`
      *,
      user:users!clients_user_id_fkey(id, name, email, is_active)
    `)
    .eq('id', id)
    .single()

  if (error || !client) {
    sendNotFound(res, 'Client')
    return
  }

  sendSuccess(res, client)
}

/**
 * @route PUT /api/clients/:id
 * @desc Update client
 */
export const updateClient = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const parsed = createClientSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })))
    return
  }

  const { data: updatedClient, error } = await supabase
    .from('clients')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error || !updatedClient) {
    sendError(res, 'Failed to update client')
    return
  }

  sendSuccess(res, updatedClient, 'Client updated successfully')
}

/**
 * @route GET /api/clients/:id/projects
 * @desc Get projects for a specific client
 */
export const getClientProjects = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    sendError(res, 'Failed to fetch client projects')
    return
  }

  sendSuccess(res, projects || [])
}

/**
 * @route GET /api/clients/:id/portal
 * @desc Get client portal data (sanitized view for client)
 */
export const getClientPortalData = async (req: Request, res: Response): Promise<void> => {
  // If user is client, ensure they can only fetch their own data
  const userId = req.user?.id
  const isClient = req.user?.role === 'client'
  let clientId = req.params.id

  if (isClient) {
    // Determine client id based on the user_id
    const { data: cData } = await supabase.from('clients').select('id').eq('user_id', userId).single()
    if (!cData || (clientId !== 'me' && clientId !== cData.id)) {
      sendError(res, 'Access denied', 'UNAUTHORIZED', 403)
      return
    }
    clientId = cData.id
  }

  // Fetch projects linked to this client
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id, name, status, start_date, end_date,
      tasks(id, status, progress, deadline, title, assigned_user:users!tasks_assigned_to_fkey(id, name, avatar_url))
    `)
    .eq('client_id', clientId)

  if (error) {
    sendError(res, 'Failed to fetch portal data')
    return
  }

  // Format data strictly (no risk scores, no internal employee info)
  const sanitizedProjects = projects?.map(p => {
    const totalTasks = p.tasks?.length || 0
    const overallProgress = totalTasks > 0 
      ? Math.round(p.tasks.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / totalTasks)
      : 0
    
    // Milestones (represented as tasks for simplicity, or specific tasks that are milestones)
    const milestones = p.tasks?.filter((t: any) => t.status === 'completed').slice(0, 5).map((t: any) => ({
      title: t.title,
      completed_at: t.deadline // Using deadline as proxy for completed date in this view
    })) || []

    // Active team tasks (excluding cancelled)
    const active_tasks = p.tasks?.filter((t: any) => t.status !== 'cancelled').map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      progress: t.progress || 0,
      assigned_to: t.assigned_user ? {
        name: t.assigned_user.name,
        avatar_url: t.assigned_user.avatar_url,
        initials: t.assigned_user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
      } : null
    })) || []

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      start_date: p.start_date,
      end_date: p.end_date,
      overall_progress: overallProgress,
      milestones,
      active_tasks
    }
  })

  // Fetch their feedback
  const { data: feedback } = await supabase
    .from('client_feedback')
    .select('id, project_id, message, rating, created_at')
    .eq('client_id', userId)
    .order('created_at', { ascending: false })

  sendSuccess(res, {
    projects: sanitizedProjects,
    feedback: feedback || []
  })
}

/**
 * @route POST /api/clients/feedback
 * @desc Client submits feedback
 */
export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id

  const parsed = submitFeedbackSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })))
    return
  }

  const { project_id, message, rating } = parsed.data

  // Save feedback
  const { data: feedback, error } = await supabase
    .from('client_feedback')
    .insert({
      client_id: userId,
      project_id,
      message,
      rating
    })
    .select()
    .single()

  if (error || !feedback) {
    sendError(res, 'Failed to submit feedback')
    return
  }

  // Create alert for manager
  // Get project manager
  const { data: project } = await supabase
    .from('projects')
    .select('manager_id, name')
    .eq('id', project_id)
    .single()

  if (project?.manager_id) {
    const alertMessage = `New client feedback (${rating}/5) received for ${project.name}`
    await supabase.from('alerts').insert({
      manager_id: project.manager_id,
      project_id,
      type: 'client_feedback',
      severity: rating <= 2 ? 'high' : 'low',
      title: 'Client Feedback',
      message: alertMessage
    })

    // Emit socket to manager
    emitToManager(project.manager_id, 'client_feedback', {
      project_id,
      rating,
      message
    })
  }

  sendSuccess(res, feedback, 'Feedback submitted successfully', 201)
}

/**
 * @route POST /api/clients/tokens
 * @desc Client submits a support token (ticket)
 */
export const submitToken = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id

  const parsed = submitTokenSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })))
    return
  }

  const { project_id, title, message, severity } = parsed.data

  // Get project manager
  const { data: project } = await supabase
    .from('projects')
    .select('manager_id, name, client_id')
    .eq('id', project_id)
    .single()

  if (!project) {
    sendNotFound(res, 'Project')
    return
  }

  // Create alert for manager (used as a token)
  const alertMessage = `[Support Token] ${message}`
  const { data: alert, error } = await supabase
    .from('alerts')
    .insert({
      manager_id: project.manager_id,
      project_id,
      type: 'client_token',
      severity,
      title: `Token: ${title}`,
      message: alertMessage
    })
    .select()
    .single()

  if (error || !alert) {
    sendError(res, 'Failed to submit token')
    return
  }

  // Emit socket to manager
  emitToManager(project.manager_id, 'client_token_raised', {
    project_id,
    title,
    severity,
    message
  })

  sendSuccess(res, alert, 'Token raised successfully', 201)
}

/**
 * @route GET /api/clients/tokens
 * @desc Get all tokens raised by the client
 */
export const getClientTokens = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id

  // Determine client id based on the user_id
  const { data: cData } = await supabase.from('clients').select('id').eq('user_id', userId).single()
  if (!cData) {
    sendError(res, 'Client not found', 'NOT_FOUND', 404)
    return
  }

  // Fetch projects linked to this client
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('client_id', cData.id)

  if (!projects || projects.length === 0) {
    sendSuccess(res, [])
    return
  }

  const projectIds = projects.map(p => p.id)

  // Fetch tokens (alerts of type 'client_token')
  const { data: tokens, error } = await supabase
    .from('alerts')
    .select('id, project_id, title, message, severity, is_resolved, created_at, project:projects(name)')
    .in('project_id', projectIds)
    .eq('type', 'client_token')
    .order('created_at', { ascending: false })

  if (error) {
    sendError(res, 'Failed to fetch tokens')
    return
  }

  sendSuccess(res, tokens || [])
}
