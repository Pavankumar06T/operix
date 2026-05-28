import { Router } from 'express'
import { authenticate, requireManager } from '../middleware/auth'
import {
  loginTracking,
  logoutTracking,
  startTask,
  stopTask,
  getActiveTimer,
  getTodaySummary,
  getWeeklySummary,
  getTechnologies,
  getTeamOverview,
  manualLog
} from '../controllers/tracking.controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Core tracking
router.post('/login', loginTracking)
router.post('/logout', logoutTracking)

// Task tracking
router.post('/task/start', startTask)
export const stopTaskHandler = stopTask
router.post('/task/stop', stopTask)
router.post('/manual-log', manualLog)

// Employee specific queries
router.get('/active-timer', getActiveTimer)
router.get('/today', getTodaySummary)

// Manager specific or shared queries
router.get('/weekly/:userId', getWeeklySummary)
router.get('/technologies/:userId', getTechnologies)

// Manager ONLY
router.get('/team-overview', requireManager, getTeamOverview)

export const trackingRoutes = router
