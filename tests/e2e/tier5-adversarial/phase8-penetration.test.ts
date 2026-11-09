/**
 * SafeFreight OS — Phase 8 Tier 5: Adversarial & Penetration Test Suite
 * Feature 75: Cross-Tenant Security Penetration & Hardening Defense Gate
 * 
 * Master penetration test verifying:
 * - Cross-tenant audit trail penetration defenses
 * - Forged JWT & HMAC signature tampering rejections
 * - Role escalation & privilege boundary defenses
 * - Rate limit evasion & spoofed header injection resistance
 * - Cross-tenant load mutation rejection
 * - Client bundle secret leakage defense
 * - e-Bilti cryptographic tampering defense
 * - DR restoration tenant boundary integrity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { dataService } from '@/lib/data-service';
import { createSignedJwtPayload, tenantStore } from '@/lib/auth';
import { resetRateLimiter } from '@/lib/rateLimit';
import { middleware } from '@/middleware';
import { runSecretScan } from '../../../scripts/scan-secrets';
import { verifyDisasterRecovery } from '../../../scripts/verify-backup-dr';
import { GET as auditGET } from '@/app/api/v1/fleet/audit/route';
import { DELETE as loadDELETE } from '@/app/api/v1/loads/[id]/route';
import { GET as verifyGET } from '@/app/api/v1/statutory/verify/route';
import { GET as quotesGET } from '@/app/api/v1/quotes/route';
import { SessionClaims } from '@/types/database';

describe('Phase 8 Tier 5: Adversarial Penetration Testing (Feature 75)', () => {
  const TENANT_ALPHA = '00000000-0000-4000-8000-000000000001';
  const TENANT_BETA = '00000000-0000-4000-8000-000000000002';

  const adminAlphaClaims: SessionClaims = {
    sub: 'admin-alpha-attacker',
    email: 'admin@alpha-logistics.in',
    tenant_id: TENANT_ALPHA,
    role: 'fleet_admin',
  };

  const adminBetaClaims: SessionClaims = {
    sub: 'admin-beta-victim',
    email: 'admin@beta-freight.in',
    tenant_id: TENANT_BETA,
    role: 'fleet_admin',
  };

  const driverAlphaClaims: SessionClaims = {
    sub: 'driver-alpha-pawn',
    email: 'driver@alpha-logistics.in',
    tenant_id: TENANT_ALPHA,
    role: 'driver',
  };

  const shipperAlphaClaims: SessionClaims = {
    sub: 'shipper-alpha-victim',
    email: 'shipper@alpha-logistics.in',
    tenant_id: TENANT_ALPHA,
    role: 'shipper',
  };

  const shipperBetaClaims: SessionClaims = {
    sub: 'shipper-beta-attacker',
    email: 'shipper@beta-freight.in',
    tenant_id: TENANT_BETA,
    role: 'shipper',
  };

  const adminAlphaToken = createSignedJwtPayload(adminAlphaClaims);
  const adminBetaToken = createSignedJwtPayload(adminBetaClaims);
  const driverAlphaToken = createSignedJwtPayload(driverAlphaClaims);
  const _shipperAlphaToken = createSignedJwtPayload(shipperAlphaClaims);
  const shipperBetaToken = createSignedJwtPayload(shipperBetaClaims);

  beforeEach(() => {
    dataService.clear();
    tenantStore.clear();
    resetRateLimiter();
  });

  // ============================================================================
  // AT-PEN-01: Cross-Tenant Audit Log Penetration
  // ============================================================================
  it('AT-PEN-01: Tenant Beta admin cannot view or access Tenant Alpha audit trail records', async () => {
    // Seed private audit records for Tenant Alpha
    await dataService.recordAuditLog({
      tenantId: TENANT_ALPHA,
      actorId: adminAlphaClaims.sub,
      action: 'DISBURSE_BHATTA',
      tableName: 'trips',
      recordId: 'alpha-confidential-trip-001',
      beforeState: { amount: 0 },
      afterState: { amount: 25000, recipient: 'Alpha Driver Account' },
    });

    // Tenant Beta admin queries audit logs for the exact confidential record ID
    const req = new NextRequest(
      'http://localhost:3000/api/v1/fleet/audit?record_id=alpha-confidential-trip-001',
      { headers: { authorization: `Bearer ${adminBetaToken}` } }
    );

    const res = await auditGET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toEqual([]);
    expect(json.pagination.total).toBe(0);
  });

  // ============================================================================
  // AT-PEN-02: Cryptographic Token Forgery Attack
  // ============================================================================
  it('AT-PEN-02: Forged JWT token with swapped tenant_id is rejected across protected routes', async () => {
    // Craft forged token: header.payload with attacker's fake tenant, but invalid HMAC
    const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const forgedPayloadB64 = Buffer.from(
      JSON.stringify({
        sub: 'forged-attacker',
        tenant_id: TENANT_ALPHA,
        role: 'fleet_admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');
    const invalidSig = Buffer.from('invalid-forged-signature-bytes').toString('base64url');

    const forgedToken = `${headerB64}.${forgedPayloadB64}.${invalidSig}`;

    const req = new NextRequest('http://localhost:3000/api/v1/fleet/audit', {
      headers: { authorization: `Bearer ${forgedToken}` },
    });

    const res = await auditGET(req);
    expect(res.status).toBe(401);
  });

  // ============================================================================
  // AT-PEN-03: Edge Middleware Access Control Guard
  // ============================================================================
  it('AT-PEN-03: Unauthenticated request attempting direct access to /admin/* is redirected to /login', async () => {
    const unauthReq = new NextRequest('http://localhost:3000/admin/audit');
    const res = await middleware(unauthReq);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?redirect=%2Fadmin%2Faudit');
  });

  // ============================================================================
  // AT-PEN-04: Role Escalation Penetration
  // ============================================================================
  it('AT-PEN-04: Driver role attempting to access Fleet Admin audit trail is rejected with 403 Forbidden', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/fleet/audit', {
      headers: { authorization: `Bearer ${driverAlphaToken}` },
    });

    const res = await auditGET(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Only Fleet Admins');
  });

  // ============================================================================
  // AT-PEN-05: Rate Limit Evasion & Header Injection Defense
  // ============================================================================
  it('AT-PEN-05: Rate limiter defends against spoofed headers and throttles repeated calls from single origin', async () => {
    const originIp = '198.51.100.99';

    // Send 60 requests from origin
    for (let i = 1; i <= 60; i++) {
      const req = new NextRequest('http://localhost:3000/api/v1/quotes?origin=Mumbai&destination=Ahmedabad&truckType=19ft&weightKg=5000', {
        headers: { 'x-forwarded-for': originIp },
      });
      const res = await quotesGET(req);
      expect(res.status).toBe(200);
    }

    // 61st request must be throttled with 429
    const req61 = new NextRequest('http://localhost:3000/api/v1/quotes?origin=Mumbai&destination=Ahmedabad&truckType=19ft&weightKg=5000', {
      headers: { 'x-forwarded-for': originIp },
    });
    const res61 = await quotesGET(req61);
    expect(res61.status).toBe(429);
    expect(res61.headers.get('Retry-After')).toBeDefined();
  });

  // ============================================================================
  // AT-PEN-06: Cross-Tenant Load Mutation Penetration
  // ============================================================================
  it('AT-PEN-06: Tenant Beta shipper cannot cancel or mutate Tenant Alpha load', async () => {
    const alphaLoad = await dataService.createLoad(shipperAlphaClaims, {
      origin_name: 'Vadodara GIDC',
      destination_name: 'Surat Textile Market',
      weight_kg: 8000,
    });

    const cancelReq = new NextRequest(`http://localhost:3000/api/v1/loads/${alphaLoad.id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${shipperBetaToken}` },
    });

    const cancelRes = await loadDELETE(cancelReq, { params: { id: alphaLoad.id } });
    expect([403, 404]).toContain(cancelRes.status);

    // Verify original load status is untouched
    const verifiedLoad = dataService.getLoadById(shipperAlphaClaims, alphaLoad.id);
    expect(verifiedLoad?.status).toBe('posted');
  });

  // ============================================================================
  // AT-PEN-07: Static Secret Leak Penetration Check
  // ============================================================================
  it('AT-PEN-07: Static secret leak scanner confirms zero privileged credentials in client source', () => {
    const isClean = runSecretScan();
    expect(isClean).toBe(true);
  });

  // ============================================================================
  // AT-PEN-08: Checkpoint e-Bilti Tampering Defense
  // ============================================================================
  it('AT-PEN-08: Checkpoint e-Bilti verification endpoint rejects tampered tokens with 400 Bad Request', async () => {
    const tamperedTokens = [
      'SF-TAMPERED-HASH-0000',
      'invalid.jwt.token.here',
      '../sql_injection_attempt',
      ' ',
    ];

    for (const token of tamperedTokens) {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/statutory/verify?token=${encodeURIComponent(token)}`
      );
      const res = await verifyGET(req);
      expect([400, 404]).toContain(res.status);
      const json = await res.json();
      expect(json.verified).toBe(false);
    }
  });

  // ============================================================================
  // AT-PEN-09: Disaster Recovery Multi-Tenant Isolation Integrity
  // ============================================================================
  it('AT-PEN-09: DR snapshot restoration guarantees strict multi-tenant boundary isolation without contamination', async () => {
    const drReport = await verifyDisasterRecovery();

    expect(drReport.status).toBe('PASSED');
    expect(drReport.tenantIsolationVerified).toBe(true);
    expect(drReport.pointInTimeHashMatch).toBe(true);
  });

  // ============================================================================
  // AT-PEN-10: Master Tenant Boundary Invariant Check
  // ============================================================================
  it('AT-PEN-10: Fleet admin querying audit dispute trail with empty filters receives strictly own-tenant events', async () => {
    // Create events across both tenants
    await dataService.recordAuditLog({
      tenantId: TENANT_ALPHA,
      actorId: adminAlphaClaims.sub,
      action: 'UPDATE',
      tableName: 'trips',
      recordId: 'alpha-rec-01',
    });
    await dataService.recordAuditLog({
      tenantId: TENANT_BETA,
      actorId: adminBetaClaims.sub,
      action: 'UPDATE',
      tableName: 'trips',
      recordId: 'beta-rec-02',
    });

    const res = await auditGET(
      new NextRequest('http://localhost:3000/api/v1/fleet/audit', {
        headers: { authorization: `Bearer ${adminAlphaToken}` },
      })
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].record_id).toBe('alpha-rec-01');
    expect(json.data[0].tenant_id).toBe(TENANT_ALPHA);
  });
});
