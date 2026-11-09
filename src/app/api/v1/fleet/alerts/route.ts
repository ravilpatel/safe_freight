/**
 * SafeFreight OS — Security & Route Deviation Alerts API (/api/v1/fleet/alerts)
 * PRD v4.0.0 §8, PRD v3 FR-FO-09, FR-SF-06
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { withIdempotency } from '@/lib/middleware/idempotency';
import { logger } from '@/lib/logger';
import { SecurityAlertType, AlertSeverity } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    if (claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only Fleet Admins can access security alerts' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resolvedParam = searchParams.get('resolved');
    const severityParam = searchParams.get('severity') as AlertSeverity | null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor') || undefined;

    const resolved = resolvedParam !== null ? resolvedParam === 'true' : undefined;

    const result = dataService.getSecurityAlerts(claims, {
      resolved,
      severity: severityParam || undefined,
      limit,
      cursor,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to retrieve security alerts', { error: errMsg });
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

    if (claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only Fleet Admins can create security alerts' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.alert_type || !body.message) {
      return NextResponse.json(
        { error: '400 Bad Request: Both alert_type and message are required' },
        { status: 400 }
      );
    }

    const alert = await dataService.createSecurityAlert(claims, {
      trip_id: body.trip_id,
      alert_type: body.alert_type as SecurityAlertType,
      message: body.message,
      severity: body.severity as AlertSeverity | undefined,
    });

    return NextResponse.json({ success: true, alert, data: alert }, { status: 201 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to create security alert', { error: errMsg });
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

    if (claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only Fleet Admins can resolve alerts' },
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

      const alertId = body.alert_id || body.id;
      if (!alertId) {
        return NextResponse.json(
          { error: '400 Bad Request: alert_id is required' },
          { status: 400 }
        );
      }

      const updatedAlert = await dataService.resolveSecurityAlert(
        claims,
        alertId,
        body.notes
      );

      return NextResponse.json(
        { success: true, alert: updatedAlert, data: updatedAlert },
        { status: 200 }
      );
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to resolve security alert', { error: errMsg });
    const status = errMsg.includes('404') ? 404 : errMsg.includes('400') ? 400 : 500;
    return NextResponse.json({ error: errMsg }, { status });
  }
}
