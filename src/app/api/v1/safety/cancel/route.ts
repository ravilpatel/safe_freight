/**
 * SafeFreight OS — 96dp False Alarm Emergency Cancellation API (/api/v1/safety/cancel)
 * Reference: PRD v4.0.0 §5 Phase 6, §8, PRD v3 FR-SF-03, FR-DR-08
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
        { error: '403 Forbidden: Only drivers and fleet operators can cancel emergency alerts' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const incidentId = body.incident_id || body.id;
    const reason = body.reason || 'Driver tapped 96dp cancel button (False Alarm)';

    const incident = await dataService.cancelSafetyIncident(claims, incidentId, reason);

    logger.info('Safety incident false alarm cancelled', {
      tenant_id: claims.tenant_id,
      user_id: claims.sub,
      incident_id: incident.id,
      reason,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'False alarm cancellation acknowledged. Siren and distress dispatch halted.',
        incident,
        data: incident,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to cancel safety incident', { error: errMsg });
    if (errMsg.startsWith('403') || errMsg.includes('403 Forbidden')) {
      return NextResponse.json({ error: errMsg }, { status: 403 });
    }
    if (errMsg.startsWith('404') || errMsg.includes('404 Not Found')) {
      return NextResponse.json({ error: errMsg }, { status: 404 });
    }
    if (errMsg.startsWith('400') || errMsg.includes('400 Bad Request') || errMsg.includes('already cancelled') || errMsg.includes('already resolved')) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
