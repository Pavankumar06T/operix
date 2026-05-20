import { Router, Request, Response } from 'express';
import { authenticate, requireManager } from '../middleware/auth';
import { getAllReports, getReportById } from '../services/reportGenerator';

const router = Router();

// GET /api/reports — Get all reports, newest first
router.get('/', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const reports = await getAllReports();
    res.json({ reports });
  } catch (error) {
    console.error('[Report Route] Fetch all error:', error);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// GET /api/reports/:id — Get single report full content
router.get('/:id', authenticate, requireManager, async (req: Request, res: Response) => {
  try {
    const report = await getReportById(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    res.json({ report });
  } catch (error) {
    console.error('[Report Route] Fetch single error:', error);
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

export default router;

