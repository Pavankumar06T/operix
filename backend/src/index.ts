import 'dotenv/config'
import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cron from 'node-cron'

// Import utilities
import { initSocket } from './lib/socket'
import { testConnection, supabase } from './lib/supabase'
import { globalErrorHandler } from './middleware/response'

// Import Routes
import authRoutes from './routes/auth.routes'
import projectRoutes from './routes/project.routes'
import taskRoutes from './routes/task.routes'
import teamRoutes from './routes/team.routes'
import alertRoutes from './routes/alert.routes'
import clientRoutes from './routes/client.routes'
import dashboardRoutes from './routes/dashboard.routes'
import aiRoutes from './routes/ai.routes'
import reportRoutes from './routes/report.routes'
import { trackingRoutes } from './routes/tracking.routes'
import employeeRoutes from './routes/employee.routes'

// Import Services for Cron
import { runRiskEngine } from './services/riskEngine'
import { runBurnoutEngine } from './services/burnoutEngine'
import { generateWeeklyReport } from './services/reportGenerator'

// ─── Environment & App Setup ────────────────────────────

const PORT = process.env.PORT || 5000
const app = express()
const server = http.createServer(app)

// ─── Middleware ─────────────────────────────────────────

app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(morgan('dev'))

// ─── Routes ─────────────────────────────────────────────

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/tracking', trackingRoutes)
app.use('/api/employee', employeeRoutes)

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Global Error Handler ───────────────────────────────

app.use(globalErrorHandler)

// ─── Socket.io Initialization ───────────────────────────

initSocket(server)

// ─── Cron Jobs ──────────────────────────────────────────

// Risk Engine: Runs every hour
cron.schedule('0 * * * *', async () => {
  try {
    await runRiskEngine()
  } catch (error) {
    console.error('[Cron] Risk Engine failed:', error)
  }
})

// Burnout Engine: Runs Sunday at midnight
cron.schedule('0 0 * * 0', async () => {
  try {
    await runBurnoutEngine()
  } catch (error) {
    console.error('[Cron] Burnout Engine failed:', error)
  }
})

// Weekly Reports: Runs Monday at 6:00 AM
cron.schedule('0 6 * * 1', async () => {
  try {
    console.log('[Cron] Generating weekly reports...')
    // Fetch all managers to generate reports for them
    const { data: managers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'manager')
      .eq('is_active', true)

    if (managers) {
      const period = `Week of ${new Date().toISOString().split('T')[0]}`
      for (const m of managers) {
        await generateWeeklyReport(m.id, period).catch(e => 
          console.error(`[Cron] Report failed for manager ${m.id}:`, e)
        )
      }
    }
  } catch (error) {
    console.error('[Cron] Weekly Reports failed:', error)
  }
})

// ─── Server Startup ─────────────────────────────────────

const startServer = async () => {
  console.log('═════════════════════════════════════════════')
  console.log('🚀 Starting OPERIX Backend')
  console.log('═════════════════════════════════════════════')

  // Test DB connection before starting server
  await testConnection()

  server.listen(PORT, () => {
    console.log(`[Server] ✅ Listening on port ${PORT}`)
    console.log(`[Server] ✅ Environment: ${process.env.NODE_ENV}`)
  })
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Process] ❌ Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[Process] ❌ Unhandled Rejection:', reason)
})

startServer()
