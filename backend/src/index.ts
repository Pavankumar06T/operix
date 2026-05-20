import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import aiRoutes from './routes/aiRoutes';
import reportRoutes from './routes/reportRoutes';
import { setIO } from './lib/socket';
import { initializeCronJobs } from './cron/scheduler';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'operix-ai-engine',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP server and Socket.io
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
});

// Register Socket.io for use in services
setIO(io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Manager joins their private room for real-time alerts
  socket.on('join:manager', (managerId: string) => {
    socket.join(`manager_${managerId}`);
    console.log(`[Socket] Manager ${managerId} joined room manager_${managerId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('  Operix AI Engine');
  console.log('  Predict. Prevent. Perform.');
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('  by KaizenSpark Tech Pvt. Ltd.');
  console.log('══════════════════════════════════════════════');
  console.log('');

  // Initialize cron jobs
  initializeCronJobs();
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    io.close(() => {
      console.log('[Socket] Socket.io server closed.');
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;

