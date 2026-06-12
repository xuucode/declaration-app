import { NextFunction, Request, Response } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message: string;
}

const getClientKey = (req: Request): string => {
  return req.ip || req.socket.remoteAddress || 'unknown';
};

export const createRateLimit = ({ windowMs, maxRequests, message }: RateLimitOptions) => {
  const store = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = getClientKey(req);
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ message });
      return;
    }

    current.count += 1;
    store.set(key, current);

    if (store.size > 10000) {
      for (const [storedKey, entry] of store.entries()) {
        if (entry.resetAt <= now) {
          store.delete(storedKey);
        }
      }
    }

    next();
  };
};
