import { Router } from 'express'
import { getAllReports, generateReport } from '../controllers/report.controller'
import { authenticate, requireManager } from '../middleware/auth'
import { asyncHandler } from '../middleware/response'

const router = Router()

router.use(authenticate, requireManager)

router.get('/', asyncHandler(getAllReports))
router.post('/generate', asyncHandler(generateReport))

export default router
