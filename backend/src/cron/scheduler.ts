import cron from 'node-cron';
import { runRiskEngine } from '../services/riskEngine';
import { runBurnoutEngine } from '../services/burnoutEngine';
import { generateWeeklyReport } from '../services/reportGenerator';

export function initializeCronJobs(): void {
  console.log('[Cron] Initializing scheduled jobs...');

  // Risk Engine: Every 12 hours
  cron.schedule('0 */12 * * *', async () => {
    console.log('[Cron] Running Risk Engine...');
    try {
      const summary = await runRiskEngine();
      console.log(`[Cron] Risk Engine completed: ${summary.totalTasksChecked} tasks checked, ${summary.tasksAtRisk} at risk, ${summary.alertsCreated} alerts created (${summary.executionTime})`);
    } catch (error) {
      console.error('[Cron] Risk Engine failed:', error);
    }
  });

  // Burnout Engine: Every Sunday at 11:00 PM
  cron.schedule('0 23 * * 0', async () => {
    console.log('[Cron] Running Burnout Engine...');
    try {
      const results = await runBurnoutEngine();
      const flaggedCount = results.filter((r) => r.isFlagged).length;
      console.log(`[Cron] Burnout Engine completed: ${results.length} employees analyzed, ${flaggedCount} flagged`);
    } catch (error) {
      console.error('[Cron] Burnout Engine failed:', error);
    }
  });

  // Report Generator: Every Monday at 8:00 AM
  cron.schedule('0 8 * * 1', async () => {
    console.log('[Cron] Running Weekly Report Generator...');
    try {
      const result = await generateWeeklyReport();
      console.log(`[Cron] Report generated: ID ${result.reportId}, ${result.emailsSent} emails sent`);
    } catch (error) {
      console.error('[Cron] Report Generator failed:', error);
    }
  });

  console.log('[Cron] Scheduled jobs:');
  console.log('  ├── Risk Engine       → Every 12 hours (0 */12 * * *)');
  console.log('  ├── Burnout Engine    → Sunday 11 PM   (0 23 * * 0)');
  console.log('  └── Report Generator  → Monday 8 AM    (0 8 * * 1)');
}

