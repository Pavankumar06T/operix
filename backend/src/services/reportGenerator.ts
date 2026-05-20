// ══════════════════════════════════════════════════════════
// KaisenFlow — Auto Weekly Report Generator
// Gathers week data, generates AI report via Gemini,
// saves to DB, emails all managers via Resend.
// ══════════════════════════════════════════════════════════

import { startOfWeek, endOfWeek, subWeeks, format, differenceInDays } from 'date-fns';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { geminiReportModel } from '../lib/gemini';
import supabase from '../lib/supabase';
import { resend, buildReportEmailHTML } from '../lib/resend';
import type { User, ReportData, ReportResult, EmployeePerformance, ProjectHealth, WeeklyReport } from '../types/index';

export async function generateWeeklyReport(): Promise<ReportResult> {
  console.log('[ReportGenerator] Starting weekly report generation...');

  const weekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const weekStartISO = weekStart.toISOString();
  const weekEndISO = weekEnd.toISOString();

  // STEP 1: Gather week data

  // Task stats
  const { count: totalAssigned } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', weekStartISO)
    .lte('created_at', weekEndISO);

  const { count: completed } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('updated_at', weekStartISO)
    .lte('updated_at', weekEndISO);

  const { count: delayed } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'delayed')
    .gte('updated_at', weekStartISO)
    .lte('updated_at', weekEndISO);

  const { count: newlyOverdue } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .lt('deadline', weekEndISO)
    .gte('deadline', weekStartISO)
    .not('status', 'in', '("completed","cancelled")');

  const totalAssignedNum = totalAssigned || 0;
  const completedNum = completed || 0;
  const delayedNum = delayed || 0;

  const taskStats = {
    totalAssigned: totalAssignedNum,
    completed: completedNum,
    delayed: delayedNum,
    newlyOverdue: newlyOverdue || 0,
    completionRate: totalAssignedNum > 0 ? ((completedNum / totalAssignedNum) * 100).toFixed(1) : '0.0',
  };

  // Employee performance
  const { data: employees } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'employee')
    .eq('is_active', true);

  const employeePerformance: EmployeePerformance[] = [];
  for (const emp of employees || []) {
    const empId = emp.id as string;
    const empName = emp.name as string;

    const { count: assigned } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', empId)
      .gte('created_at', weekStartISO)
      .lte('created_at', weekEndISO);

    const { count: comp } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', empId)
      .eq('status', 'completed')
      .gte('updated_at', weekStartISO)
      .lte('updated_at', weekEndISO);

    const { count: del } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', empId)
      .eq('status', 'delayed')
      .gte('updated_at', weekStartISO)
      .lte('updated_at', weekEndISO);

    const { data: progressLogs } = await supabase
      .from('progress_logs')
      .select('progress')
      .eq('logged_by', empId)
      .gte('logged_at', weekStartISO)
      .lte('logged_at', weekEndISO);

    const avgProgress =
      progressLogs && progressLogs.length > 0
        ? progressLogs.reduce((sum, l) => sum + (l.progress as number), 0) / progressLogs.length
        : 0;

    const assignedNum = assigned || 0;
    const compNum = comp || 0;
    const efficiencyScore = assignedNum > 0 ? Math.round((compNum / assignedNum) * 100) : 0;

    employeePerformance.push({
      name: empName,
      tasksAssigned: assignedNum,
      tasksCompleted: compNum,
      tasksDelayed: del || 0,
      avgProgress: Math.round(avgProgress),
      efficiencyScore,
      trend: efficiencyScore >= 80 ? 'improving' : efficiencyScore >= 50 ? 'stable' : 'declining',
    });
  }

  // Project health
  const { data: activeProjects } = await supabase
    .from('projects')
    .select('id, name, status, end_date')
    .eq('status', 'active');

  const projectHealth: ProjectHealth[] = [];
  for (const proj of activeProjects || []) {
    const projId = proj.id as string;

    const { data: projTasks } = await supabase
      .from('tasks')
      .select('progress, risk_score')
      .eq('project_id', projId)
      .not('status', 'eq', 'cancelled');

    const avgProgress =
      projTasks && projTasks.length > 0
        ? projTasks.reduce((sum, t) => sum + (t.progress as number), 0) / projTasks.length
        : 0;

    const atRiskCount = projTasks ? projTasks.filter((t) => (t.risk_score as number) >= 70).length : 0;
    const daysUntilDeadline = differenceInDays(new Date(proj.end_date as string), new Date());

    projectHealth.push({
      name: proj.name as string,
      progressThisWeek: 0, // Would need previous week's snapshot for delta
      currentCompletion: Math.round(avgProgress),
      tasksAtRisk: atRiskCount,
      status: proj.status as string,
      daysUntilDeadline,
    });
  }

  // Alert stats
  const { count: alertsGenerated } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', weekStartISO)
    .lte('created_at', weekEndISO);

  const { count: criticalAlerts } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('severity', 'critical')
    .gte('created_at', weekStartISO)
    .lte('created_at', weekEndISO);

  const { count: highAlerts } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('severity', 'high')
    .gte('created_at', weekStartISO)
    .lte('created_at', weekEndISO);

  const { count: resolvedAlerts } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('is_resolved', true)
    .gte('updated_at', weekStartISO)
    .lte('updated_at', weekEndISO);

  const alertStats = {
    totalGenerated: alertsGenerated || 0,
    critical: criticalAlerts || 0,
    high: highAlerts || 0,
    resolved: resolvedAlerts || 0,
  };

  // Top risks
  const { data: topRiskTasks } = await supabase
    .from('tasks')
    .select(`
      title, risk_score, deadline,
      users!assigned_to ( name ),
      projects!project_id ( name )
    `)
    .gte('risk_score', 50)
    .order('risk_score', { ascending: false })
    .limit(5);

  const topRisks = (topRiskTasks || []).map((t) => {
    const rawUsers = t.users as unknown;
    const rawProjects = t.projects as unknown;
    const user = Array.isArray(rawUsers) ? (rawUsers[0] as { name: string } | undefined) : (rawUsers as { name: string } | null);
    const project = Array.isArray(rawProjects) ? (rawProjects[0] as { name: string } | undefined) : (rawProjects as { name: string } | null);
    return {
      title: t.title as string,
      riskScore: t.risk_score as number,
      assignedTo: user?.name || 'Unassigned',
      deadline: format(new Date(t.deadline as string), 'dd MMM yyyy'),
      project: project?.name || 'Unknown',
    };
  });

  // Burnout summary
  const { count: burnoutFlagged } = await supabase
    .from('burnout_signals')
    .select('id', { count: 'exact', head: true })
    .eq('is_flagged', true)
    .gte('created_at', weekStartISO);

  const { data: burnoutScores } = await supabase
    .from('burnout_signals')
    .select('burnout_score')
    .gte('created_at', weekStartISO);

  const avgBurnoutScore =
    burnoutScores && burnoutScores.length > 0
      ? burnoutScores.reduce((sum, b) => sum + (b.burnout_score as number), 0) / burnoutScores.length
      : 0;

  const reportData: ReportData = {
    taskStats,
    employeePerformance,
    projectHealth,
    alertStats,
    topRisks,
    burnoutSummary: {
      employeesFlagged: burnoutFlagged || 0,
      avgTeamBurnoutScore: Math.round(avgBurnoutScore),
    },
  };

  // STEP 2: Generate AI report
  const prompt = `
Write a professional weekly operations report for the management team of KaizenSpark Tech Pvt. Ltd., an IT company.

Write in clear, professional business English.
Use specific names, numbers, and percentages from the data.
Be direct. Avoid corporate filler language.

WEEK: ${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM yyyy')}

DATA:
${JSON.stringify(reportData, null, 2)}

Write the report with EXACTLY these sections:

## Executive Summary
2-3 sentences. Overall picture of the week. One key positive. One key concern. Be specific.

## Key Achievements
Bullet list of what went well. Use real names and project names from the data.

## Concerns & Risks
Bullet list of problems that need attention. Name specific tasks, employees, projects at risk. Use professional and empathetic language.

## Team Performance Snapshot
Short paragraph about team efficiency. Mention top performer this week. If anyone is struggling, mention supportively.

## Top 3 Recommendations for Next Week
Numbered list. Specific and actionable. Based directly on this week's data. Not generic advice.

Keep total report under 500 words.
`;

  const aiResponse = await geminiReportModel.invoke([
    new SystemMessage('You write concise, data-driven business reports for IT company management. Company: KaizenSpark Tech Pvt. Ltd.'),
    new HumanMessage(prompt),
  ]);

  const reportContent = typeof aiResponse.content === 'string' ? aiResponse.content : String(aiResponse.content);

  // STEP 3: Save to database
  const { data: savedReport, error: saveError } = await supabase
    .from('weekly_reports')
    .insert({
      week_start: weekStart.toISOString(),
      week_end: weekEnd.toISOString(),
      content: reportContent,
      summary: JSON.stringify(taskStats),
      email_sent: false,
      generated_by: 'ai',
    })
    .select('id')
    .single();

  if (saveError) {
    console.error('[ReportGenerator] Error saving report:', saveError.message);
    throw new Error(`Failed to save report: ${saveError.message}`);
  }

  // STEP 4: Email all managers
  const { data: managers } = await supabase
    .from('users')
    .select('id, name, email, role, is_active, created_at')
    .eq('role', 'manager')
    .eq('is_active', true);

  let emailsSent = 0;
  for (const manager of (managers || []) as User[]) {
    try {
      const emailHtml = buildReportEmailHTML({
        managerName: manager.name,
        period: `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM yyyy')}`,
        reportContent,
        taskStats,
        topRisks,
      });

      await resend.emails.send({
        from: 'reports@operix.app',
        to: manager.email,
        subject: `📊 Weekly Report — Week of ${format(weekStart, 'dd MMM yyyy')}`,
        html: emailHtml,
      });

      emailsSent++;
      console.log(`[ReportGenerator] Report emailed to ${manager.email}`);
    } catch (emailError) {
      console.error(`[ReportGenerator] Failed to email ${manager.email}:`, emailError);
    }
  }

  // Update email status
  await supabase
    .from('weekly_reports')
    .update({ email_sent: true, sent_at: new Date().toISOString() })
    .eq('id', savedReport.id);

  const result: ReportResult = {
    reportId: savedReport.id as string,
    emailsSent,
    weekPeriod: { start: weekStart, end: weekEnd },
    generatedAt: new Date(),
  };

  console.log(`[ReportGenerator] Report generated. ID: ${result.reportId}, Emails sent: ${emailsSent}`);
  return result;
}

export async function getAllReports(): Promise<WeeklyReport[]> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ReportGenerator] Error fetching reports:', error.message);
    return [];
  }

  return (data || []) as WeeklyReport[];
}

export async function getReportById(id: string): Promise<WeeklyReport | null> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[ReportGenerator] Error fetching report:', error.message);
    return null;
  }

  return data as WeeklyReport;
}

