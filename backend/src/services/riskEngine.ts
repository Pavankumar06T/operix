// ══════════════════════════════════════════════════════════
// KaisenFlow — Delay Prediction Risk Engine
// Scans all active tasks, calculates risk scores 0-100,
// creates alerts, sends emails, emits socket events.
// ══════════════════════════════════════════════════════════

import { differenceInDays, format, subDays, startOfDay } from 'date-fns';
import supabase from '../lib/supabase';
import { sendRiskAlertEmail } from '../lib/resend';
import { getIO } from '../lib/socket';
import type { Task, ProgressLog, RiskEngineSummary, User } from '../types/index';

interface DailyProgress {
  date: string;
  progress: number;
}

interface TaskRiskResult {
  taskId: string;
  riskScore: number;
  avgDailyProgress: number;
  daysNeeded: number;
  daysRemaining: number;
  isOverdue: boolean;
}

function calculateAvgDailyProgress(logs: ProgressLog[]): number {
  if (logs.length === 0) return 10;

  const dailyMap = new Map<string, number[]>();
  for (const log of logs) {
    const dateKey = format(new Date(log.logged_at), 'yyyy-MM-dd');
    const existing = dailyMap.get(dateKey) || [];
    existing.push(log.progress);
    dailyMap.set(dateKey, existing);
  }

  const sortedDates = Array.from(dailyMap.keys()).sort();
  if (sortedDates.length < 2) return 10;

  const dailyGains: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1];
    const currDate = sortedDates[i];
    const prevMax = Math.max(...(dailyMap.get(prevDate) || [0]));
    const currMax = Math.max(...(dailyMap.get(currDate) || [0]));
    const gain = currMax - prevMax;
    if (gain > 0) {
      dailyGains.push(gain);
    }
  }

  if (dailyGains.length === 0) return 5;

  const avgDailyProgress = dailyGains.reduce((sum, g) => sum + g, 0) / dailyGains.length;
  return Math.max(avgDailyProgress, 5);
}

function calculateRiskScore(
  progress: number,
  avgDailyProgress: number,
  deadline: string
): TaskRiskResult {
  const today = startOfDay(new Date());
  const deadlineDate = startOfDay(new Date(deadline));
  const daysRemaining = differenceInDays(deadlineDate, today);

  if (progress >= 100) {
    return {
      taskId: '',
      riskScore: 0,
      avgDailyProgress,
      daysNeeded: 0,
      daysRemaining,
      isOverdue: false,
    };
  }

  const workRemaining = 100 - progress;
  const daysNeeded = workRemaining / avgDailyProgress;

  if (daysRemaining <= 0) {
    return {
      taskId: '',
      riskScore: 100,
      avgDailyProgress,
      daysNeeded,
      daysRemaining,
      isOverdue: true,
    };
  }

  let riskScore: number;
  if (daysNeeded <= daysRemaining) {
    riskScore = Math.round((daysNeeded / daysRemaining) * 50);
  } else {
    const excessDays = daysNeeded - daysRemaining;
    riskScore = Math.round(50 + (excessDays / daysNeeded) * 50);
    riskScore = Math.min(riskScore, 100);
  }

  return {
    taskId: '',
    riskScore,
    avgDailyProgress,
    daysNeeded,
    daysRemaining,
    isOverdue: false,
  };
}

