import { Router, Request, Response } from 'express'
import { authenticate, requireManager } from '../middleware/auth'
import { asyncHandler, sendSuccess, sendError, sendValidationError } from '../middleware/response'
import { askOperix, generateProjectBreakdown } from '../services/aiAssistant'
import { runRiskEngine, getRiskExplanation } from '../services/riskEngine'
import { runBurnoutEngine } from '../services/burnoutEngine'

const router = Router()

router.use(authenticate)

/**
 * @route POST /api/ai/ask
 * @desc Chat with Operix AI
 */
router.post('/ask', asyncHandler(async (req: Request, res: Response) => {
  const { query, history } = req.body
  const userId = req.user?.id

  if (!query) {
    sendValidationError(res, 'Query is required', [{ field: 'query', message: 'Must provide a question' }])
    return
  }

  if (!userId) {
    sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401)
    return
  }

  const answer = await askOperix(query, userId, history)
  sendSuccess(res, { answer })
}))

/**
 * @route POST /api/ai/breakdown
 * @desc Generate tasks for a project
 */
router.post('/breakdown', requireManager, asyncHandler(async (req: Request, res: Response) => {
  const { projectId, description } = req.body
  const userId = req.user?.id

  if (!projectId || !description) {
    sendValidationError(res, 'Project ID and description are required', [])
    return
  }

  const tasks = await generateProjectBreakdown(projectId, description, userId as string)
  sendSuccess(res, { tasks }, 'Project breakdown generated successfully')
}))

/**
 * @route GET /api/ai/task-risk/:id
 * @desc Get AI explanation for task risk score
 */
router.get('/task-risk/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const explanation = await getRiskExplanation(id as string)
  sendSuccess(res, { explanation })
}))

// ─── Manual Engine Triggers (Manager Only) ──────────────

/**
 * @route POST /api/ai/run-risk
 * @desc Manually trigger risk engine
 */
router.post('/run-risk', requireManager, asyncHandler(async (req: Request, res: Response) => {
  const result = await runRiskEngine()
  sendSuccess(res, result, 'Risk engine executed successfully')
}))

/**
 * @route POST /api/ai/run-burnout
 * @desc Manually trigger burnout engine
 */
router.post('/run-burnout', requireManager, asyncHandler(async (req: Request, res: Response) => {
  const result = await runBurnoutEngine()
  sendSuccess(res, result, 'Burnout engine executed successfully')
}))

export default router
