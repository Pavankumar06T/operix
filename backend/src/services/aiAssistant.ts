// ══════════════════════════════════════════════════════════
// KaisenFlow — Conversational AI Assistant
// Manager asks plain English questions, AI reads LIVE
// company data and responds intelligently via Gemini.
// ══════════════════════════════════════════════════════════

import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { format, subWeeks } from 'date-fns';
import { geminiModel } from '../lib/gemini';
import supabase from '../lib/supabase';
import type { ChatMessage, TeamEfficiency, AIResponse } from '../types/index';

export async function calculateTeamEfficiency(managerId: string): Promise<TeamEfficiency[]> {
  // Get all projects managed by this manager
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('manager_id', managerId)
    .eq('status', 'active');

  if (!projects || projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id as string);

  // Get all employees assigned to tasks in these projects
  const { data: tasks } = await supabase
    .from('tasks')
    .select('assigned_to, status')
    .in('project_id', projectIds)
    .not('status', 'eq', 'cancelled');

  if (!tasks || tasks.length === 0) return [];

  // Group tasks by employee
  const employeeMap = new Map<string, { assigned: number; completed: number }>();
  for (const task of tasks) {
    const empId = task.assigned_to as string;
    const current = employeeMap.get(empId) || { assigned: 0, completed: 0 };
    current.assigned++;
    if (task.status === 'completed') current.completed++;
    employeeMap.set(empId, current);
  }

  // Get employee names
  const employeeIds = Array.from(employeeMap.keys());
  const { data: employees } = await supabase
    .from('users')
    .select('id, name')
    .in('id', employeeIds);

  const results: TeamEfficiency[] = [];
  for (const emp of employees || []) {
    const stats = employeeMap.get(emp.id as string);
    if (!stats) continue;

    const efficiencyScore = stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0;

    // Determine trend based on recent vs older tasks
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('assigned_to', emp.id as string)
      .in('project_id', projectIds)
      .gte('created_at', subWeeks(new Date(), 2).toISOString());

    const { data: olderTasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('assigned_to', emp.id as string)
      .in('project_id', projectIds)
      .lt('created_at', subWeeks(new Date(), 2).toISOString())
      .gte('created_at', subWeeks(new Date(), 4).toISOString());

    const recentRate =
      recentTasks && recentTasks.length > 0
        ? recentTasks.filter((t) => t.status === 'completed').length / recentTasks.length
        : 0;

    const olderRate =
      olderTasks && olderTasks.length > 0
        ? olderTasks.filter((t) => t.status === 'completed').length / olderTasks.length
        : 0;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentRate > olderRate + 0.1) trend = 'improving';
    else if (recentRate < olderRate - 0.1) trend = 'declining';

    results.push({
      employeeId: emp.id as string,
      employeeName: emp.name as string,
      tasksAssigned: stats.assigned,
      tasksCompleted: stats.completed,
      efficiencyScore,
      trend,
    });
  }

  return results.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
}