export async function runRiskEngine(): Promise<RiskEngineSummary> {
  const startTime = performance.now();
  console.log('[RiskEngine] Starting risk calculation...');

  let totalTasksChecked = 0;
  let tasksAtRisk = 0;
  let tasksCritical = 0;
  let tasksOverdue = 0;
  let alertsCreated = 0;

  const today = startOfDay(new Date());
  const thirtyDaysAgo = subDays(today, 30);

  // STEP 1: Fetch active tasks (not yet overdue)
  const { data: activeTasks, error: activeError } = await supabase
    .from('tasks')
    .select(`
      id, title, description, status, progress, risk_score, deadline,
      assigned_to, project_id, priority, created_at, updated_at,
      users!assigned_to ( name, email ),
      projects!project_id ( name, manager_id )
    `)
    .in('status', ['not_started', 'in_progress'])
    .gte('deadline', today.toISOString());

  if (activeError) {
    console.error('[RiskEngine] Error fetching active tasks:', activeError.message);
    throw new Error(`Failed to fetch active tasks: ${activeError.message}`);
  }

  // Fetch overdue tasks (deadline passed, not completed/cancelled)
  const { data: overdueTasks, error: overdueError } = await supabase
    .from('tasks')
    .select(`
      id, title, description, status, progress, risk_score, deadline,
      assigned_to, project_id, priority, created_at, updated_at,
      users!assigned_to ( name, email ),
      projects!project_id ( name, manager_id )
    `)
    .lt('deadline', today.toISOString())
    .not('status', 'in', '("completed","cancelled")');

  if (overdueError) {
    console.error('[RiskEngine] Error fetching overdue tasks:', overdueError.message);
    throw new Error(`Failed to fetch overdue tasks: ${overdueError.message}`);
  }

  const allTasks = [...(activeTasks || []), ...(overdueTasks || [])] as unknown as Task[];
  totalTasksChecked = allTasks.length;

  if (totalTasksChecked === 0) {
    console.log('[RiskEngine] No tasks to evaluate.');
    const endTime = performance.now();
    return {
      totalTasksChecked: 0,
      tasksAtRisk: 0,
      tasksCritical: 0,
      tasksOverdue: 0,
      alertsCreated: 0,
      executionTime: `${((endTime - startTime) / 1000).toFixed(1)}s`,
      timestamp: new Date(),
    };
  }

  // STEP 2: Process each task
  for (const task of allTasks) {
    if (task.progress >= 100) {
      await supabase.from('tasks').update({ risk_score: 0 }).eq('id', task.id);
      continue;
    }

    // Get employee progress logs for the last 30 days
    const { data: progressLogs } = await supabase
      .from('progress_logs')
      .select('id, task_id, logged_by, progress, notes, logged_at')
      .eq('logged_by', task.assigned_to)
      .gte('logged_at', thirtyDaysAgo.toISOString())
      .order('logged_at', { ascending: true });

    const avgDailyProgress = calculateAvgDailyProgress((progressLogs || []) as ProgressLog[]);
    const result = calculateRiskScore(task.progress, avgDailyProgress, task.deadline);
    const riskScore = result.riskScore;

    // STEP 5: Update database
    await supabase.from('tasks').update({ risk_score: riskScore }).eq('id', task.id);

    if (riskScore === 100) tasksOverdue++;
    if (riskScore >= 90) tasksCritical++;
    if (riskScore >= 70) tasksAtRisk++;

    // STEP 6: Create alerts for high risk
    if (riskScore >= 70) {
      const managerId = task.projects?.manager_id;
      if (!managerId) continue;

      // Check for existing unresolved alert
      const { data: existingAlert } = await supabase
        .from('alerts')
        .select('id')
        .eq('task_id', task.id)
        .eq('type', 'delay_risk')
        .eq('is_resolved', false)
        .single();

      if (!existingAlert) {
        const severity = riskScore >= 90 ? 'critical' : 'high';
        const employeeName = task.users?.name || 'Unknown';
        const daysRemaining = result.daysRemaining;

        const alertMessage = `${employeeName}'s task "${task.title}" has a risk score of ${riskScore}/100. At current pace of ${avgDailyProgress.toFixed(1)}% per day, this task needs ${Math.ceil(result.daysNeeded)} more days but only ${Math.max(daysRemaining, 0)} days remain until the deadline of ${format(new Date(task.deadline), 'dd MMM yyyy')}.`;

        const { data: newAlert } = await supabase
          .from('alerts')
          .insert({
            task_id: task.id,
            project_id: task.project_id,
            manager_id: managerId,
            type: 'delay_risk',
            severity,
            title: `Task At Risk: "${task.title}"`,
            message: alertMessage,
            is_resolved: false,
            is_seen: false,
          })
          .select('id')
          .single();

        alertsCreated++;

        // Send email to manager
        const { data: manager } = await supabase
          .from('users')
          .select('id, name, email, role, is_active, created_at')
          .eq('id', managerId)
          .single();

        if (manager) {
          await sendRiskAlertEmail(manager as User, task, riskScore);
        }

        // Emit socket event
        try {
          const io = getIO();
          io.to(`manager_${managerId}`).emit('alert:new', {
            alertId: newAlert?.id,
            type: 'delay_risk',
            riskScore,
            taskTitle: task.title,
            severity,
          });
        } catch (socketError) {
          console.warn('[RiskEngine] Socket.io not available, skipping real-time notification');
        }
      }
    }
  }

  const endTime = performance.now();
  const summary: RiskEngineSummary = {
    totalTasksChecked,
    tasksAtRisk,
    tasksCritical,
    tasksOverdue,
    alertsCreated,
    executionTime: `${((endTime - startTime) / 1000).toFixed(1)}s`,
    timestamp: new Date(),
  };

  console.log(`[RiskEngine] Completed. Checked: ${totalTasksChecked}, At Risk: ${tasksAtRisk}, Critical: ${tasksCritical}, Overdue: ${tasksOverdue}, Alerts Created: ${alertsCreated}`);
  return summary;
}

export async function getRiskExplanation(taskId: string): Promise<string> {
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select(`
      id, title, progress, risk_score, deadline, assigned_to, status,
      users!assigned_to ( name )
    `)
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return 'Unable to generate risk explanation. Task not found.';
  }

  const typedTask = task as unknown as Task;

  if (typedTask.progress >= 100 || typedTask.status === 'completed') {
    return `This task is completed. No delay risk.`;
  }

  const today = startOfDay(new Date());
  const deadline = startOfDay(new Date(typedTask.deadline));
  const daysRemaining = differenceInDays(deadline, today);

  // Get employee progress logs
  const thirtyDaysAgo = subDays(today, 30);
  const { data: progressLogs } = await supabase
    .from('progress_logs')
    .select('id, task_id, logged_by, progress, notes, logged_at')
    .eq('logged_by', typedTask.assigned_to)
    .gte('logged_at', thirtyDaysAgo.toISOString())
    .order('logged_at', { ascending: true });

  const avgDailyProgress = calculateAvgDailyProgress((progressLogs || []) as ProgressLog[]);
  const workRemaining = 100 - typedTask.progress;
  const daysNeeded = Math.ceil(workRemaining / avgDailyProgress);
  const employeeName = typedTask.users?.name || 'The assigned employee';

  if (daysRemaining <= 0) {
    return `This task is overdue. The deadline of ${format(deadline, 'dd MMM yyyy')} has passed. ${employeeName} has ${workRemaining}% work remaining and would need approximately ${daysNeeded} more days at their current pace of ${avgDailyProgress.toFixed(1)}% per day.`;
  }

  if (daysNeeded <= daysRemaining) {
    return `At ${employeeName}'s current pace of ${avgDailyProgress.toFixed(1)}% per day, this task needs ${daysNeeded} more days and ${daysRemaining} days remain before the ${format(deadline, 'dd MMM yyyy')} deadline. The task is on track.`;
  }

  return `At ${employeeName}'s current pace of ${avgDailyProgress.toFixed(1)}% per day, this task needs ${daysNeeded} more days but only ${daysRemaining} remain before the ${format(deadline, 'dd MMM yyyy')} deadline.`;
}

