/**
 * SafeFreight OS — Trips Versioned API Endpoint (/api/v1/trips)
 * Reference: PRD v4.0.0 §8 & CTO Phase 2 Directives
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { withIdempotency } from '@/lib/middleware/idempotency';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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
    const cursor = searchParams.get('cursor') || undefined;
    const milestoneStatus = searchParams.get('milestone_status') || undefined;

    const result = dataService.getTrips(claims, { limit, cursor, milestone_status: milestoneStatus });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to retrieve trips', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    return await withIdempotency(request, claims.tenant_id, async () => {
      const body = await request.json().catch(() => null);
      if (!body) {
        return NextResponse.json({ error: '400 Bad Request: Missing request body' }, { status: 400 });
      }

      const trip = await dataService.createTrip(claims, {
        load_id: body.load_id,
        driver_id: body.driver_id,
        gross_freight: body.gross_freight,
        maintenance_reserve: body.maintenance_reserve,
      });

      return NextResponse.json({ data: trip }, { status: 201 });
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to create trip', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
