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

export type LoadStatus =
  | 'draft'
  | 'posted'
  | 'matched'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface Load {
  id: string;
  tenant_id: string;
  shipper_id?: string | null;
  origin_name: string;
  origin_lat?: number | null;
  origin_lng?: number | null;
  destination_name: string;
  destination_lat?: number | null;
  destination_lng?: number | null;
  weight_kg: number;
  volume_cft?: number | null;
  distance_km?: number | null;
  status: LoadStatus;
  pricing_inr: number;
  matched_driver_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type MilestoneStatus =
  | 'created'
  | 'assigned'
  | 'at_pickup'
  | 'loaded'
  | 'in_transit'
  | 'at_unloading'
  | 'completed'
  | 'cancelled';

export interface Trip {
  id: string;
  tenant_id: string;
  load_id?: string | null;
  driver_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  milestone_status: MilestoneStatus;
  gross_freight: number;
  total_advances: number;
  maintenance_reserve: number;
  balance_due: number;
  net_profit: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentType =
  | 'rc'
  | 'fitness'
  | 'insurance'
  | 'puc'
  | 'national_permit'
  | 'driving_license'
  | 'lr_eway_bill'
  | 'other';

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface FleetDocument {
  id: string;
  tenant_id: string;
  vehicle_number: string;
  doc_type: DocumentType;
  expiry_date?: string | null;
  verification_status: VerificationStatus;
  document_url?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TelematicsPing {
  id: string;
  tenant_id: string;
  trip_id?: string | null;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  g_force: number;
  battery_pct?: number | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type IncidentType =
  | 'crash'
  | 'sos'
  | 'harsh_braking'
  | 'rollover'
  | 'panic_button'
  | 'geofence_breach';

export type IncidentStatus = 'triggered' | 'cancelled' | 'erss_notified' | 'resolved';

export interface SafetyIncident {
  id: string;
  tenant_id: string;
  driver_id?: string | null;
  trip_id?: string | null;
  incident_type: IncidentType;
  g_force?: number | null;
  t0_timestamp?: string | null;
  t1_timestamp?: string | null;
  t2_timestamp?: string | null;
  status: IncidentStatus;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type SecurityAlertType =
  | 'route_deviation'
  | 'fuel_theft_drop'
  | 'speed_violation'
  | 'unauthorized_stop'
  | 'night_driving';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface SecurityAlert {
  id: string;
  tenant_id: string;
  trip_id?: string | null;
  alert_type: SecurityAlertType;
  message: string;
  severity: AlertSeverity;
  resolved: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  table_name: string;
  record_id: string;
  row_id?: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  old_record?: Record<string, unknown> | null;
  new_record?: Record<string, unknown> | null;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  performed_by?: string | null;
  actor_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}
