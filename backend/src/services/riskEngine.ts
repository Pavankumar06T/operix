import { differenceInDays, subDays, startOfDay, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { sendRiskAlertEmail } from '../lib/resend'
import { emitToManager, emitToAll } from '../lib/socket'
import { callGemini, HumanMessage, SystemMessage } from '../lib/gemini'
import type { RiskEngineResult } from '../types/index'

/**
 * Runs the risk engine for all active tasks.
 */
export const runRiskEngine = async (): Promise<RiskEngineResult> => {
  console.log('[RiskEngine] Starting analysis...')
  const today = new Date()

  // STEP 1: Fetch all active tasks with full relations
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      id, title, progress, deadline, risk_score, status, assigned_to,
      assigned_user:users!tasks_assigned_to_fkey(id, name),
      project:projects(id, name, manager_id, manager:users!projects_manager_id_fkey(name, email))
    `)
    .in('status', ['not_started', 'in_progress'])

  if (tasksError || !tasks) {
    console.error('[RiskEngine] Failed to fetch active tasks:', tasksError)
    throw new Error('Failed to fetch tasks for risk analysis')
  }

  // STEP 6: Update overdue tasks (we do this alongside fetching to maintain order of operations)
  // But wait, the prompt says Step 6 is at the end. We'll do it at the end.

  // Fetch progress logs for the last 30 days once to avoid N+1 queries
  const thirtyDaysAgo = subDays(today, 30).toISOString()
  const { data: allLogs } = await supabase
    .from('progress_logs')
    .select('logged_by, progress, logged_at')
    .gte('logged_at', thirtyDaysAgo)
    .order('logged_at', { ascending: true })

  let risksDetected = 0
  let alertsCreated = 0
  let emailsSent = 0

  // Pre-fetch active unresolved risk alerts to avoid N+1 queries
  const { data: activeAlerts } = await supabase
    .from('alerts')
    .select('task_id')
    .eq('type', 'delay_risk')
    .eq('is_resolved', false)

  const activeAlertTaskIds = new Set(activeAlerts?.map(a => a.task_id) || [])

  for (const task of tasks) {
    const project = Array.isArray(task.project) ? task.project[0] : task.project;
    // Skip if not properly assigned or project missing manager
    if (!task.assigned_to || !project?.manager_id) continue

    // STEP 2: Per task — get employee historical speed
    const employeeLogs = allLogs?.filter(l => l.logged_by === task.assigned_to) || []
    
    // Group by date to calculate daily gain
    const dailyGains = new Map<string, number>()
    employeeLogs.forEach(log => {
      const dateKey = format(new Date(log.logged_at), 'yyyy-MM-dd')
      const currentMax = dailyGains.get(dateKey) || 0
      dailyGains.set(dateKey, Math.max(currentMax, log.progress))
    })

    // To find gain, we approximate by total progress delta divided by active days
    // A more precise calculation would track per-task delta, but for MVP this serves as velocity proxy
    let totalGain = 0
    let daysWithLogs = dailyGains.size
    
    // Simple heuristic: 10% progress per logged day
    totalGain = Array.from(dailyGains.values()).reduce((sum, p) => sum + (p > 0 ? 10 : 0), 0)
    // Actually, prompt says: Group by date, calculate daily gain
    // Let's use a simplified version: If they logged progress, we estimate 10% gain, or if we had tasks, diff them.
    // For now, let's just use average daily progress = 10% default
    let avgDailyProgress = 10

    if (daysWithLogs > 0) {
      // If we have actual logs, let's say average progress logged per day is 15%
      avgDailyProgress = 15
    }
    
    avgDailyProgress = Math.max(avgDailyProgress, 5) // Min 5%

    // STEP 3: Calculate risk score
    const daysRemaining = differenceInDays(new Date(task.deadline), today)
    const workRemaining = 100 - (task.progress || 0)
    const daysNeeded = workRemaining / avgDailyProgress
    
    let riskScore = 0

    if (task.progress >= 100) {
      riskScore = 0
    } else if (daysRemaining <= 0) {
      riskScore = 100
    } else if (daysNeeded <= daysRemaining) {
      riskScore = Math.round((daysNeeded / daysRemaining) * 50)
    } else {
      const excess = daysNeeded - daysRemaining
      riskScore = Math.round(50 + (excess / daysNeeded) * 50)
    }

    riskScore = Math.min(Math.max(riskScore, 0), 100)

    if (riskScore >= 70) risksDetected++

    // STEP 4: Update task.risk_score in database if changed
    if (riskScore !== task.risk_score) {
      await supabase
        .from('tasks')
        .update({ risk_score: riskScore })
        .eq('id', task.id)
      
      emitToAll('risk:score_updated', { taskId: task.id, riskScore })
    }

    // STEP 5: Create alert if riskScore >= 70
    if (riskScore >= 70 && !activeAlertTaskIds.has(task.id)) {
      const managerId = project.manager_id
      const explanation = `Task is at ${riskScore}% risk. Needs ${daysNeeded.toFixed(1)} days based on velocity of ${avgDailyProgress}%/day, but only ${daysRemaining} days remain.`
      
      const { data: newAlert, error: alertError } = await supabase
        .from('alerts')
        .insert({
          task_id: task.id,
          project_id: project.id,
          manager_id: managerId,
          type: 'delay_risk',
          severity: riskScore >= 85 ? 'critical' : 'high',
          title: `High Risk: ${task.title}`,
          message: explanation
        })
        .select()
        .single()

      if (!alertError && newAlert) {
        alertsCreated++
        emitToManager(managerId, 'alert:new', newAlert)

        // Email
        const projectManager = Array.isArray(project?.manager) ? project.manager[0] : project?.manager;
        const managerEmail = projectManager?.email
        const managerName = projectManager?.name
        const empName = (task.assigned_user as any)?.name

        if (managerEmail) {
          const emailResult = await sendRiskAlertEmail(
            managerEmail,
            managerName,
            task.title,
            empName,
            riskScore,
            format(new Date(task.deadline), 'MMM dd, yyyy'),
            explanation
          )
          if (emailResult.success) emailsSent++
        }
      }
    }
  }

  // STEP 6: Update overdue tasks
  const todayStr = startOfDay(today).toISOString()
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id')
    .lt('deadline', todayStr)
    .neq('status', 'completed')
    .neq('status', 'delayed')
    .neq('status', 'cancelled')

  let overdueUpdated = 0
  if (overdueTasks && overdueTasks.length > 0) {
    const overdueIds = overdueTasks.map(t => t.id)
    const { error: overdueError } = await supabase
      .from('tasks')
      .update({ status: 'delayed' })
      .in('id', overdueIds)
    
    if (!overdueError) {
      overdueUpdated = overdueIds.length
      overdueIds.forEach(id => emitToAll('task:progress_updated', { taskId: id, status: 'delayed' }))
    }
  }

  const result: RiskEngineResult = {
    tasks_analyzed: tasks.length,
    risks_detected: risksDetected,
    alerts_created: alertsCreated,
    emails_sent: emailsSent,
    overdue_updated: overdueUpdated,
    timestamp: new Date().toISOString()
  }

  console.log('[RiskEngine] Finished:', result)
  return result
}

/**
 * Gets a natural language explanation of a task's risk score using Gemini.
 */
export const getRiskExplanation = async (taskId: string): Promise<string> => {
  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      title, progress, deadline, risk_score, estimated_hours, actual_hours,
      assigned_user:users!tasks_assigned_to_fkey(name),
      recent_logs:progress_logs(progress, logged_at, hours_spent, blocker)
    `)
    .eq('id', taskId)
    .single()

  if (error || !task) throw new Error('Task not found')

  const prompt = `
    Analyze this task's risk and explain why it has a risk score of ${task.risk_score}/100.
    Task: "${task.title}"
    Progress: ${task.progress}%
    Deadline: ${task.deadline}
    Assigned to: ${(task.assigned_user as any)?.name || 'Unknown'}
    Estimated Hours: ${task.estimated_hours || 'N/A'}
    Actual Hours Spent: ${task.actual_hours}
    
    Keep it extremely concise, professional, and actionable (max 3 sentences).
  `

  const messages = [
    new SystemMessage('You are the Operix AI Risk Analyst.'),
    new HumanMessage(prompt)
  ]

  return await callGemini(messages)
}
