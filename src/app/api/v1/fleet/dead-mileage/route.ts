/**
 * SafeFreight OS — Dead Mileage & Savings Versioned API (/api/v1/fleet/dead-mileage)
 * PRD v4.0.0 §7, PRD v3 FR-FO-02, FR-FO-07
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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
        { error: '403 Forbidden: Only Fleet Admins can access dead mileage metrics' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const totalKmParam = searchParams.get('total_km');
    const loadedKmParam = searchParams.get('loaded_km');

    const totalKm = totalKmParam !== null ? parseFloat(totalKmParam) : undefined;
    const loadedKm = loadedKmParam !== null ? parseFloat(loadedKmParam) : undefined;

    const metrics = dataService.getDeadMileageMetrics(claims, {
      total_km: totalKm,
      loaded_km: loadedKm,
    });

    const summary = dataService.getFleetKpiSummary(claims);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...metrics,
          summary,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to calculate dead mileage metrics', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
