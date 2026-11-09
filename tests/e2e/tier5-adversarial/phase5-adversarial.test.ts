/**
 * SafeFreight OS — Tier 5 Adversarial Penetration & Cross-Tenant Security Suite: Phase 5
 *
 * Stress-tests multi-tenant isolation, RBAC boundaries, state machine invariants,
 * and idempotency across Phase 5 Shipper endpoints:
 * - /api/v1/loads/[id]/cancel (PATCH, POST)
 * - /api/v1/quotes/invoice (POST, GET)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  PATCH as loadCancelPATCH,
  POST as loadCancelPOST,
} from '@/app/api/v1/loads/[id]/cancel/route';
import {
  POST as invoicePOST,
  GET as invoiceGET,
} from '@/app/api/v1/quotes/invoice/route';
import { createSignedJwtPayload } from '@/lib/auth';
import { dataService } from '@/lib/data-service';
import { globalIdempotencyStore } from '@/lib/middleware/idempotency';
import { SessionClaims } from '@/types/database';

describe('Tier 5 Adversarial Hardening: Phase 5 Shipper & Tenancy Security Suite', () => {
  // Tenant Alpha (Adani / Reliance Corridor)
  const tenantAlphaOrgId = '11111111-1111-4000-a000-000000000001';
  const alphaShipperClaims: SessionClaims = {
    sub: 'alpha-shipper-uuid-001',
    email: 'shipper@alpha-corridor.in',
    tenant_id: tenantAlphaOrgId,
    role: 'shipper',
  };
  const alphaAdminClaims: SessionClaims = {
    sub: 'alpha-admin-uuid-001',
    email: 'admin@alpha-corridor.in',
    tenant_id: tenantAlphaOrgId,
    role: 'fleet_admin',
  };
  const alphaDriverClaims: SessionClaims = {
    sub: 'alpha-driver-uuid-001',
    email: 'driver@alpha-corridor.in',
    tenant_id: tenantAlphaOrgId,
    role: 'driver',
  };

  // Tenant Beta (Tata / Ultratech Corridor)
  const tenantBetaOrgId = '22222222-2222-4000-b000-000000000002';
  const betaShipperClaims: SessionClaims = {
    sub: 'beta-shipper-uuid-001',
    email: 'shipper@beta-corridor.in',
    tenant_id: tenantBetaOrgId,
    role: 'shipper',
  };
  const betaAdminClaims: SessionClaims = {
    sub: 'beta-admin-uuid-001',
    email: 'admin@beta-corridor.in',
    tenant_id: tenantBetaOrgId,
    role: 'fleet_admin',
  };
  const betaDriverClaims: SessionClaims = {
    sub: 'beta-driver-uuid-001',
    email: 'driver@beta-corridor.in',
    tenant_id: tenantBetaOrgId,
    role: 'driver',
  };

  let tokenAlphaShipper: string;
  let tokenAlphaAdmin: string;
  let tokenAlphaDriver: string;
  let tokenBetaShipper: string;
  let tokenBetaAdmin: string;
  let tokenBetaDriver: string;

  beforeEach(() => {
    dataService.clear();
    globalIdempotencyStore.clear();

    tokenAlphaShipper = createSignedJwtPayload(alphaShipperClaims);
    tokenAlphaAdmin = createSignedJwtPayload(alphaAdminClaims);
    tokenAlphaDriver = createSignedJwtPayload(alphaDriverClaims);
    tokenBetaShipper = createSignedJwtPayload(betaShipperClaims);
    tokenBetaAdmin = createSignedJwtPayload(betaAdminClaims);
    tokenBetaDriver = createSignedJwtPayload(betaDriverClaims);
  });

  // =========================================================================
  // 1. CROSS-TENANT ISOLATION ATTACKS
  // =========================================================================
  describe('Group 1: Cross-Tenant Isolation Attacks', () => {
    it('TC-ADV-P5-01: Org Alpha cannot cancel Org Beta load via PATCH (strictly 404 Not Found)', async () => {
      const loadBeta = await dataService.createLoad(betaAdminClaims, {
        origin_name: 'Ahmedabad Changodar Hub',
        destination_name: 'Mumbai JNPT Port',
        weight_kg: 18000,
        pricing_inr: 45000,
        status: 'posted',
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${loadBeta.id}/cancel`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Malicious cross-tenant cancellation' }),
      });

      const res = await loadCancelPATCH(req, { params: { id: loadBeta.id } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/404 Not Found/i);

      // Verify Org Beta load remains untouched
      const persisted = dataService.getLoadById(betaAdminClaims, loadBeta.id);
      expect(persisted).not.toBeNull();
      expect(persisted?.status).toBe('posted');
    });

    it('TC-ADV-P5-02: Org Alpha cannot cancel Org Beta load via POST fallback (strictly 404 Not Found)', async () => {
      const loadBeta = await dataService.createLoad(betaAdminClaims, {
        origin_name: 'Surat Ring Road Hub',
        destination_name: 'Pune Chakan MIDC',
        weight_kg: 14000,
        pricing_inr: 38000,
        status: 'open',
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${loadBeta.id}/cancel`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaAdmin}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Malicious admin cancellation' }),
      });

      const res = await loadCancelPOST(req, { params: { id: loadBeta.id } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/404 Not Found/i);

      // Verify Org Beta load remains open
      const persisted = dataService.getLoadById(betaAdminClaims, loadBeta.id);
      expect(persisted?.status).toBe('open');
    });

    it('TC-ADV-P5-03: Org Alpha cannot generate invoice referencing Org Beta load_id (strictly 404 Not Found)', async () => {
      const loadBeta = await dataService.createLoad(betaAdminClaims, {
        origin_name: 'Vadodara GIDC',
        destination_name: 'Navi Mumbai Taloja',
        weight_kg: 12000,
        pricing_inr: 32000,
        consignor_name: 'Beta Chemicals Pvt Ltd',
        consignor_gstin: '24AAACB1111B1Z1',
      });

      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          load_id: loadBeta.id,
          consigneeGstin: '27AAACA2222A1Z2',
        }),
      });

      const res = await invoicePOST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/404 Not Found/i);
    });

    it('TC-ADV-P5-04: Org Alpha cannot generate invoice referencing Org Beta loadId in camelCase (strictly 404)', async () => {
      const loadBeta = await dataService.createLoad(betaAdminClaims, {
        origin_name: 'Vadodara GIDC',
        destination_name: 'Navi Mumbai Taloja',
        weight_kg: 10000,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          loadId: loadBeta.id,
        }),
      });

      const res = await invoicePOST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/404 Not Found/i);
    });

    it('TC-ADV-P5-05: Org Beta cannot retrieve Org Alpha invoice via GET /api/v1/quotes/invoice?invoice_number=... (strictly 404)', async () => {
      // 1. Org Alpha generates legitimate invoice
      const invoiceReq = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          origin: 'JNPT Port Mumbai',
          destination: 'Changodar Ahmedabad',
          distanceKm: 525,
          weightKg: 15000,
          pricingInr: 48000,
          consignorName: 'Alpha Petrochem Industries',
          consignorGstin: '27AAACA9999A1Z1',
          consigneeName: 'Gujarat Polymers Ltd',
          consigneeGstin: '24AAACG8888G1Z2',
        }),
      });

      const invoiceRes = await invoicePOST(invoiceReq);
      expect(invoiceRes.status).toBe(201);
      const invoiceJson = await invoiceRes.json();
      const invoiceNumber = invoiceJson.invoice.invoiceNumber;
      expect(invoiceNumber).toBeDefined();

      // 2. Org Beta maliciously attempts to retrieve Org Alpha's invoice by invoiceNumber
      const probeReq = new NextRequest(
        `http://localhost:3000/api/v1/quotes/invoice?invoice_number=${encodeURIComponent(invoiceNumber)}`,
        {
          method: 'GET',
          headers: {
            authorization: `Bearer ${tokenBetaShipper}`,
          },
        }
      );

      const probeRes = await invoiceGET(probeReq);
      // Multi-tenant isolation invariant: A tenant querying an entity belonging to another tenant MUST receive 404 Not Found
      expect(probeRes.status).toBe(404);
    });

    it('TC-ADV-P5-06: Org Alpha cannot retrieve Org Beta invoice via GET /api/v1/quotes/invoice?load_id=... (strictly 404)', async () => {
      const loadBeta = await dataService.createLoad(betaAdminClaims, {
        origin_name: 'Ahmedabad Changodar Hub',
        destination_name: 'Mumbai JNPT Port',
        weight_kg: 18000,
        pricing_inr: 45000,
      });

      const probeReq = new NextRequest(
        `http://localhost:3000/api/v1/quotes/invoice?load_id=${loadBeta.id}`,
        {
          method: 'GET',
          headers: {
            authorization: `Bearer ${tokenAlphaShipper}`,
          },
        }
      );

      const probeRes = await invoiceGET(probeReq);
      expect(probeRes.status).toBe(404);
      const json = await probeRes.json();
      expect(json.error).toMatch(/404 Not Found/i);
    });
  });

  // =========================================================================
  // 2. RBAC PRIVILEGE ESCALATION ATTACKS
  // =========================================================================
  describe('Group 2: RBAC Privilege Escalation Attacks', () => {
    it('TC-ADV-P5-07: Driver cannot cancel load via PATCH (strictly 403 Forbidden)', async () => {
      const loadAlpha = await dataService.createLoad(alphaAdminClaims, {
        origin_name: 'Mumbai JNPT',
        destination_name: 'Pune Chakan',
        weight_kg: 8000,
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${loadAlpha.id}/cancel`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Unauthorized driver cancel' }),
      });

      const res = await loadCancelPATCH(req, { params: { id: loadAlpha.id } });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/403 Forbidden/i);
    });

    it('TC-ADV-P5-08: Driver cannot cancel load via POST (strictly 403 Forbidden)', async () => {
      const loadAlpha = await dataService.createLoad(alphaAdminClaims, {
        origin_name: 'Mumbai JNPT',
        destination_name: 'Pune Chakan',
        weight_kg: 8000,
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${loadAlpha.id}/cancel`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver}`,
        },
      });

      const res = await loadCancelPOST(req, { params: { id: loadAlpha.id } });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/403 Forbidden/i);
    });

    it('TC-ADV-P5-09: Driver cannot generate tax invoice via POST (strictly 403 Forbidden)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          pricingInr: 30000,
          distanceKm: 400,
        }),
      });

      const res = await invoicePOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/403 Forbidden/i);
    });

    it('TC-ADV-P5-10: Driver cannot view tax invoices via GET (strictly 403 Forbidden)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice?invoice_number=SF-INV/2026-27/00001', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${tokenAlphaDriver}`,
        },
      });

      const res = await invoiceGET(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/403 Forbidden/i);
    });

    it('TC-ADV-P5-11: Invalid/unrecognized role is rejected with 403 Forbidden', async () => {
      const rogueClaims = {
        sub: 'rogue-user-001',
        email: 'rogue@unknown.in',
        tenant_id: tenantAlphaOrgId,
        role: 'superadmin' as any,
      };
      const rogueToken = createSignedJwtPayload(rogueClaims);

      const cancelReq = new NextRequest('http://localhost:3000/api/v1/loads/some-id/cancel', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${rogueToken}` },
      });
      const cancelRes = await loadCancelPATCH(cancelReq, { params: { id: 'some-id' } });
      expect(cancelRes.status).toBe(403);

      const invoiceReq = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: { authorization: `Bearer ${rogueToken}` },
      });
      const invoiceRes = await invoicePOST(invoiceReq);
      expect(invoiceRes.status).toBe(403);
    });
  });

  // =========================================================================
  // 3. UNAUTHENTICATED & TOKEN SECURITY ATTACKS
  // =========================================================================
  describe('Group 3: Authentication & Token Security Attacks', () => {
    it('TC-ADV-P5-12: Unauthenticated cancel request returns 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/loads/load-xyz/cancel', {
        method: 'PATCH',
      });
      const res = await loadCancelPATCH(req, { params: { id: 'load-xyz' } });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/401 Unauthorized/i);
    });

    it('TC-ADV-P5-13: Unauthenticated invoice POST request returns 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
      });
      const res = await invoicePOST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/401 Unauthorized/i);
    });

    it('TC-ADV-P5-14: Unauthenticated invoice GET request returns 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice?load_id=load-xyz', {
        method: 'GET',
      });
      const res = await invoiceGET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/401 Unauthorized/i);
    });

    it('TC-ADV-P5-15: Malformed Bearer token returns 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/loads/load-xyz/cancel', {
        method: 'PATCH',
        headers: { authorization: 'Bearer this.is.garbage.jwt' },
      });
      const res = await loadCancelPATCH(req, { params: { id: 'load-xyz' } });
      expect(res.status).toBe(401);
    });

    it('TC-ADV-P5-16: Tampered JWT signature returns 401 Unauthorized', async () => {
      const [header, payload] = tokenAlphaShipper.split('.');
      const tamperedToken = `${header}.${payload}.tampered_signature_bytes`;

      const req = new NextRequest('http://localhost:3000/api/v1/loads/load-xyz/cancel', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${tamperedToken}` },
      });
      const res = await loadCancelPATCH(req, { params: { id: 'load-xyz' } });
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 4. INVALID STATE TRANSITIONS & CANCELLATION RULES
  // =========================================================================
  describe('Group 4: State Machine Invariants & Transitions', () => {
    it('TC-ADV-P5-17: Cancellation of in_transit load strictly returns 400 Bad Request', async () => {
      const load = await dataService.createLoad(alphaAdminClaims, {
        origin_name: 'Mumbai JNPT',
        destination_name: 'Ahmedabad Changodar',
        weight_kg: 16000,
        status: 'in_transit',
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
      });

      const res = await loadCancelPATCH(req, { params: { id: load.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/in transit or delivered cannot be cancelled/i);

      // Verify status was NOT modified
      const persisted = dataService.getLoadById(alphaAdminClaims, load.id);
      expect(persisted?.status).toBe('in_transit');
    });

    it('TC-ADV-P5-18: Cancellation of delivered load strictly returns 400 Bad Request', async () => {
      const load = await dataService.createLoad(alphaAdminClaims, {
        origin_name: 'Mumbai JNPT',
        destination_name: 'Ahmedabad Changodar',
        weight_kg: 16000,
        status: 'delivered',
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
        },
      });

      const res = await loadCancelPATCH(req, { params: { id: load.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/in transit or delivered cannot be cancelled/i);

      const persisted = dataService.getLoadById(alphaAdminClaims, load.id);
      expect(persisted?.status).toBe('delivered');
    });

    it('TC-ADV-P5-19: Cancellation of open load succeeds with 200 OK and audit trail', async () => {
      const load = await dataService.createLoad(alphaShipperClaims, {
        origin_name: 'Surat',
        destination_name: 'Mumbai',
        weight_kg: 10000,
        status: 'open',
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Consignment postponed' }),
      });

      const res = await loadCancelPATCH(req, { params: { id: load.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.load.status).toBe('cancelled');
      expect(json.load.cancellation_reason).toBe('Consignment postponed');

      // Verify audit log entry
      const auditTrail = dataService.getAuditTrail(alphaShipperClaims, 'loads');
      const cancelAudit = auditTrail.find((a) => a.record_id === load.id && a.action === 'CANCEL');
      expect(cancelAudit).toBeDefined();
      expect((cancelAudit?.after_state as any)?.status).toBe('cancelled');
    });

    it('TC-ADV-P5-20: Cancellation cascades to unstarted trip linked to load', async () => {
      const load = await dataService.createLoad(alphaAdminClaims, {
        origin_name: 'Delhi Transport Nagar',
        destination_name: 'Jaipur VKIA',
        weight_kg: 12000,
        status: 'open',
      });

      const trip = await dataService.createTrip(alphaAdminClaims, {
        load_id: load.id,
        driver_id: 'driver-test-1',
        origin_name: load.origin_name,
        destination_name: load.destination_name,
        distance_km: 270,
        fuel_allowance_inr: 5000,
        toll_allowance_inr: 800,
        statutory_daily_da_inr: 400,
        total_fare_inr: 25000,
        net_driver_pay_inr: 18800,
      });
      expect(trip.milestone_status).toBe('assigned');

      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaAdmin}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Fleet re-assignment' }),
      });

      const res = await loadCancelPATCH(req, { params: { id: load.id } });
      expect(res.status).toBe(200);

      // Verify linked trip was cancelled as well
      const tripsResult = dataService.getTrips(alphaAdminClaims, {});
      const linkedTrip = tripsResult.data.find((t) => t.id === trip.id);
      expect(linkedTrip?.milestone_status).toBe('cancelled');
    });
  });

  // =========================================================================
  // 5. IDEMPOTENCY & CONCURRENCY STRESS
  // =========================================================================
  describe('Group 5: Idempotency & Concurrency Stress', () => {
    it('TC-ADV-P5-21: Repeated cancellation returns 200 OK without corrupting original state', async () => {
      const load = await dataService.createLoad(alphaShipperClaims, {
        origin_name: 'Mumbai JNPT',
        destination_name: 'Ahmedabad Changodar',
        weight_kg: 15000,
        status: 'open',
      });

      // 1. Initial cancellation
      const req1 = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Initial Shipper Cancellation' }),
      });
      const res1 = await loadCancelPATCH(req1, { params: { id: load.id } });
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      const firstCancelledAt = json1.load.cancelled_at;
      expect(firstCancelledAt).toBeDefined();

      // 2. Re-cancel attempt with different reason
      const req2 = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Different Second Reason' }),
      });
      const res2 = await loadCancelPATCH(req2, { params: { id: load.id } });
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.message).toMatch(/already cancelled/i);

      // Verify original cancellation reason and timestamp was NOT overwritten
      expect(json2.load.cancellation_reason).toBe('Initial Shipper Cancellation');
      expect(json2.load.cancelled_at).toBe(firstCancelledAt);
    });

    it('TC-ADV-P5-22: Concurrent cancellation storm (5 simultaneous requests) converges consistently', async () => {
      const load = await dataService.createLoad(alphaShipperClaims, {
        origin_name: 'Mumbai JNPT',
        destination_name: 'Ahmedabad Changodar',
        weight_kg: 15000,
        status: 'open',
      });

      // Send 5 concurrent cancel requests
      const promises = Array.from({ length: 5 }, (_, i) => {
        const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
          method: 'PATCH',
          headers: {
            authorization: `Bearer ${tokenAlphaShipper}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ reason: `Storm attempt #${i + 1}` }),
        });
        return loadCancelPATCH(req, { params: { id: load.id } });
      });

      const responses = await Promise.all(promises);
      for (const res of responses) {
        expect(res.status).toBe(200);
      }

      // Check load state
      const persisted = dataService.getLoadById(alphaShipperClaims, load.id);
      expect(persisted?.status).toBe('cancelled');
    });
  });

  // =========================================================================
  // 6. INPUT VALIDATION & BOUNDARY STRESS
  // =========================================================================
  describe('Group 6: Input Validation & Boundary Stress', () => {
    it('TC-ADV-P5-23: Non-existent load cancellation returns strictly 404 Not Found', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/loads/non-existent-uuid-99999/cancel', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
        },
      });
      const res = await loadCancelPATCH(req, { params: { id: 'non-existent-uuid-99999' } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/404 Not Found/i);
    });

    it('TC-ADV-P5-24: Invoice generation rejects invalid GSTIN with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          consignorGstin: '99XYZ12345!@#$',
          pricingInr: 40000,
        }),
      });

      const res = await invoicePOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid consignor GSTIN format/i);
    });

    it('TC-ADV-P5-25: Invoice generation rejects invalid e-Way bill with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ewayBillNumber: '12345', // Must be 12 numeric digits
          pricingInr: 40000,
        }),
      });

      const res = await invoicePOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid e-Way bill format/i);
    });

    it('TC-ADV-P5-26: Invoice generation rejects zero or negative amounts with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes/invoice', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          pricingInr: -5000,
          distanceKm: 500,
        }),
      });

      const res = await invoicePOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/positive numbers/i);
    });

    it('TC-ADV-P5-27: SQL injection and XSS payloads in cancellation reason are handled safely', async () => {
      const load = await dataService.createLoad(alphaShipperClaims, {
        origin_name: 'Mumbai',
        destination_name: 'Pune',
        weight_kg: 5000,
      });

      const maliciousReason = "'; DROP TABLE loads; -- <script>alert('xss')</script>";
      const req = new NextRequest(`http://localhost:3000/api/v1/loads/${load.id}/cancel`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${tokenAlphaShipper}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: maliciousReason }),
      });

      const res = await loadCancelPATCH(req, { params: { id: load.id } });
      expect(res.status).toBe(200);

      const persisted = dataService.getLoadById(alphaShipperClaims, load.id);
      expect(persisted?.status).toBe('cancelled');
      expect(persisted?.cancellation_reason).toBe(maliciousReason);
    });
  });
});
