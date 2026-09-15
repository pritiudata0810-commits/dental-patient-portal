// Simple in-memory sliding window rate limiter for public submission protection

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Checks whether an IP or identifier has exceeded max requests in the given window.
 * Default: 10 registrations per 60 seconds per IP
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Clean up if window expired
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count };
}
