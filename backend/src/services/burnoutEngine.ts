// ══════════════════════════════════════════════════════════
// KaisenFlow — Employee Burnout Detection Engine
// Analyzes 4-week performance trends, flags at-risk
// employees, creates CONFIDENTIAL alerts for managers only.
// ══════════════════════════════════════════════════════════

import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';
import supabase from '../lib/supabase';
import { sendBurnoutAlertEmail } from '../lib/resend';
import { getIO } from '../lib/socket';
import type { User, WeekData, BurnoutAnalysis } from '../types/index';

type BurnoutLevel = 'low' | 'medium' | 'high' | 'critical';

function getBurnoutLevel(score: number): BurnoutLevel {
  if (score <= 30) return 'low';
  if (score <= 55) return 'medium';
  if (score <= 75) return 'high';
  return 'critical';
}

async function analyzeEmployeeWeeks(employeeId: string): Promise<WeekData[]> {
  const today = new Date();
  const weeks: WeekData[] = [];

  for (let i = 3; i >= 0; i--) {
    const weekRef = subWeeks(today, i);
    const weekStart = startOfWeek(weekRef, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekRef, { weekStartsOn: 1 });

    const weekStartISO = weekStart.toISOString();
    const weekEndISO = weekEnd.toISOString();

    // Count tasks assigned during this week
    const { count: tasksAssigned } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', employeeId)
      .gte('created_at', weekStartISO)
      .lte('created_at', weekEndISO);

    // Count tasks completed during this week
    const { count: tasksCompleted } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', employeeId)
      .eq('status', 'completed')
      .gte('updated_at', weekStartISO)
      .lte('updated_at', weekEndISO);

    // Get progress logs for this week
    const { data: progressLogs } = await supabase
      .from('progress_logs')
      .select('progress')
      .eq('logged_by', employeeId)
      .gte('logged_at', weekStartISO)
      .lte('logged_at', weekEndISO);

    const avgProgressRate =
      progressLogs && progressLogs.length > 0
        ? progressLogs.reduce((sum, log) => sum + (log.progress as number), 0) / progressLogs.length
        : 0;

    const assigned = tasksAssigned || 0;
    const completed = tasksCompleted || 0;
    const completionRate = assigned > 0 ? completed / assigned : 0;

    weeks.push({
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      tasksAssigned: assigned,
      tasksCompleted: completed,
      avgProgressRate,
      completionRate: Math.min(completionRate, 1),
    });
  }

  return weeks;
}

function calculateBurnoutScore(weeks: WeekData[]): number {
  // Weighted completion rate (recent weeks matter more)
  const weightedRate =
    weeks[0].completionRate * 0.1 +
    weeks[1].completionRate * 0.2 +
    weeks[2].completionRate * 0.3 +
    weeks[3].completionRate * 0.4;

  let burnoutScore = (1 - weightedRate) * 100;

  // Consecutive decline penalty
  const isDecline3 =
    weeks[3].completionRate < weeks[2].completionRate &&
    weeks[2].completionRate < weeks[1].completionRate &&
    weeks[1].completionRate < weeks[0].completionRate;

  const isDecline2 =
    weeks[3].completionRate < weeks[2].completionRate &&
    weeks[2].completionRate < weeks[1].completionRate;

  if (isDecline3) {
    burnoutScore += 20;
  } else if (isDecline2) {
    burnoutScore += 10;
  }

  return Math.min(Math.round(burnoutScore), 100);
}

