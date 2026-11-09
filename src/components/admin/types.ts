/**
 * SafeFreight OS — Phase 4 Fleet Admin Console Type Definitions
 * Source: PRD v4.0.0 §6 (Phase 4), PRD v3 FR-FO-01 to 11
 */

import { DocumentType, IncidentType, IncidentStatus, SecurityAlertType, AlertSeverity } from '@/types/database';

export type AdminTab =
  | 'overview'
  | 'freight'
  | 'roster'
  | 'dispatch'
  | 'khata'
  | 'pnl'
  | 'deadhead'
  | 'documents'
  | 'alerts'
  | 'golden_hour'
  | 'audit';

export interface FleetKpiSummary {
  activeAssets: number;
  deadheadReductionPct: number;
  fuelSavedINR: number;
  activeAlertsCount: number;
  totalMoneySavedINR: number;
  co2SavedKg: number;
}

export interface DriverRosterItem {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  model: string;
  tareWeightMT: number;
  payloadCapacityMT: number;
  status: 'on_trip' | 'idle' | 'alert';
  currentSpeedKmH: number;
  currentLocation: string;
  drivingLicense: string;
  fastagId: string;
  lastPingTime: string;
}

export interface VehiclePnlItem {
  vehicleNumber: string;
  model: string;
  monthlyTrips: number;
  grossRevenueINR: number;
  dieselCostINR: number;
  tollCostINR: number;
  maintenanceReserveINR: number;
  driverBhattaINR: number;
  totalOperatingCostINR: number;
  netMarginINR: number;
  marginPct: number;
  health: 'excellent' | 'healthy' | 'low' | 'loss';
}

export interface OpenShipperLoadItem {
  id: string;
  origin: string;
  destination: string;
  weightKg: number;
  volumeCft: number;
  freightRateINR: number;
  distanceKm: number;
  detourKm: number;
  profitScore: number;
  cargoCategory: string;
  shipperName: string;
  loadType: 'LTL' | 'FTL';
  status: 'posted' | 'matched' | 'in_transit' | 'delivered';
}

export interface TripDispatchItem {
  id: string;
  lrNumber: string;
  ewayBill: string;
  driverId?: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  origin: string;
  destination: string;
  scheduledDate: string;
  routeType: 'fastest' | 'toll_optimized' | 'eco_fuel';
  distanceKm: number;
  tollINR: number;
  grossFreightINR: number;
  milestoneStatus: string;
  dieselAdvanceINR: number;
  fastagAdvanceINR: number;
  bhattaAdvanceINR: number;
  hamaliAdvanceINR: number;
  totalAdvancesINR: number;
  balanceDueINR: number;
}

export interface StatutoryDocumentItem {
  id: string;
  vehicleNumber: string;
  docType: DocumentType;
  expiryDate: string | null;
  status: 'valid' | 'expiring_soon' | 'expired';
  documentUrl?: string | null;
  createdAt: string;
}

export interface SecurityAlertItem {
  id: string;
  tripId?: string | null;
  vehicleNumber?: string;
  driverName?: string;
  alertType: SecurityAlertType;
  message: string;
  severity: AlertSeverity;
  resolved: boolean;
  createdAt: string;
}

export interface SafetyIncidentItem {
  id: string;
  driverName: string;
  driverPhone?: string;
  vehicleNumber: string;
  incidentType: IncidentType;
  gForce: number;
  t0: string;
  t1: string;
  t2: string | null;
  status: IncidentStatus;
  rescueDurationMinutes: number | null;
  location?: string;
}
