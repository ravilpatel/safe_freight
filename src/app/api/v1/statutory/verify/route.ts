/**
 * SafeFreight OS — Checkpoint Scannable e-Bilti Verification Endpoint (/api/v1/statutory/verify)
 * Public read-only verification for RTO and Police Checkpoints along National Corridors.
 * Reference: PRD v4.0.0 §5 Phase 7, Feature 61
 */

import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/data-service';
import { checkRateLimit, getClientIp, createRateLimitExceededResponse, createRateLimitHeaders } from '@/lib/rateLimit';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, 60, 60000);
  if (!rateLimit.success) {
    return createRateLimitExceededResponse(rateLimit);
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || searchParams.get('hash') || searchParams.get('lr') || '';

  if (!token) {
    return NextResponse.json(
      { verified: false, error: 'Verification token or LR key is required' },
      { status: 400, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  const result = dataService.verifyEBiltiCheckpoint(token);
  if (!result.verified) {
    return NextResponse.json(
      { verified: false, error: result.error || 'Invalid or unverified consignment' },
      { status: 400, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  return NextResponse.json(
    {
      verified: true,
      consignment: result.consignment,
      message: 'e-Bilti cryptographic verification passed',
    },
    { headers: createRateLimitHeaders(rateLimit) }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, 60, 60000);
  if (!rateLimit.success) {
    return createRateLimitExceededResponse(rateLimit);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const token = body.token || body.hash || body.lrNumber || body.verificationHash || '';

    if (!token) {
      return NextResponse.json(
        { verified: false, error: 'Verification token or LR key is required' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const result = dataService.verifyEBiltiCheckpoint(token);
    if (!result.verified) {
      return NextResponse.json(
        { verified: false, error: result.error || 'Invalid or unverified consignment' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    return NextResponse.json(
      {
        verified: true,
        consignment: result.consignment,
        message: 'e-Bilti cryptographic verification passed',
      },
      { headers: createRateLimitHeaders(rateLimit) }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { verified: false, error: errMsg },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
