/**
 * SafeFreight OS — Trip Khata Financial Settlement API Endpoint (/api/v1/khata)
 * Reference: PRD v4.0.0 §7, §8 & CTO Phase 2 Directives
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
    const tripId = searchParams.get('trip_id');
    if (!tripId) {
      return NextResponse.json(
        { error: '400 Bad Request: trip_id query parameter is required' },
        { status: 400 }
      );
    }

    const settlementData = dataService.getTripKhataSettlement(claims, tripId);
    if (!settlementData) {
      return NextResponse.json(
        { error: '404 Not Found: Trip not found in tenant organization' },
        { status: 404 }
      );
    }

    return NextResponse.json(settlementData, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to get Khata settlement', { error: errMsg });
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

    // Mutating financial endpoints strictly require Idempotency-Key
    return await withIdempotency(
      request,
      claims.tenant_id,
      async () => {
        const body = await request.json().catch(() => null);
        if (!body) {
          return NextResponse.json({ error: '400 Bad Request: Missing request body' }, { status: 400 });
        }

        const { trip_id, type, amount, notes } = body;
        if (!trip_id || !type || typeof amount !== 'number' || amount <= 0) {
          return NextResponse.json(
            {
              error:
                '400 Bad Request: trip_id, valid advance type (diesel, fastag, driverBhatta, hamali), and positive amount required',
            },
            { status: 400 }
          );
        }

        const validTypes = ['diesel', 'fastag', 'driverBhatta', 'hamali'];
        if (!validTypes.includes(type)) {
          return NextResponse.json(
            { error: `400 Bad Request: Invalid advance type. Must be one of: ${validTypes.join(', ')}` },
            { status: 400 }
          );
        }

        const result = await dataService.disburseTripAdvance(claims, trip_id, {
          type,
          amount,
          notes,
        });

        return NextResponse.json({ data: result }, { status: 201 });
      },
      { required: true }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to disburse trip advance', { error: errMsg });
    const status = errMsg.includes('404') ? 404 : 500;
    return NextResponse.json({ error: errMsg }, { status });
  }
}
