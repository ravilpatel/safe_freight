/**
 * SafeFreight OS — MoRTH VAHAN Vehicle Compliance API (/api/v1/statutory/vahan)
 * Reference: PRD v4.0.0 §5 Phase 7, Feature 65
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateVAHANCompliance, VAHANComplianceInput } from '@/lib/algorithms/statutory';
import { extractClaimsFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    extractClaimsFromRequest(request);

    const body: VAHANComplianceInput = await request.json().catch(() => ({}));

    if (!body.registrationPlate || typeof body.registrationPlate !== 'string') {
      return NextResponse.json(
        { error: '400 Bad Request: registrationPlate string parameter is required' },
        { status: 400 }
      );
    }

    const result = validateVAHANCompliance({
      registrationPlate: body.registrationPlate,
      fitnessExpiryDate: body.fitnessExpiryDate,
      nationalPermitExpiryDate: body.nationalPermitExpiryDate,
      insuranceExpiryDate: body.insuranceExpiryDate,
      pucExpiryDate: body.pucExpiryDate,
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
