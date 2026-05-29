import { Request, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { sendSuccess, sendError, sendValidationError } from '../middleware/response'

// ─── Helpers ───────────────────────────────────────────

export const formatDuration = (mins: number): string => {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const updateDailySummary = async (userId: string, dateStr: string) => {
  try {
    // 1. Calculate total login mins
    const { data: logins } = await supabase
      .from('login_sessions')
      .select('duration_mins')
      .eq('user_id', userId)
      .gte('login_at', `${dateStr}T00:00:00Z`)
      .lte('login_at', `${dateStr}T23:59:59Z`)
    
    const totalLoginMins = logins?.reduce((acc, curr) => acc + (curr.duration_mins || 0), 0) || 0

    // 2. Calculate active mins, tasks worked on, and technologies used
    const { data: taskLogs } = await supabase
      .from('task_time_logs')
      .select('duration_mins, task_id, technologies')
      .eq('user_id', userId)
      .gte('start_time', `${dateStr}T00:00:00Z`)
      .lte('start_time', `${dateStr}T23:59:59Z`)

    let totalActiveMins = 0
    const taskIds = new Set<string>()
    const techs = new Set<string>()

    if (taskLogs) {
      for (const log of taskLogs) {
        totalActiveMins += log.duration_mins || 0
        if (log.task_id) taskIds.add(log.task_id)
        if (log.technologies) {
          log.technologies.forEach((t: string) => techs.add(t))
        }
      }
    }

    // 3. Upsert into daily_work_summary
    const { error } = await supabase
      .from('daily_work_summary')
      .upsert({
        user_id: userId,
        work_date: dateStr,
        total_login_mins: totalLoginMins,
        total_active_mins: totalActiveMins,
        tasks_worked_on: taskIds.size,
        technologies_used: Array.from(techs),
        last_activity: new Date().toISOString()
      }, { onConflict: 'user_id, work_date' })

    if (error) console.error('Error updating daily summary:', error)
  } catch (err) {
    console.error('updateDailySummary exception:', err)
  }
}

// ─── Controllers ────────────────────────────────────────

export const loginTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    const ip = req.ip || req.socket.remoteAddress

    const { data, error } = await supabase
      .from('login_sessions')
      .insert({ user_id: userId, ip_address: ip, login_at: new Date().toISOString() })
      .select('id')
      .single()

    if (error) throw error

    // Initialize daily summary
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('daily_work_summary').upsert({
      user_id: userId,
      work_date: today,
      first_login: new Date().toISOString()
    }, { onConflict: 'user_id, work_date', ignoreDuplicates: true })

    sendSuccess(res, { sessionId: data.id })
  } catch (error: any) {
    console.error('loginTracking Error:', error)
    sendError(res, 'Failed to log session', 'TRACKING_ERROR', 500)
  }
}

export const logoutTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    const { sessionId } = req.body

    if (sessionId) {
      // Calculate duration
      const { data: session } = await supabase.from('login_sessions').select('login_at').eq('id', sessionId).single()
      
      if (session) {
        const now = new Date()
        const loginAt = new Date(session.login_at)
        const durationMins = Math.round((now.getTime() - loginAt.getTime()) / 60000)

        await supabase
          .from('login_sessions')
          .update({ logout_at: now.toISOString(), duration_mins: durationMins })
          .eq('id', sessionId)
      }
    }

    const today = new Date().toISOString().split('T')[0]
    await updateDailySummary(userId!, today)

    sendSuccess(res, { success: true })
  } catch (error: any) {
    console.error('logoutTracking Error:', error)
    sendError(res, 'Failed to end session', 'TRACKING_ERROR', 500)
  }
}

const startTaskSchema = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional()
})

