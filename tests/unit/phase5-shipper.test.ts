import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as quotesGET, POST as quotesPOST } from '@/app/api/v1/quotes/route';
import { GET as loadsGET, POST as loadsPOST } from '@/app/api/v1/loads/route';
import { DELETE as singleLoadDELETE, GET as singleLoadGET } from '@/app/api/v1/loads/[id]/route';
import { generateGSTInvoice } from '@/lib/algorithms/statutory';
import { createSignedJwtPayload, tenantStore } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { resetRateLimiter } from '@/lib/rateLimit';
import { SessionClaims } from '@/types/database';

describe('Unit Test: Phase 5 Shipper Portal & Public Estimator Services', () => {
  const shipperClaims: SessionClaims = {
    sub: 'shipper-user-1',
    email: 'ops@adani-logistics.in',
    tenant_id: 'org-adani-tenant',
    role: 'shipper',
  };

  const otherTenantClaims: SessionClaims = {
    sub: 'shipper-user-2',
    email: 'logistics@reliance.in',
    tenant_id: 'org-reliance-tenant',
    role: 'shipper',
  };

  const driverClaims: SessionClaims = {
    sub: 'driver-user-1',
    email: 'driver@wifl.in',
    tenant_id: 'org-wifl-fleet',
    role: 'driver',
  };

  const shipperToken = createSignedJwtPayload(shipperClaims);
  const otherTenantToken = createSignedJwtPayload(otherTenantClaims);
  const driverToken = createSignedJwtPayload(driverClaims);

  beforeEach(() => {
    dataService.clear();
    tenantStore.clear();
    resetRateLimiter();
  });

  // ====================================================
  // Feature 35: Public Rate-Limited Freight Cost Estimator
  // ====================================================
  describe('Feature 35: Public Rate-Limited Freight Cost Estimator (/api/v1/quotes)', () => {
    it('computes accurate corridor quote via GET without authentication', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes?origin=Mumbai%20JNPT%20Port&destination=Ahmedabad%20Changodar%20Hub&truckType=19ft&weightKg=6500');
      const res = await quotesGET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.estimate).toBeDefined();
      expect(json.estimate.distanceKm).toBe(525);
      expect(json.estimate.truckType).toBe('19ft');
      expect(json.estimate.sacCode).toBe('9965');
      expect(json.estimate.gstINR).toBeGreaterThan(0);
      expect(json.estimate.totalQuoteINR).toBeGreaterThan(0);
      // Asserts 0 database writes occurred
      expect(dataService.getAuditTrail(shipperClaims, 'loads')).toHaveLength(0);
    });

    it('computes quote and acceptance probability via POST', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          origin: 'Bhiwandi Logistics Hub',
          destination: 'Surat Ring Road Textile Hub',
          distanceKm: 235,
          weightKg: 8000,
          truckType: '22ft',
          userBid: 28000,
        }),
      });

      const res = await quotesPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.quote).toBeDefined();
      expect(json.estimate).toBeDefined();
      expect(json.acceptance).toBeDefined();
      expect(json.acceptance.probabilityPercent).toBeGreaterThanOrEqual(48);
    });

    it('enforces 60 req/min rate limit per IP and returns 429 on the 61st request', async () => {
      const ip = '198.51.100.42';
      // Fire 60 requests
      for (let i = 0; i < 60; i++) {
        const req = new NextRequest('http://localhost:3000/api/v1/quotes?origin=Vapi&destination=Surat', {
          headers: { 'x-forwarded-for': ip },
        });
        const res = await quotesGET(req);
        expect(res.status).toBe(200);
      }

      // 61st request must receive 429
      const burstReq = new NextRequest('http://localhost:3000/api/v1/quotes?origin=Vapi&destination=Surat', {
        headers: { 'x-forwarded-for': ip },
      });
      const burstRes = await quotesGET(burstReq);
      expect(burstRes.status).toBe(429);
      expect(burstRes.headers.get('Retry-After')).toBeDefined();
      const burstJson = await burstRes.json();
      expect(burstJson.error).toContain('429 Too Many Requests');
    });
  });

  // ====================================================
  // Feature 40, 41, 42, 45: Booking, Consignment, Scheduling & Tenant Scoping
  // ====================================================
  describe('Features 38, 40, 41, 42: Shipper Booking, Consignment Toggles & Tracking', () => {
    it('creates enriched shipper load with statutory consignment fields and advance schedule', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${shipperToken}`,
          'content-type': 'application/json',
          'idempotency-key': 'shipper-booking-001',
        },
        body: JSON.stringify({
          origin_name: 'Mumbai JNPT Port',
          destination_name: 'Ahmedabad Changodar Hub',
          weight_kg: 14000,
          distance_km: 525,
          cargo_category: 'steel_machinery',
          truck_type: '32ft SXL',
          consignor_name: 'Adani Ports Logistics',
          consignor_gstin: '27AAACW1234F1Z1',
          consignee_name: 'Gujarat Heavy Industrial Ltd',
          consignee_gstin: '24AAACW5678G1Z2',
          eway_bill_number: '241098234512',
          hamali_included: true,
          insurance_included: true,
          scheduled_date: new Date().toISOString().split('T')[0], // Day 0
          scheduled_slot: 'Morning 08:00 - 12:00',
          bid_bonus_inr: 2500,
          acceptance_probability: 91,
          dispatch_speed_band: 'Instant (< 10 mins)',
        }),
      });

      const res = await loadsPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBeDefined();
      expect(json.data.tenant_id).toBe(shipperClaims.tenant_id);
      expect(json.data.consignor_gstin).toBe('27AAACW1234F1Z1');
      expect(json.data.eway_bill_number).toBe('241098234512');
      expect(json.data.status).toBe('posted');
    });

    it('enforces strict cross-tenant isolation on loads listing', async () => {
      await dataService.createLoad(shipperClaims, {
        origin_name: 'Bhiwandi Hub',
        destination_name: 'Vapi GIDC',
        weight_kg: 4000,
      });

      // Tenant A queries
      const reqA = new NextRequest('http://localhost:3000/api/v1/loads', {
        headers: { authorization: `Bearer ${shipperToken}` },
      });
      const resA = await loadsGET(reqA);
      const jsonA = await resA.json();
      expect(jsonA.data).toHaveLength(1);

      // Tenant B queries (must see 0)
      const reqB = new NextRequest('http://localhost:3000/api/v1/loads', {
        headers: { authorization: `Bearer ${otherTenantToken}` },
      });
      const resB = await loadsGET(reqB);
      const jsonB = await resB.json();
      expect(jsonB.data).toHaveLength(0);
    });

    it('rejects past scheduled pickup date with 400 Bad Request', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const req = new NextRequest('http://localhost:3000/api/v1/loads', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${shipperToken}`,
          'content-type': 'application/json',
          'idempotency-key': 'shipper-booking-past-date',
        },
        body: JSON.stringify({
          origin_name: 'Bhiwandi Hub',
          destination_name: 'Surat Ring Road',
          weight_kg: 3000,
          scheduled_date: pastDateStr,
        }),
      });

      const res = await loadsPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('past');
    });
  });

  // ====================================================
  // Feature 44: Shipper Load Cancellation & Refund Handling
  // ====================================================
  describe('Feature 44: Shipper Load Cancellation & Refund Handling', () => {
    it('cancels open load idempotently via DELETE /api/v1/loads/[id]', async () => {
      const load = await dataService.createLoad(shipperClaims, {
        origin_name: 'Surat Ring Road',
        destination_name: 'Bharuch Industrial Zone',
        weight_kg: 6000,
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}`, {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${shipperToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Consignment production delayed' }),
      });

      const res = await singleLoadDELETE(req, { params: { id: load.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.load.status).toBe('cancelled');
      expect(json.load.cancellation_reason).toBe('Consignment production delayed');

      // Verify audit log has CANCEL action
      const auditTrail = dataService.getAuditTrail(shipperClaims, 'loads');
      const cancelEntry = auditTrail.find((e) => e.action === 'CANCEL');
      expect(cancelEntry).toBeDefined();
      expect(cancelEntry?.record_id).toBe(load.id);

      // Verify second cancellation is idempotent
      const req2 = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${shipperToken}` },
      });
      const res2 = await singleLoadDELETE(req2, { params: { id: load.id } });
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.success).toBe(true);
      expect(json2.message).toContain('already cancelled');
    });

    it('rejects cancellation of loads that are already in_transit with 400', async () => {
      const load = await dataService.createLoad(shipperClaims, {
        origin_name: 'Vapi GIDC',
        destination_name: 'Vadodara Makarpura',
        weight_kg: 9000,
        status: 'in_transit',
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${shipperToken}` },
      });

      const res = await singleLoadDELETE(req, { params: { id: load.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('in transit');
    });

    it('rejects cross-tenant load cancellation with 404', async () => {
      const load = await dataService.createLoad(shipperClaims, {
        origin_name: 'Vadodara',
        destination_name: 'Ahmedabad',
        weight_kg: 5000,
      });

      // Other tenant attempts to cancel Org A load
      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${otherTenantToken}` },
      });

      const res = await singleLoadDELETE(req, { params: { id: load.id } });
      expect(res.status).toBe(404);
    });

    it('rejects driver role attempting to cancel shipper load with 403', async () => {
      const load = await dataService.createLoad(shipperClaims, {
        origin_name: 'Vapi',
        destination_name: 'Surat',
        weight_kg: 2000,
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${driverToken}` },
      });

      const res = await singleLoadDELETE(req, { params: { id: load.id } });
      expect(res.status).toBe(403);
    });
  });

  // ====================================================
  // Feature 43: Official GST Tax Invoice Generator
  // ====================================================
  describe('Feature 43: 1-Click Official GST Tax Invoice Generator', () => {
    it('generates compliant SAC 9965 invoice with 5% GST and Indian currency format', () => {
      const invoice = generateGSTInvoice({
        origin: 'Mumbai JNPT Port, Maharashtra',
        destination: 'Ahmedabad Changodar Hub, Gujarat',
        consignorGstin: '27AAACW1234F1Z1',
        consigneeGstin: '24AAACW5678G1Z2',
        distanceKm: 525,
        weightKg: 12000,
        pricingInr: 42000,
        hamaliIncluded: true,
        isDelivered: true,
      });

      expect(invoice.sacCode).toBe('9965');
      expect(invoice.isInterState).toBe(true);
      expect(invoice.igstRatePct).toBe(5.0);
      expect(invoice.cgstRatePct).toBe(0);
      expect(invoice.sgstRatePct).toBe(0);
      expect(invoice.grandTotalINR).toBeGreaterThan(0);
      expect(invoice.formattedGrandTotal).toMatch(/^₹[0-9,]+\.[0-9]{2}$/);
      expect(invoice.status).toBe('DELIVERED_FINAL');
    });

    it('generates intra-state invoice with CGST 2.5% and SGST 2.5%', () => {
      const invoice = generateGSTInvoice({
        origin: 'Surat Ring Road, Gujarat',
        destination: 'Ahmedabad Changodar, Gujarat',
        consignorGstin: '24AAACW1234F1Z1',
        consigneeGstin: '24AAACW5678G1Z2',
        pricingInr: 18000,
      });

      expect(invoice.isInterState).toBe(false);
      expect(invoice.cgstRatePct).toBe(2.5);
      expect(invoice.sgstRatePct).toBe(2.5);
      expect(invoice.igstRatePct).toBe(0);
      expect(invoice.cgstAmountINR).toBe(invoice.sgstAmountINR);
    });

    it('retrieves load invoice via GET /api/v1/loads/[id]?invoice=true', async () => {
      const load = await dataService.createLoad(shipperClaims, {
        origin_name: 'Bhiwandi Logistics Hub',
        destination_name: 'Vapi GIDC',
        weight_kg: 5000,
        pricing_inr: 25000,
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}?invoice=true`, {
        headers: { authorization: `Bearer ${shipperToken}` },
      });

      const res = await singleLoadGET(req, { params: { id: load.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.invoice).toBeDefined();
      expect(json.invoice.sacCode).toBe('9965');
    });
  });
});
