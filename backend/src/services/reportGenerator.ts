import { subDays, startOfDay, endOfDay, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { callGemini, HumanMessage, SystemMessage, geminiReport } from '../lib/gemini'
import { sendWeeklyReportEmail } from '../lib/resend'

/**
 * Generates an AI-summarized weekly report for a manager.
 */
export const generateWeeklyReport = async (managerId: string, period: string): Promise<any> => {
  console.log(`[ReportGenerator] Generating report for manager ${managerId}`)

  // 1. Fetch manager details
  const { data: manager, error: mError } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', managerId)
    .single()

  if (mError || !manager) throw new Error('Manager not found')

  // 2. Fetch projects & tasks
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('manager_id', managerId)

  const projectIds = projects?.map(p => p.id) || []
  
  const sevenDaysAgo = startOfDay(subDays(new Date(), 7)).toISOString()
  const today = endOfDay(new Date()).toISOString()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, status, updated_at, risk_score')
    .in('project_id', projectIds)

  if (!tasks) throw new Error('No tasks found to generate report')

  // Calculate stats
  const completedThisWeek = tasks.filter(t => t.status === 'completed' && t.updated_at >= sevenDaysAgo && t.updated_at <= today)
  const currentlyDelayed = tasks.filter(t => t.status === 'delayed')
  const highRisk = tasks.filter(t => t.risk_score >= 70)
  
  // Base raw data summary for Gemini
  const rawData = `
    Period: ${period}
    Active Projects: ${projects?.length || 0}
    Tasks Completed this week: ${completedThisWeek.length}
    Tasks Currently Delayed: ${currentlyDelayed.length}
    Tasks at High Risk (>70): ${highRisk.length}
    
    Notable Completed: ${completedThisWeek.slice(0, 3).map(t => t.title).join(', ')}
    Notable Delayed: ${currentlyDelayed.slice(0, 3).map(t => t.title).join(', ')}
  `

  // 3. Ask Gemini to generate report content
  const systemPrompt = `
    You are the Operix AI Reporting Engine. Write a concise, executive weekly summary report for a project manager.
    Use professional tone. Use Markdown.
    Focus on key achievements, current bottlenecks (delays), and risks.
    Format with 3 short sections:
    ### 🌟 Key Achievements
    ### ⚠️ Blockers & Delays
    ### 🎯 Focus for Next Week
  `

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(`Raw Data:\n${rawData}\nPlease generate the report content.`)
  ]

  const reportContent = await callGemini(messages, geminiReport)

  // 4. Save to Database
  const { data: savedReport, error: rError } = await supabase
    .from('reports')
    .insert({
      manager_id: managerId,
      period,
      content: reportContent
    })
    .select()
    .single()

  if (rError) {
    console.error('[ReportGenerator] Failed to save report:', rError)
    throw new Error('Failed to save report to DB')
  }

  // 5. Send Email
  if (manager.email) {
    // Approximate team efficiency
    const totalAssignedThisWeek = tasks.filter(t => t.updated_at >= sevenDaysAgo).length || 1
    const efficiency = Math.round((completedThisWeek.length / totalAssignedThisWeek) * 100)

    await sendWeeklyReportEmail(
      manager.email,
      manager.name,
      period,
      reportContent,
      {
        tasksCompleted: completedThisWeek.length,
        tasksDelayed: currentlyDelayed.length,
        avgEfficiency: efficiency > 100 ? 100 : efficiency,
        activeProjects: projects?.length || 0
      }
    )
  }

  return savedReport
}
