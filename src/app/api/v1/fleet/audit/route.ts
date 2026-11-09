/**
 * SafeFreight OS — Append-Only Audit Dispute Trail API (/api/v1/fleet/audit)
 * Reference: PRD v4.0.0 §8 Feature 71, CGST Rule 54(3), IT Act §194C
 * 
 * Provides tenant-isolated, cryptographically auditable before/after event trails
 * for statutory inspections, rate disputes, GPS reconciliation, and insurance claims.
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
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
        { error: '403 Forbidden: Only Fleet Admins can access the audit dispute trail' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table_name') || searchParams.get('tableName') || undefined;
    const recordId = searchParams.get('record_id') || searchParams.get('recordId') || undefined;
    const action = searchParams.get('action') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = dataService.getPaginatedAuditTrail(claims, {
      tableName,
      recordId,
      action: action?.toUpperCase(),
      limit: isNaN(limit) ? 20 : limit,
      offset: isNaN(offset) ? 0 : offset,
    });

    logger.info('Audit trail query retrieved', {
      tenant_id: claims.tenant_id,
      actor_id: claims.sub,
      tableName,
      recordId,
      count: result.data.length,
      total: result.pagination.total,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to query audit dispute trail', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
