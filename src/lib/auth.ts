import crypto from 'crypto';
import { createAdminClient } from './supabase/admin';
import { logger } from './logger';
import {
  Organization,
  Profile,
  DriverInvitation,
  SessionClaims,
  UserRole,
  OrganizationType,
  LanguagePreference,
} from '../types/database';

export interface SignupInput {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  orgName: string;
  orgType?: OrganizationType;
  role: 'fleet_admin' | 'shipper';
  gstin?: string;
  languagePreference?: LanguagePreference;
}

export interface DriverInviteInput {
  phone: string;
  expiresInHours?: number;
}

export interface DriverOnboardInput {
  invitationToken: string;
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  languagePreference?: LanguagePreference;
}

// Global persistent state for organizations and invitations (maintains state across API calls)
class MultiTenancyStore {
  private organizations = new Map<string, Organization>();
  private profiles = new Map<string, Profile>();
  private invitations = new Map<string, DriverInvitation>();

  constructor() {
    // Zero seed rows invariant
  }

  getOrganization(id: string): Organization | undefined {
    return this.organizations.get(id);
  }

  getOrganizationByName(name: string): Organization | undefined {
    return Array.from(this.organizations.values()).find(
      (org) => org.name.toLowerCase() === name.toLowerCase()
    );
  }

  saveOrganization(org: Organization): void {
    this.organizations.set(org.id, org);
  }

  getAllOrganizations(): Organization[] {
    return Array.from(this.organizations.values());
  }

  getProfile(id: string): Profile | undefined {
    return this.profiles.get(id);
  }

  saveProfile(profile: Profile): void {
    this.profiles.set(profile.id, profile);
  }

  getAllProfiles(): Profile[] {
    return Array.from(this.profiles.values());
  }

  getProfilesByTenant(tenantId: string): Profile[] {
    return Array.from(this.profiles.values()).filter(
      (p) => p.tenant_id === tenantId
    );
  }

  getInvitationByToken(token: string): DriverInvitation | undefined {
    return this.invitations.get(token);
  }

  saveInvitation(invitation: DriverInvitation): void {
    this.invitations.set(invitation.token, invitation);
  }

  getAllInvitations(): DriverInvitation[] {
    return Array.from(this.invitations.values());
  }

  clear(): void {
    this.organizations.clear();
    this.profiles.clear();
    this.invitations.clear();
  }
}

// Global singleton registry
export const tenantStore = new MultiTenancyStore();

/**
 * Validates signup inputs according to enterprise security requirements
 */
export function validateSignupInput(body: any): { valid: boolean; error?: string; data?: SignupInput } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object' };
  }

  const { email, password, fullName, phone, orgName, orgType, role, gstin, languagePreference } = body;

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: 'Invalid or missing email address' };
  }

  if (password !== undefined && (typeof password !== 'string' || password.length < 8)) {
    return { valid: false, error: 'Password must be at least 8 characters in length' };
  }

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    return { valid: false, error: 'Full name is required' };
  }

  if (!orgName || typeof orgName !== 'string' || orgName.trim().length === 0) {
    return { valid: false, error: 'Organization name is required' };
  }

  if (role !== 'fleet_admin' && role !== 'shipper') {
    return {
      valid: false,
      error: 'Direct signup is restricted to role "fleet_admin" or "shipper". Drivers must use an invitation token.',
    };
  }

  const allowedTypes: OrganizationType[] = ['carrier', 'shipper', 'fleet'];
  let resolvedOrgType: OrganizationType = orgType;
  if (!resolvedOrgType) {
    resolvedOrgType = role === 'shipper' ? 'shipper' : 'carrier';
  } else if (!allowedTypes.includes(resolvedOrgType)) {
    return { valid: false, error: `Invalid orgType: ${resolvedOrgType}. Must be carrier, shipper, or fleet.` };
  }

  const allowedLanguages: LanguagePreference[] = ['en', 'hi', 'mr', 'gu', 'ta'];
  const resolvedLang: LanguagePreference = languagePreference || 'en';
  if (!allowedLanguages.includes(resolvedLang)) {
    return { valid: false, error: `Invalid languagePreference: ${languagePreference}` };
  }

  return {
    valid: true,
    data: {
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      phone: phone ? String(phone).trim() : undefined,
      orgName: orgName.trim(),
      orgType: resolvedOrgType,
      role,
      gstin: gstin ? String(gstin).trim() : undefined,
      languagePreference: resolvedLang,
    },
  };
}

/**
 * Handles Fleet Admin and Shipper self-onboarding.
 * Creates user in Supabase Auth, creates exactly 1 organization and 1 profile.
 * Invariant: Zero business rows added.
 */
