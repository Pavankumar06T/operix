import { Router } from 'express'
import {
  getAll,
  getUnreadCount,
  markSeen,
  markResolved,
  markAllSeen
} from '../controllers/alert.controller'
import { authenticate, requireManager } from '../middleware/auth'
import { asyncHandler } from '../middleware/response'

const router = Router()

// Alerts are manager-facing in this design
router.use(authenticate, requireManager)

// Ensure specific routes like /count or /seen-all come before /:id
router.get('/count', asyncHandler(getUnreadCount))
router.patch('/seen-all', asyncHandler(markAllSeen))

router.get('/', asyncHandler(getAll))
router.patch('/:id/seen', asyncHandler(markSeen))
router.patch('/:id/resolve', asyncHandler(markResolved))

export default router
