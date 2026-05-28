// ═══════════════════════════════════════════════════════
// B5: Authentication Middleware — JWT + Role Guards
// ═══════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { supabase } from '../lib/supabase'
import type { UserRole, JwtPayload } from '../types/index'

// ─── Extend Express Request ────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: UserRole
        name: string
        department?: string
      }
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? ''

if (!JWT_SECRET) {
  console.error('[Auth] ❌ Missing JWT_SECRET environment variable')
  process.exit(1)
}

// ─── Authenticate — Verify JWT + User Exists ────────────

/**
 * Validates the JWT Bearer token from the Authorization header.
 * Queries Supabase to confirm the user exists and is active.
 * Attaches user info to req.user for downstream handlers.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
        code: 'AUTH_TOKEN_MISSING',
        timestamp: new Date().toISOString(),
      })
      return
    }

    const token = authHeader.slice(7) // Remove "Bearer "

    // Verify JWT
    let decoded: JwtPayload
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    } catch (jwtError) {
      const errorMessage =
        jwtError instanceof jwt.TokenExpiredError
          ? 'Token has expired. Please log in again.'
          : 'Invalid authentication token.'

      const errorCode =
        jwtError instanceof jwt.TokenExpiredError
          ? 'AUTH_TOKEN_EXPIRED'
          : 'AUTH_TOKEN_INVALID'

      res.status(401).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Verify user still exists and is active in the database
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('id, name, email, role, department, is_active')
      .eq('id', decoded.id)
      .single()

    if (dbError || !user) {
      res.status(401).json({
        success: false,
        error: 'User account not found.',
        code: 'AUTH_USER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      })
      return
    }

    if (!user.is_active) {
      res.status(401).json({
        success: false,
        error: 'Account has been deactivated. Contact your administrator.',
        code: 'AUTH_ACCOUNT_INACTIVE',
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Attach user to request
    req.user = {
      id: user.id as string,
      email: user.email as string,
      role: user.role as UserRole,
      name: user.name as string,
      department: user.department as string | undefined,
    }

    next()
  } catch (error) {
    console.error('[Auth] Middleware error:', error)
    res.status(500).json({
      success: false,
      error: 'Authentication service unavailable.',
      code: 'AUTH_SERVICE_ERROR',
      timestamp: new Date().toISOString(),
    })
  }
}

// ─── Role Guard: Manager Only ───────────────────────────

export const requireManager = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'manager') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Manager role required.',
      code: 'ROLE_MANAGER_REQUIRED',
      timestamp: new Date().toISOString(),
    })
    return
  }
  next()
}

// ─── Role Guard: Employee Only ──────────────────────────

export const requireEmployee = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'employee') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Employee role required.',
      code: 'ROLE_EMPLOYEE_REQUIRED',
      timestamp: new Date().toISOString(),
    })
    return
  }
  next()
}

// ─── Role Guard: Client Only ────────────────────────────

export const requireClient = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'client') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Client role required.',
      code: 'ROLE_CLIENT_REQUIRED',
      timestamp: new Date().toISOString(),
    })
    return
  }
  next()
}

// ─── Role Guard: Manager or Employee ────────────────────

export const requireManagerOrEmployee = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'manager' && req.user?.role !== 'employee') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Manager or Employee role required.',
      code: 'ROLE_STAFF_REQUIRED',
      timestamp: new Date().toISOString(),
    })
    return
  }
  next()
}
