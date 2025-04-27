import type { NextApiRequest, NextApiResponse } from 'next';

type RateLimitOptions = {
  windowMs: number; // Time window in milliseconds
  max: number;      // Max requests per window per IP
};

const defaultOptions: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per windowMs
};

const ipCache = new Map<string, { count: number; expires: number }>();

export default function rateLimit(options: Partial<RateLimitOptions> = {}) {
  const opts = { ...defaultOptions, ...options };

  return async function(req: NextApiRequest, res: NextApiResponse) {
    const ip = 
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '';

    const now = Date.now();
    const entry = ipCache.get(ip);

    if (!entry || entry.expires < now) {
      ipCache.set(ip, { count: 1, expires: now + opts.windowMs });
    } else {
      entry.count++;
      if (entry.count > opts.max) {
        res.status(429).json({ error: 'Too many requests, please try again later.' });
        return;
      }
    }
  };
}
