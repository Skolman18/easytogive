const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * In-memory rate limit. Resets on server restart. On serverless/multi-instance
 * deployments, consider Redis or similar for shared state.
 */
export function checkRateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const key = `${identifier}:${action}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}
