import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loadsPOST, GET as loadsGET } from '@/app/api/v1/loads/route';
import { PATCH as loadCancelPATCH, POST as loadCancelPOST } from '@/app/api/v1/loads/[id]/cancel/route';
import { POST as tripsPOST, GET as tripsGET } from '@/app/api/v1/trips/route';
import { POST as quotesPOST } from '@/app/api/v1/quotes/route';
import { POST as invoicePOST, GET as invoiceGET } from '@/app/api/v1/quotes/invoice/route';
import { POST as khataPOST, GET as khataGET } from '@/app/api/v1/khata/route';
import { createSignedJwtPayload } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { globalIdempotencyStore } from '@/lib/middleware/idempotency';
import { SessionClaims } from '@/types/database';

describe('Unit Test: Versioned REST API Surface & Idempotency (/api/v1/)', () => {
  const tenantA: SessionClaims = {
    sub: 'user-admin-1',
    email: 'admin1@tenant-a.com',
    tenant_id: 'tenant-a-org-uuid',
    role: 'fleet_admin',
  };

  const tenantB: SessionClaims = {
    sub: 'user-admin-2',
    email: 'admin2@tenant-b.com',
    tenant_id: 'tenant-b-org-uuid',
    role: 'fleet_admin',
  };

  const tenantAShipper: SessionClaims = {
    sub: 'user-shipper-1',
    email: 'shipper1@tenant-a.com',
    tenant_id: 'tenant-a-org-uuid',
    role: 'shipper',
  };

  const tenantADriver: SessionClaims = {
    sub: 'user-driver-1',
    email: 'driver1@tenant-a.com',
    tenant_id: 'tenant-a-org-uuid',
    role: 'driver',
  };

  const tokenA = createSignedJwtPayload(tenantA);
  const tokenB = createSignedJwtPayload(tenantB);
  const tokenAShipper = createSignedJwtPayload(tenantAShipper);
  const tokenADriver = createSignedJwtPayload(tenantADriver);

  beforeEach(() => {
    dataService.clear();
    globalIdempotencyStore.clear();
  });

  // ==========================================
  // 1. LOADS ENDPOINT (/api/v1/loads)
  // ==========================================
  describe('/api/v1/loads', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'GET',
      });
      const res = await loadsGET(req);
      expect(res.status).toBe(401);
    });

    it('creates a new load with tenant isolation and audit logging', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'content-type': 'application/json',
          'idempotency-key': 'load-idemp-1',
        },
        body: JSON.stringify({
          origin_name: 'Mumbai JNPT Port',
          destination_name: 'Ahmedabad Changodar',
          weight_kg: 16000,
          distance_km: 525,
          volume_cft: 850,
        }),
      });

      const res = await loadsPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBeDefined();
      expect(json.data.tenant_id).toBe(tenantA.tenant_id);
      expect(json.data.origin_name).toBe('Mumbai JNPT Port');
      expect(json.data.pricing_inr).toBeGreaterThan(0);

      // Verify audit log entry
      const auditTrail = dataService.getAuditTrail(tenantA, 'loads');
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].action).toBe('INSERT');
      expect(auditTrail[0].record_id).toBe(json.data.id);
      expect(auditTrail[0].after_state).toBeDefined();
    });

    it('enforces strict cross-tenant isolation on GET', async () => {
      // Create load for Tenant A
      await dataService.createLoad(tenantA, {
        origin_name: 'Surat Ring Road',
        destination_name: 'Vapi GIDC',
        weight_kg: 5000,
      });

      // Query from Tenant A
      const reqA = new NextRequest('http://localhost:3000/api/v1/loads', {
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const resA = await loadsGET(reqA);
      const jsonA = await resA.json();
      expect(jsonA.data).toHaveLength(1);

      // Query from Tenant B (must see 0 rows)
      const reqB = new NextRequest('http://localhost:3000/api/v1/loads', {
        headers: { authorization: `Bearer ${tokenB}` },
      });
      const resB = await loadsGET(reqB);
      const jsonB = await resB.json();
      expect(jsonB.data).toHaveLength(0);
      expect(jsonB.pagination.total).toBe(0);
    });

    it('replays identical cached result on repeated Idempotency-Key', async () => {
      const makeRequest = () =>
        new NextRequest('http://localhost:3000/api/v1/loads', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${tokenA}`,
            'content-type': 'application/json',
            'idempotency-key': 'fixed-key-load-99',
          },
          body: JSON.stringify({
            origin_name: 'Bharuch',
            destination_name: 'Vadodara',
            weight_kg: 8000,
          }),
        });

      // First call
      const res1 = await loadsPOST(makeRequest());
      expect(res1.status).toBe(201);
      const json1 = await res1.json();

      // Second call with identical key
      const res2 = await loadsPOST(makeRequest());
      expect(res2.status).toBe(201);
      expect(res2.headers.get('Idempotency-Replayed')).toBe('true');
      const json2 = await res2.json();
      expect(json2.data.id).toBe(json1.data.id);

      // Verify only 1 load was created in database
      const tenantLoads = dataService.getLoads(tenantA, {});
      expect(tenantLoads.data).toHaveLength(1);
    });
  });

  // ==========================================
  // 2. TRIPS ENDPOINT (/api/v1/trips)
  // ==========================================
  describe('/api/v1/trips', () => {
    it('creates a new trip with Idempotency-Key and audits mutation', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/trips', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'content-type': 'application/json',
          'idempotency-key': 'trip-idemp-1',
        },
        body: JSON.stringify({
          gross_freight: 48000,
          maintenance_reserve: 2400,
        }),
      });

      const res = await tripsPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBeDefined();
      expect(json.data.tenant_id).toBe(tenantA.tenant_id);
      expect(json.data.gross_freight).toBe(48000);
      expect(json.data.balance_due).toBe(48000);

      // Audit trail
      const audit = dataService.getAuditTrail(tenantA, 'trips');
      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe('INSERT');
    });

    it('paginates trip records with limit and cursor', async () => {
      // Create 5 trips
      for (let i = 1; i <= 5; i++) {
        await dataService.createTrip(tenantA, { gross_freight: 10000 * i });
      }

      // Page 1 (limit 2)
      const reqPage1 = new NextRequest('http://localhost:3000/api/v1/trips?limit=2', {
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const resPage1 = await tripsGET(reqPage1);
      const jsonPage1 = await resPage1.json();
      expect(jsonPage1.data).toHaveLength(2);
      expect(jsonPage1.pagination.has_more).toBe(true);
      expect(jsonPage1.pagination.next_cursor).toBeDefined();

      // Page 2 (with cursor)
      const cursor = jsonPage1.pagination.next_cursor;
      const reqPage2 = new NextRequest(`http://localhost:3000/api/v1/trips?limit=2&cursor=${cursor}`, {
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const resPage2 = await tripsGET(reqPage2);
      const jsonPage2 = await resPage2.json();
      expect(jsonPage2.data).toHaveLength(2);
      expect(jsonPage2.pagination.has_more).toBe(true);
    });
  });

  // ==========================================
  // 3. QUOTES ENDPOINT (/api/v1/quotes)
  // ==========================================
  describe('/api/v1/quotes', () => {
    it('calculates quote and acceptance probability for shipper bid', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'private',
          distanceKm: 500,
          weightKg: 12000,
          volumeCbm: 25,
          userBid: 46000,
        }),
      });

      const res = await quotesPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.quote).toBeDefined();
      expect(json.quote.truckType).toBe('private');
      expect(json.quote.minPricingINR).toBe(41600);
      expect(json.quote.recommendedPriceINR).toBe(Math.round(41600 * 1.08));

      // Acceptance probability calculated for bid
      expect(json.acceptance).toBeDefined();
      expect(json.acceptance.probabilityPercent).toBeGreaterThan(68);
    });

    it('rejects invalid parameters with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ distanceKm: 'invalid' }),
      });
      const res = await quotesPOST(req);
      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // 4. KHATA FINANCIAL LEDGER (/api/v1/khata)
  // ==========================================
  describe('/api/v1/khata', () => {
    it('requires Idempotency-Key on advance disbursement (rejects with 400 if missing)', async () => {
      const trip = await dataService.createTrip(tenantA, { gross_freight: 40000 });

      const req = new NextRequest('http://localhost:3000/api/v1/khata', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenA}`,
          'content-type': 'application/json',
          // Omitting idempotency-key header
        },
        body: JSON.stringify({
          trip_id: trip.id,
          type: 'diesel',
          amount: 12000,
        }),
      });

      const res = await khataPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Idempotency-Key header is required');
    });

    it('disburses advance, updates balance due, records audit log, and replays on retry', async () => {
      const trip = await dataService.createTrip(tenantA, {
        gross_freight: 50000,
        maintenance_reserve: 2500,
      });

      const advancePayload = {
        trip_id: trip.id,
        type: 'diesel',
        amount: 15000,
      };

      const makeRequest = () =>
        new NextRequest('http://localhost:3000/api/v1/khata', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${tokenA}`,
            'content-type': 'application/json',
            'idempotency-key': 'khata-advance-key-001',
          },
          body: JSON.stringify(advancePayload),
        });

      // 1. Initial disbursement
      const res1 = await khataPOST(makeRequest());
      expect(res1.status).toBe(201);
      const json1 = await res1.json();
      expect(json1.data.trip.total_advances).toBe(15000);
      expect(json1.data.trip.balance_due).toBe(35000); // 50000 - 15000
      expect(json1.data.trip.net_profit).toBe(32500); // 50000 - (15000 + 2500)

      // 2. Audit log entry recorded with before and after state
      const audit = dataService.getAuditTrail(tenantA, 'trips');
      const updateAudit = audit.find((a) => a.action === 'UPDATE');
      expect(updateAudit).toBeDefined();
      expect(updateAudit?.before_state).toBeDefined();
      expect(updateAudit?.after_state).toBeDefined();

      // 3. Replay with identical idempotency key
      const res2 = await khataPOST(makeRequest());
      expect(res2.status).toBe(201);
      expect(res2.headers.get('Idempotency-Replayed')).toBe('true');
      const json2 = await res2.json();
      expect(json2.data.trip.total_advances).toBe(15000); // Not doubled!

      // 4. Query settlement via GET /api/v1/khata?trip_id=...
      const getReq = new NextRequest(
        `http://localhost:3000/api/v1/khata?trip_id=${trip.id}`,
        {
          headers: { authorization: `Bearer ${tokenA}` },
        }
      );
      const getRes = await khataGET(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.settlement.balanceDueOnPODINR).toBe(35000);
      expect(getJson.settlement.netGrossProfitINR).toBe(32500);
    });

    it('rejects cross-tenant advance disbursement with 404', async () => {
      // Trip belongs to Tenant A
      const tripA = await dataService.createTrip(tenantA, { gross_freight: 30000 });

      // Tenant B attempts to disburse advance on Tenant A's trip
      const req = new NextRequest('http://localhost:3000/api/v1/khata', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenB}`,
          'content-type': 'application/json',
          'idempotency-key': 'attacker-disburse-key',
        },
        body: JSON.stringify({
          trip_id: tripA.id,
          type: 'driverBhatta',
          amount: 2000,
        }),
      });

      const res = await khataPOST(req);
      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 5. LOAD CANCELLATION ENDPOINT (/api/v1/loads/[id]/cancel)
  // ==========================================
  describe('/api/v1/loads/[id]/cancel', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/loads/load-123/cancel', {
        method: 'PATCH',
      });
      const res = await loadCancelPATCH(req, { params: { id: 'load-123' } });
      expect(res.status).toBe(401);
    });

    it('returns 403 when user has driver role', async () => {
      const load = await dataService.createLoad(tenantA, {
        origin_name: 'Mumbai JNPT',
        destination_name: 'Pune Chakan',
        weight_kg: 9000,
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
        method: 'PATCH',
        headers: { authorization: `Bearer ${tokenADriver}` },
      });
      const res = await loadCancelPATCH(req, { params: { id: load.id } });
      expect(res.status).toBe(403);
    });

    it('returns 404 for cross-tenant load cancellation', async () => {
      const loadA = await dataService.createLoad(tenantA, {
        origin_name: 'Surat Ring Road',
        destination_name: 'Vadodara Ranoli',
        weight_kg: 8000,
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${loadA.id}/cancel`, {
        method: 'PATCH',
        headers: { authorization: `Bearer ${tokenB}` },
      });
      const res = await loadCancelPATCH(req, { params: { id: loadA.id } });
      expect(res.status).toBe(404);
    });

    it('returns 400 when load is already in_transit', async () => {
      const load = await dataService.createLoad(tenantA, {
        origin_name: 'Vapi GIDC',
        destination_name: 'Bhiwandi Warehousing',
        weight_kg: 12000,
        status: 'in_transit',
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
        method: 'PATCH',
        headers: { authorization: `Bearer ${tokenAShipper}` },
      });
      const res = await loadCancelPATCH(req, { params: { id: load.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/in transit/i);
    });

    it('returns 200 on success and idempotently on duplicate cancellation', async () => {
      const load = await dataService.createLoad(tenantA, {
        origin_name: 'JNPT Port',
        destination_name: 'Changodar Hub',
        weight_kg: 14000,
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Warehouse schedule changed' }),
      });
      const res = await loadCancelPATCH(req, { params: { id: load.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.load.status).toBe('cancelled');

      // Re-cancelling returns 200 idempotently
      const repeatReq = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
        method: 'POST',
        headers: { authorization: `Bearer ${tokenAShipper}` },
      });
      const repeatRes = await loadCancelPOST(repeatReq, { params: { id: load.id } });
      expect(repeatRes.status).toBe(200);
      const repeatJson = await repeatRes.json();
      expect(repeatJson.message).toMatch(/already cancelled/i);
    });
  });

  // ==========================================
  // 6. GST TAX INVOICE ENDPOINT (/api/v1/quotes/invoice)
  // ==========================================
  describe('/api/v1/quotes/invoice', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
      });
      const res = await invoicePOST(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 when driver role attempts to generate tax invoice', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenADriver}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          pricingInr: 45000,
          distanceKm: 525,
        }),
      });
      const res = await invoicePOST(req);
      expect(res.status).toBe(403);
    });

    it('returns 404 for cross-tenant load_id reference', async () => {
      const loadB = await dataService.createLoad(tenantB, {
        origin_name: 'Delhi Transport Nagar',
        destination_name: 'Jaipur VKIA',
        weight_kg: 10000,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ load_id: loadB.id }),
      });
      const res = await invoicePOST(req);
      expect(res.status).toBe(404);
    });

    it('returns 400 when invalid GSTIN format is supplied', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          consignorGstin: 'INVALID-GSTIN-FORMAT',
          pricingInr: 45000,
        }),
      });
      const res = await invoicePOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid consignor GSTIN format/i);
    });

    it('returns 201 with SAC 9965 invoice and appends to audit log', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          origin: 'Mumbai JNPT Port, Maharashtra',
          destination: 'Ahmedabad Changodar Hub, Gujarat',
          distanceKm: 525,
          weightKg: 14000,
          pricingInr: 52000,
          consignorName: 'Adani Logistics Hub',
          consignorGstin: '27AAACW1234F1Z1',
          consigneeName: 'Gujarat Industrial Corp',
          consigneeGstin: '24AAACW5678G1Z2',
          ewayBillNumber: '241098234512',
          vehicleNumber: 'GJ-01-XX-9821',
        }),
      });

      const res = await invoicePOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.invoice.sacCode).toBe('9965');
      expect(json.invoice.invoiceNumber).toMatch(/^SF-INV\/2026-27\/\d{5}$/);
      expect(json.invoice.isInterState).toBe(true);
      expect(json.invoice.igstRatePct).toBe(5);

      // Verify audit trail
      const audit = dataService.getAuditTrail(tenantAShipper, 'invoices');
      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe('INSERT');
      expect(audit[0].record_id).toBe(json.invoice.invoiceNumber);

      // Verify GET retrieval by invoice number
      const getReq = new NextRequest(
        `http://localhost:3000/api/v1/quotes/invoice?invoice_number=${json.invoice.invoiceNumber}`,
        {
          headers: { authorization: `Bearer ${tokenAShipper}` },
        }
      );
      const getRes = await invoiceGET(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.invoice.invoiceNumber).toBe(json.invoice.invoiceNumber);
    });
  });
});
