import { Router } from 'express'
import {
  getAll,
  createClient,
  getSingle,
  updateClient,
  getClientProjects,
  getClientPortalData,
  submitFeedback,
  submitToken,
  getClientTokens
} from '../controllers/client.controller'
import { authenticate, requireManager, requireClient } from '../middleware/auth'
import { asyncHandler } from '../middleware/response'

const router = Router()

router.use(authenticate)

// Client routes
router.post('/feedback', requireClient, asyncHandler(submitFeedback))
router.post('/tokens', requireClient, asyncHandler(submitToken))
router.get('/tokens', requireClient, asyncHandler(getClientTokens))
router.get('/:id/portal', asyncHandler(getClientPortalData)) // Can be accessed by client or manager

// Manager routes
router.get('/', requireManager, asyncHandler(getAll))
router.post('/', requireManager, asyncHandler(createClient))
router.get('/:id', requireManager, asyncHandler(getSingle))
router.put('/:id', requireManager, asyncHandler(updateClient))
router.get('/:id/projects', requireManager, asyncHandler(getClientProjects))

export default router
