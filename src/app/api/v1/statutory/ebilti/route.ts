/**
 * SafeFreight OS — Server-Side Tenant-Unique e-Bilti REST Endpoint (/api/v1/statutory/ebilti)
 * Reference: PRD v4.0.0 §5 Phase 7, Features 60, 61, 62
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { idempotencyManager } from '@/lib/middleware/idempotency';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    const idempotencyKey = request.headers.get('idempotency-key') || '';
    if (idempotencyKey) {
      const cached = idempotencyManager.get(claims.tenant_id, idempotencyKey);
      if (cached) {
        logger.info('Idempotent replay served for e-Bilti creation', {
          tenantId: claims.tenant_id,
          key: idempotencyKey,
        });
        return NextResponse.json(cached.responsePayload, { status: cached.statusCode });
      }
    }

    const body = await request.json().catch(() => ({}));

    const ebilti = await dataService.createEBiltiConsignmentNote(claims, body);

    logger.info('Tenant-unique e-Bilti generated', {
      tenantId: claims.tenant_id,
      lrNumber: ebilti.lr_number,
      vehiclePlate: ebilti.vehicle_plate,
      grossWeightKg: ebilti.gross_weight_kg,
    });

    const responsePayload = {
      success: true,
      message: 'Server-side tenant-unique e-Bilti consignment note created successfully',
      ebilti,
      data: ebilti,
    };

    if (idempotencyKey) {
      idempotencyManager.set(
        claims.tenant_id,
        idempotencyKey,
        '/api/v1/statutory/ebilti',
        201,
        responsePayload
      );
    }

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to create e-Bilti consignment note', { error: errMsg });

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await dataService.getEBiltis(claims, { limit, offset });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
