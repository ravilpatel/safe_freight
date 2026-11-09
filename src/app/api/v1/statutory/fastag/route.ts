/**
 * SafeFreight OS — NETC FASTag Plaza & Toll Calculation API (/api/v1/statutory/fastag)
 * Reference: PRD v4.0.0 §5 Phase 7, Feature 68
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateFASTagCorridorToll, VehicleAxleType } from '@/lib/algorithms/statutory';
import { extractClaimsFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const startKm = parseInt(searchParams.get('startKm') || '0', 10);
  const endKm = parseInt(searchParams.get('endKm') || '525', 10);
  const axleType = (searchParams.get('axleType') || '4_6_AXLE') as VehicleAxleType;

  const result = calculateFASTagCorridorToll(startKm, endKm, axleType);

  return NextResponse.json({
    success: true,
    data: result,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    extractClaimsFromRequest(request);

    const body = await request.json().catch(() => ({}));
    const startKm = typeof body.startKm === 'number' ? body.startKm : 0;
    const endKm = typeof body.endKm === 'number' ? body.endKm : 525;
    const axleType = (body.axleType || '4_6_AXLE') as VehicleAxleType;

    const result = calculateFASTagCorridorToll(startKm, endKm, axleType);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