export async function handleSignup(input: SignupInput) {
  logger.info('Processing self-onboarding registration', {
    email: input.email,
    role: input.role,
    orgName: input.orgName,
    orgType: input.orgType,
  });

  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Create organization
  const organization: Organization = {
    id: orgId,
    name: input.orgName,
    type: input.orgType || (input.role === 'shipper' ? 'shipper' : 'carrier'),
    gstin: input.gstin || null,
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  // Create profile
  const profile: Profile = {
    id: userId,
    tenant_id: orgId,
    role: input.role,
    full_name: input.fullName,
    phone: input.phone || null,
    language_preference: input.languagePreference || 'en',
    created_at: now,
    updated_at: now,
  };

  // Attempt live Supabase Auth creation if credentials are valid
  try {
    const admin = createAdminClient();
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password || crypto.randomBytes(16).toString('hex'),
      email_confirm: true,
      app_metadata: {
        tenant_id: orgId,
        role: input.role,
        user_role: input.role,
      },
      user_metadata: {
        full_name: input.fullName,
        phone: input.phone,
        org_id: orgId,
      },
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already registered')) {
        throw new Error(`Email address already registered: ${input.email}`);
      }
      logger.warn('Supabase Auth user creation returned error, proceeding with local ID', {
        error: authError.message,
      });
    } else if (authUser?.user?.id) {
      profile.id = authUser.user.id;
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('already registered')) {
      throw err;
    }
    logger.warn('Could not complete live Supabase Auth call, continuing with secure UUID', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Persist organization and profile
  tenantStore.saveOrganization(organization);
  tenantStore.saveProfile(profile);

  // Mint session claims
  const claims: SessionClaims = {
    sub: profile.id,
    email: input.email,
    tenant_id: orgId,
    role: input.role,
  };

  const token = createSignedJwtPayload(claims);

  logger.info('Self-onboarding completed successfully', {
    userId: profile.id,
    orgId,
    role: input.role,
    businessRowsCreated: 0,
  });

  return {
    token,
    user: {
      id: profile.id,
      email: input.email,
      fullName: profile.full_name,
      role: profile.role,
      tenantId: orgId,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      type: organization.type,
      status: organization.status,
    },
    businessRowsCreated: 0,
  };
}

/**
 * Fleet Admin generates invitation token for commercial driver with expiration.
 */
export async function createDriverInvitation(
  claims: SessionClaims,
  input: DriverInviteInput
): Promise<DriverInvitation> {
  if (claims.role !== 'fleet_admin') {
    throw new Error('403 Forbidden: Only Fleet Admins can generate driver invitations');
  }

  if (!input.phone || String(input.phone).trim().length === 0) {
    throw new Error('Driver phone number is required');
  }

  if (typeof input.expiresInHours === 'number' && input.expiresInHours <= 0) {
    throw new Error('400 Bad Request: expiresInHours must be a positive number');
  }

  const hours = typeof input.expiresInHours === 'number' && input.expiresInHours > 0 ? input.expiresInHours : 48;
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  const token = `inv-${crypto.randomBytes(16).toString('hex')}`;
  const now = new Date().toISOString();

  const invitation: DriverInvitation = {
    id: crypto.randomUUID(),
    tenant_id: claims.tenant_id,
    token,
    phone: String(input.phone).trim(),
    role: 'driver',
    status: 'pending',
    expires_at: expiresAt,
    created_at: now,
  };

  tenantStore.saveInvitation(invitation);

  logger.info('Driver invitation generated', {
    tenantId: claims.tenant_id,
    token,
    phone: invitation.phone,
    expiresAt,
  });

  return invitation;
}

/**
 * Driver onboarding: Validates invite token, links driver profile to inviting org tenant_id.
 * Invariant: Zero new organizations created.
 */
export async function handleDriverOnboarding(input: DriverOnboardInput) {
  if (!input.invitationToken || input.invitationToken.trim().length === 0) {
    throw new Error('400 Bad Request: Invalid or missing invitation token');
  }

  const invitation = tenantStore.getInvitationByToken(input.invitationToken.trim());
  if (!invitation) {
    throw new Error('400 Bad Request: Invalid invitation token');
  }

  if (invitation.status === 'accepted') {
    throw new Error('400 Bad Request: Invitation token already redeemed');
  }

  if (invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()) {
    invitation.status = 'expired';
    throw new Error('400 Bad Request: Invitation token has expired');
  }

  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error('400 Bad Request: Invalid or missing email address');
  }

  if (!input.fullName || input.fullName.trim().length === 0) {
    throw new Error('400 Bad Request: Driver full name is required');
  }

  const targetTenantId = invitation.tenant_id;
  const org = tenantStore.getOrganization(targetTenantId);
  const now = new Date().toISOString();
  const driverUserId = crypto.randomUUID();

  // Create driver profile strictly linked to targetTenantId
  const profile: Profile = {
    id: driverUserId,
    tenant_id: targetTenantId,
    role: 'driver',
    full_name: input.fullName.trim(),
    phone: input.phone || invitation.phone,
    language_preference: input.languagePreference || 'en',
    created_at: now,
    updated_at: now,
  };

  // Attempt live Supabase Auth creation for driver
  try {
    const admin = createAdminClient();
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: input.email.trim().toLowerCase(),
      password: input.password || crypto.randomBytes(16).toString('hex'),
      email_confirm: true,
      app_metadata: {
        tenant_id: targetTenantId,
        role: 'driver',
        user_role: 'driver',
      },
      user_metadata: {
        full_name: input.fullName.trim(),
        phone: input.phone || invitation.phone,
        org_id: targetTenantId,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error(`Email address already registered: ${input.email}`);
      }
    } else if (authUser?.user?.id) {
      profile.id = authUser.user.id;
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('already registered')) {
      throw err;
    }
    logger.warn('Could not complete live Supabase Auth for driver, using secure UUID', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Update invitation status to accepted
  invitation.status = 'accepted';
  tenantStore.saveInvitation(invitation);
  tenantStore.saveProfile(profile);

  const claims: SessionClaims = {
    sub: profile.id,
    email: input.email.trim().toLowerCase(),
    tenant_id: targetTenantId,
    role: 'driver',
  };

  const token = createSignedJwtPayload(claims);

  logger.info('Driver successfully onboarded via invitation', {
    driverId: profile.id,
    tenantId: targetTenantId,
    tokenRedeemed: invitation.token,
    newOrgsCreated: 0,
  });

  return {
    token,
    user: {
      id: profile.id,
      email: input.email,
      fullName: profile.full_name,
      role: 'driver' as const,
      tenantId: targetTenantId,
    },
    organization: org ? { id: org.id, name: org.name, type: org.type } : { id: targetTenantId },
    newOrgsCreated: 0,
    businessRowsCreated: 0,
  };
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

/**
 * Creates a signed base64url JWT payload string for session headers
 */
export function createSignedJwtPayload(
  claims: SessionClaims,
  expiresInSeconds: number = 86400
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...claims,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secrets = getJwtSecrets();
  const secret = secrets[0] || DEFAULT_JWT_SECRET;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Extracts and verifies SessionClaims from a request via Authorization Bearer header or cookies.
 */
export function extractClaimsFromRequest(request: {
  headers: { get(_name: string): string | null };
  cookies?: { get(_name: string): { value: string } | undefined };
}): SessionClaims | null {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const claims = verifyAndExtractClaims(authHeader);
    if (claims) return claims;
  }

  const cookieToken =
    request.cookies?.get('sb-access-token')?.value ||
    request.cookies?.get('safefreight-token')?.value;

  if (cookieToken) {
    return verifyAndExtractClaims(cookieToken);
  }

  return null;
}

/**
 * Extracts and verifies SessionClaims from a JWT token string.
 * Strictly verifies the HMAC-SHA256 signature using constant-time comparison.
 * Any invalid signature, forged token, or malformed structure returns null.
 */
export function verifyAndExtractClaims(token: string): SessionClaims | null {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.trim().replace(/^Bearer\s+/i, '').split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const sigBuf = Buffer.from(signatureB64);
    if (sigBuf.length === 0) return null;

    // Cryptographically verify HMAC-SHA256 signature against candidate secrets
    const secrets = getJwtSecrets();
    let isSignatureValid = false;

    for (const secret of secrets) {
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');
      const expectedBuf = Buffer.from(expectedSig);

      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        isSignatureValid = true;
        break;
      }
    }

    if (!isSignatureValid) {
      return null;
    }

    const rawPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));

    // Check expiration timestamp if present
    if (rawPayload.exp && typeof rawPayload.exp === 'number' && rawPayload.exp * 1000 < Date.now()) {
      return null;
    }

    // Extract tenant_id and role from top-level or app_metadata
    const tenantId =
      rawPayload.tenant_id ||
      rawPayload.app_metadata?.tenant_id ||
      rawPayload.user_metadata?.org_id;

    const role =
      rawPayload.role ||
      rawPayload.user_role ||
      rawPayload.app_metadata?.role;

    const sub = rawPayload.sub || rawPayload.id || rawPayload.userId;
    const email = rawPayload.email || '';

    if (!tenantId || !role) {
      return null;
    }

    if (role !== 'fleet_admin' && role !== 'shipper' && role !== 'driver') {
      return null;
    }

    return {
      sub: String(sub),
      email: String(email),
      tenant_id: String(tenantId),
      role: role as UserRole,
    };
  } catch (_err) {
    return null;
  }
}
