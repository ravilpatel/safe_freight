/**
 * SafeFreight OS — Section 194C TDS Withholding API (/api/v1/statutory/tds)
 * Reference: PRD v4.0.0 §5 Phase 7, Feature 64
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateSection194CTDS, TDS194CInput } from '@/lib/algorithms/statutory';
import { extractClaimsFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Optional claims extraction: allows both authenticated callers and public preview
    extractClaimsFromRequest(request);

    const body: TDS194CInput = await request.json().catch(() => ({}));

    if (body.grossPaymentINR === undefined || typeof body.grossPaymentINR !== 'number') {
      return NextResponse.json(
        { error: '400 Bad Request: grossPaymentINR numeric parameter is required' },
        { status: 400 }
      );
    }

    const result = calculateSection194CTDS({
      transporterPan: body.transporterPan,
      transporterType: body.transporterType || 'individual',
      goodsCarriagesOwnedCount: Number(body.goodsCarriagesOwnedCount || 0),
      hasDeclarationSubSection6: Boolean(body.hasDeclarationSubSection6),
      grossPaymentINR: Number(body.grossPaymentINR),
      financialYearAggregateINR: Number(body.financialYearAggregateINR || 0),
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
