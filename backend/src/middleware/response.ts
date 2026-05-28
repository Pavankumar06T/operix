// ═══════════════════════════════════════════════════════
// B6: Response Middleware — Standardized API Responses
// ═══════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express'
import type { PaginationMeta } from '../types/index'

// ─── Success Response ───────────────────────────────────

/**
 * Send a standardized success JSON response.
 *
 * @param res - Express Response object
 * @param data - The response payload
 * @param message - Optional success message
 * @param statusCode - HTTP status code (default: 200)
 * @param pagination - Optional pagination metadata
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  pagination?: PaginationMeta
): void => {
  const response: {
    success: true
    data: T
    message?: string
    pagination?: PaginationMeta
  } = {
    success: true,
    data,
  }

  if (message) {
    response.message = message
  }

  if (pagination) {
    response.pagination = pagination
  }

  res.status(statusCode).json(response)
}

// ─── Error Response ─────────────────────────────────────

/**
 * Send a standardized error JSON response.
 *
 * @param res - Express Response object
 * @param message - Human-readable error message
 * @param code - Machine-readable error code (default: INTERNAL_ERROR)
 * @param statusCode - HTTP status code (default: 500)
 */
export const sendError = (
  res: Response,
  message: string,
  code: string = 'INTERNAL_ERROR',
  statusCode: number = 500
): void => {
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
  })
}

// ─── Validation Error Response ──────────────────────────

/**
 * Send a 400 validation error with field-level details.
 */
export const sendValidationError = (
  res: Response,
  message: string,
  details?: Array<{ field: string; message: string }>
): void => {
  res.status(400).json({
    success: false,
    error: message,
    code: 'VALIDATION_ERROR',
    details,
    timestamp: new Date().toISOString(),
  })
}

// ─── Not Found Response ─────────────────────────────────

/**
 * Send a 404 not found error.
 */
export const sendNotFound = (
  res: Response,
  resource: string = 'Resource'
): void => {
  res.status(404).json({
    success: false,
    error: `${resource} not found.`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  })
}

// ─── Pagination Helper ──────────────────────────────────

/**
 * Calculate pagination metadata from query params.
 *
 * @param query - Express request query object
 * @param total - Total number of records
 * @returns Object with page, limit, offset, and pagination meta
 */
export const getPagination = (
  query: Record<string, unknown>,
  total: number
): {
  page: number
  limit: number
  offset: number
  meta: PaginationMeta
} => {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20))
  const offset = (page - 1) * limit
  const total_pages = Math.ceil(total / limit)

  return {
    page,
    limit,
    offset,
    meta: {
      page,
      limit,
      total,
      total_pages,
    },
  }
}

// ─── Global Error Handler ───────────────────────────────

interface AppError extends Error {
  statusCode?: number
  code?: string
}

/**
 * Express global error handler — catches all unhandled errors.
 * Must have 4 parameters to be recognized as error middleware.
 */
export const globalErrorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Handler]', {
      message: err.message,
      stack: err.stack,
      code: err.code,
    })
  } else {
    console.error('[Error Handler]', err.message)
  }

  // Determine status code
  const statusCode = err.statusCode ?? 500

  // Determine error message — hide internal errors in production
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again.'
      : err.message || 'Internal server error'

  const code = err.code ?? 'INTERNAL_ERROR'

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
  })
}

// ─── Async Handler Wrapper ──────────────────────────────

/**
 * Wraps an async Express route handler to automatically catch errors
 * and forward them to the global error handler via next().
 *
 * Usage: router.get('/path', asyncHandler(myController))
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
