import { Router } from 'express'
import {
  getAll,
  getSingle,
  createTask,
  updateTask,
  deleteTask,
  updateProgress,
  getMyTasks,
  getTaskLogs
} from '../controllers/task.controller'
import { authenticate, requireManager, requireManagerOrEmployee } from '../middleware/auth'
import { asyncHandler } from '../middleware/response'

const router = Router()

// All task routes require authentication
router.use(authenticate)

// Get employee's own tasks (must be above /:id)
router.get('/my-tasks', requireManagerOrEmployee, asyncHandler(getMyTasks))

// GET operations
router.get('/', asyncHandler(getAll))
router.get('/:id', asyncHandler(getSingle))
router.get('/:id/logs', asyncHandler(getTaskLogs))

// Progress update available to managers and assigned employees
router.put('/:id/progress', requireManagerOrEmployee, asyncHandler(updateProgress))

// Creation/Modification/Deletion restricted to managers
router.post('/', requireManager, asyncHandler(createTask))
router.put('/:id', requireManager, asyncHandler(updateTask))
router.delete('/:id', requireManager, asyncHandler(deleteTask))

export default router