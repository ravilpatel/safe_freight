import { NextRequest, NextResponse } from 'next/server';
import { verifyAndExtractClaims, createDriverInvitation, tenantStore } from '@/lib/auth';
import { logger } from '@/lib/logger';

function extractClaimsFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const claims = verifyAndExtractClaims(authHeader);
    if (claims) return claims;
  }

  const cookieToken =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('safefreight-token')?.value;

  if (cookieToken) {
    return verifyAndExtractClaims(cookieToken);
  }

  return null;
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
        { error: '403 Forbidden: Only Fleet Admins can generate driver invitations' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.phone) {
      return NextResponse.json(
        { error: 'Driver phone number is required' },
        { status: 400 }
      );
    }

    const invitation = await createDriverInvitation(claims, {
      phone: body.phone,
      expiresInHours: body.expiresInHours,
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('Failed to create driver invitation', { error: errMsg });
    const status = errMsg.includes('403') ? 403 : 400;
    return NextResponse.json({ error: errMsg }, { status });
  }
}

export async function GET(request: NextRequest) {
  const claims = extractClaimsFromRequest(request);

  if (!claims) {
    return NextResponse.json(
      { error: '401 Unauthorized: Valid Bearer token required' },
      { status: 401 }
    );
  }

  if (claims.role !== 'fleet_admin') {
    return NextResponse.json(
      { error: '403 Forbidden: Only Fleet Admins can access driver roster' },
      { status: 403 }
    );
  }

  // Strictly tenant-scoped driver roster
  const tenantProfiles = tenantStore.getProfilesByTenant(claims.tenant_id);
  const drivers = tenantProfiles.filter((p) => p.role === 'driver');
  const invitations = tenantStore
    .getAllInvitations()
    .filter((inv) => inv.tenant_id === claims.tenant_id);

  return NextResponse.json({
    drivers,
    invitations,
  });
}
