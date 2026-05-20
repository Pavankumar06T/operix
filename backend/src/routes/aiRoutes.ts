import { Router, Request, Response } from 'express';
import { authenticate, requireManager } from '../middleware/auth';
import { askAI, getChatHistory, clearChatHistory, getSuggestedQuestions } from '../services/aiAssistant';
import { runRiskEngine, getRiskExplanation } from '../services/riskEngine';
import { runBurnoutEngine, getBurnoutHistory } from '../services/burnoutEngine';
import { generateWeeklyReport } from '../services/reportGenerator';
import type { ChatMessage } from '../types/index';

const router = Router();

// POST /api/ai/chat — Send question to AI assistant
router.post('/chat', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const { question } = req.body as { question: string };
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({ error: 'Question is required and must be a non-empty string.' });
      return;
    }

    const managerId = req.user!.userId;
    const chatHistory = await getChatHistory(managerId);
    const result = await askAI(question.trim(), managerId, chatHistory);

    res.json({
      answer: result.answer,
      tokensUsed: result.tokensUsed,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error('[AI Route] Chat error:', error);
    res.status(500).json({ error: 'Failed to process your question. Please try again.' });
  }
});

// GET /api/ai/chat-history — Get chat history for current user
router.get('/chat-history', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const messages = await getChatHistory(req.user!.userId);
    res.json({ messages });
  } catch (error) {
    console.error('[AI Route] Chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history.' });
  }
});

// DELETE /api/ai/chat-history — Clear chat history
router.delete('/chat-history', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    await clearChatHistory(req.user!.userId);
    res.json({ success: true, message: 'Chat history cleared.' });
  } catch (error) {
    console.error('[AI Route] Clear chat error:', error);
    res.status(500).json({ error: 'Failed to clear chat history.' });
  }
});

// GET /api/ai/suggested-questions — Get context-aware suggested questions
router.get('/suggested-questions', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const questions = await getSuggestedQuestions(req.user!.userId);
    res.json({ questions });
  } catch (error) {
    console.error('[AI Route] Suggested questions error:', error);
    res.status(500).json({ error: 'Failed to generate suggested questions.' });
  }
});

// POST /api/ai/recalculate-risks — Manually trigger risk engine
router.post('/recalculate-risks', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    console.log(`[AI Route] Risk recalculation triggered by ${req.user!.email}`);
    const summary = await runRiskEngine();
    res.json({ success: true, summary });
  } catch (error) {
    console.error('[AI Route] Risk recalculation error:', error);
    res.status(500).json({ error: 'Failed to recalculate risk scores.' });
  }
});

// GET /api/ai/risk-explanation/:taskId — Get risk explanation for a task
router.get('/risk-explanation/:taskId', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const explanation = await getRiskExplanation(req.params.taskId);
    res.json({ explanation });
  } catch (error) {
    console.error('[AI Route] Risk explanation error:', error);
    res.status(500).json({ error: 'Failed to generate risk explanation.' });
  }
});

// POST /api/ai/check-burnout — Manually trigger burnout engine
router.post('/check-burnout', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    console.log(`[AI Route] Burnout check triggered by ${req.user!.email}`);
    const results = await runBurnoutEngine();
    const summary = {
      totalEmployees: results.length,
      flagged: results.filter((r) => r.isFlagged).length,
      critical: results.filter((r) => r.level === 'critical').length,
      high: results.filter((r) => r.level === 'high').length,
    };
    res.json({ success: true, summary, results });
  } catch (error) {
    console.error('[AI Route] Burnout check error:', error);
    res.status(500).json({ error: 'Failed to run burnout analysis.' });
  }
});

// GET /api/ai/burnout-history/:employeeId — Get burnout history for an employee
router.get('/burnout-history/:employeeId', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const weeksBack = parseInt(req.query.weeks as string) || 12;
    const history = await getBurnoutHistory(req.params.employeeId, weeksBack);
    res.json({ history });
  } catch (error) {
    console.error('[AI Route] Burnout history error:', error);
    res.status(500).json({ error: 'Failed to fetch burnout history.' });
  }
});

// POST /api/ai/generate-report — Manually trigger report generation
router.post('/generate-report', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    console.log(`[AI Route] Report generation triggered by ${req.user!.email}`);
    const result = await generateWeeklyReport();
    res.json({ success: true, result });
  } catch (error) {
    console.error('[AI Route] Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate weekly report.' });
  }
});

export default router;

