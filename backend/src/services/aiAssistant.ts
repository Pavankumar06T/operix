import { supabase } from '../lib/supabase'
import { callGemini, HumanMessage, SystemMessage, AIMessage, geminiChat } from '../lib/gemini'

export const askOperix = async (query: string, userId: string, history: { role: string, content: string }[] = []): Promise<string> => {
  // 1. Get user details
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    throw new Error('User not found')
  }

  const { name, role } = user
  let contextData = ''

  // 2. Gather context based on role
  if (role === 'manager') {
    // Get manager's active projects and high risk tasks
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status, tasks(id, title, status, risk_score, deadline, assigned_to:users!tasks_assigned_to_fkey(name))')
      .eq('manager_id', userId)
      .eq('status', 'active')

    // Get unread alerts
    const { data: alerts } = await supabase
      .from('alerts')
      .select('title, severity')
      .eq('manager_id', userId)
      .eq('is_seen', false)

    let highRiskCount = 0
    let activeTaskCount = 0

    projects?.forEach(p => {
      p.tasks?.forEach((t: any) => {
        activeTaskCount++
        if (t.risk_score >= 70) highRiskCount++
      })
    })

    const projectsList = projects?.map(p => {
      const taskList = p.tasks?.map((t: any) => 
        `- [${t.status}] ${t.title} (Risk: ${t.risk_score || 0}, Deadline: ${t.deadline}, Assignee: ${t.assigned_to?.name || 'Unassigned'})`
      ).join('\n        ') || 'No tasks'
      
      return `Project: ${p.name}\n        Tasks:\n        ${taskList}`
    }).join('\n\n      ') || 'None'

    contextData = `
      You manage ${projects?.length || 0} active projects with ${activeTaskCount} total tasks.
      There are ${highRiskCount} high-risk tasks requiring attention.
      You have ${alerts?.length || 0} unread alerts.

      --- PROJECTS & TASKS DETAILS ---
      ${projectsList}

      --- ALERTS ---
      ${alerts?.map(a => `- [${a.severity}] ${a.title}`).join('\n      ') || 'No unread alerts.'}
    `
  } else if (role === 'employee') {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, status, deadline')
      .eq('assigned_to', userId)

    const activeTasks = tasks?.filter(t => t.status !== 'completed' && t.status !== 'cancelled') || []
    const completedTasks = tasks?.filter(t => t.status === 'completed') || []

    contextData = `
      You have ${activeTasks.length} active assigned tasks and you have successfully completed ${completedTasks.length} tasks!
      Active Tasks list:
      ${activeTasks.map(t => `- ${t.title} (Status: ${t.status}, Deadline: ${t.deadline})`).join('\n') || 'No active tasks.'}
      
      Completed Tasks list:
      ${completedTasks.slice(0, 5).map(t => `- ${t.title}`).join('\n') || 'None yet.'}
    `
  } else if (role === 'client') {
    contextData = `You are a client. You can ask for general project updates, but specific details might be restricted.`
  }

  // 3. Build prompt
  const systemPrompt = `
    You are Operix AI, an intelligent project management assistant.
    The current user is ${name}, and their role is ${role}.
    Here is their current context derived from the database:
    ${contextData}

    Rules:
    - Answer the user's question accurately based on the context and previous conversation.
    - If the user asks something outside the context, inform them you don't have that data currently but offer general advice.
    - Be concise, professional, and helpful. Use markdown formatting (bullet points, bold text).
    - Do not make up fake data. If you don't know, say so.
  `

  const messages = [
    new SystemMessage(systemPrompt)
  ]

  // Inject history
  history.forEach(h => {
    if (h.role === 'user') {
      messages.push(new HumanMessage(h.content))
    } else if (h.role === 'assistant') {
      messages.push(new AIMessage(h.content))
    }
  })

  // Add the current query
  messages.push(new HumanMessage(query))

  // 4. Call Gemini
  return await callGemini(messages, geminiChat)
}

/**
 * AI Service to break down a project description into tasks
 */
export const generateProjectBreakdown = async (projectId: string, description: string, userId: string) => {
  const systemPrompt = `
    You are an expert Project Manager AI. Break down the following project description into 3-6 actionable tasks.
    You MUST respond with raw JSON matching this structure perfectly. NO markdown blocks.
    [
      {
        "title": "Task title",
        "description": "Task description",
        "priority": "high" | "medium" | "low",
        "estimated_hours": 10
      }
    ]
  `

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(`Project Description: ${description}`)
  ]

  const responseString = await callGemini(messages, geminiChat)
  
  try {
    let jsonString = responseString
    const match = jsonString.match(/\[[\s\S]*\]/)
    if (match) {
      jsonString = match[0]
    } else {
      throw new Error('No JSON array found in response')
    }
    
    const tasks = JSON.parse(jsonString)
    
    // Insert tasks into database
    const dbTasks = tasks.map((t: any) => ({
      project_id: projectId,
      title: t.title,
      description: t.description,
      priority: t.priority || 'medium',
      estimated_hours: t.estimated_hours || 5,
      status: 'not_started',
      risk_score: Math.floor(Math.random() * 20) + 10, // Default low risk
      assigned_to: null, // Leave unassigned for the manager to distribute
      created_by: userId,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week from now
    }))

    const { data, error } = await supabase.from('tasks').insert(dbTasks).select()
    
    if (error) throw error
    return data
    
  } catch (error) {
    console.error('[AI Breakdown] Error parsing or inserting:', error)
    throw new Error('Failed to generate project breakdown.')
  }
}