export const startTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = startTaskSchema.safeParse(req.body)
    if (!parsed.success) {
      sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })))
      return
    }

    const userId = req.user?.id
    const { taskId, projectId } = parsed.data
    const now = new Date()

    // Stop any active timers first
    const { data: activeLogs } = await supabase
      .from('task_time_logs')
      .select('id, start_time')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (activeLogs && activeLogs.length > 0) {
      for (const log of activeLogs) {
        const start = new Date(log.start_time)
        const mins = Math.round((now.getTime() - start.getTime()) / 60000)
        await supabase
          .from('task_time_logs')
          .update({ end_time: now.toISOString(), duration_mins: mins, is_active: false })
          .eq('id', log.id)
      }
    }

    // Start new timer
    const { data, error } = await supabase
      .from('task_time_logs')
      .insert({
        task_id: taskId,
        user_id: userId,
        project_id: projectId,
        start_time: now.toISOString(),
        is_active: true
      })
      .select('id, start_time')
      .single()

    if (error) throw error

    sendSuccess(res, { timeLogId: data.id, startTime: data.start_time })
  } catch (error: any) {
    console.error('startTask Error:', error)
    sendError(res, 'Failed to start task timer', 'TRACKING_ERROR', 500)
  }
}

const stopTaskSchema = z.object({
  timeLogId: z.string().uuid(),
  technologies: z.array(z.string()).default([]),
  notes: z.string().optional()
})

export const stopTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = stopTaskSchema.safeParse(req.body)
    if (!parsed.success) {
      sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })))
      return
    }

    const userId = req.user?.id
    const { timeLogId, technologies, notes } = parsed.data
    const now = new Date()

    // Fetch the log to get start_time
    const { data: log } = await supabase
      .from('task_time_logs')
      .select('start_time, task_id, project_id')
      .eq('id', timeLogId)
      .single()

    if (!log) {
      sendError(res, 'Time log not found', 'NOT_FOUND', 404)
      return
    }

    const start = new Date(log.start_time)
    const durationMins = Math.max(1, Math.round((now.getTime() - start.getTime()) / 60000))

    // Update the task log
    await supabase
      .from('task_time_logs')
      .update({
        end_time: now.toISOString(),
        duration_mins: durationMins,
        technologies,
        notes,
        is_active: false
      })
      .eq('id', timeLogId)

    // Insert/Update technology logs
    const today = now.toISOString().split('T')[0]
    for (const tech of technologies) {
      // Find existing tech log for today, user, and task
      const { data: existingTech } = await supabase
        .from('technology_logs')
        .select('id, duration_mins')
        .eq('user_id', userId)
        .eq('technology', tech)
        .eq('logged_date', today)
        .eq('task_id', log.task_id)
        .maybeSingle()

      if (existingTech) {
        await supabase
          .from('technology_logs')
          .update({ duration_mins: (existingTech.duration_mins || 0) + durationMins })
          .eq('id', existingTech.id)
      } else {
        await supabase
          .from('technology_logs')
          .insert({
            user_id: userId,
            task_id: log.task_id,
            project_id: log.project_id,
            technology: tech,
            duration_mins: durationMins,
            logged_date: today
          })
      }
    }

    await updateDailySummary(userId!, today)

    // Additionally, auto-update the task progress internally (optional, but good practice)
    // We can fetch existing total hours spent and add to it, but for now we just log it.

    sendSuccess(res, { durationMins, technologies })
  } catch (error: any) {
    console.error('stopTask Error:', error)
    sendError(res, 'Failed to stop task timer', 'TRACKING_ERROR', 500)
  }
}

