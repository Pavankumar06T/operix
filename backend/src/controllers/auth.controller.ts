import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../middleware/response'
import type { UserRole, JwtPayload, JwtRefreshPayload, SafeUser } from '../types/index'

const JWT_SECRET = process.env.JWT_SECRET ?? ''

// ─── Validation Schemas ─────────────────────────────────

const loginSchema = z.strictObject({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.strictObject({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['manager', 'employee', 'client']),
  department: z.string().optional(),
  company_name: z.string().optional(), // For clients
})

const forgotPasswordSchema = z.strictObject({
  email: z.string().email('Invalid email format'),
})

const resetPasswordSchema = z.strictObject({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

const directResetPasswordSchema = z.strictObject({
  email: z.string().email('Invalid email format'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

const updateProfileSchema = z.strictObject({
  name: z.string().optional(),
  avatarBase64: z.string().optional(),
})

// ─── Helper Functions ───────────────────────────────────

const generateTokens = (user: SafeUser) => {
  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  }

  const refreshPayload: JwtRefreshPayload = {
    id: user.id,
  }

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
  const refreshToken = jwt.sign(refreshPayload, JWT_SECRET, { expiresIn: '7d' })

  return { accessToken, refreshToken }
}

// ─── Controllers ────────────────────────────────────────

/**
 * @route POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  // Validate request body
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })))
    return
  }

  const { email, password } = parsed.data

  // Fetch user from DB
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error || !user) {
    sendError(res, 'Invalid credentials', 'AUTH_INVALID_CREDENTIALS', 401)
    return
  }

  if (!user.is_active) {
    sendError(res, 'Account is inactive', 'AUTH_ACCOUNT_INACTIVE', 401)
    return
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    sendError(res, 'Invalid credentials', 'AUTH_INVALID_CREDENTIALS', 401)
    return
  }

  // Remove password_hash from response
  const { password_hash, ...safeUser } = user

  const tokens = generateTokens(safeUser as SafeUser)

  // -- Tracking System Integration --
  const ip = req.ip || req.socket.remoteAddress
  const { data: sessionData } = await supabase
    .from('login_sessions')
    .insert({ user_id: safeUser.id, ip_address: ip, login_at: new Date().toISOString() })
    .select('id')
    .maybeSingle()

  const sessionId = sessionData?.id

  // Initialize daily summary
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('daily_work_summary').upsert({
    user_id: safeUser.id,
    work_date: today,
    first_login: new Date().toISOString()
  }, { onConflict: 'user_id, work_date', ignoreDuplicates: true })

  sendSuccess(res, {
    user: safeUser,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    sessionId
  }, 'Login successful')
}

/**
 * @route POST /api/auth/register
 * @desc Create new user. Managers only can create employee/manager accounts.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })))
    return
  }

  const { name, email, password, role, department, company_name } = parsed.data

  // Check if email exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingUser) {
    sendError(res, 'Email already registered', 'AUTH_EMAIL_EXISTS', 409)
    return
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12)

  // Insert User
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      name,
      email,
      password_hash: passwordHash,
      role,
      department: department || null,
      is_active: true,
    })
    .select()
    .single()

  if (insertError || !newUser) {
    console.error('[Auth] Register error:', insertError)
    sendError(res, 'Failed to create user', 'AUTH_CREATE_FAILED', 500)
    return
  }

  // If role is client, create client record
  if (role === 'client') {
    const { error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: newUser.id,
        company_name: company_name || `${name}'s Company`,
        contact_name: name,
        contact_email: email,
      })
    
    if (clientError) {
      console.error('[Auth] Client record creation error:', clientError)
      // Rollback user creation could be done here, but ignoring for now
    }
  }

  const { password_hash, ...safeUser } = newUser
  const tokens = generateTokens(safeUser as SafeUser)

  sendSuccess(res, {
    user: safeUser,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  }, 'User registered successfully', 201)
}

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id

  if (!userId) {
    sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401)
    return
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, role, avatar_url, department, phone, is_active, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error || !user) {
    sendNotFound(res, 'User')
    return
  }

  sendSuccess(res, { user })
}

/**
 * @route POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.body
  const userId = req.user?.id

  if (sessionId) {
    const { data: session } = await supabase.from('login_sessions').select('login_at').eq('id', sessionId).single()
    
    if (session) {
      const now = new Date()
      const loginAt = new Date(session.login_at)
      const durationMins = Math.round((now.getTime() - loginAt.getTime()) / 60000)

      await supabase
        .from('login_sessions')
        .update({ logout_at: now.toISOString(), duration_mins: durationMins })
        .eq('id', sessionId)
        
      if (userId) {
        const today = new Date().toISOString().split('T')[0]
        
        // Quick update to total_login_mins (we can rely on cron or exact calculation later)
        const { data: summary } = await supabase.from('daily_work_summary').select('total_login_mins').eq('user_id', userId).eq('work_date', today).single()
        if (summary) {
           await supabase.from('daily_work_summary').update({
             total_login_mins: (summary.total_login_mins || 0) + durationMins
           }).eq('user_id', userId).eq('work_date', today)
        }
      }
    }
  }

  sendSuccess(res, null, 'Logged out successfully')
}

/**
 * @route POST /api/auth/refresh
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    sendError(res, 'Refresh token required', 'AUTH_REFRESH_TOKEN_MISSING', 400)
    return
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as JwtRefreshPayload

    // Fetch user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_active')
      .eq('id', decoded.id)
      .single()

    if (error || !user || !user.is_active) {
      throw new Error('User not found or inactive')
    }

    const payload: JwtPayload = {
      id: user.id as string,
      email: user.email as string,
      role: user.role as UserRole,
      name: user.name as string,
    }

    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })

    sendSuccess(res, { accessToken: newAccessToken })
  } catch (err) {
    sendError(res, 'Invalid or expired token', 'TOKEN_INVALID', 400)
  }
}

/**
 * @route POST /api/auth/direct-reset-password
 */
export const directResetPassword = async (req: Request, res: Response): Promise<void> => {
  const parsed = directResetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })))
    return
  }

  const { email, newPassword } = parsed.data

  try {
    const salt = await bcrypt.genSalt(12)
    const hash = await bcrypt.hash(newPassword, salt)

    const { error } = await supabase.from('users').update({ password_hash: hash }).eq('email', email)
    if (error) {
      sendError(res, 'Failed to update password', 'DB_ERROR', 500)
      return
    }

    sendSuccess(res, null, 'Password updated successfully')
  } catch (err) {
    sendError(res, 'Internal server error', 'SERVER_ERROR', 500)
  }
}

