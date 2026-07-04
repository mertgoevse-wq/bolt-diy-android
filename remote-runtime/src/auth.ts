import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.REMOTE_RUNTIME_TOKEN || 'change-me';

/**
 * Validates the auth token.
 */
export function validateToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }
  return token === TOKEN;
}

/**
 * Express middleware to validate bearer authorization.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token format.' });
    return;
  }

  const token = authHeader.substring(7);

  if (!validateToken(token)) {
    res.status(403).json({ error: 'Forbidden: Invalid authorization token.' });
    return;
  }

  next();
}
