/**
 * SafeFreight OS — MoRTH SARATHI Commercial DL Verification API (/api/v1/statutory/sarathi)
 * Reference: PRD v4.0.0 §5 Phase 7, Feature 66
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSARATHICommercialDL, SARATHIDLInput } from '@/lib/algorithms/statutory';
import { extractClaimsFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    extractClaimsFromRequest(request);

    const body: SARATHIDLInput = await request.json().catch(() => ({}));

    if (!body.dlNumber || typeof body.dlNumber !== 'string') {
      return NextResponse.json(
        { error: '400 Bad Request: dlNumber string parameter is required' },
        { status: 400 }
      );
    }

    const result = validateSARATHICommercialDL({
      dlNumber: body.dlNumber,
      driverName: body.driverName,
      endorsements: body.endorsements,
      expiryDate: body.expiryDate,
      referenceDate: body.referenceDate ? new Date(body.referenceDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
