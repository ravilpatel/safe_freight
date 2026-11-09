/**
 * SafeFreight OS — Loads Versioned API Endpoint (/api/v1/loads)
 * Reference: PRD v4.0.0 §8 & Features 38, 40, 41, 42, 44, 45
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { withIdempotency } from '@/lib/middleware/idempotency';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor') || undefined;
    const status = searchParams.get('status') || undefined;

    const result = dataService.getLoads(claims, { limit, cursor, status });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to retrieve loads', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    return await withIdempotency(request, claims.tenant_id, async () => {
      const body = await request.json().catch(() => null);
      if (!body) {
        return NextResponse.json({ error: '400 Bad Request: Missing request body' }, { status: 400 });
      }

      const { origin_name, destination_name, weight_kg } = body;
      if (!origin_name || !destination_name || typeof weight_kg !== 'number' || weight_kg <= 0) {
        return NextResponse.json(
          {
            error:
              '400 Bad Request: origin_name, destination_name, and valid weight_kg are required',
          },
          { status: 400 }
        );
      }

      try {
        const load = await dataService.createLoad(claims, {
          origin_name,
          origin_lat: body.origin_lat,
          origin_lng: body.origin_lng,
          destination_name,
          destination_lat: body.destination_lat,
          destination_lng: body.destination_lng,
          weight_kg,
          volume_cft: body.volume_cft,
          distance_km: body.distance_km,
          pricing_inr: body.pricing_inr,
          status: body.status,
          cargo_category: body.cargo_category,
          truck_type: body.truck_type,
          consignor_name: body.consignor_name,
          consignor_gstin: body.consignor_gstin,
          consignee_name: body.consignee_name,
          consignee_gstin: body.consignee_gstin,
          eway_bill_number: body.eway_bill_number,
          hamali_included: body.hamali_included,
          insurance_included: body.insurance_included,
          scheduled_date: body.scheduled_date,
          scheduled_slot: body.scheduled_slot,
          bid_bonus_inr: body.bid_bonus_inr,
          acceptance_probability: body.acceptance_probability,
          dispatch_speed_band: body.dispatch_speed_band,
        });

        return NextResponse.json({ data: load, load }, { status: 201 });
      } catch (validationErr: unknown) {
        const msg = validationErr instanceof Error ? validationErr.message : String(validationErr);
        if (msg.includes('400')) {
          return NextResponse.json({ error: msg }, { status: 400 });
        }
        throw validationErr;
      }
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to create load', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const loadId = searchParams.get('id') || body.id || body.load_id;

    if (!loadId) {
      return NextResponse.json(
        { error: '400 Bad Request: load_id is required' },
        { status: 400 }
      );
    }

    const result = await dataService.cancelLoad(claims, loadId, body.reason);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to cancel load', { error: errMsg });
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

export async function PATCH(request: NextRequest) {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const loadId = searchParams.get('id') || body.id || body.load_id;

    if (!loadId) {
      return NextResponse.json(
        { error: '400 Bad Request: load_id is required' },
        { status: 400 }
      );
    }

    if (body.action === 'cancel' || body.status === 'cancelled') {
      const result = await dataService.cancelLoad(claims, loadId, body.reason);
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json({ error: '400 Bad Request: Unsupported patch action' }, { status: 400 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to patch load', { error: errMsg });
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
