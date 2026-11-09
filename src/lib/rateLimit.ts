import { NextResponse } from 'next/server';

/**
 * SafeFreight OS — In-Memory IP Rate Limiter
 * Reference: PRD v4.0.0 §3, §8 & Phase 5/8 Rate Limiting Directives
 * 
 * Enforces token-bucket / sliding-window rate limiting on public unauthenticated endpoints.
 * Default: 60 requests per minute per IP.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipStore = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
}

/**
 * Extracts the real client IP address from request headers or socket info.
 * Prioritizes standard proxy headers (x-forwarded-for, x-real-ip, cf-connecting-ip).
 */
export function getClientIp(
  request: { headers?: { get(_name: string): string | null }; ip?: string } | null | undefined
): string {
  if (!request) return '127.0.0.1';

  try {
    const headers = request.headers;
    if (headers) {
      const forwarded = headers.get('x-forwarded-for');
      if (forwarded) {
        const first = forwarded.split(',')[0].trim();
        if (first) return first;
      }

      const realIp = headers.get('x-real-ip');
      if (realIp && realIp.trim()) {
        return realIp.trim();
      }

      const cfIp = headers.get('cf-connecting-ip');
      if (cfIp && cfIp.trim()) {
        return cfIp.trim();
      }
    }

    if (request.ip && typeof request.ip === 'string') {
      return request.ip.trim();
    }
  } catch {
    // fallback
  }

  return '127.0.0.1';
}

/**
 * Generates standard rate limit headers conforming to RFC 6585 and IETF Draft standards.
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(result.reset),
  };

  if (result.retryAfter > 0) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Returns a standardized 429 Too Many Requests response with appropriate headers.
 */
export function createRateLimitExceededResponse(
  result: RateLimitResult,
  customMessage?: string
): NextResponse {
  return NextResponse.json(
    {
      error: '429 Too Many Requests: Rate limit exceeded (60 req/min)',
      message:
        customMessage ||
        `Rate limit exceeded. Please retry after ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: createRateLimitHeaders(result),
    }
  );
}

/**
 * Check and record a request for a client IP.
 * @param ip Client IP address
 * @param limit Maximum allowed requests per window (default 60)
 * @param windowMs Time window in milliseconds (default 60,000 ms / 1 minute)
 */
export function checkRateLimit(
  ip: string = '127.0.0.1',
  limit: number = 60,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const cleanIp = ip.trim() || '127.0.0.1';

  let record = ipStore.get(cleanIp);

  if (!record || now >= record.resetAt) {
    record = {
      count: 1,
      resetAt: now + windowMs,
    };
    ipStore.set(cleanIp, record);
    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - 1),
      reset: Math.ceil(record.resetAt / 1000),
      retryAfter: 0,
    };
  }

  if (record.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil(record.resetAt / 1000),
      retryAfter,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - record.count),
    reset: Math.ceil(record.resetAt / 1000),
    retryAfter: 0,
  };
}

/**
 * Clear the rate limiter store (used for tests).
 */
export function resetRateLimiter(): void {
  ipStore.clear();
}
