import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../types/index';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET: string = process.env.JWT_SECRET || 'fallback-secret-key';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // Development mode bypass — auto-assign a manager when no token is provided
  if ((!authHeader || !authHeader.startsWith('Bearer ')) && process.env.NODE_ENV === 'development') {
    // Use a default dev manager identity
    req.user = {
      userId: 'dev-manager-001',
      role: 'manager',
      email: 'manager@operix.dev',
    };
    console.log('[Auth] Dev mode: auto-authenticated as manager');
    next();
    return;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Provide a valid Bearer token.' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired. Please log in again.' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token. Please log in again.' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed.' });
  }
}

export function requireManager(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (req.user.role !== 'manager') {
    res.status(403).json({ error: 'Access denied. Manager role required.' });
    return;
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  authenticate(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    next();
  });
}

