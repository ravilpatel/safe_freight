/**
 * SafeFreight OS — Statutory GST Tax Invoice REST Endpoint (/api/v1/quotes/invoice)
 * Reference: PRD v4.0.0 §5 Phase 5 & 7, §10, Features 40, 43
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromRequest } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    if (claims.role !== 'shipper' && claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only shippers or fleet admins can generate tax invoices' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const invoice = await dataService.createGSTInvoice(claims, body);

    logger.info('Official GST Tax Invoice generated', {
      tenant_id: claims.tenant_id,
      user_id: claims.sub,
      invoice_number: invoice.invoiceNumber,
      sac_code: invoice.sacCode,
      grand_total: invoice.grandTotalINR,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Official GST Tax Invoice generated successfully',
        invoice,
        data: invoice,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to generate GST tax invoice', { error: errMsg });
    if (errMsg.startsWith('403') || errMsg.includes('403 Forbidden')) {
      return NextResponse.json({ error: errMsg }, { status: 403 });
    }
    if (errMsg.startsWith('404') || errMsg.includes('404 Not Found')) {
      return NextResponse.json({ error: errMsg }, { status: 404 });
    }
    if (errMsg.startsWith('400') || errMsg.includes('400 Bad Request')) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const claims = extractClaimsFromRequest(request);
    if (!claims) {
      return NextResponse.json(
        { error: '401 Unauthorized: Valid Bearer token required' },
        { status: 401 }
      );
    }

    if (claims.role !== 'shipper' && claims.role !== 'fleet_admin') {
      return NextResponse.json(
        { error: '403 Forbidden: Only shippers or fleet admins can view tax invoices' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invoiceNumber = searchParams.get('invoice_number') || searchParams.get('invoiceNumber');
    const loadId = searchParams.get('load_id') || searchParams.get('loadId');

    if (invoiceNumber) {
      const invoice = dataService.getInvoiceByNumber(claims, invoiceNumber);
      if (!invoice) {
        return NextResponse.json(
          { error: `404 Not Found: Invoice ${invoiceNumber} not found` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, invoice, data: invoice }, { status: 200 });
    }

    if (loadId) {
      const invoice = dataService.generateInvoiceForLoad(claims, loadId);
      return NextResponse.json({ success: true, invoice, data: invoice }, { status: 200 });
    }

    return NextResponse.json(
      { error: '400 Bad Request: Missing invoice_number or load_id query parameter' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to retrieve tax invoice', { error: errMsg });
    if (errMsg.startsWith('403') || errMsg.includes('403 Forbidden')) {
      return NextResponse.json({ error: errMsg }, { status: 403 });
    }
    if (errMsg.startsWith('404') || errMsg.includes('404 Not Found')) {
      return NextResponse.json({ error: errMsg }, { status: 404 });
    }
    if (errMsg.startsWith('400') || errMsg.includes('400 Bad Request')) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
