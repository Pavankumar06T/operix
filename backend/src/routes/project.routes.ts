import { Router } from 'express'
import {
  getAll,
  getSingle,
  createProject,
  updateProject,
  deleteProject,
  getProjectTasks,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  getProjectStats
} from '../controllers/project.controller'
import { authenticate, requireManager, requireManagerOrEmployee } from '../middleware/auth'
import { asyncHandler } from '../middleware/response'

const router = Router()

// All project routes require authentication
router.use(authenticate)

// GET operations available to managers and employees (employees might need project filter in future)
router.get('/', asyncHandler(getAll))
router.get('/:id', asyncHandler(getSingle))
router.get('/:id/tasks', asyncHandler(getProjectTasks))
router.get('/:id/members', asyncHandler(getProjectMembers))
router.get('/:id/stats', asyncHandler(getProjectStats))

// Modification operations restricted to managers
router.post('/', requireManager, asyncHandler(createProject))
router.put('/:id', requireManager, asyncHandler(updateProject))
router.delete('/:id', requireManager, asyncHandler(deleteProject))
router.post('/:id/members', requireManager, asyncHandler(addProjectMember))
router.delete('/:id/members/:userId', requireManager, asyncHandler(removeProjectMember))

export default router