export async function askAI(
  question: string,
  managerId: string,
  chatHistory: ChatMessage[]
): Promise<AIResponse> {
  console.log(`[AIAssistant] Processing question from manager ${managerId}: "${question.slice(0, 80)}..."`);

  // STEP 1: Build live context — fetch all data in PARALLEL
  const { data: managerProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('manager_id', managerId)
    .eq('status', 'active');

  const activeProjectIds = (managerProjects || []).map((p) => p.id as string);

  const [projectsResult, tasksResult, teamStats, alertsResult, riskResult, burnoutResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status, start_date, end_date')
      .eq('manager_id', managerId)
      .eq('status', 'active'),

    activeProjectIds.length > 0
      ? supabase
          .from('tasks')
          .select(`
            id, title, status, progress, risk_score, deadline, priority,
            users!assigned_to ( name, email ),
            projects!project_id ( name )
          `)
          .in('project_id', activeProjectIds)
          .neq('status', 'cancelled')
      : Promise.resolve({ data: [], error: null }),

    calculateTeamEfficiency(managerId),

    supabase
      .from('alerts')
      .select('type, severity, title, message, created_at')
      .eq('manager_id', managerId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('tasks')
      .select('title, risk_score, deadline, status')
      .gte('risk_score', 50)
      .order('risk_score', { ascending: false })
      .limit(8),

    supabase
      .from('burnout_signals')
      .select('employee_id, burnout_score, is_flagged')
      .eq('is_flagged', true)
      .gte('created_at', subWeeks(new Date(), 1).toISOString()),
  ]);

  const projects = projectsResult.data || [];
  const tasks = (tasksResult.data || []) as unknown as Array<{
    title: string;
    status: string;
    progress: number;
    risk_score: number;
    deadline: string;
    priority: string;
    users: { name: string; email: string } | null;
    projects: { name: string } | null;
  }>;
  const alerts = alertsResult.data || [];
  const riskSummary = riskResult.data || [];
  const burnoutFlags = burnoutResult.data || [];

  // Build computed summary
  const summary = {
    totalActiveProjects: projects.length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === 'completed').length,
    inProgressTasks: tasks.filter((t) => t.status === 'in_progress').length,
    atRiskTasks: tasks.filter((t) => t.risk_score >= 70).length,
    overdueTasks: tasks.filter((t) => new Date(t.deadline) < new Date() && t.status !== 'completed').length,
    teamSize: teamStats.length,
    activeAlerts: alerts.length,
    burnoutFlagged: burnoutFlags.length,
  };

  // STEP 2: Build system prompt
  const systemPrompt = `
You are Operix AI, an intelligent operations assistant for KaizenSpark Tech Pvt. Ltd., an IT company.

Your role: Help managers understand team performance, identify project risks, and make smart operational decisions.

STRICT RULES — always follow these:
1. ONLY answer using the data provided below. Never invent data.
2. Be specific: use real names, numbers, percentages, dates.
3. Be concise and direct. No unnecessary filler words.
4. Format responses for readability:
   - Use **bold** for important names and numbers
   - Use bullet points (- item) for lists
   - Use tables for comparisons when helpful
5. If asked about something not in the data, say exactly:
   "I don't have that data available. Please check manually."
6. Tone: professional, direct, like a smart analyst colleague.
7. Never say "As an AI" or "I'm a language model". You are Operix AI. Act like it.

TODAY'S DATE: ${format(new Date(), 'EEEE, dd MMMM yyyy')}

LIVE COMPANY DATA:
${JSON.stringify(
  {
    summary,
    activeProjects: projects,
    allTasks: tasks.map((t) => ({
      title: t.title,
      status: t.status,
      progress: t.progress + '%',
      riskScore: t.risk_score + '/100',
      deadline: format(new Date(t.deadline), 'dd MMM yyyy'),
      assignedTo: t.users?.name || 'Unassigned',
      project: t.projects?.name || 'Unknown',
      priority: t.priority,
    })),
    teamEfficiency: teamStats,
    activeAlerts: alerts,
    highRiskTasks: riskSummary,
    burnoutFlags: burnoutFlags.length > 0 ? burnoutFlags.length + ' employee(s) flagged' : 'No burnout flags this week',
  },
  null,
  2
)}
`;

  // STEP 3: Build message history (keep last 6)
  const messages = [
    new SystemMessage(systemPrompt),
    ...chatHistory.slice(-6).map((msg) => (msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content))),
    new HumanMessage(question),
  ];

  // STEP 4: Call Gemini
  const response = await geminiModel.invoke(messages);
  const answer = typeof response.content === 'string' ? response.content : String(response.content);

  // STEP 5: Save conversation
  await supabase.from('ai_chats').insert([
    { user_id: managerId, role: 'user', content: question },
    { user_id: managerId, role: 'assistant', content: answer },
  ]);

  // STEP 6: Return response
  const usageMetadata = response.usage_metadata;
  const tokensUsed = usageMetadata ? (usageMetadata.input_tokens || 0) + (usageMetadata.output_tokens || 0) : 0;

  return {
    answer,
    tokensUsed,
    timestamp: new Date(),
  };
}

export async function getSuggestedQuestions(managerId: string): Promise<string[]> {
  const baseQuestions = [
    'Which projects are at risk this week?',
    'Who has the most overdue tasks?',
    'Show me team efficiency this month',
    'Which employee needs support right now?',
    'Generate a project summary',
    'What should I focus on today?',
  ];

  // Check for active alerts to provide context-relevant suggestions
  const { data: alerts } = await supabase
    .from('alerts')
    .select('type, title')
    .eq('manager_id', managerId)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(3);

  const { data: riskTasks } = await supabase
    .from('tasks')
    .select('title, risk_score')
    .gte('risk_score', 70)
    .order('risk_score', { ascending: false })
    .limit(2);

  const dynamicQuestions: string[] = [];

  if (alerts && alerts.length > 0) {
    const burnoutAlerts = alerts.filter((a) => a.type === 'burnout');
    if (burnoutAlerts.length > 0) {
      dynamicQuestions.push('Are there any employees showing signs of burnout?');
    }

    const delayAlerts = alerts.filter((a) => a.type === 'delay_risk');
    if (delayAlerts.length > 0) {
      dynamicQuestions.push('What tasks are most likely to miss their deadlines?');
    }
  }

  if (riskTasks && riskTasks.length > 0) {
    dynamicQuestions.push(`Why is "${(riskTasks[0].title as string).slice(0, 40)}" at risk?`);
  }

  // Merge dynamic + base, deduplicate, return 6
  const allQuestions = [...dynamicQuestions, ...baseQuestions];
  const unique = [...new Set(allQuestions)];
  return unique.slice(0, 6);
}

export async function getChatHistory(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_chats')
    .select('id, user_id, role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('[AIAssistant] Error fetching chat history:', error.message);
    return [];
  }

  return (data || []) as ChatMessage[];
}

export async function clearChatHistory(userId: string): Promise<void> {
  const { error } = await supabase.from('ai_chats').delete().eq('user_id', userId);

  if (error) {
    console.error('[AIAssistant] Error clearing chat history:', error.message);
    throw new Error(`Failed to clear chat history: ${error.message}`);
  }

  console.log(`[AIAssistant] Chat history cleared for user ${userId}`);
}

