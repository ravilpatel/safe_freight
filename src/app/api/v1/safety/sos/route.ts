/**
 * SafeFreight OS — Automated 112 ERSS Emergency SOS Distress API (/api/v1/safety/sos)
 * Reference: PRD v4.0.0 §5 Phase 6, §8, PRD v3 FR-SF-04, FR-DR-08
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { withIdempotency } from '@/lib/middleware/idempotency';
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
        { error: '403 Forbidden: Only drivers and fleet operators can trigger emergency distress protocol' },
        { status: 403 }
      );
    }

    return await withIdempotency(request, claims.tenant_id, async () => {
      const body = await request.json().catch(() => ({}));

      const incident = await dataService.createDistressSos(claims, body);

      logger.info('112 ERSS Emergency SOS Distress Dispatch triggered', {
        tenant_id: claims.tenant_id,
        user_id: claims.sub,
        incident_id: incident.id,
        incident_type: incident.incident_type,
        g_force: incident.g_force,
        t0_timestamp: incident.t0_timestamp,
        t1_timestamp: incident.t1_timestamp,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Automated 112 ERSS distress dispatch and next-of-kin alert acknowledged',
          incident,
          data: incident,
          erss_ack: true,
          sms_dispatched: true,
        },
        { status: 201 }
      );
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to trigger emergency SOS distress', { error: errMsg });
    if (errMsg.startsWith('403') || errMsg.includes('403 Forbidden')) {
      return NextResponse.json({ error: errMsg }, { status: 403 });
    }
    if (errMsg.startsWith('400') || errMsg.includes('400 Bad Request')) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
