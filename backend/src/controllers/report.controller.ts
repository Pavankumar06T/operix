import { Request, Response } from 'express'
import { startOfWeek, endOfWeek, subDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { sendSuccess, sendError } from '../middleware/response'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

const llm = new ChatGoogleGenerativeAI({
  modelName: 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.2
})

export const getAllReports = async (req: Request, res: Response): Promise<void> => {
  const managerId = req.user?.id
  if (!managerId) {
    sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401)
    return
  }

  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    sendError(res, 'Failed to fetch reports')
    return
  }

  sendSuccess(res, data)
}

export const generateReport = async (req: Request, res: Response): Promise<void> => {
  const managerId = req.user?.id
  if (!managerId) {
    sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401)
    return
  }

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()

  // 1. Fetch all projects for this manager (or all for HR)
  let projectsQuery = supabase
    .from('projects')
    .select('id, name, status, progress')
    
  if (req.user?.department !== 'HR') {
    projectsQuery = projectsQuery.eq('manager_id', managerId)
  }

  const { data: projects } = await projectsQuery
  
  const projectIds = projects?.map(p => p.id) || []

  // 2. Fetch tasks for these projects in the current week
  let tasks: any[] = []
  if (projectIds.length > 0) {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, status, priority, risk_score')
      .in('project_id', projectIds)
      .gte('created_at', subDays(now, 7).toISOString())
    tasks = data || []
  }

  // 3. Compile context for Gemini
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const delayedTasks = tasks.filter(t => t.status === 'delayed').length
  const highRiskTasks = tasks.filter(t => t.risk_score && t.risk_score > 70).length

  const prompt = `
You are an AI Executive Assistant for the Operix platform.
Generate a concise, professional Weekly Report for a manager.

Here is the data for the past 7 days:
- Active Projects: ${projects?.length || 0}
- Tasks Completed this week: ${completedTasks}
- Tasks Delayed: ${delayedTasks}
- Tasks at High Risk: ${highRiskTasks}

Please write the report using Markdown with the exact following sections:
### 🌟 Key Achievements
(Highlight what went well, deduce from the ${completedTasks} completed tasks)

### ⚠️ Blockers & Delays
(Highlight any issues, deduce from the ${delayedTasks} delayed tasks and ${highRiskTasks} high risk tasks)

### 🎯 Focus for Next Week
(Suggest actionable next steps for the manager)

Keep it crisp, business-oriented, and do not use generic placeholders. Make it sound like an insightful analysis.
  `

  try {
    const response = await llm.invoke(prompt)
    const reportContent = response.content.toString()

    // 4. Save to database
    const { data: report, error } = await supabase
      .from('weekly_reports')
      .insert({
        week_start: weekStart,
        week_end: weekEnd,
        content: reportContent,
        generated_by: 'ai',
        email_sent: true // simulating that an email would be sent
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save report:', error)
      sendError(res, 'Failed to save generated report')
      return
    }

    sendSuccess(res, report, 'Report generated successfully')
  } catch (err) {
    console.error('AI Generation failed:', err)
    sendError(res, 'AI generation failed')
  }
}
