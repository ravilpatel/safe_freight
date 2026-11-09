/**
 * SafeFreight OS — High-Volume Telematics Pings REST Endpoint (/api/v1/pings)
 * Reference: PRD v4.0.0 §5 Phase 6, §8, PRD v3 FR-SF-01, FR-SF-06, FR-OF-01, FR-OF-03
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
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

    if (claims.role !== 'driver' && claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only drivers and fleet operators can transmit telematics pings' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: '400 Bad Request: Missing request body' },
        { status: 400 }
      );
    }

    let pingsArray: Array<Record<string, unknown>>;
    if (Array.isArray(body)) {
      pingsArray = body;
    } else if (Array.isArray(body.pings)) {
      pingsArray = body.pings;
    } else if (typeof body === 'object') {
      pingsArray = [body];
    } else {
      return NextResponse.json(
        { error: '400 Bad Request: Telematics pings payload must be an object or array' },
        { status: 400 }
      );
    }

    const result = await dataService.ingestPings(claims, pingsArray as any);

    logger.info('Telematics pings ingested', {
      tenant_id: claims.tenant_id,
      user_id: claims.sub,
      count: result.accepted,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Telemetry pings ingested successfully',
        accepted: result.accepted,
        data: result.pings,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to ingest telematics pings', { error: errMsg });
    if (errMsg.startsWith('403') || errMsg.includes('403 Forbidden')) {
      return NextResponse.json({ error: errMsg }, { status: 403 });
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
    const tripId = searchParams.get('trip_id') || searchParams.get('tripId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const cursor = searchParams.get('cursor') || undefined;

    const result = dataService.getPings(claims, { trip_id: tripId, limit, cursor });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to retrieve telematics pings', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
