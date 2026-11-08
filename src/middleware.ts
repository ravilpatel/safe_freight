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
  exp?: number;
}

function extractClaimsFromRequest(request: NextRequest): {
  sub: string;
  tenantId: string;
  role: 'fleet_admin' | 'shipper' | 'driver';
} | null {
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

    // Use Web standard atob for Edge runtime compatibility
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonStr = atob(padded);
    const payload: TokenPayload = JSON.parse(jsonStr);

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    const tenantId =
      payload.tenant_id ||
      payload.app_metadata?.tenant_id;

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedAdmin = pathname.startsWith('/admin');
  const isProtectedShipper = pathname.startsWith('/shipper');
  const isProtectedDriver = pathname.startsWith('/driver');

  if (!isProtectedAdmin && !isProtectedShipper && !isProtectedDriver) {
    return NextResponse.next();
  }

  const claims = extractClaimsFromRequest(request);

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
