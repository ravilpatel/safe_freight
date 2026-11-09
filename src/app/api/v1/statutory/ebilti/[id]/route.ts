/**
 * SafeFreight OS — Tenant-Scoped e-Bilti by ID REST Endpoint (/api/v1/statutory/ebilti/[id])
 * Reference: PRD v4.0.0 §5 Phase 7, Features 60, 61
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: '400 Bad Request: e-Bilti ID parameter is required' },
        { status: 400 }
      );
    }

    const ebilti = await dataService.getEBiltiById(claims, id);
    if (!ebilti) {
      return NextResponse.json(
        { error: `404 Not Found: e-Bilti ${id} not found in tenant organization` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ebilti,
      data: ebilti,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.startsWith('403') || errMsg.includes('403 Forbidden')) {
      return NextResponse.json({ error: errMsg }, { status: 403 });
    }
    if (errMsg.startsWith('404') || errMsg.includes('404 Not Found')) {
      return NextResponse.json({ error: errMsg }, { status: 404 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
