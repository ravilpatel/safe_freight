/**
 * SafeFreight OS — Fleet Statutory Documents API (/api/v1/fleet/documents)
 * PRD v4.0.0 §8, PRD v3 FR-FO-08, NEW_REQ FR-A3
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { withIdempotency } from '@/lib/middleware/idempotency';
import { logger } from '@/lib/logger';
import { DocumentType } from '@/types/database';

const VALID_DOC_TYPES: DocumentType[] = [
  'rc',
  'fitness',
  'insurance',
  'puc',
  'national_permit',
  'driving_license',
  'lr_eway_bill',
  'other',
];

export async function GET(request: NextRequest) {
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
        { error: '403 Forbidden: Only Fleet Admins can access document repository' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vehicleNumber = searchParams.get('vehicle_number') || undefined;
    const docType = searchParams.get('doc_type') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor') || undefined;

    const result = dataService.getDocuments(claims, {
      vehicle_number: vehicleNumber,
      doc_type: docType,
      limit,
      cursor,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to retrieve fleet documents', { error: errMsg });
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

    if (claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only Fleet Admins can upload compliance documents' },
        { status: 403 }
      );
    }

    return await withIdempotency(request, claims.tenant_id, async () => {
      const body = await request.json().catch(() => null);
      if (!body || !body.vehicle_number || !body.doc_type) {
        return NextResponse.json(
          { error: '400 Bad Request: vehicle_number and doc_type are required' },
          { status: 400 }
        );
      }

      if (!VALID_DOC_TYPES.includes(body.doc_type as DocumentType)) {
        return NextResponse.json(
          { error: `400 Bad Request: Invalid doc_type. Must be one of: ${VALID_DOC_TYPES.join(', ')}` },
          { status: 400 }
        );
      }

      const document = await dataService.createDocument(claims, {
        vehicle_number: body.vehicle_number,
        doc_type: body.doc_type as DocumentType,
        expiry_date: body.expiry_date,
        document_url: body.document_url,
      });

      return NextResponse.json({ success: true, document, data: document }, { status: 201 });
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to create fleet document', { error: errMsg });
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

    if (claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only Fleet Admins can delete documents' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idFromQuery = searchParams.get('id') || searchParams.get('document_id');

    let documentId = idFromQuery;
    if (!documentId) {
      const body = await request.json().catch(() => null);
      documentId = body?.id || body?.document_id;
    }

    if (!documentId) {
      return NextResponse.json(
        { error: '400 Bad Request: Document id is required' },
        { status: 400 }
      );
    }

    await dataService.deleteDocument(claims, documentId);

    return NextResponse.json(
      { success: true, message: 'Document deleted successfully' },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to delete fleet document', { error: errMsg });
    const status = errMsg.includes('404') ? 404 : 500;
    return NextResponse.json({ error: errMsg }, { status });
  }
}
