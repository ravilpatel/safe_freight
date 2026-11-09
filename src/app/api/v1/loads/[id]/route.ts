/**
 * SafeFreight OS — Single Load & Cancellation REST Endpoint (/api/v1/loads/[id])
 * Reference: PRD v4.0.0 §8 & Feature 44 (Shipper Load Cancellation & Refund)
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    const { id } = params;
    const load = dataService.getLoadById(claims, id);
    if (!load) {
      return NextResponse.json(
        { error: `404 Not Found: Load ${id} not found in tenant organization` },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get('invoice') === 'true') {
      const invoice = dataService.generateInvoiceForLoad(claims, id);
      return NextResponse.json({ load, invoice }, { status: 200 });
    }

    return NextResponse.json({ load, data: load }, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to get load by ID', { error: errMsg, id: params.id });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    // Role check: Only shipper or fleet_admin can cancel loads
    if (claims.role !== 'shipper' && claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only shippers or fleet admins can cancel loads' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason || 'Cancelled by shipper request';

    const result = await dataService.cancelLoad(claims, id, reason);

    logger.info('Shipper load cancelled successfully', {
      tenant_id: claims.tenant_id,
      user_id: claims.sub,
      load_id: id,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to cancel load', { error: errMsg, id: params.id });
    if (errMsg.includes('403')) {
      return NextResponse.json({ error: errMsg }, { status: 403 });
    }
    if (errMsg.includes('404')) {
      return NextResponse.json({ error: errMsg }, { status: 404 });
    }
    if (errMsg.includes('400')) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    // Role check
    if (claims.role !== 'shipper' && claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only shippers or fleet admins can modify loads' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: '400 Bad Request: Missing request body' },
        { status: 400 }
      );
    }

    if (body.status === 'cancelled' || body.action === 'cancel') {
      const result = await dataService.cancelLoad(claims, id, body.reason);
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json(
      { error: '400 Bad Request: Unsupported patch action' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to patch load', { error: errMsg, id: params.id });
    if (errMsg.includes('403')) {
      return NextResponse.json({ error: errMsg }, { status: 403 });
    }
    if (errMsg.includes('404')) {
      return NextResponse.json({ error: errMsg }, { status: 404 });
    }
    if (errMsg.includes('400')) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
