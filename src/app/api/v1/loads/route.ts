/**
 * SafeFreight OS — Loads Versioned API Endpoint (/api/v1/loads)
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
    const status = searchParams.get('status') || undefined;

    const result = dataService.getLoads(claims, { limit, cursor, status });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to retrieve loads', { error: errMsg });
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

      const { origin_name, destination_name, weight_kg } = body;
      if (!origin_name || !destination_name || typeof weight_kg !== 'number' || weight_kg <= 0) {
        return NextResponse.json(
          {
            error:
              '400 Bad Request: origin_name, destination_name, and valid weight_kg are required',
          },
          { status: 400 }
        );
      }

      const load = await dataService.createLoad(claims, {
        origin_name,
        origin_lat: body.origin_lat,
        origin_lng: body.origin_lng,
        destination_name,
        destination_lat: body.destination_lat,
        destination_lng: body.destination_lng,
        weight_kg,
        volume_cft: body.volume_cft,
        distance_km: body.distance_km,
        pricing_inr: body.pricing_inr,
        status: body.status,
      });

      return NextResponse.json({ data: load }, { status: 201 });
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to create load', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
