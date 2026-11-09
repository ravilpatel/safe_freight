import { NextRequest, NextResponse } from 'next/server';
import { validateSignupInput, handleSignup } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp, createRateLimitExceededResponse, createRateLimitHeaders } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, 60, 60000);
  if (!rateLimit.success) {
    return createRateLimitExceededResponse(rateLimit);
  }

  try {
    const body = await request.json().catch(() => null);
    const validation = validateSignupInput(body);

    if (!validation.valid || !validation.data) {
      logger.warn('Signup rejected due to validation errors', {
        error: validation.error,
      });
      return NextResponse.json(
        { error: validation.error || 'Validation failed' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const result = await handleSignup(validation.data);

    return NextResponse.json(result, { status: 201, headers: createRateLimitHeaders(rateLimit) });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Signup error', { error: errMsg });

    const status = errMsg.includes('already registered') ? 409 : 400;
    return NextResponse.json({ error: errMsg }, { status, headers: createRateLimitHeaders(rateLimit) });
  }
}
