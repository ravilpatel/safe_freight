/**
 * SafeFreight OS — Load Cancellation Endpoint (/api/v1/loads/[id]/cancel)
 * Reference: PRD v4.0.0 §8 & Feature 44 (Shipper Load Cancellation & Refund)
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { logger } from '@/lib/logger';

async function handleCancel(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    if (claims.role !== 'shipper' && claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only shippers or fleet admins can cancel loads' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason || 'Cancelled by shipper request';

    const result = await dataService.cancelLoad(claims, id, reason);

    logger.info('Load cancelled via cancel endpoint', {
      tenant_id: claims.tenant_id,
      user_id: claims.sub,
      load_id: id,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to cancel load', { error: errMsg, id: params?.id });
    if (errMsg.startsWith('403') || errMsg.includes('403 Forbidden')) {
      return NextResponse.json({ error: errMsg }, { status: 403 });
    }
    if (errMsg.startsWith('404') || errMsg.includes('404 Not Found')) {
      return NextResponse.json({ error: errMsg }, { status: 404 });
    }
    if (errMsg.startsWith('400') || errMsg.includes('400 Bad Request')) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return handleCancel(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return handleCancel(request, context);
}
