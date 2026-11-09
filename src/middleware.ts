import { NextRequest, NextResponse } from 'next/server';

interface TokenPayload {
  sub?: string;
  tenant_id?: string;
  role?: string;
  user_role?: string;
  app_metadata?: {
    tenant_id?: string;
    role?: string;
  };
  user_metadata?: {
    org_id?: string;
  };
  exp?: number;
}

const DEFAULT_JWT_SECRET = 'safefreight-enterprise-secret';

function getJwtSecrets(): string[] {
  return Array.from(
    new Set(
      [process.env.JWT_SECRET, process.env.SUPABASE_JWT_SECRET, DEFAULT_JWT_SECRET].filter(
        (s): s is string => typeof s === 'string' && s.length > 0
      )
    )
  );
}

function base64UrlToUint8Array(base64url: string): Uint8Array | null {
  try {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function verifyHmacSha256(
  headerB64: string,
  payloadB64: string,
  signatureB64: string
): Promise<boolean> {
  const providedSigBytes = base64UrlToUint8Array(signatureB64);
  if (!providedSigBytes || providedSigBytes.length === 0) return false;

  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(`${headerB64}.${payloadB64}`);
  const secrets = getJwtSecrets();

  for (const secret of secrets) {
    try {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const expectedSigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes);
      const expectedSigBytes = new Uint8Array(expectedSigBuffer);

      if (timingSafeEqualBytes(providedSigBytes, expectedSigBytes)) {
        return true;
      }
    } catch {
      // Continue to next candidate secret
    }
  }

  return false;
}

export async function extractClaimsFromRequest(request: NextRequest): Promise<{
  sub: string;
  tenantId: string;
  role: 'fleet_admin' | 'shipper' | 'driver';
} | null> {
  let token = '';

  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.replace(/^Bearer\s+/i, '').trim();
  } else {
    token =
      request.cookies.get('safefreight-token')?.value ||
      request.cookies.get('sb-access-token')?.value ||
      '';
  }

  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    // Cryptographically verify HMAC-SHA256 signature on edge runtime
    const isSignatureValid = await verifyHmacSha256(headerB64, payloadB64, signatureB64);
    if (!isSignatureValid) {
      return null;
    }

    // Use Web standard atob for Edge runtime compatibility
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonStr = atob(padded);
    const payload: TokenPayload = JSON.parse(jsonStr);

    if (payload.exp && typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      return null;
    }

    const tenantId =
      payload.tenant_id ||
      payload.app_metadata?.tenant_id ||
      payload.user_metadata?.org_id;

    const role =
      payload.role ||
      payload.user_role ||
      payload.app_metadata?.role;

    const sub = payload.sub || '';

    if (!tenantId || !role) return null;
    if (role !== 'fleet_admin' && role !== 'shipper' && role !== 'driver') return null;

    return {
      sub,
      tenantId,
      role: role as 'fleet_admin' | 'shipper' | 'driver',
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedAdmin = pathname.startsWith('/admin');
  const isProtectedShipper = pathname.startsWith('/shipper');
  const isProtectedDriver = pathname.startsWith('/driver');

  if (!isProtectedAdmin && !isProtectedShipper && !isProtectedDriver) {
    return NextResponse.next();
  }

  const claims = await extractClaimsFromRequest(request);

  // Unauthenticated user -> redirect to /login
  if (!claims) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route requires role === 'fleet_admin'
  if (isProtectedAdmin && claims.role !== 'fleet_admin') {
    if (claims.role === 'shipper') {
      return NextResponse.redirect(new URL('/shipper', request.url));
    }
    if (claims.role === 'driver') {
      return NextResponse.redirect(new URL('/driver', request.url));
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized_role');
    return NextResponse.redirect(loginUrl);
  }

  // Shipper route requires role === 'shipper'
  if (isProtectedShipper && claims.role !== 'shipper') {
    if (claims.role === 'fleet_admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (claims.role === 'driver') {
      return NextResponse.redirect(new URL('/driver', request.url));
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized_role');
    return NextResponse.redirect(loginUrl);
  }

  // Driver route requires role === 'driver'
  if (isProtectedDriver && claims.role !== 'driver') {
    if (claims.role === 'fleet_admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (claims.role === 'shipper') {
      return NextResponse.redirect(new URL('/shipper', request.url));
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized_role');
    return NextResponse.redirect(loginUrl);
  }

  // Authorized: pass forward with tenant and role context headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', claims.tenantId);
  requestHeaders.set('x-user-role', claims.role);
  requestHeaders.set('x-user-id', claims.sub);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/shipper/:path*',
    '/driver/:path*',
  ],
};
