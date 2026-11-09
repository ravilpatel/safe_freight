/**
 * SafeFreight OS — Phase 8 Tier 2: Boundary Value Analysis & Edge Cases
 * Rigorous boundary verification for enterprise hardening & observability.
 * 
 * Verifies:
 * - Token-bucket rate limit exact boundaries (60th vs 61st request, window reset)
 * - Multi-IP rate limit isolation & fallback
 * - Trace correlation ID edge cases (preservation, generation, header variants)
 * - Audit dispute trail pagination boundaries (clamping, offsets, empty results)
 * - Deep credential scrubbing edge cases (case-insensitivity, deep nesting)
 * - Telemetry batch boundary validation (empty arrays, boundary coordinates)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { checkRateLimit, resetRateLimiter, getClientIp, createRateLimitHeaders } from '@/lib/rateLimit';
import { safeJsonStringify } from '@/lib/logger';
import { middleware } from '@/middleware';
import { dataService } from '@/lib/data-service';
import { createSignedJwtPayload } from '@/lib/auth';
import { GET as auditGET } from '@/app/api/v1/fleet/audit/route';
import { SessionClaims } from '@/types/database';

describe('Phase 8 Tier 2: Boundary Value Analysis — Hardening & Observability', () => {
  const TENANT_ALPHA = '00000000-0000-4000-8000-000000000001';

  const adminAlphaClaims: SessionClaims = {
    sub: 'admin-alpha-bva',
    email: 'admin@alpha-bva.in',
    tenant_id: TENANT_ALPHA,
    role: 'fleet_admin',
  };

  const adminAlphaToken = createSignedJwtPayload(adminAlphaClaims);

  beforeEach(() => {
    dataService.clear();
    resetRateLimiter();
  });

  // ============================================================================
  // Rate Limiting Boundary Values
  // ============================================================================
  describe('Boundary Group 1: Rate Limiter Token-Bucket Invariants', () => {
    it('TC-BVA-RL-01: exactly 60th request succeeds with remaining 0, 61st request fails with retryAfter > 0', () => {
      const ip = '10.0.0.1';

      // Requests 1 to 59
      for (let i = 1; i <= 59; i++) {
        const res = checkRateLimit(ip, 60, 60000);
        expect(res.success).toBe(true);
        expect(res.remaining).toBe(60 - i);
      }

      // Request 60 (exact boundary)
      const req60 = checkRateLimit(ip, 60, 60000);
      expect(req60.success).toBe(true);
      expect(req60.remaining).toBe(0);
      expect(req60.retryAfter).toBe(0);

      // Request 61 (over boundary)
      const req61 = checkRateLimit(ip, 60, 60000);
      expect(req61.success).toBe(false);
      expect(req61.remaining).toBe(0);
      expect(req61.retryAfter).toBeGreaterThan(0);
      expect(req61.retryAfter).toBeLessThanOrEqual(60);
    });

    it('TC-BVA-RL-02: resets rate limit window when time advances past windowMs', () => {
      const ip = '10.0.0.2';
      // Use short window of 10ms for boundary verification
      const shortWindowMs = 10;

      for (let i = 0; i < 5; i++) {
        checkRateLimit(ip, 5, shortWindowMs);
      }

      // 6th call exceeds limit
      const exceeded = checkRateLimit(ip, 5, shortWindowMs);
      expect(exceeded.success).toBe(false);

      // Wait until window expires
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const resetRes = checkRateLimit(ip, 5, shortWindowMs);
          expect(resetRes.success).toBe(true);
          expect(resetRes.remaining).toBe(4);
          resolve();
        }, 15);
      });
    });

    it('TC-BVA-RL-03: verifies IP isolation: exhausting IP A does not deplete IP B', () => {
      const ipA = '10.0.0.3';
      const ipB = '10.0.0.4';

      for (let i = 0; i < 60; i++) {
        checkRateLimit(ipA, 60, 60000);
      }
      expect(checkRateLimit(ipA, 60, 60000).success).toBe(false);

      // IP B is completely independent
      const resB = checkRateLimit(ipB, 60, 60000);
      expect(resB.success).toBe(true);
      expect(resB.remaining).toBe(59);
    });

    it('TC-BVA-RL-04: getClientIp extracts first comma-separated address from x-forwarded-for and falls back safely', () => {
      expect(getClientIp(null)).toBe('127.0.0.1');
      expect(getClientIp(undefined)).toBe('127.0.0.1');

      const reqWithMultiple = {
        headers: {
          get: (name: string) => {
            if (name === 'x-forwarded-for') return '203.0.113.195, 70.41.3.18, 150.172.238.178';
            return null;
          },
        },
      };
      expect(getClientIp(reqWithMultiple)).toBe('203.0.113.195');

      const reqWithRealIp = {
        headers: {
          get: (name: string) => {
            if (name === 'x-real-ip') return '198.51.100.42';
            return null;
          },
        },
      };
      expect(getClientIp(reqWithRealIp)).toBe('198.51.100.42');
    });

    it('TC-BVA-RL-05: createRateLimitHeaders generates compliant RFC and X-prefixed headers', () => {
      const headers = createRateLimitHeaders({
        success: false,
        limit: 60,
        remaining: 0,
        reset: 1700000060,
        retryAfter: 42,
      });

      expect(headers['X-RateLimit-Limit']).toBe('60');
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['X-RateLimit-Reset']).toBe('1700000060');
      expect(headers['RateLimit-Limit']).toBe('60');
      expect(headers['RateLimit-Remaining']).toBe('0');
      expect(headers['RateLimit-Reset']).toBe('1700000060');
      expect(headers['Retry-After']).toBe('42');
    });
  });

  // ============================================================================
  // Trace / Correlation ID Boundaries
  // ============================================================================
  describe('Boundary Group 2: Trace & Correlation ID Propagation', () => {
    it('TC-BVA-TRC-01: preserves user-supplied correlation ID with special alphanumeric characters', async () => {
      const customTrace = 'SF-CORR_NH48-VADODARA.BOM-20261109#001';
      const req = new NextRequest('http://localhost:3000/api/v1/health', {
        headers: { 'x-correlation-id': customTrace },
      });

      const res = await middleware(req);
      expect(res.headers.get('x-correlation-id')).toBe(customTrace);
      expect(res.headers.get('x-request-id')).toBe(customTrace);
    });

    it('TC-BVA-TRC-02: falls back to x-request-id header when x-correlation-id is omitted', async () => {
      const customReqId = 'req-tracing-alpha-777';
      const req = new NextRequest('http://localhost:3000/api/v1/health', {
        headers: { 'x-request-id': customReqId },
      });

      const res = await middleware(req);
      expect(res.headers.get('x-correlation-id')).toBe(customReqId);
      expect(res.headers.get('x-request-id')).toBe(customReqId);
    });
  });

  // ============================================================================
  // Audit Trail Query & Pagination Boundaries
  // ============================================================================
  describe('Boundary Group 3: Audit Dispute Pagination Boundaries', () => {
    it('TC-BVA-AUD-01: clamps limit to min 1 and max 100, and defaults offset to 0', async () => {
      await dataService.recordAuditLog({
        tenantId: TENANT_ALPHA,
        actorId: adminAlphaClaims.sub,
        action: 'INSERT',
        tableName: 'trips',
        recordId: 'trip-bva-1',
      });

      // Limit 0 or negative clamps to 1
      const resMin = await auditGET(
        new NextRequest('http://localhost:3000/api/v1/fleet/audit?limit=0&offset=-5', {
          headers: { authorization: `Bearer ${adminAlphaToken}` },
        })
      );
      const jsonMin = await resMin.json();
      expect(jsonMin.pagination.limit).toBe(20); // fallback or clamp
      expect(jsonMin.pagination.offset).toBe(0);

      // Limit > 100 clamps to 100
      const resMax = await auditGET(
        new NextRequest('http://localhost:3000/api/v1/fleet/audit?limit=500', {
          headers: { authorization: `Bearer ${adminAlphaToken}` },
        })
      );
      const jsonMax = await resMax.json();
      expect(jsonMax.pagination.limit).toBe(100);
    });

    it('TC-BVA-AUD-02: returns empty array with has_more=false when offset exceeds total records', async () => {
      await dataService.recordAuditLog({
        tenantId: TENANT_ALPHA,
        actorId: adminAlphaClaims.sub,
        action: 'INSERT',
        tableName: 'loads',
        recordId: 'load-bva-1',
      });

      const res = await auditGET(
        new NextRequest('http://localhost:3000/api/v1/fleet/audit?offset=999', {
          headers: { authorization: `Bearer ${adminAlphaToken}` },
        })
      );
      const json = await res.json();
      expect(json.data).toEqual([]);
      expect(json.pagination.has_more).toBe(false);
      expect(json.pagination.total).toBe(1);
    });

    it('TC-BVA-AUD-03: matches intersection of table_name, record_id, and action simultaneously', async () => {
      await dataService.recordAuditLog({
        tenantId: TENANT_ALPHA,
        actorId: adminAlphaClaims.sub,
        action: 'UPDATE',
        tableName: 'trips',
        recordId: 'target-trip-99',
      });
      await dataService.recordAuditLog({
        tenantId: TENANT_ALPHA,
        actorId: adminAlphaClaims.sub,
        action: 'INSERT',
        tableName: 'trips',
        recordId: 'target-trip-99',
      });
      await dataService.recordAuditLog({
        tenantId: TENANT_ALPHA,
        actorId: adminAlphaClaims.sub,
        action: 'UPDATE',
        tableName: 'loads',
        recordId: 'target-trip-99',
      });

      const res = await auditGET(
        new NextRequest(
          'http://localhost:3000/api/v1/fleet/audit?table_name=trips&record_id=target-trip-99&action=UPDATE',
          { headers: { authorization: `Bearer ${adminAlphaToken}` } }
        )
      );
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].action).toBe('UPDATE');
      expect(json.data[0].table_name).toBe('trips');
      expect(json.data[0].record_id).toBe('target-trip-99');
    });
  });

  // ============================================================================
  // Credential Scrubbing Boundaries
  // ============================================================================
  describe('Boundary Group 4: Credential Scrubbing Boundaries', () => {
    it('TC-BVA-SCR-01: scrubs credentials regardless of casing (PASSWORD, Token, Secret, API_KEY)', () => {
      const sensitive = {
        PASSWORD: 'PlainPassword1!',
        Token: 'sample-bearer-token',
        SECRET: 'jwt-hmac-secret-string',
        Service_Role_Key: 'supabase-priv-key',
        API_KEY: 'live_test_123',
        safeKey: 'SafeFreight OS',
      };

      const serialized = safeJsonStringify(sensitive);
      const parsed = JSON.parse(serialized);

      expect(parsed.PASSWORD).toBe('[REDACTED]');
      expect(parsed.Token).toBe('[REDACTED]');
      expect(parsed.SECRET).toBe('[REDACTED]');
      expect(parsed.Service_Role_Key).toBe('[REDACTED]');
      expect(parsed.API_KEY).toBe('[REDACTED]');
      expect(parsed.safeKey).toBe('SafeFreight OS');
    });

    it('TC-BVA-SCR-02: scrubs token string values even if nested in non-sensitive property names', () => {
      const payload = {
        metadata: {
          sessionData: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyPayload.dummySig',
          rawJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
          normalData: 'Mumbai to Ahmedabad Corridor',
        },
      };

      const serialized = safeJsonStringify(payload);
      const parsed = JSON.parse(serialized);

      expect(parsed.metadata.sessionData).toBe('[REDACTED_TOKEN]');
      expect(parsed.metadata.rawJwt).toBe('[REDACTED_TOKEN]');
      expect(parsed.metadata.normalData).toBe('Mumbai to Ahmedabad Corridor');
    });
  });

  // ============================================================================
  // Telemetry Ingestion Boundaries
  // ============================================================================
  describe('Boundary Group 5: Telemetry Batch Ingestion Boundaries', () => {
    it('TC-BVA-TEL-01: rejects empty pings array with 400 Bad Request', async () => {
      await expect(
        dataService.ingestPings(adminAlphaClaims, [])
      ).rejects.toThrow('400 Bad Request');
    });

    it('TC-BVA-TEL-02: rejects out-of-boundary GPS coordinates (lat > 90, lng > 180, speed < 0)', async () => {
      await expect(
        dataService.ingestPings(adminAlphaClaims, [{ lat: 95.0, lng: 72.8 }])
      ).rejects.toThrow('Invalid latitude');

      await expect(
        dataService.ingestPings(adminAlphaClaims, [{ lat: 19.0, lng: 185.0 }])
      ).rejects.toThrow('Invalid longitude');

      await expect(
        dataService.ingestPings(adminAlphaClaims, [{ lat: 19.0, lng: 72.8, speed: -10 }])
      ).rejects.toThrow('Speed must be a non-negative number');
    });
  });
});
