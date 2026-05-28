import { Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { sendSuccess, sendError, sendNotFound, getPagination } from '../middleware/response'

/**
 * @route GET /api/alerts
 * @desc Get all alerts for the current manager
 */
export const getAll = async (req: Request, res: Response): Promise<void> => {
  const { type, severity, is_seen, is_resolved, page, limit } = req.query
  const managerId = req.user?.id
  const pagination = getPagination(req.query, 0)

  let query = supabase
    .from('alerts')
    .select(`
      *,
      task:tasks(id, title, status, progress, deadline),
      project:projects(id, name)
    `, { count: 'exact' })
    
  if (req.user?.department !== 'HR') {
    query = query.eq('manager_id', managerId)
  }

  if (type) query = query.eq('type', type)
  if (severity) query = query.eq('severity', severity)
  if (is_seen !== undefined) query = query.eq('is_seen', is_seen === 'true')
  if (is_resolved !== undefined) query = query.eq('is_resolved', is_resolved === 'true')

  query = query
    .order('created_at', { ascending: false })
    .range(pagination.offset, pagination.offset + pagination.limit - 1)

  const { data: alerts, error, count } = await query

  if (error) {
    console.error('[Alerts] Get all error:', error)
    sendError(res, 'Failed to fetch alerts')
    return
  }

  pagination.meta.total = count || 0
  pagination.meta.total_pages = Math.ceil((count || 0) / pagination.limit)

  sendSuccess(res, alerts || [], undefined, 200, pagination.meta)
}

/**
 * @route GET /api/alerts/count
 * @desc Get count of unread/unseen alerts
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  const managerId = req.user?.id

  let countQuery = supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('is_seen', false)
    
  if (req.user?.department !== 'HR') {
    countQuery = countQuery.eq('manager_id', managerId)
  }

  const { error, count } = await countQuery

  if (error) {
    sendError(res, 'Failed to fetch alert count')
    return
  }

  sendSuccess(res, { unreadCount: count || 0 })
}

/**
 * @route PATCH /api/alerts/:id/seen
 * @desc Mark a specific alert as seen
 */
export const markSeen = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const managerId = req.user?.id

  let updateQuery = supabase
    .from('alerts')
    .update({ is_seen: true })
    .eq('id', id)
    
  if (req.user?.department !== 'HR') {
    updateQuery = updateQuery.eq('manager_id', managerId)
  }

  const { data: alert, error } = await updateQuery
    .select()
    .single()

  if (error || !alert) {
    sendNotFound(res, 'Alert')
    return
  }

  sendSuccess(res, alert, 'Alert marked as seen')
}

/**
 * @route PATCH /api/alerts/:id/resolve
 * @desc Mark a specific alert as resolved
 */
export const markResolved = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const managerId = req.user?.id

  let updateQuery = supabase
    .from('alerts')
    .update({ is_resolved: true, is_seen: true })
    .eq('id', id)
    
  if (req.user?.department !== 'HR') {
    updateQuery = updateQuery.eq('manager_id', managerId)
  }

  const { data: alert, error } = await updateQuery
    .select()
    .single()

  if (error || !alert) {
    sendNotFound(res, 'Alert')
    return
  }

  sendSuccess(res, alert, 'Alert resolved')
}

/**
 * @route PATCH /api/alerts/seen-all
 * @desc Mark all alerts as seen for the manager
 */
export const markAllSeen = async (req: Request, res: Response): Promise<void> => {
  const managerId = req.user?.id

  let updateQuery = supabase
    .from('alerts')
    .update({ is_seen: true })
    .eq('is_seen', false)
    
  if (req.user?.department !== 'HR') {
    updateQuery = updateQuery.eq('manager_id', managerId)
  }

  const { error } = await updateQuery

  if (error) {
    sendError(res, 'Failed to mark all alerts as seen')
    return
  }

  sendSuccess(res, null, 'All alerts marked as seen')
}
