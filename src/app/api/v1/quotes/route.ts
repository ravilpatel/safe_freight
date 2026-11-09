/**
 * SafeFreight OS — Public Rate-Limited Freight Cost Estimator Versioned API (/api/v1/quotes)
 * Reference: PRD v4.0.0 §3, §7, §8 & Feature 35 Directives
 * 
 * Unauthenticated instant freight calculator with ZERO database writes.
 * Enforces 60 requests/minute rate limit per IP.
 * Computes base freight, diesel fuel surcharge, FASTag tolls, backhaul discount, and 5% GST (SAC 9965).
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateShipperQuote } from '@/lib/algorithms/shipperPricing';
import { calculateBidProbability } from '@/lib/algorithms/acceptanceProbability';
import {
  calculateDynamicFreightQuote,
  calculateCorridorDistance,
} from '@/lib/algorithms/quoteEstimator';
import { checkRateLimit, getClientIp, createRateLimitHeaders } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

function rateLimitHeaders(limit: number, remaining: number, reset: number, retryAfter?: number): Record<string, string> {
  return createRateLimitHeaders({
    success: (remaining > 0 || (retryAfter === undefined || retryAfter === 0)),
    limit,
    remaining,
    reset,
    retryAfter: retryAfter || 0,
  });
}

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, 60, 60000);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: '429 Too Many Requests: Rate limit exceeded (60 req/min)' },
      {
        status: 429,
        headers: rateLimitHeaders(rateLimit.limit, rateLimit.remaining, rateLimit.reset, rateLimit.retryAfter),
      }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin') || 'Mumbai JNPT Port';
    const destination = searchParams.get('destination') || 'Ahmedabad Changodar Hub';
    const rawDist = searchParams.get('distanceKm');
    const rawWeight = searchParams.get('weightKg') || searchParams.get('payloadKg');
    const rawVolume = searchParams.get('volumeCbm') || searchParams.get('volumeCft');
    const truckType = searchParams.get('truckType') || searchParams.get('type') || 'shared';
    const rawBid = searchParams.get('userBid');

    let distanceKm = rawDist ? parseFloat(rawDist) : calculateCorridorDistance(origin, destination);
    if (isNaN(distanceKm) || distanceKm <= 0) {
      distanceKm = calculateCorridorDistance(origin, destination);
    }

    const weightKg = rawWeight ? parseFloat(rawWeight) : 5000;
    const volumeCbm = rawVolume ? parseFloat(rawVolume) : 12.0;

    const detailedEstimate = calculateDynamicFreightQuote({
      origin,
      destination,
      distanceKm,
      weightKg: isNaN(weightKg) ? 5000 : weightKg,
      volumeCbm: isNaN(volumeCbm) ? 12.0 : volumeCbm,
      truckType,
    });

    const standardQuote = calculateShipperQuote(
      truckType,
      detailedEstimate.distanceKm,
      detailedEstimate.weightKg,
      detailedEstimate.volumeCbm
    );

    let acceptance = null;
    if (rawBid) {
      const bidAmount = parseFloat(rawBid);
      if (!isNaN(bidAmount)) {
        acceptance = calculateBidProbability(bidAmount, detailedEstimate.totalQuoteINR);
      }
    }

    return NextResponse.json(
      {
        quote: standardQuote,
        estimate: detailedEstimate,
        acceptance,
      },
      {
        status: 200,
        headers: rateLimitHeaders(rateLimit.limit, rateLimit.remaining, rateLimit.reset),
      }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to calculate freight quote via GET', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, 60, 60000);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: '429 Too Many Requests: Rate limit exceeded (60 req/min)' },
      {
        status: 429,
        headers: rateLimitHeaders(rateLimit.limit, rateLimit.remaining, rateLimit.reset, rateLimit.retryAfter),
      }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: '400 Bad Request: Missing request body' },
        {
          status: 400,
          headers: rateLimitHeaders(rateLimit.limit, rateLimit.remaining, rateLimit.reset),
        }
      );
    }

    const {
      type,
      truckType = type || 'shared',
      distanceKm,
      weightKg,
      payloadKg,
      volumeCft,
      volumeCbm,
      userBid,
      origin = 'Mumbai JNPT Port',
      destination = 'Ahmedabad Changodar Hub',
      fuelPricePerLitre,
      hasBackhaulDiscount,
    } = body;

    const effectiveWeight = typeof weightKg === 'number' ? weightKg : typeof payloadKg === 'number' ? payloadKg : null;

    if (
      (distanceKm !== undefined && (typeof distanceKm !== 'number' || isNaN(distanceKm))) ||
      (effectiveWeight !== null && (typeof effectiveWeight !== 'number' || isNaN(effectiveWeight)))
    ) {
      return NextResponse.json(
        { error: '400 Bad Request: distanceKm and weightKg must be valid numbers' },
        {
          status: 400,
          headers: rateLimitHeaders(rateLimit.limit, rateLimit.remaining, rateLimit.reset),
        }
      );
    }

    // Default distance from hubs if omitted
    const effectiveDistanceKm =
      typeof distanceKm === 'number' && isFinite(distanceKm)
        ? distanceKm
        : calculateCorridorDistance(origin, destination);

    const finalWeightKg = effectiveWeight !== null ? effectiveWeight : 5000;

    const effectiveVolumeCbm =
      typeof volumeCbm === 'number'
        ? volumeCbm
        : typeof volumeCft === 'number'
          ? Math.round((volumeCft / 35.315) * 10) / 10
          : 12.0;

    // Detailed algorithmic calculation (Feature 35)
    const detailedEstimate = calculateDynamicFreightQuote({
      origin,
      destination,
      distanceKm: effectiveDistanceKm,
      weightKg: finalWeightKg,
      volumeCbm: effectiveVolumeCbm,
      truckType,
      fuelPricePerLitre,
      hasBackhaulDiscount,
    });

    // Standard quote for backward compatibility
    const standardQuote = calculateShipperQuote(
      truckType,
      effectiveDistanceKm,
      finalWeightKg,
      effectiveVolumeCbm
    );

    let acceptance = null;
    if (typeof userBid === 'number') {
      acceptance = calculateBidProbability(userBid, standardQuote.minPricingINR);
    }

    return NextResponse.json(
      {
        quote: standardQuote,
        estimate: detailedEstimate,
        acceptance,
      },
      {
        status: 200,
        headers: rateLimitHeaders(rateLimit.limit, rateLimit.remaining, rateLimit.reset),
      }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to calculate shipper quote', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
