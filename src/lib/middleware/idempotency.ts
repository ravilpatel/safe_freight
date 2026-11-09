/**
 * SafeFreight OS — Idempotency Middleware & Replay Engine
 * Reference: PRD v4.0.0 §3, §8 & CTO Phase 2 Directives
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../logger';

export interface IdempotencyEntry {
  key: string;
  tenantId: string;
  endpoint: string;
  statusCode: number;
  responsePayload: unknown;
  timestamp: string;
}

export class IdempotencyManager {
  private cache = new Map<string, IdempotencyEntry>();
  private readonly defaultTTLMs: number = 24 * 60 * 60 * 1000; // 24-hour replay window

  private getCompositeKey(tenantId: string, key: string): string {
    return `${tenantId}:${key}`;
  }

  public get(tenantId: string, key: string): IdempotencyEntry | null {
    const compositeKey = this.getCompositeKey(tenantId, key);
    const entry = this.cache.get(compositeKey);
    if (!entry) return null;

    // Check TTL
    const age = Date.now() - new Date(entry.timestamp).getTime();
    if (age > this.defaultTTLMs) {
      this.cache.delete(compositeKey);
      return null;
    }

    return entry;
  }

  public set(
    tenantId: string,
    key: string,
    endpoint: string,
    statusCode: number,
    responsePayload: unknown
  ): void {
    const compositeKey = this.getCompositeKey(tenantId, key);
    this.cache.set(compositeKey, {
      key,
      tenantId,
      endpoint,
      statusCode,
      responsePayload,
      timestamp: new Date().toISOString(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

// Global singleton idempotency store for runtime reuse
export const globalIdempotencyStore = new IdempotencyManager();
export const idempotencyManager = globalIdempotencyStore;

/**
 * Extracts Idempotency-Key header from request.
 */
export function getIdempotencyKey(request: NextRequest): string | null {
  return (
    request.headers.get('Idempotency-Key') ||
    request.headers.get('idempotency-key') ||
    request.headers.get('x-idempotency-key') ||
    null
  );
}

/**
 * Validates Idempotency-Key header requirement and replays cached response if exists.
 * If not cached, executes the handler and caches successful/client responses.
 */
export async function withIdempotency(
  request: NextRequest,
  tenantId: string,
  handler: () => Promise<NextResponse>,
  options: { required?: boolean } = { required: false }
): Promise<NextResponse> {
  const key = getIdempotencyKey(request);

  if (!key) {
    if (options.required) {
      return NextResponse.json(
        { error: '400 Bad Request: Idempotency-Key header is required for this operation' },
        { status: 400 }
      );
    }
    return handler();
  }

  const endpoint = new URL(request.url).pathname;

  // Check replay cache
  const cached = globalIdempotencyStore.get(tenantId, key);
  if (cached) {
    logger.info('Idempotent replay served from cache', {
      tenantId,
      key,
      endpoint,
      statusCode: cached.statusCode,
    });

    return NextResponse.json(cached.responsePayload, {
      status: cached.statusCode,
      headers: {
        'Idempotency-Replayed': 'true',
        'X-Cache': 'HIT',
      },
    });
  }

  // Execute operation
  const response = await handler();

  // Cache response if not a server error (5xx shouldn't cache flaky crashes)
  if (response.status < 500) {
    try {
      // Clone response to read body without consuming it for client
      const cloned = response.clone();
      const body = await cloned.json().catch(() => null);

      if (body) {
        globalIdempotencyStore.set(tenantId, key, endpoint, response.status, body);
      }
    } catch (e) {
      logger.warn('Failed to parse response body for idempotency caching', { error: String(e) });
    }
  }

  return response;
}
