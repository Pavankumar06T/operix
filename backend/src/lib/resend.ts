// ═══════════════════════════════════════════════════════
// B4: Resend Email Service — Complete HTML Templates
// ═══════════════════════════════════════════════════════

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY ?? '')
const FROM = 'Operix <reports@operix.app>'
const DASHBOARD_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// ─── Shared Styles ──────────────────────────────────────

const baseStyles = `
  body { margin: 0; padding: 0; background-color: #0A0A0F; font-family: 'Inter', 'Segoe UI', sans-serif; color: #F8F8FF; }
  .container { max-width: 600px; margin: 0 auto; background-color: #111118; border-radius: 12px; overflow: hidden; border: 1px solid #2A2A3A; }
  .header { padding: 32px 32px 24px; text-align: center; }
  .body { padding: 0 32px 32px; }
  .footer { padding: 24px 32px; border-top: 1px solid #2A2A3A; text-align: center; font-size: 12px; color: #5A5A72; }
  .card { background-color: #16161F; border: 1px solid #2A2A3A; border-radius: 8px; padding: 16px; margin: 16px 0; }
  .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; text-align: center; }
  .label { font-size: 12px; color: #9898B0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .value { font-size: 16px; color: #F8F8FF; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
  .text-secondary { color: #9898B0; }
  .text-sm { font-size: 13px; line-height: 1.6; }
  h2 { margin: 0 0 16px; font-size: 20px; font-weight: 700; }
  p { margin: 0 0 12px; line-height: 1.6; }
`

// ─── Email Result Type ──────────────────────────────────

interface EmailResult {
  success: boolean
  messageId?: string
}

// ═══════════════════════════════════════════════════════
// 1. RISK ALERT EMAIL
// ═══════════════════════════════════════════════════════

