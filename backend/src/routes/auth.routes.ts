import { Router } from 'express'
import { login, register, me, logout, refresh, directResetPassword, updateProfile } from '../controllers/auth.controller'
import { authenticate, requireManager } from '../middleware/auth'
import { asyncHandler } from '../middleware/response'

const router = Router()

// Public routes
router.post('/login', asyncHandler(login))
router.post('/refresh', asyncHandler(refresh))
router.post('/logout', asyncHandler(logout))
router.post('/direct-reset-password', asyncHandler(directResetPassword))

// Protected routes
// Only managers can create new accounts in this system
router.post('/register', authenticate, requireManager, asyncHandler(register))
router.get('/me', authenticate, asyncHandler(me))
router.post('/update-profile', authenticate, asyncHandler(updateProfile))

export default router
