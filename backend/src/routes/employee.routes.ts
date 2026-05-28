import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { getEmployeePortal } from '../controllers/employee.controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

router.get('/portal', getEmployeePortal)

export default router