export const sendRiskAlertEmail = async (
  to: string,
  managerName: string,
  taskTitle: string,
  employeeName: string,
  riskScore: number,
  deadline: string,
  explanation: string
): Promise<EmailResult> => {
  try {
    const riskColor = riskScore >= 80 ? '#EF4444' : '#F59E0B'
    const riskLabel = riskScore >= 80 ? 'CRITICAL' : 'HIGH'

    const html = `
      <!DOCTYPE html>
      <html>
      <head><style>${baseStyles}</style></head>
      <body style="margin:0;padding:20px;background-color:#0A0A0F;font-family:'Inter','Segoe UI',sans-serif;color:#F8F8FF;">
        <div class="container" style="max-width:600px;margin:0 auto;background-color:#111118;border-radius:12px;overflow:hidden;border:1px solid #2A2A3A;">
          
          <!-- Header -->
          <div style="padding:32px;text-align:center;background:linear-gradient(135deg,#7f1d1d,#991b1b,#450a0a);border-bottom:2px solid #EF4444;">
            <div style="font-size:32px;margin-bottom:8px;">⚠️</div>
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#FCA5A5;letter-spacing:1px;">TASK AT RISK</h1>
            <p style="margin:8px 0 0;font-size:13px;color:#FCA5A5;opacity:0.8;">Immediate attention required</p>
          </div>

          <!-- Body -->
          <div style="padding:32px;">
            <p style="margin:0 0 20px;color:#9898B0;font-size:14px;">Hi ${managerName},</p>
            <p style="margin:0 0 24px;color:#9898B0;font-size:14px;line-height:1.6;">
              Our AI risk engine has flagged the following task as <strong style="color:${riskColor};">${riskLabel} risk</strong>. 
              Based on current progress trajectory, this task is unlikely to meet its deadline without intervention.
            </p>

            <!-- Task Details Card -->
            <div style="background-color:#16161F;border:1px solid #2A2A3A;border-radius:8px;padding:20px;margin:0 0 20px;">
              <div style="font-size:12px;color:#5A5A72;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Task Details</div>
              
              <div style="margin-bottom:16px;">
                <div style="font-size:12px;color:#9898B0;margin-bottom:2px;">Task</div>
                <div style="font-size:16px;color:#F8F8FF;font-weight:600;">${taskTitle}</div>
              </div>

              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;">
                    <div style="font-size:11px;color:#9898B0;">Assigned To</div>
                    <div style="font-size:14px;color:#F8F8FF;font-weight:500;">${employeeName}</div>
                  </td>
                  <td style="padding:8px 0;">
                    <div style="font-size:11px;color:#9898B0;">Deadline</div>
                    <div style="font-size:14px;color:#F8F8FF;font-weight:500;">${deadline}</div>
                  </td>
                </tr>
              </table>

              <!-- Risk Score Gauge -->
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid #2A2A3A;">
                <div style="font-size:11px;color:#9898B0;margin-bottom:8px;">Risk Score</div>
                <div style="display:flex;align-items:center;">
                  <div style="font-size:36px;font-weight:800;color:${riskColor};font-family:'JetBrains Mono',monospace;">${riskScore}</div>
                  <div style="font-size:14px;color:#5A5A72;margin-left:4px;">/100</div>
                </div>
                <div style="margin-top:8px;height:6px;background-color:#1C1C28;border-radius:3px;overflow:hidden;">
                  <div style="width:${riskScore}%;height:100%;background-color:${riskColor};border-radius:3px;"></div>
                </div>
              </div>
            </div>

            <!-- AI Explanation -->
            <div style="background-color:#16161F;border:1px solid #2A2A3A;border-radius:8px;padding:20px;margin:0 0 24px;">
              <div style="font-size:12px;color:#A855F7;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🤖 AI Analysis</div>
              <p style="margin:0;font-size:13px;color:#9898B0;line-height:1.7;">${explanation}</p>
            </div>

            <!-- CTA -->
            <div style="text-align:center;">
              <a href="${DASHBOARD_URL}/tasks" 
                 style="display:inline-block;padding:14px 32px;background-color:#4F6EF7;color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                View in Operix →
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding:20px 32px;border-top:1px solid #2A2A3A;text-align:center;">
            <p style="margin:0;font-size:11px;color:#5A5A72;">Operix AI Risk Engine • KaizenSpark Tech Pvt. Ltd.</p>
            <p style="margin:4px 0 0;font-size:11px;color:#5A5A72;">This is an automated alert. Review and take action as needed.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `⚠️ Risk Alert: "${taskTitle}" — Score ${riskScore}/100`,
      html,
    })

    if (error) {
      console.error('[Resend] Risk alert email failed:', error)
      return { success: false }
    }

    console.log(`[Resend] ✅ Risk alert sent to ${to} (${data?.id})`)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('[Resend] Risk alert email error:', error)
    return { success: false }
  }
}

// ═══════════════════════════════════════════════════════
// 2. BURNOUT ALERT EMAIL
// ═══════════════════════════════════════════════════════

interface BurnoutWeekRow {
  week: string
  assigned: number
  completed: number
  rate: string
}

export const sendBurnoutAlertEmail = async (
  to: string,
  managerName: string,
  employeeName: string,
  burnoutScore: number,
  burnoutLevel: string,
  weeks: BurnoutWeekRow[]
): Promise<EmailResult> => {
  try {
    const levelColor: Record<string, string> = {
      critical: '#EF4444',
      high: '#F59E0B',
      medium: '#F59E0B',
      low: '#22C55E',
    }
    const color = levelColor[burnoutLevel] ?? '#F59E0B'

    const weekRows = weeks
      .map(
        (w) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #2A2A3A;color:#9898B0;font-size:13px;">${w.week}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2A2A3A;color:#F8F8FF;font-size:13px;text-align:center;font-family:'JetBrains Mono',monospace;">${w.assigned}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2A2A3A;color:#F8F8FF;font-size:13px;text-align:center;font-family:'JetBrains Mono',monospace;">${w.completed}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #2A2A3A;color:${parseFloat(w.rate) < 50 ? '#EF4444' : '#22C55E'};font-size:13px;text-align:center;font-family:'JetBrains Mono',monospace;">${w.rate}</td>
          </tr>`
      )
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head><style>${baseStyles}</style></head>
      <body style="margin:0;padding:20px;background-color:#0A0A0F;font-family:'Inter','Segoe UI',sans-serif;color:#F8F8FF;">
        <div class="container" style="max-width:600px;margin:0 auto;background-color:#111118;border-radius:12px;overflow:hidden;border:1px solid #2A2A3A;">
          
          <!-- Header -->
          <div style="padding:32px;text-align:center;background:linear-gradient(135deg,#581c87,#7e22ce,#3b0764);border-bottom:2px solid #A855F7;">
            <div style="font-size:32px;margin-bottom:8px;">🔴</div>
            <h1 style="margin:0;font-size:20px;font-weight:800;color:#E9D5FF;">Private: Wellbeing Alert</h1>
            <p style="margin:8px 0 0;font-size:12px;color:#C4B5FD;">Confidential — Manager Eyes Only</p>
          </div>

          <!-- Body -->
          <div style="padding:32px;">
            <p style="margin:0 0 20px;color:#9898B0;font-size:14px;">Hi ${managerName},</p>
            <p style="margin:0 0 24px;color:#9898B0;font-size:14px;line-height:1.6;">
              Our burnout detection system has flagged <strong style="color:#F8F8FF;">${employeeName}</strong> 
              with a <strong style="color:${color};">${burnoutLevel.toUpperCase()}</strong> burnout risk. 
              This assessment is based on their 4-week performance pattern analysis.
            </p>

            <!-- Burnout Score -->
            <div style="background-color:#16161F;border:1px solid #2A2A3A;border-radius:8px;padding:20px;margin:0 0 20px;text-align:center;">
              <div style="font-size:11px;color:#9898B0;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Burnout Score</div>
              <div style="font-size:48px;font-weight:800;color:${color};font-family:'JetBrains Mono',monospace;">${burnoutScore}</div>
              <div style="font-size:13px;color:#5A5A72;">out of 100</div>
              <div style="margin-top:12px;height:6px;background-color:#1C1C28;border-radius:3px;overflow:hidden;">
                <div style="width:${burnoutScore}%;height:100%;background:linear-gradient(90deg,#A855F7,${color});border-radius:3px;"></div>
              </div>
            </div>

            <!-- 4 Week Trend Table -->
            <div style="background-color:#16161F;border:1px solid #2A2A3A;border-radius:8px;overflow:hidden;margin:0 0 20px;">
              <div style="padding:12px 16px;border-bottom:1px solid #2A2A3A;">
                <span style="font-size:12px;color:#A855F7;text-transform:uppercase;letter-spacing:1px;">📊 4-Week Performance Trend</span>
              </div>
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr style="background-color:#1C1C28;">
                    <th style="padding:8px 12px;text-align:left;font-size:11px;color:#5A5A72;text-transform:uppercase;">Week</th>
                    <th style="padding:8px 12px;text-align:center;font-size:11px;color:#5A5A72;text-transform:uppercase;">Assigned</th>
                    <th style="padding:8px 12px;text-align:center;font-size:11px;color:#5A5A72;text-transform:uppercase;">Done</th>
                    <th style="padding:8px 12px;text-align:center;font-size:11px;color:#5A5A72;text-transform:uppercase;">Rate</th>
                  </tr>
                </thead>
                <tbody>${weekRows}</tbody>
              </table>
            </div>

            <!-- Recommendations -->
            <div style="background-color:#16161F;border:1px solid #2A2A3A;border-radius:8px;padding:20px;margin:0 0 24px;">
              <div style="font-size:12px;color:#22C55E;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">💡 Recommended Actions</div>
              <ul style="margin:0;padding:0 0 0 16px;color:#9898B0;font-size:13px;line-height:2;">
                <li>Schedule a private 1-on-1 to understand their challenges</li>
                <li>Review current task assignments for realistic deadlines</li>
                <li>Consider redistributing some workload temporarily</li>
                <li>Check for blockers or dependencies causing delays</li>
              </ul>
            </div>

            <div style="text-align:center;">
              <a href="${DASHBOARD_URL}/team" 
                 style="display:inline-block;padding:14px 32px;background-color:#A855F7;color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                View Team Dashboard →
              </a>
            </div>
          </div>

          <!-- Confidentiality Footer -->
          <div style="padding:20px 32px;border-top:1px solid #2A2A3A;text-align:center;background-color:#0A0A0F;">
            <p style="margin:0;font-size:11px;color:#5A5A72;">🔒 This alert is confidential and visible only to you as the manager.</p>
            <p style="margin:4px 0 0;font-size:11px;color:#5A5A72;">Please handle this information with care and empathy.</p>
            <p style="margin:8px 0 0;font-size:10px;color:#3A3A4A;">Operix Burnout Engine • KaizenSpark Tech Pvt. Ltd.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `🔴 Wellbeing Alert: ${employeeName} — Burnout Score ${burnoutScore}/100`,
      html,
    })

    if (error) {
      console.error('[Resend] Burnout alert email failed:', error)
      return { success: false }
    }

    console.log(`[Resend] ✅ Burnout alert sent to ${to} (${data?.id})`)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('[Resend] Burnout alert email error:', error)
    return { success: false }
  }
}

