import { NextRequest, NextResponse } from 'next/server';
import { handleDriverOnboarding } from '@/lib/auth';
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

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: '400 Bad Request: Request body must be a valid JSON object' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const { invitationToken, email, password, fullName, phone, languagePreference } = body;

    if (!invitationToken || typeof invitationToken !== 'string' || invitationToken.trim().length === 0) {
      return NextResponse.json(
        { error: '400 Bad Request: Invalid or missing invitation token' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const result = await handleDriverOnboarding({
      invitationToken: invitationToken.trim(),
      email: email ? String(email).trim() : '',
      password: password ? String(password) : undefined,
      fullName: fullName ? String(fullName).trim() : '',
      phone: phone ? String(phone).trim() : undefined,
      languagePreference,
    });

    return NextResponse.json(result, { status: 201, headers: createRateLimitHeaders(rateLimit) });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Driver onboarding failed', { error: errMsg });
    const status = errMsg.includes('already registered') ? 409 : 400;
    return NextResponse.json({ error: errMsg }, { status, headers: createRateLimitHeaders(rateLimit) });
  }
}
