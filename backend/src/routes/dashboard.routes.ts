import { Router } from 'express'
import {
  getDashboard,
  getDashboardStats,
  getWeeklyActivity
} from '../controllers/dashboard.controller'
import { authenticate, requireManager } from '../middleware/auth'
import { asyncHandler } from '../middleware/response'

const router = Router()

router.use(authenticate, requireManager)

router.get('/', asyncHandler(getDashboard))
router.get('/stats', asyncHandler(getDashboardStats))
router.get('/weekly-activity', asyncHandler(getWeeklyActivity))

export default router
