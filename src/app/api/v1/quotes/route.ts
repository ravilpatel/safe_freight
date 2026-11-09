/**
 * SafeFreight OS — Dynamic Shipper Quotes Versioned API Endpoint (/api/v1/quotes)
 * Reference: PRD v4.0.0 §7, §8 & CTO Phase 2 Directives
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateShipperQuote } from '@/lib/algorithms/shipperPricing';
import { calculateBidProbability } from '@/lib/algorithms/acceptanceProbability';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: '400 Bad Request: Missing request body' }, { status: 400 });
    }

    const { type = 'shared', distanceKm, weightKg, volumeCft, volumeCbm, userBid } = body;

    if (typeof distanceKm !== 'number' || typeof weightKg !== 'number') {
      return NextResponse.json(
        { error: '400 Bad Request: distanceKm and weightKg must be valid numbers' },
        { status: 400 }
      );
    }

    const effectiveVolumeCbm =
      typeof volumeCbm === 'number'
        ? volumeCbm
        : typeof volumeCft === 'number'
          ? Math.round((volumeCft / 35.315) * 10) / 10
          : 12.0;

    const quote = calculateShipperQuote(type, distanceKm, weightKg, effectiveVolumeCbm);

    let acceptance = null;
    if (typeof userBid === 'number') {
      acceptance = calculateBidProbability(userBid, quote.minPricingINR);
    }

    return NextResponse.json(
      {
        quote,
        acceptance,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to calculate shipper quote', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