/**
 * @route POST /api/auth/update-profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id
  if (!userId) {
    sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401)
    return
  }

  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })))
    return
  }

  const { name, avatarBase64 } = parsed.data
  const updates: any = {}

  if (name) updates.name = name

  if (avatarBase64) {
    try {
      // Ensure the 'avatars' bucket exists
      const { data: buckets } = await supabase.storage.listBuckets()
      if (!buckets?.find(b => b.name === 'avatars')) {
        await supabase.storage.createBucket('avatars', { public: true })
      }

      // Convert base64 to buffer
      // Expecting format like "data:image/png;base64,iVBORw0KGgo..."
      const matches = avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
      if (!matches || matches.length !== 3) {
        sendError(res, 'Invalid base64 string', 'INVALID_IMAGE', 400)
        return
      }

      const contentType = matches[1]
      const buffer = Buffer.from(matches[2], 'base64')
      
      // Determine extension
      const ext = contentType.split('/')[1] || 'png'
      const filename = `${userId}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, buffer, { contentType, upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename)

      updates.avatar_url = publicUrlData.publicUrl
    } catch (err) {
      console.error('[Update Profile] Storage Error:', err)
      sendError(res, 'Failed to upload avatar', 'UPLOAD_ERROR', 500)
      return
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)

    if (updateError) {
      sendError(res, 'Failed to update profile in database', 'DB_ERROR', 500)
      return
    }
  }

  // Fetch and return the updated user
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, role, avatar_url, department, phone, is_active, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error || !user) {
    sendNotFound(res, 'User')
    return
  }

  sendSuccess(res, { user }, 'Profile updated successfully')
}
