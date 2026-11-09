'use client';

import React, { useState, useEffect } from 'react';
import {
  OperationsHeader,
} from '@/components/admin/OperationsHeader';
import { KpiGrid } from '@/components/admin/KpiGrid';
import { FreightMatchingTab } from '@/components/admin/FreightMatchingTab';
import { RosterTab } from '@/components/admin/RosterTab';
import { DriverProvisionModal } from '@/components/admin/DriverProvisionModal';
import { DriverPasswordModal } from '@/components/admin/DriverPasswordModal';
import { TripDispatchTab } from '@/components/admin/TripDispatchTab';
import { AdvanceTripPlannerModal } from '@/components/admin/AdvanceTripPlannerModal';
import { WhatsAppDispatchSlipModal } from '@/components/admin/WhatsAppDispatchSlipModal';
import { TripKhataLedgerTab } from '@/components/admin/TripKhataLedgerTab';
import { GaadiWisePnlTab } from '@/components/admin/GaadiWisePnlTab';
import { DeadheadSimulatorTab } from '@/components/admin/DeadheadSimulatorTab';
import { DocumentRepositoryTab } from '@/components/admin/DocumentRepositoryTab';
import { SecurityAlertsTab } from '@/components/admin/SecurityAlertsTab';
import { GoldenHourConsoleTab } from '@/components/admin/GoldenHourConsoleTab';
import { AuditDisputeTab } from '@/components/admin/AuditDisputeTab';
import { FleetMap } from '@/components/admin/FleetMap';
import {
  AdminTab,
  FleetKpiSummary,
  DriverRosterItem,
  VehiclePnlItem,
  OpenShipperLoadItem,
  TripDispatchItem,
  StatutoryDocumentItem,
  SecurityAlertItem,
  SafetyIncidentItem,
} from '@/components/admin/types';
import {
  Compass,
  Package,
  Users,
  Truck,
  Wallet,
  TrendingUp,
  Sliders,
  FileText,
  ShieldAlert,
  Ambulance,
  History,
} from 'lucide-react';

