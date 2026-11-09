/**
 * SafeFreight OS — Load Acceptance Versioned API Endpoint (/api/v1/loads/accept)
 * Reference: PRD v4.0.0 Phase 3, PROJECT.md Interface Contract §2
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { withIdempotency } from '@/lib/middleware/idempotency';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    // Role check: Only driver (or fleet_admin on behalf of fleet) can accept loads
    if (claims.role !== 'driver' && claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only drivers or fleet operators may accept loads' },
        { status: 403 }
      );
    }

    return await withIdempotency(request, claims.tenant_id, async () => {
      const body = await request.json().catch(() => null);
      if (!body) {
        return NextResponse.json(
          { error: '400 Bad Request: Missing request body' },
          { status: 400 }
        );
      }

      const loadId = body.load_id || body.loadId || body.id;
      if (!loadId) {
        return NextResponse.json(
          { error: '400 Bad Request: load_id is required' },
          { status: 400 }
        );
      }

      try {
        const { load, trip } = await dataService.acceptLoad(claims, loadId);

        logger.info('Load accepted successfully', {
          tenant_id: claims.tenant_id,
          driver_id: claims.sub,
          load_id: loadId,
          trip_id: trip.id,
        });

        return NextResponse.json(
          {
            success: true,
            trip_id: trip.id,
            message: 'Load accepted successfully',
            load,
            trip,
            data: { trip_id: trip.id, load, trip },
          },
          { status: 200 }
        );
      } catch (acceptErr: unknown) {
        const msg = acceptErr instanceof Error ? acceptErr.message : String(acceptErr);
        if (msg.includes('404')) {
          return NextResponse.json({ error: msg }, { status: 404 });
        }
        if (msg.includes('409') || msg.toLowerCase().includes('already accepted') || msg.toLowerCase().includes('conflict')) {
          return NextResponse.json({ error: msg }, { status: 409 });
        }
        throw acceptErr;
      }
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to accept load', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
