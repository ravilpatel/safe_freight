/**
 * SafeFreight OS — Golden Hour Safety Incident Console API (/api/v1/safety/incidents)
 * PRD v4.0.0 §8, PRD v3 FR-FO-10, FR-SF-05
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { withIdempotency } from '@/lib/middleware/idempotency';
import { logger } from '@/lib/logger';
import { IncidentType, IncidentStatus } from '@/types/database';

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
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor') || undefined;

    const result = dataService.getSafetyIncidents(claims, { status, limit, cursor });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to retrieve safety incidents', { error: errMsg });
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

    const body = await request.json().catch(() => null);
    if (!body || !body.incident_type) {
      return NextResponse.json(
        { error: '400 Bad Request: incident_type is required' },
        { status: 400 }
      );
    }

    const incident = await dataService.createSafetyIncident(claims, {
      trip_id: body.trip_id,
      driver_id: body.driver_id || claims.sub,
      incident_type: body.incident_type as IncidentType,
      g_force: body.g_force,
      t0_timestamp: body.t0_timestamp,
      status: body.status as IncidentStatus | undefined,
    });

    return NextResponse.json({ success: true, incident, data: incident }, { status: 201 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to create safety incident', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
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
        return NextResponse.json(
          { error: '400 Bad Request: Missing request body' },
          { status: 400 }
        );
      }

      const incidentId = body.incident_id || body.id;
      if (!incidentId) {
        return NextResponse.json(
          { error: '400 Bad Request: incident_id is required' },
          { status: 400 }
        );
      }

      const action = body.action || 'log_t2';

      let updatedIncident;
      if (action === 'cancel') {
        updatedIncident = await dataService.cancelSafetyIncident(
          claims,
          incidentId,
          body.reason
        );
      } else {
        // Log T2 arrival (First responders on-scene)
        updatedIncident = await dataService.logT2Arrival(claims, incidentId);
      }

      if (!updatedIncident) {
        return NextResponse.json(
          { error: '400 Bad Request: Incident already resolved' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: true, incident: updatedIncident, data: updatedIncident },
        { status: 200 }
      );
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to update safety incident', { error: errMsg });
    const status = errMsg.includes('404')
      ? 404
      : (errMsg.includes('400') || errMsg.includes('already resolved') || errMsg.includes('already cancelled'))
      ? 400
      : 500;
    return NextResponse.json({ error: errMsg }, { status });
  }
}