export default function FleetAdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [passwordModalDriver, setPasswordModalDriver] = useState<DriverRosterItem | null>(null);
  const [whatsAppSlipTrip, setWhatsAppSlipTrip] = useState<TripDispatchItem | null>(null);

  // Live KPI Summary
  const [kpis, setKpis] = useState<FleetKpiSummary>({
    activeAssets: 4,
    deadheadReductionPct: 24,
    fuelSavedINR: 142600,
    activeAlertsCount: 1,
    totalMoneySavedINR: 210400,
    co2SavedKg: 418,
  });

  // Drivers & Vehicle Roster
  const [drivers, setDrivers] = useState<DriverRosterItem[]>([
    {
      id: 'drv-01',
      name: 'Commercial Driver Alpha',
      phone: '+919879054321',
      vehicleNumber: 'GJ 05 BZ 8821',
      model: 'Tata Signa 4825.T - 16 Wheeler',
      tareWeightMT: 12.5,
      payloadCapacityMT: 28.0,
      status: 'on_trip',
      currentSpeedKmH: 62,
      currentLocation: 'Surat Kadodara NH 48 Junction',
      drivingLicense: 'GJ0520180012345',
      fastagId: '34161FA820392019',
      lastPingTime: '10 sec ago',
    },
    {
      id: 'drv-02',
      name: 'Commercial Driver Beta',
      phone: '+919825012345',
      vehicleNumber: 'MH 04 GP 9102',
      model: 'Ashok Leyland 4220 14-Wheeler',
      tareWeightMT: 11.0,
      payloadCapacityMT: 24.0,
      status: 'on_trip',
      currentSpeedKmH: 58,
      currentLocation: 'Vapi GIDC Industrial Gateway',
      drivingLicense: 'MH0420160084321',
      fastagId: '34161FA991024810',
      lastPingTime: '24 sec ago',
    },
    {
      id: 'drv-03',
      name: 'Commercial Driver Gamma',
      phone: '+919898011223',
      vehicleNumber: 'GJ 06 AX 1944',
      model: 'BharatBenz 3523R Multi-Axle',
      tareWeightMT: 9.8,
      payloadCapacityMT: 21.0,
      status: 'idle',
      currentSpeedKmH: 0,
      currentLocation: 'Vadodara Ranoli GIDC Logistics Hub',
      drivingLicense: 'GJ0620190044123',
      fastagId: '34161FA550192831',
      lastPingTime: '1 min ago',
    },
    {
      id: 'drv-04',
      name: 'Commercial Driver Delta',
      phone: '+919820044556',
      vehicleNumber: 'MH 12 RQ 5510',
      model: 'Tata Prima 5530.S Trailer',
      tareWeightMT: 14.2,
      payloadCapacityMT: 35.0,
      status: 'alert',
      currentSpeedKmH: 42,
      currentLocation: 'Bharuch Narmada Bypass Toll',
      drivingLicense: 'MH1220150099412',
      fastagId: '34161FA119284729',
      lastPingTime: '15 sec ago',
    },
  ]);

  // Open Freight Demands along NH 48
  const [openLoads, setOpenLoads] = useState<OpenShipperLoadItem[]>([
    {
      id: 'load-nh48-01',
      origin: 'Mumbai JNPT Port Container Terminal',
      destination: 'Ahmedabad Changodar Industrial Hub',
      weightKg: 18000,
      volumeCft: 920,
      freightRateINR: 54000,
      distanceKm: 525,
      detourKm: 4.2,
      profitScore: 94,
      cargoCategory: 'Industrial Machinery & Precision Tooling',
      shipperName: 'Apex Industrial Forwarders Ltd',
      loadType: 'FTL',
      status: 'posted',
    },
    {
      id: 'load-nh48-02',
      origin: 'Surat Kadodara Textile Ring Road',
      destination: 'Vadodara Ranoli GIDC',
      weightKg: 6500,
      volumeCft: 380,
      freightRateINR: 19500,
      distanceKm: 155,
      detourKm: 1.8,
      profitScore: 88,
      cargoCategory: 'Export Synthetic Textiles',
      shipperName: 'Reliance Retail Logistics Hub',
      loadType: 'LTL',
      status: 'posted',
    },
    {
      id: 'load-nh48-03',
      origin: 'Vapi GIDC Chemical Estate',
      destination: 'Ahmedabad Changodar Hub',
      weightKg: 12000,
      volumeCft: 600,
      freightRateINR: 36000,
      distanceKm: 360,
      detourKm: 3.5,
      profitScore: 91,
      cargoCategory: 'Specialty Polymers & Resins',
      shipperName: 'Pidilite Industries Distribution',
      loadType: 'FTL',
      status: 'posted',
    },
  ]);

  // Corridor Trips
  const [trips, setTrips] = useState<TripDispatchItem[]>([
    {
      id: 'trip-101',
      lrNumber: 'WIFL/2026-27/LR-0482',
      ewayBill: '241289012345',
      driverId: 'drv-01',
      driverName: 'Commercial Driver Alpha',
      driverPhone: '+919879054321',
      vehicleNumber: 'GJ 05 BZ 8821',
      origin: 'Mumbai JNPT Port Terminal',
      destination: 'Ahmedabad Changodar Hub',
      scheduledDate: '2026-11-09',
      routeType: 'fastest',
      distanceKm: 525,
      tollINR: 2450,
      grossFreightINR: 54000,
      milestoneStatus: 'in_transit',
      dieselAdvanceINR: 14000,
      fastagAdvanceINR: 2450,
      bhattaAdvanceINR: 1600,
      hamaliAdvanceINR: 0,
      totalAdvancesINR: 18050,
      balanceDueINR: 35950,
    },
    {
      id: 'trip-102',
      lrNumber: 'WIFL/2026-27/LR-0483',
      ewayBill: '271890123456',
      driverId: 'drv-02',
      driverName: 'Commercial Driver Beta',
      driverPhone: '+919825012345',
      vehicleNumber: 'MH 04 GP 9102',
      origin: 'Vapi GIDC Industrial Checkpoint',
      destination: 'Vadodara Ranoli GIDC',
      scheduledDate: '2026-11-09',
      routeType: 'toll_optimized',
      distanceKm: 275,
      tollINR: 980,
      grossFreightINR: 31000,
      milestoneStatus: 'loaded',
      dieselAdvanceINR: 7500,
      fastagAdvanceINR: 1000,
      bhattaAdvanceINR: 1200,
      hamaliAdvanceINR: 0,
      totalAdvancesINR: 9700,
      balanceDueINR: 21300,
    },
    {
      id: 'trip-103',
      lrNumber: 'WIFL/2026-27/LR-0484',
      ewayBill: '241908234567',
      driverId: 'drv-04',
      driverName: 'Suresh Choudhary',
      driverPhone: '+919820044556',
      vehicleNumber: 'MH 12 RQ 5510',
      origin: 'Surat Kadodara Textile Ring Road',
      destination: 'Mumbai JNPT Terminal',
      scheduledDate: '2026-11-08',
      routeType: 'eco_fuel',
      distanceKm: 285,
      tollINR: 1450,
      grossFreightINR: 38000,
      milestoneStatus: 'completed',
      dieselAdvanceINR: 9000,
      fastagAdvanceINR: 1500,
      bhattaAdvanceINR: 1500,
      hamaliAdvanceINR: 500,
      totalAdvancesINR: 12500,
      balanceDueINR: 25500,
    },
  ]);

  // Gaadi-wise P&L items
  const [vehiclePnls] = useState<VehiclePnlItem[]>([
    {
      vehicleNumber: 'GJ 05 BZ 8821',
      model: 'Tata Signa 4825.T - 16 Wheeler',
      monthlyTrips: 8,
      grossRevenueINR: 432000,
      dieselCostINR: 135000,
      tollCostINR: 19600,
      maintenanceReserveINR: 28000,
      driverBhattaINR: 14400,
      totalOperatingCostINR: 197000,
      netMarginINR: 235000,
      marginPct: 54,
      health: 'excellent',
    },
    {
      vehicleNumber: 'MH 04 GP 9102',
      model: 'Ashok Leyland 4220 14-Wheeler',
      monthlyTrips: 6,
      grossRevenueINR: 286000,
      dieselCostINR: 98000,
      tollCostINR: 14200,
      maintenanceReserveINR: 18000,
      driverBhattaINR: 10800,
      totalOperatingCostINR: 141000,
      netMarginINR: 145000,
      marginPct: 51,
      health: 'healthy',
    },
    {
      vehicleNumber: 'GJ 06 AX 1944',
      model: 'BharatBenz 3523R Multi-Axle',
      monthlyTrips: 5,
      grossRevenueINR: 245000,
      dieselCostINR: 88000,
      tollCostINR: 12000,
      maintenanceReserveINR: 15000,
      driverBhattaINR: 9000,
      totalOperatingCostINR: 124000,
      netMarginINR: 121000,
      marginPct: 49,
      health: 'healthy',
    },
    {
      vehicleNumber: 'MH 12 RQ 5510',
      model: 'Tata Prima 5530.S Trailer',
      monthlyTrips: 7,
      grossRevenueINR: 395000,
      dieselCostINR: 142000,
      tollCostINR: 22000,
      maintenanceReserveINR: 32000,
      driverBhattaINR: 14000,
      totalOperatingCostINR: 210000,
      netMarginINR: 185000,
      marginPct: 47,
      health: 'healthy',
    },
  ]);

  // Statutory Documents
  const [documents, setDocuments] = useState<StatutoryDocumentItem[]>([
    {
      id: 'doc-01',
      vehicleNumber: 'GJ 05 BZ 8821',
      docType: 'national_permit',
      expiryDate: '2027-05-14',
      status: 'valid',
      documentUrl: 'https://vahan.parivahan.gov.in/permit/WIFL-AITP-0482',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'doc-02',
      vehicleNumber: 'GJ 05 BZ 8821',
      docType: 'fitness',
      expiryDate: '2026-11-28',
      status: 'expiring_soon',
      documentUrl: 'https://vahan.parivahan.gov.in/fitness/GJ05-FIT-9912',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'doc-03',
      vehicleNumber: 'MH 04 GP 9102',
      docType: 'insurance',
      expiryDate: '2027-08-20',
      status: 'valid',
      documentUrl: 'https://uiic.co.in/policy/COMM-991024',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'doc-04',
      vehicleNumber: 'GJ 06 AX 1944',
      docType: 'puc',
      expiryDate: '2026-10-15',
      status: 'expired',
      documentUrl: 'https://vahan.parivahan.gov.in/puc/GJ06PUC-4412',
      createdAt: new Date().toISOString(),
    },
  ]);

  // Security & Route Deviation Alerts
  const [alerts, setAlerts] = useState<SecurityAlertItem[]>([
    {
      id: 'alert-01',
      tripId: 'trip-101',
      vehicleNumber: 'MH 12 RQ 5510',
      driverName: 'Suresh Choudhary',
      alertType: 'route_deviation',
      message: 'Vehicle made unapproved highway detour 6.2 km off NH 48 corridor near Bharuch bypass',
      severity: 'critical',
      resolved: false,
      createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    },
    {
      id: 'alert-02',
      tripId: 'trip-102',
      vehicleNumber: 'MH 04 GP 9102',
      driverName: 'Balwant Singh',
      alertType: 'unauthorized_stop',
      message: 'Stationary halt >48 min logged at non-designated dhaba waypoint (km 210)',
      severity: 'warning',
      resolved: true,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
  ]);

  // Golden Hour Safety Incidents
  const [incidents, setIncidents] = useState<SafetyIncidentItem[]>([
    {
      id: 'inc-01',
      driverName: 'Commercial Driver Alpha',
      driverPhone: '+919879054321',
      vehicleNumber: 'GJ 05 BZ 8821',
      incidentType: 'crash',
      gForce: 4.5,
      t0: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      t1: new Date(Date.now() - 13.5 * 60 * 1000).toISOString(),
      t2: null,
      status: 'erss_notified',
      rescueDurationMinutes: null,
      location: 'NH 48 KM 278 (Near Surat Toll Plaza)',
    },
  ]);

  // Load real-time data from APIs on mount
  useEffect(() => {
    fetchKpis();
    fetchFleetDrivers();
    fetchDocuments();
    fetchAlerts();
    fetchSafetyIncidents();
  }, []);

  async function fetchKpis() {
    try {
      const res = await fetch('/api/v1/fleet/dead-mileage');
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.summary) {
          setKpis((prev) => ({
            ...prev,
            ...json.data.summary,
          }));
        }
      }
    } catch {
      // Retain state
    }
  }

  async function fetchFleetDrivers() {
    try {
      const res = await fetch('/api/v1/fleet/drivers');
      if (res.ok) {
        const json = await res.json();
        if (json.drivers && json.drivers.length > 0) {
          // Merge with roster
        }
      }
    } catch {
      // Retain state
    }
  }

  async function fetchDocuments() {
    try {
      const res = await fetch('/api/v1/fleet/documents');
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setDocuments(json.data);
        }
      }
    } catch {
      // Retain state
    }
  }

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/v1/fleet/alerts');
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setAlerts(json.data);
        }
      }
    } catch {
      // Retain state
    }
  }

  async function fetchSafetyIncidents() {
    try {
      const res = await fetch('/api/v1/safety/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setIncidents(json.data);
        }
      }
    } catch {
      // Retain state
    }
  }

  const handleSignOut = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'safefreight-token=; path=/; max-age=0';
      window.location.href = '/login';
    }
  };

  // Actions
  const handleDispatchLoad = async (loadId: string, driverId: string) => {
    const load = openLoads.find((l) => l.id === loadId);
    const driver = drivers.find((d) => d.id === driverId);
    if (!load || !driver) return;

    // Simulate load dispatch & trip generation
    const newTripId = `trip-${Date.now()}`;
    const newTrip: TripDispatchItem = {
      id: newTripId,
      lrNumber: `WIFL/2026-27/LR-${Math.floor(1000 + Math.random() * 9000)}`,
      ewayBill: `24${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      vehicleNumber: driver.vehicleNumber,
      origin: load.origin,
      destination: load.destination,
      scheduledDate: new Date().toISOString().split('T')[0],
      routeType: 'fastest',
      distanceKm: load.distanceKm,
      tollINR: 2450,
      grossFreightINR: load.freightRateINR,
      milestoneStatus: 'assigned',
      dieselAdvanceINR: Math.round(load.freightRateINR * 0.25),
      fastagAdvanceINR: 2450,
      bhattaAdvanceINR: 1500,
      hamaliAdvanceINR: 0,
      totalAdvancesINR: Math.round(load.freightRateINR * 0.25) + 2450 + 1500,
      balanceDueINR: load.freightRateINR - (Math.round(load.freightRateINR * 0.25) + 2450 + 1500),
    };

    setTrips((prev) => [newTrip, ...prev]);
    setOpenLoads((prev) =>
      prev.map((l) => (l.id === loadId ? { ...l, status: 'matched' } : l))
    );
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, status: 'on_trip' } : d))
    );
  };

  const handleDisburseAdvance = async (
    tripId: string,
    type: 'diesel' | 'fastag' | 'driverBhatta' | 'hamali',
    amount: number,
    _notes?: string
  ) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t;

        const newDiesel = type === 'diesel' ? t.dieselAdvanceINR + amount : t.dieselAdvanceINR;
        const newFastag = type === 'fastag' ? t.fastagAdvanceINR + amount : t.fastagAdvanceINR;
        const newBhatta = type === 'driverBhatta' ? t.bhattaAdvanceINR + amount : t.bhattaAdvanceINR;
        const newHamali = type === 'hamali' ? t.hamaliAdvanceINR + amount : t.hamaliAdvanceINR;
        const newTotal = newDiesel + newFastag + newBhatta + newHamali;
        const newBalance = Math.max(0, t.grossFreightINR - newTotal);

        return {
          ...t,
          dieselAdvanceINR: newDiesel,
          fastagAdvanceINR: newFastag,
          bhattaAdvanceINR: newBhatta,
          hamaliAdvanceINR: newHamali,
          totalAdvancesINR: newTotal,
          balanceDueINR: newBalance,
        };
      })
    );
  };

  const handleScheduleAdvanceTrip = async (tripData: any) => {
    const newTrip: TripDispatchItem = {
      id: `trip-${Date.now()}`,
      lrNumber: `WIFL/2026-27/LR-${Math.floor(1000 + Math.random() * 9000)}`,
      ewayBill: `24${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      ...tripData,
      milestoneStatus: 'created',
    };
    setTrips((prev) => [newTrip, ...prev]);
  };

  const handleAddDocument = async (docInput: any) => {
    const newDoc: StatutoryDocumentItem = {
      id: `doc-${Date.now()}`,
      vehicleNumber: docInput.vehicle_number,
      docType: docInput.doc_type,
      expiryDate: docInput.expiry_date || null,
      status: docInput.expiry_date && new Date(docInput.expiry_date) < new Date() ? 'expired' : 'valid',
      documentUrl: docInput.document_url,
      createdAt: new Date().toISOString(),
    };
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const handleDeleteDocument = async (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleResolveAlert = async (alertId: string, notes?: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              resolved: true,
              message: notes ? `${a.message} [Resolved: ${notes}]` : a.message,
            }
          : a
      )
    );
  };

  const handleLogT2Arrival = async (incidentId: string) => {
    try {
      await fetch('/api/v1/safety/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_id: incidentId, action: 'log_t2' }),
      });
    } catch {
      // Memory state fallback
    }

    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        const now = new Date().toISOString();
        const durationMin = Math.round(
          (new Date(now).getTime() - new Date(inc.t0).getTime()) / 60000
        );
        return {
          ...inc,
          status: 'resolved',
          t2: now,
          rescueDurationMinutes: durationMin,
        };
      })
    );
  };

  const unreadAlertsCount = alerts.filter((a) => !a.resolved).length;
  const activeIncidentsCount = incidents.filter(
    (i) => i.status !== 'resolved' && i.status !== 'cancelled'
  ).length;
  const totalUrgentNotifications = unreadAlertsCount + activeIncidentsCount;

  return (
    <div className="min-h-screen bg-[#f6f5f4] text-[#191919] font-sans antialiased">
      {/* 1. Operations Control Header (F16) */}
      <OperationsHeader
        fleetName="Western India Fleet Logistics (WIFL)"
        corridorName="NH 48 Western Freight Spine (JNPT ⇄ Changodar)"
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
        onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation Tabs (F33 Notion-Calm Design System) */}
        <div className="bg-white rounded-xl border border-[#e6e6e6] p-1.5 shadow-xs overflow-x-auto">
          <nav className="flex items-center space-x-1 min-w-max text-xs font-semibold">
            {[
              { id: 'overview', label: 'Overview & Map', icon: Compass },
              { id: 'freight', label: 'Freight Matching', icon: Package, badge: openLoads.filter(l => l.status === 'posted').length },
              { id: 'roster', label: 'Driver Roster', icon: Users, badge: drivers.length },
              { id: 'dispatch', label: 'Trip Dispatch', icon: Truck, badge: trips.filter(t => t.milestoneStatus === 'in_transit').length },
              { id: 'khata', label: 'Trip Khata', icon: Wallet },
              { id: 'pnl', label: 'Gaadi-wise P&L', icon: TrendingUp },
              { id: 'deadhead', label: 'Deadhead Simulator', icon: Sliders },
              { id: 'documents', label: 'Statutory Docs', icon: FileText, badge: documents.filter(d => d.status === 'expired' || d.status === 'expiring_soon').length, badgeColor: 'amber' },
              { id: 'alerts', label: 'Security Alerts', icon: ShieldAlert, badge: unreadAlertsCount, badgeColor: 'red' },
              { id: 'golden_hour', label: 'Golden Hour Command', icon: Ambulance, badge: activeIncidentsCount, badgeColor: 'red' },
              { id: 'audit', label: 'Audit Dispute Replay', icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${
                    isActive
                      ? 'bg-neutral-900 text-white font-bold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-neutral-500'}`} />
                  <span>{tab.label}</span>

                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-neutral-800 text-white'
                          : tab.badgeColor === 'red'
                          ? 'bg-red-100 text-red-800'
                          : tab.badgeColor === 'amber'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 2. Real-Time Fleet KPI Cards (F17) */}
        <KpiGrid
          kpis={{
            ...kpis,
            activeAlertsCount: totalUrgentNotifications,
          }}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />

        {/* 3. Tab Panels */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Interactive Corridor Leaflet Fleet Map (F32) */}
            <FleetMap
              drivers={drivers}
              onSelectDriver={(driver) => {
                setPasswordModalDriver(driver);
              }}
            />

            {/* Two Column Section: Quick Dispatch + Deadhead Simulation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Freight Matches Snapshot */}
              <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-neutral-900">
                      Open Highway Backhauls (NH 48)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('freight')}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      View All ({openLoads.length})
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mb-4">
                    High-yield shipper freight posted along Western Freight Spine.
                  </p>

                  <div className="space-y-2.5">
                    {openLoads.slice(0, 2).map((load) => (
                      <div
                        key={load.id}
                        className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-neutral-900">
                            {load.origin.split(' ')[0]} ➔ {load.destination.split(' ')[0]}
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {(load.weightKg / 1000).toFixed(1)} MT · {load.cargoCategory}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-neutral-900 block">
                            ₹{load.freightRateINR.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold">
                            Score {load.profitScore}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('freight')}
                  className="w-full py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition"
                >
                  Match Trucks & Dispatch
                </button>
              </div>

              {/* Deadhead Reduction Quick Simulator Snapshot */}
              <DeadheadSimulatorTab />
            </div>
          </div>
        )}

        {activeTab === 'freight' && (
          <FreightMatchingTab
            loads={openLoads}
            drivers={drivers}
            onDispatchLoad={handleDispatchLoad}
          />
        )}

        {activeTab === 'roster' && (
          <RosterTab
            drivers={drivers}
            onOpenInviteModal={() => setIsInviteModalOpen(true)}
            onOpenPasswordModal={(driver) => setPasswordModalDriver(driver)}
          />
        )}

        {activeTab === 'dispatch' && (
          <TripDispatchTab
            trips={trips}
            onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
            onOpenWhatsAppSlip={(trip) => setWhatsAppSlipTrip(trip)}
            onSelectTripForKhata={() => setActiveTab('khata')}
          />
        )}

        {activeTab === 'khata' && (
          <TripKhataLedgerTab
            trips={trips}
            onDisburseAdvance={handleDisburseAdvance}
          />
        )}

        {activeTab === 'pnl' && (
          <GaadiWisePnlTab vehicles={vehiclePnls} />
        )}

        {activeTab === 'deadhead' && (
          <DeadheadSimulatorTab />
        )}

        {activeTab === 'documents' && (
          <DocumentRepositoryTab
            documents={documents}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        )}

        {activeTab === 'alerts' && (
          <SecurityAlertsTab
            alerts={alerts}
            onResolveAlert={handleResolveAlert}
          />
        )}

        {activeTab === 'golden_hour' && (
          <GoldenHourConsoleTab
            incidents={incidents}
            onLogT2Arrival={handleLogT2Arrival}
          />
        )}

        {activeTab === 'audit' && (
          <AuditDisputeTab />
        )}
      </main>

      {/* Global Modals */}
      <DriverProvisionModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onDriverEnrolled={() => {
          fetchFleetDrivers();
        }}
      />

      <DriverPasswordModal
        isOpen={Boolean(passwordModalDriver)}
        driver={passwordModalDriver}
        onClose={() => setPasswordModalDriver(null)}
      />

      <AdvanceTripPlannerModal
        isOpen={isScheduleModalOpen}
        drivers={drivers}
        onClose={() => setIsScheduleModalOpen(false)}
        onTripScheduled={handleScheduleAdvanceTrip}
      />

      <WhatsAppDispatchSlipModal
        isOpen={Boolean(whatsAppSlipTrip)}
        trip={whatsAppSlipTrip}
        onClose={() => setWhatsAppSlipTrip(null)}
      />
    </div>
  );
}
