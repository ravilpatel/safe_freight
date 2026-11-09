/**
 * SafeFreight OS — Trips Versioned API Endpoint (/api/v1/trips)
 * Reference: PRD v4.0.0 §8 & CTO Phase 2 Directives
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService, validateScheduledDate } from '@/lib/data-service';
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

      const scheduledDate = body.scheduled_date || body.scheduledDate;
      if (scheduledDate) {
        const validation = validateScheduledDate(scheduledDate);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
      }

      const trip = await dataService.createTrip(claims, {
        load_id: body.load_id,
        driver_id: body.driver_id,
        gross_freight: body.gross_freight,
        maintenance_reserve: body.maintenance_reserve,
        scheduled_date: scheduledDate,
      });

      return NextResponse.json({ data: trip }, { status: 201 });
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to create trip', { error: errMsg });
    const status = errMsg.includes('400') ? 400 : 500;
    return NextResponse.json({ error: errMsg }, { status });
  }
}

export async function PATCH(request: NextRequest) {
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

      const tripId = body.trip_id || body.id;
      const milestone = body.milestone_status || body.milestone;

      if (!tripId || !milestone) {
        return NextResponse.json(
          { error: '400 Bad Request: Both trip_id and milestone_status are required' },
          { status: 400 }
        );
      }

      const trip = await dataService.updateTripMilestone(claims, tripId, milestone);

      return NextResponse.json({ success: true, trip, data: trip }, { status: 200 });
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('404')) {
      return NextResponse.json({ error: errMsg }, { status: 404 });
    }
    if (
      errMsg.includes('400') ||
      errMsg.includes('Bad Request') ||
      errMsg.includes('terminal state') ||
      errMsg.includes('Sequential progression') ||
      errMsg.includes('transition backwards') ||
      errMsg.includes('Invalid milestone')
    ) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    if (errMsg.includes('409') || errMsg.includes('Conflict')) {
      return NextResponse.json({ error: errMsg }, { status: 409 });
    }
    logger.error('Failed to update trip milestone', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
