export type OrganizationType = 'carrier' | 'shipper' | 'fleet';
export type UserRole = 'fleet_admin' | 'shipper' | 'driver';
export type LanguagePreference = 'en' | 'hi' | 'mr' | 'gu' | 'ta';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  gstin?: string | null;
  status: 'active' | 'suspended' | 'deactivated';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  role: UserRole;
  full_name: string;
  phone?: string | null;
  language_preference: LanguagePreference;
  created_at: string;
  updated_at: string;
}

export interface DriverInvitation {
  id: string;
  tenant_id: string;
  token: string;
  phone: string;
  role: 'driver';
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

export interface SessionClaims {
  sub: string;
  email: string;
  tenant_id: string;
  role: UserRole;
}