export const getActiveTimer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id

    const { data, error } = await supabase
      .from('task_time_logs')
      .select(`
        id, start_time, task_id, project_id,
        tasks ( title )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      sendSuccess(res, { active: false })
      return
    }

    const now = new Date()
    const start = new Date(data.start_time)
    const elapsedMins = Math.round((now.getTime() - start.getTime()) / 60000)

    sendSuccess(res, {
      active: true,
      timeLogId: data.id,
      taskId: data.task_id,
      projectId: data.project_id,
      taskTitle: (data.tasks as any)?.title,
      startTime: data.start_time,
      elapsedMins
    })
  } catch (error: any) {
    console.error('getActiveTimer Error:', error)
    sendError(res, 'Failed to fetch active timer', 'TRACKING_ERROR', 500)
  }
}

export const getTodaySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    const today = new Date().toISOString().split('T')[0]

    const { data: summary } = await supabase
      .from('daily_work_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', today)
      .maybeSingle()

    const { data: sessions } = await supabase
      .from('login_sessions')
      .select('id, login_at, logout_at, duration_mins')
      .eq('user_id', userId)
      .gte('login_at', `${today}T00:00:00Z`)
      .order('login_at', { ascending: true })

    const { data: taskLogs } = await supabase
      .from('task_time_logs')
      .select(`id, start_time, end_time, duration_mins, technologies, is_active, tasks(title)`)
      .eq('user_id', userId)
      .gte('start_time', `${today}T00:00:00Z`)
      .order('start_time', { ascending: true })

    // Generate timeline
    const timeline: any[] = []
    if (sessions) {
      sessions.forEach(s => {
        timeline.push({ time: s.login_at, type: 'login', description: 'Logged in', color: 'blue' })
        if (s.logout_at) {
          timeline.push({ time: s.logout_at, type: 'logout', description: 'Logged out', color: 'red' })
        }
      })
    }
    if (taskLogs) {
      taskLogs.forEach(t => {
        const title = (t.tasks as any)?.title || 'Unknown Task'
        timeline.push({ time: t.start_time, type: 'task_start', description: `Started: ${title}`, color: 'green' })
        if (t.end_time) {
          const formattedDur = formatDuration(t.duration_mins || 0)
          const techStr = t.technologies?.length ? ` — ${t.technologies.join(', ')}` : ''
          timeline.push({ time: t.end_time, type: 'task_stop', description: `Stopped: ${formattedDur}${techStr}`, color: 'gray' })
        }
      })
    }

    timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    // Generate Tech Used with Hours
    const techBreakdown: Record<string, number> = {}
    if (taskLogs) {
      taskLogs.forEach(t => {
        if (t.technologies && t.duration_mins) {
          t.technologies.forEach((tech: string) => {
            techBreakdown[tech] = (techBreakdown[tech] || 0) + t.duration_mins!
          })
        }
      })
    }

    const techArray = Object.keys(techBreakdown).map(k => ({
      technology: k,
      hours: +(techBreakdown[k] / 60).toFixed(1)
    })).sort((a, b) => b.hours - a.hours)

    sendSuccess(res, {
      totalLoginMins: summary?.total_login_mins || 0,
      totalActiveMins: summary?.total_active_mins || 0,
      sessionsCount: sessions?.length || 0,
      tasksWorkedOn: summary?.tasks_worked_on || 0,
      technologiesUsed: techArray,
      timelineOfDay: timeline
    })
  } catch (error: any) {
    console.error('getTodaySummary Error:', error)
    sendError(res, 'Failed to fetch summary', 'TRACKING_ERROR', 500)
  }
}

export const getWeeklySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params
    // Simple 7-day lookback
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const { data } = await supabase
      .from('daily_work_summary')
      .select('*')
      .eq('user_id', userId)
      .gte('work_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('work_date', { ascending: true })

    sendSuccess(res, { weekly: data || [] })
  } catch (error: any) {
    console.error('getWeeklySummary Error:', error)
    sendError(res, 'Failed to fetch weekly summary', 'TRACKING_ERROR', 500)
  }
}

export const getTechnologies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params
    const period = req.query.period || 'all'
    
    let query = supabase.from('technology_logs').select('technology, duration_mins, projects(name)').eq('user_id', userId)

    if (period === 'week') {
      const sevenDaysAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      query = query.gte('logged_date', sevenDaysAgo)
    } else if (period === 'month') {
      const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      query = query.gte('logged_date', thirtyDaysAgo)
    }

    const { data } = await query

    if (!data) {
      sendSuccess(res, [])
      return
    }

    const techMap: Record<string, { mins: number, projects: Set<string> }> = {}
    data.forEach(d => {
      if (!techMap[d.technology]) techMap[d.technology] = { mins: 0, projects: new Set() }
      techMap[d.technology].mins += d.duration_mins || 0
      if ((d.projects as any)?.name) techMap[d.technology].projects.add((d.projects as any).name)
    })

    const totalMins = Object.values(techMap).reduce((acc, curr) => acc + curr.mins, 0) || 1

    const result = Object.keys(techMap).map(k => {
      const hours = techMap[k].mins / 60;
      return {
        technology: k,
        totalHours: techMap[k].mins > 0 ? Math.max(0.1, +hours.toFixed(1)) : 0,
        percentage: Math.round((techMap[k].mins / totalMins) * 100),
        projects: Array.from(techMap[k].projects)
      };
    }).sort((a, b) => b.totalHours - a.totalHours)

    sendSuccess(res, result)
  } catch (error: any) {
    console.error('getTechnologies Error:', error)
    sendError(res, 'Failed to fetch technologies', 'TRACKING_ERROR', 500)
  }
}

export const getTeamOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0]

    // 1. Get all employees
    const { data: users } = await supabase
      .from('users')
      .select('id, name, avatar_url, role, department')
      .in('role', ['employee', 'manager'])

    if (!users) {
      sendSuccess(res, [])
      return
    }

    // 2. Get today's summary for all
    const { data: summaries } = await supabase
      .from('daily_work_summary')
      .select('*')
      .eq('work_date', today)

    // 3. Get currently active tasks
    const { data: activeTasks } = await supabase
      .from('task_time_logs')
      .select('user_id, start_time, tasks(title)')
      .eq('is_active', true)

    // 4. Map everything together
    const result = users.map(u => {
      const summary = summaries?.find(s => s.user_id === u.id)
      const activeTask = activeTasks?.find(t => t.user_id === u.id)
      
      let status = '🔴 Offline'
      let activeSince = null
      
      if (activeTask) {
        status = '🟢 Active'
        const mins = Math.round((new Date().getTime() - new Date(activeTask.start_time).getTime()) / 60000)
        activeSince = `Started ${formatDuration(mins)} ago`
      } else if (summary && new Date().getTime() - new Date(summary.last_activity).getTime() < 30 * 60000) {
        // Logged in recently but no active task -> Idle
        status = '🟡 Idle'
      }

      // Find top tech
      let topTech = 'None'
      if (summary?.technologies_used && summary.technologies_used.length > 0) {
        topTech = summary.technologies_used[0] // Simple proxy for top tech today
      }

      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar_url,
        department: u.department,
        status,
        currentTask: activeTask ? (activeTask.tasks as any)?.title : '—',
        activeSince,
        todayLoginTime: formatDuration(summary?.total_login_mins || 0),
        todayActiveTime: formatDuration(summary?.total_active_mins || 0),
        todayLoginMins: summary?.total_login_mins || 0,
        todayActiveMins: summary?.total_active_mins || 0,
        topTechnology: topTech,
        weeklyHours: '0h' // Can be augmented via another query if needed
      }
    })

    sendSuccess(res, result)
  } catch (error: any) {
    console.error('getTeamOverview Error:', error)
    sendError(res, 'Failed to fetch team overview', 'TRACKING_ERROR', 500)
  }
}

const manualLogSchema = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  technologies: z.array(z.string()).default([]),
  notes: z.string().optional()
})

export const manualLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = manualLogSchema.safeParse(req.body)
    if (!parsed.success) {
      sendValidationError(res, 'Validation failed', parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })))
      return
    }

    const userId = req.user?.id
    const { taskId, projectId, startTime, endTime, technologies, notes } = parsed.data

    const start = new Date(startTime)
    const end = new Date(endTime)
    const durationMins = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))

    if (durationMins <= 0) {
      sendError(res, 'End time must be after start time', 'VALIDATION_ERROR', 400)
      return
    }

    // Insert task log
    await supabase.from('task_time_logs').insert({
      task_id: taskId,
      user_id: userId,
      project_id: projectId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_mins: durationMins,
      technologies,
      notes,
      is_active: false
    })

    // Insert tech logs
    const loggedDate = start.toISOString().split('T')[0]
    for (const tech of technologies) {
      await supabase.from('technology_logs').insert({
        user_id: userId,
        task_id: taskId,
        project_id: projectId,
        technology: tech,
        duration_mins: durationMins,
        logged_date: loggedDate
      })
    }

    await updateDailySummary(userId!, loggedDate)

    sendSuccess(res, { success: true, durationMins })
  } catch (error: any) {
    console.error('manualLog Error:', error)
    sendError(res, 'Failed to manually log time', 'TRACKING_ERROR', 500)
  }
}
