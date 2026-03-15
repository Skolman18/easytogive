const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Periodically evict expired entries to prevent unbounded memory growth.
// Runs at most once per minute in long-running (non-serverless) environments.
let lastCleanup = 0;
function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, record] of rateLimitMap) {
    if (now > record.resetAt) rateLimitMap.delete(key);
  }
}

/**
 * In-memory rate limit. Resets on server restart. On serverless/multi-instance
 * deployments, consider Redis or similar for shared state.
 */
export function checkRateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  maybeCleanup();
  const key = `${identifier}:${action}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, retryAfterMs: record.resetAt - now };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, retryAfterMs: 0 };
}
