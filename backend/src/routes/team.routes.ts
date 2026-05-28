import { Router } from 'express'
import {
  getAll,
  getWorkload,
  getEmployeeProfile,
  getEmployeeTasks,
  getBurnoutData,
  getPerformance
} from '../controllers/team.controller'
import { authenticate, requireManager, requireManagerOrEmployee } from '../middleware/auth'
import { asyncHandler } from '../middleware/response'

const router = Router()

router.use(authenticate)

// All endpoints generally viewable by managers. Employees might only view specific parts.
// We'll restrict to requireManagerOrEmployee generally, but restrict sensitive data in the controller.

router.get('/', requireManagerOrEmployee, asyncHandler(getAll))
router.get('/workload', requireManagerOrEmployee, asyncHandler(getWorkload))
router.get('/:id', requireManagerOrEmployee, asyncHandler(getEmployeeProfile))
router.get('/:id/tasks', requireManagerOrEmployee, asyncHandler(getEmployeeTasks))
router.get('/:id/performance', requireManagerOrEmployee, asyncHandler(getPerformance))

// Manager only
router.get('/:id/burnout', requireManager, asyncHandler(getBurnoutData))

export default router