// ═══════════════════════════════════════════════════════
// 3. WEEKLY REPORT EMAIL
// ═══════════════════════════════════════════════════════

interface ReportStats {
  tasksCompleted: number
  tasksDelayed: number
  avgEfficiency: number
  activeProjects: number
}

export const sendWeeklyReportEmail = async (
  to: string,
  managerName: string,
  period: string,
  reportContent: string,
  stats: ReportStats
): Promise<EmailResult> => {
  try {
    // Convert markdown-like content to basic HTML
    const htmlContent = reportContent
      .replace(/### (.*)/g, '<h3 style="margin:20px 0 8px;font-size:16px;color:#F8F8FF;font-weight:700;">$1</h3>')
      .replace(/## (.*)/g, '<h2 style="margin:24px 0 12px;font-size:18px;color:#F8F8FF;font-weight:700;">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#F8F8FF;">$1</strong>')
      .replace(/- (.*)/g, '<li style="margin:4px 0;color:#9898B0;font-size:13px;">$1</li>')
      .replace(/\n\n/g, '</p><p style="margin:0 0 12px;color:#9898B0;font-size:14px;line-height:1.7;">')
      .replace(/\n/g, '<br>')

    const html = `
      <!DOCTYPE html>
      <html>
      <head><style>${baseStyles}</style></head>
      <body style="margin:0;padding:20px;background-color:#0A0A0F;font-family:'Inter','Segoe UI',sans-serif;color:#F8F8FF;">
        <div class="container" style="max-width:600px;margin:0 auto;background-color:#111118;border-radius:12px;overflow:hidden;border:1px solid #2A2A3A;">
          
          <!-- Header -->
          <div style="padding:32px;text-align:center;background:linear-gradient(135deg,#1e3a5f,#1e40af,#0c1929);border-bottom:2px solid #4F6EF7;">
            <div style="font-size:20px;font-weight:800;color:#F8F8FF;letter-spacing:1px;">
              <span style="color:#4F6EF7;">◆</span> OPERIX
            </div>
            <p style="margin:8px 0 4px;font-size:18px;color:#F8F8FF;font-weight:700;">Weekly Operations Report</p>
            <p style="margin:0;font-size:13px;color:#93C5FD;">${period}</p>
          </div>

          <!-- Stats Row -->
          <div style="padding:24px 32px;display:flex;background-color:#0A0A0F;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="width:25%;text-align:center;padding:12px 8px;background-color:#16161F;border-radius:8px 0 0 8px;border-right:1px solid #2A2A3A;">
                  <div style="font-size:24px;font-weight:800;color:#22C55E;font-family:'JetBrains Mono',monospace;">${stats.tasksCompleted}</div>
                  <div style="font-size:10px;color:#9898B0;text-transform:uppercase;margin-top:4px;">Completed</div>
                </td>
                <td style="width:25%;text-align:center;padding:12px 8px;background-color:#16161F;border-right:1px solid #2A2A3A;">
                  <div style="font-size:24px;font-weight:800;color:#F59E0B;font-family:'JetBrains Mono',monospace;">${stats.tasksDelayed}</div>
                  <div style="font-size:10px;color:#9898B0;text-transform:uppercase;margin-top:4px;">Delayed</div>
                </td>
                <td style="width:25%;text-align:center;padding:12px 8px;background-color:#16161F;border-right:1px solid #2A2A3A;">
                  <div style="font-size:24px;font-weight:800;color:#4F6EF7;font-family:'JetBrains Mono',monospace;">${stats.avgEfficiency}%</div>
                  <div style="font-size:10px;color:#9898B0;text-transform:uppercase;margin-top:4px;">Efficiency</div>
                </td>
                <td style="width:25%;text-align:center;padding:12px 8px;background-color:#16161F;border-radius:0 8px 8px 0;">
                  <div style="font-size:24px;font-weight:800;color:#06B6D4;font-family:'JetBrains Mono',monospace;">${stats.activeProjects}</div>
                  <div style="font-size:10px;color:#9898B0;text-transform:uppercase;margin-top:4px;">Projects</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Report Content -->
          <div style="padding:8px 32px 32px;">
            <p style="margin:0 0 20px;color:#9898B0;font-size:14px;">Hi ${managerName},</p>
            <p style="margin:0 0 16px;color:#9898B0;font-size:14px;line-height:1.6;">
              Here's your AI-generated weekly operations summary for <strong style="color:#F8F8FF;">${period}</strong>.
            </p>

            <div style="background-color:#16161F;border:1px solid #2A2A3A;border-radius:8px;padding:24px;margin:0 0 24px;">
              <p style="margin:0 0 12px;color:#9898B0;font-size:14px;line-height:1.7;">${htmlContent}</p>
            </div>

            <div style="text-align:center;">
              <a href="${DASHBOARD_URL}/reports" 
                 style="display:inline-block;padding:14px 32px;background-color:#4F6EF7;color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                View Full Report →
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding:20px 32px;border-top:1px solid #2A2A3A;text-align:center;">
            <p style="margin:0;font-size:11px;color:#5A5A72;">Generated by Operix AI • KaizenSpark Tech Pvt. Ltd.</p>
            <p style="margin:4px 0 0;font-size:10px;color:#3A3A4A;">Predict. Prevent. Perform.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `📊 Weekly Report: ${period} — ${stats.tasksCompleted} tasks completed`,
      html,
    })

    if (error) {
      console.error('[Resend] Weekly report email failed:', error)
      return { success: false }
    }

    console.log(`[Resend] ✅ Weekly report sent to ${to} (${data?.id})`)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('[Resend] Weekly report email error:', error)
    return { success: false }
  }
}

// ═══════════════════════════════════════════════════════
// 4. CLIENT UPDATE EMAIL
// ═══════════════════════════════════════════════════════

export const sendClientUpdateEmail = async (
  to: string,
  clientName: string,
  projectName: string,
  milestone: string,
  progress: number
): Promise<EmailResult> => {
  try {
    const progressColor = progress >= 75 ? '#22C55E' : progress >= 50 ? '#4F6EF7' : '#F59E0B'

    const html = `
      <!DOCTYPE html>
      <html>
      <head><style>${baseStyles}</style></head>
      <body style="margin:0;padding:20px;background-color:#0A0A0F;font-family:'Inter','Segoe UI',sans-serif;color:#F8F8FF;">
        <div class="container" style="max-width:600px;margin:0 auto;background-color:#111118;border-radius:12px;overflow:hidden;border:1px solid #2A2A3A;">
          
          <!-- Header -->
          <div style="padding:32px;text-align:center;background:linear-gradient(135deg,#064e3b,#065f46,#022c22);border-bottom:2px solid #22C55E;">
            <div style="font-size:32px;margin-bottom:8px;">✅</div>
            <h1 style="margin:0;font-size:20px;font-weight:800;color:#A7F3D0;">Project Update</h1>
            <p style="margin:8px 0 0;font-size:13px;color:#6EE7B7;">${projectName}</p>
          </div>

          <!-- Body -->
          <div style="padding:32px;">
            <p style="margin:0 0 20px;color:#9898B0;font-size:14px;">Hi ${clientName},</p>
            <p style="margin:0 0 24px;color:#9898B0;font-size:14px;line-height:1.6;">
              Great news! We have an update on your project <strong style="color:#F8F8FF;">${projectName}</strong>.
            </p>

            <!-- Milestone Card -->
            <div style="background-color:#16161F;border:1px solid #2A2A3A;border-radius:8px;padding:20px;margin:0 0 20px;">
              <div style="font-size:12px;color:#22C55E;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">🎯 Milestone Reached</div>
              <p style="margin:0;font-size:16px;color:#F8F8FF;font-weight:600;">${milestone}</p>
            </div>

            <!-- Progress Card -->
            <div style="background-color:#16161F;border:1px solid #2A2A3A;border-radius:8px;padding:20px;margin:0 0 24px;">
              <div style="font-size:12px;color:#9898B0;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Overall Progress</div>
              <div style="display:flex;align-items:baseline;">
                <span style="font-size:40px;font-weight:800;color:${progressColor};font-family:'JetBrains Mono',monospace;">${progress}%</span>
                <span style="font-size:14px;color:#5A5A72;margin-left:8px;">complete</span>
              </div>
              <div style="margin-top:12px;height:8px;background-color:#1C1C28;border-radius:4px;overflow:hidden;">
                <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,${progressColor},${progressColor}cc);border-radius:4px;transition:width 0.3s;"></div>
              </div>
            </div>

            <div style="text-align:center;">
              <a href="${DASHBOARD_URL}/client/dashboard" 
                 style="display:inline-block;padding:14px 32px;background-color:#22C55E;color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                View Your Project Portal →
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding:20px 32px;border-top:1px solid #2A2A3A;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9898B0;">Thank you for choosing KaizenSpark Tech.</p>
            <p style="margin:8px 0 0;font-size:10px;color:#5A5A72;">Powered by Operix • Predict. Prevent. Perform.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `✅ Project Update: ${projectName} — ${progress}% Complete`,
      html,
    })

    if (error) {
      console.error('[Resend] Client update email failed:', error)
      return { success: false }
    }

    console.log(`[Resend] ✅ Client update sent to ${to} (${data?.id})`)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('[Resend] Client update email error:', error)
    return { success: false }
  }
}