export async function runBurnoutEngine(): Promise<BurnoutAnalysis[]> {
  console.log('[BurnoutEngine] Starting burnout analysis...');

  // STEP 1: Get all active employees
  const { data: employees, error: empError } = await supabase
    .from('users')
    .select('id, name, email, role, is_active, created_at')
    .eq('role', 'employee')
    .eq('is_active', true);

  if (empError) {
    console.error('[BurnoutEngine] Error fetching employees:', empError.message);
    throw new Error(`Failed to fetch employees: ${empError.message}`);
  }

  if (!employees || employees.length === 0) {
    console.log('[BurnoutEngine] No active employees found.');
    return [];
  }

  const results: BurnoutAnalysis[] = [];

  for (const employee of employees as User[]) {
    // STEP 2: Analyze 4 weeks
    const weeks = await analyzeEmployeeWeeks(employee.id);

    // STEP 3: Calculate burnout score
    const burnoutScore = calculateBurnoutScore(weeks);
    const level = getBurnoutLevel(burnoutScore);
    const isFlagged = burnoutScore > 55;

    // Total metrics across 4 weeks
    const totalAssigned = weeks.reduce((sum, w) => sum + w.tasksAssigned, 0);
    const totalCompleted = weeks.reduce((sum, w) => sum + w.tasksCompleted, 0);
    const avgProgressRate = weeks.reduce((sum, w) => sum + w.avgProgressRate, 0) / weeks.length;

    // STEP 5: Save to database
    await supabase.from('burnout_signals').insert({
      employee_id: employee.id,
      week_start: weeks[0].weekStart,
      tasks_assigned: totalAssigned,
      tasks_completed: totalCompleted,
      avg_progress_rate: Math.round(avgProgressRate * 100) / 100,
      burnout_score: burnoutScore,
      is_flagged: isFlagged,
      week_data: JSON.stringify(weeks),
    });

    // STEP 6: Create PRIVATE alert for manager (if flagged)
    if (isFlagged) {
      // Find manager(s) for this employee's projects
      const { data: employeeProjects } = await supabase
        .from('tasks')
        .select('projects!project_id ( manager_id )')
        .eq('assigned_to', employee.id)
        .not('status', 'eq', 'cancelled');

      const managerIds = new Set<string>();
      if (employeeProjects) {
        for (const ep of employeeProjects) {
          const raw = ep.projects as unknown;
          const projects = Array.isArray(raw) ? (raw[0] as { manager_id: string } | undefined) : (raw as { manager_id: string } | null);
          if (projects?.manager_id) {
            managerIds.add(projects.manager_id);
          }
        }
      }

      for (const managerId of managerIds) {
        const severity = burnoutScore > 75 ? 'critical' : 'high';
        const alertMessage = `Performance data suggests ${employee.name} may be experiencing elevated workload stress. Task completion rate has declined from ${(weeks[0].completionRate * 100).toFixed(0)}% to ${(weeks[3].completionRate * 100).toFixed(0)}% over 4 weeks. Burnout risk score: ${burnoutScore}/100 (${level} risk). A private check-in conversation is recommended.`;

        await supabase.from('alerts').insert({
          task_id: null,
          project_id: null,
          manager_id: managerId,
          type: 'burnout',
          severity,
          title: `Wellbeing Alert: ${employee.name}`,
          message: alertMessage,
          is_resolved: false,
          is_seen: false,
        });

        // Send PRIVATE email to manager only
        const { data: manager } = await supabase
          .from('users')
          .select('id, name, email, role, is_active, created_at')
          .eq('id', managerId)
          .single();

        if (manager) {
          await sendBurnoutAlertEmail(manager as User, employee, burnoutScore, weeks);
        }

        // Emit socket event to manager only
        try {
          const io = getIO();
          io.to(`manager_${managerId}`).emit('alert:new', {
            type: 'burnout',
            severity,
            employeeName: employee.name,
            burnoutScore,
          });
        } catch {
          console.warn('[BurnoutEngine] Socket.io not available, skipping real-time notification');
        }
      }
    }

    results.push({
      employeeId: employee.id,
      employeeName: employee.name,
      burnoutScore,
      level,
      weeks,
      isFlagged,
    });

    console.log(`[BurnoutEngine] ${employee.name}: score=${burnoutScore}, level=${level}, flagged=${isFlagged}`);
  }

  console.log(`[BurnoutEngine] Analysis complete. ${results.filter((r) => r.isFlagged).length}/${results.length} employees flagged.`);
  return results;
}

export async function getBurnoutHistory(
  employeeId: string,
  weeksBack: number = 12
): Promise<Array<{ burnoutScore: number; weekStart: string; weekData: WeekData[]; isFlagged: boolean }>> {
  const { data, error } = await supabase
    .from('burnout_signals')
    .select('burnout_score, week_start, week_data, is_flagged, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(weeksBack);

  if (error) {
    console.error('[BurnoutEngine] Error fetching burnout history:', error.message);
    return [];
  }

  return (data || []).map((record) => ({
    burnoutScore: record.burnout_score as number,
    weekStart: record.week_start as string,
    weekData: JSON.parse(record.week_data as string) as WeekData[],
    isFlagged: record.is_flagged as boolean,
  }));
}

