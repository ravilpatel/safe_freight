'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ShipperHeader from '@/components/shipper/ShipperHeader';
import AIBookingWizard from '@/components/shipper/AIBookingWizard';
import ShipmentsTrackerTable from '@/components/shipper/ShipmentsTrackerTable';
import GSTTaxInvoiceModal from '@/components/shipper/GSTTaxInvoiceModal';
import { generateGSTInvoice, GSTInvoiceData } from '@/lib/algorithms/statutory';
import { Load } from '@/types/database';
import {
  Sparkles,
  Truck,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

const INITIAL_SEED_LOADS: Load[] = [
  {
    id: 'load-nh48-hub-01',
    tenant_id: 'org-enterprise-tenant',
    shipper_id: 'shipper-user-1',
    origin_name: 'Mumbai JNPT Port, Maharashtra',
    destination_name: 'Ahmedabad Changodar Hub, Gujarat',
    distance_km: 525,
    weight_kg: 18000,
    truck_type: '22ft Multi-Axle Container',
    cargo_category: 'heavy_machinery',
    pricing_inr: 56700,
    bid_bonus_inr: 2500,
    status: 'in_transit',
    scheduled_date: '2026-11-09',
    scheduled_slot: 'Morning 08:00 - 12:00',
    matched_driver_id: 'drv-01',
    consignor_name: 'Western Logistics Terminal Nhava Sheva',
    consignor_gstin: '27AAACW1234F1Z1',
    consignee_name: 'Gujarat Heavy Industries Changodar',
    consignee_gstin: '24AAACW5678G1Z2',
    eway_bill_number: '241098234512',
    hamali_included: true,
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'shipper-user-1',
    updated_by: 'shipper-user-1',
  },
  {
    id: 'load-nh48-hub-02',
    tenant_id: 'org-enterprise-tenant',
    shipper_id: 'shipper-user-1',
    origin_name: 'Surat Ring Road Textile Hub, Gujarat',
    destination_name: 'Vadodara Ranoli GIDC, Gujarat',
    distance_km: 150,
    weight_kg: 8500,
    truck_type: '19ft Container Truck',
    cargo_category: 'textiles_garments',
    pricing_inr: 21000,
    bid_bonus_inr: 1000,
    status: 'open',
    scheduled_date: '2026-11-10',
    scheduled_slot: 'Afternoon 12:00 - 16:00',
    matched_driver_id: null,
    consignor_name: 'Surat Synthetic Weavers Co-op',
    consignor_gstin: '24AABCS9821M1Z5',
    consignee_name: 'Baroda Garment Processing Ltd',
    consignee_gstin: '24AAACB1122K1Z9',
    eway_bill_number: '241077654321',
    hamali_included: false,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'shipper-user-1',
    updated_by: 'shipper-user-1',
  },
  {
    id: 'load-nh48-hub-03',
    tenant_id: 'org-enterprise-tenant',
    shipper_id: 'shipper-user-1',
    origin_name: 'Vapi GIDC Industrial Park, Gujarat',
    destination_name: 'Bhiwandi Warehousing Complex, Maharashtra',
    distance_km: 120,
    weight_kg: 12000,
    truck_type: '20ft Multi-Axle',
    cargo_category: 'chemicals_polymers',
    pricing_inr: 28350,
    bid_bonus_inr: 0,
    status: 'delivered',
    scheduled_date: '2026-11-08',
    scheduled_slot: 'Evening 16:00 - 20:00',
    matched_driver_id: 'drv-02',
    consignor_name: 'Vapi Polymer Resins Ltd',
    consignor_gstin: '24AAACV3456L1Z4',
    consignee_name: 'All-India Bhiwandi 3PL Fulfillment',
    consignee_gstin: '27AAACW9988P1Z8',
    eway_bill_number: '241044332211',
    hamali_included: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    created_by: 'shipper-user-1',
    updated_by: 'shipper-user-1',
  },
];

export default function ShipperDashboardPage() {
  const [activeTab, setActiveTab] = useState<'booking' | 'tracker'>('booking');
  const [loads, setLoads] = useState<Load[]>(INITIAL_SEED_LOADS);
  const [loading, setLoading] = useState<boolean>(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<GSTInvoiceData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [tenantInfo, setTenantInfo] = useState({
    tenantId: 'org-enterprise-tenant',
    tenantName: 'National Freight Logistics Ltd',
  });

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Decode JWT cookie for tenant authentication & role verification
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';').map((c) => c.trim());
      const tokenCookie = cookies.find((c) => c.startsWith('safefreight-token='));
      if (tokenCookie) {
        try {
          const token = tokenCookie.split('=')[1];
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(
              atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
            );
            if (payload.role === 'driver') {
              window.location.href = '/driver';
              return;
            }
            if (payload.tenant_id) {
              setTenantInfo({
                tenantId: payload.tenant_id,
                tenantName: payload.org_name || 'National Freight Logistics Ltd',
              });
            }
          }
        } catch {
          // Retain default tenant
        }
      }
    }
  }, []);

  // Fetch tenant loads from REST API
  const fetchLoads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/loads');
      if (res.ok) {
        const json = await res.json();
        const fetchedLoads = json.data || json.loads || [];
        if (Array.isArray(fetchedLoads) && fetchedLoads.length > 0) {
          setLoads(fetchedLoads);
        }
      }
    } catch {
      // Retain existing loads on offline/network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoads();
  }, [fetchLoads]);

  const handleSignOut = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'safefreight-token=; path=/; max-age=0';
      window.location.href = '/login';
    }
  };

  // Handler: 6-Step AI Wizard Booking Submission
  const handleBookingSubmitted = async (payload: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/loads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': `shipper-book-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        },
        body: JSON.stringify(payload),
      });

      let createdLoad: Load | null = null;
      if (res.ok) {
        const json = await res.json();
        createdLoad = json.data || json.load || null;
      }

      if (!createdLoad) {
        // Fallback load object for demo / offline environment
        createdLoad = {
          id: `load-local-${Date.now()}`,
          tenant_id: tenantInfo.tenantId,
          shipper_id: 'shipper-user-current',
          origin_name: String(payload.origin_name || 'Mumbai JNPT Port'),
          destination_name: String(payload.destination_name || 'Ahmedabad Changodar Hub'),
          distance_km: Number(payload.distance_km || 525),
          weight_kg: Number(payload.weight_kg || 10000),
          truck_type: String(payload.truck_type || '19ft Container'),
          cargo_category: String(payload.cargo_category || 'general_freight'),
          pricing_inr: Number(payload.pricing_inr || 38000),
          bid_bonus_inr: Number(payload.bid_bonus_inr || 0),
          status: 'open',
          scheduled_date: String(payload.scheduled_date || new Date().toISOString().split('T')[0]),
          scheduled_slot: String(payload.scheduled_slot || 'Morning 08:00 - 12:00'),
          matched_driver_id: null,
          consignor_name: String(payload.consignor_name || 'Corridor Freight Hub'),
          consignor_gstin: String(payload.consignor_gstin || '27AAACW1234F1Z1'),
          consignee_name: String(payload.consignee_name || 'Gujarat Inbound Receiving'),
          consignee_gstin: String(payload.consignee_gstin || '24AAACW5678G1Z2'),
          eway_bill_number: payload.eway_bill_number ? String(payload.eway_bill_number) : undefined,
          hamali_included: Boolean(payload.hamali_included),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'shipper-user-current',
          updated_by: 'shipper-user-current',
        };
      }

      setLoads((prev) => [createdLoad!, ...prev]);
      setToast({
        message: `Freight load booked successfully on NH 48 corridor! Ref: ${createdLoad.id.substring(0, 8)}`,
        type: 'success',
      });
      setActiveTab('tracker');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({ message: `Booking failed: ${msg}`, type: 'error' });
      return false;
    }
  };

  // Handler: Cancel eligible load via PATCH /api/v1/loads/[id]/cancel
  const handleCancelLoad = async (loadId: string, reason?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/loads/${loadId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Cancelled by shipper request' }),
      });

      if (!res.ok) {
        // Fallback to DELETE /api/v1/loads/[id]
        const delRes = await fetch(`/api/v1/loads/${loadId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason || 'Cancelled by shipper request' }),
        });
        if (!delRes.ok) {
          const errJson = await delRes.json().catch(() => ({}));
          throw new Error(errJson.error || 'Failed to cancel load');
        }
      }

      setLoads((prev) =>
        prev.map((l) =>
          l.id === loadId
            ? {
                ...l,
                status: 'cancelled',
                cancellation_reason: reason || 'Cancelled by shipper request',
                cancelled_at: new Date().toISOString(),
              }
            : l
        )
      );
      setToast({ message: 'Freight load cancelled successfully', type: 'success' });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({ message: `Cancellation failed: ${msg}`, type: 'error' });
      return false;
    }
  };

  // Handler: View SAC 9965 GST Invoice Modal
  const handleViewInvoice = async (load: Load) => {
    try {
      const res = await fetch(`/api/v1/loads/${load.id}?invoice=true`);
      if (res.ok) {
        const json = await res.json();
        if (json.invoice) {
          setSelectedInvoice(json.invoice);
          setIsInvoiceOpen(true);
          return;
        }
      }
    } catch {
      // Fallback to client statutory calculation
    }

    const invoice = generateGSTInvoice({
      origin: load.origin_name,
      destination: load.destination_name,
      distanceKm: load.distance_km || 525,
      weightKg: load.weight_kg,
      pricingInr: load.pricing_inr,
      consignorName: load.consignor_name || undefined,
      consignorGstin: load.consignor_gstin || undefined,
      consigneeName: load.consignee_name || undefined,
      consigneeGstin: load.consignee_gstin || undefined,
      ewayBillNumber: load.eway_bill_number || undefined,
      hamaliIncluded: load.hamali_included ?? false,
      isDelivered: load.status === 'delivered',
    });
    setSelectedInvoice(invoice);
    setIsInvoiceOpen(true);
  };

  const activeShipmentsCount = loads.filter((l) => l.status === 'in_transit').length;
  const openBidsCount = loads.filter(
    (l) => l.status === 'open' || l.status === 'posted' || l.status === 'matched'
  ).length;

  return (
    <div className="min-h-screen bg-[#f6f5f4] text-[#191919]">
      {/* 1. Shipper Header */}
      <ShipperHeader
        tenantName={tenantInfo.tenantName}
        tenantId={tenantInfo.tenantId}
        totalLoadsCount={loads.length}
        inTransitCount={activeShipmentsCount}
        onSignOut={handleSignOut}
      />

      {/* Toast Notification Banner */}
      {toast && (
        <div className="max-w-7xl mx-auto px-6 sm:px-10 pt-4">
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-sm ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-md hover:bg-black/5 text-neutral-500 hover:text-neutral-800"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Container */}
      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-6 sm:py-8 space-y-6">
        {/* Navigation Tabs (Stitch MCP Design Tokens: Cobalt #0075de, Canvas #f6f5f4, min-h-[56px]) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
          <div className="flex items-center gap-2 p-1 bg-neutral-200/60 rounded-xl">
            <button
              onClick={() => setActiveTab('booking')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold min-h-[56px] transition-all ${
                activeTab === 'booking'
                  ? 'bg-[#0075de] text-white shadow-md'
                  : 'bg-transparent text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/80'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Freight Booking Wizard</span>
            </button>

            <button
              onClick={() => setActiveTab('tracker')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold min-h-[56px] transition-all ${
                activeTab === 'tracker'
                  ? 'bg-[#0075de] text-white shadow-md'
                  : 'bg-transparent text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/80'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Corridor Shipments Tracker</span>
              <span
                className={`ml-1 text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  activeTab === 'tracker'
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-300 text-neutral-800'
                }`}
              >
                {loads.length}
              </span>
            </button>
          </div>

          {/* Quick Metrics Capsule */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-mono text-neutral-600">
            <div className="px-3 py-2 bg-white rounded-lg border border-neutral-200 shadow-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Open Bids: <strong>{openBidsCount}</strong></span>
            </div>
            <div className="px-3 py-2 bg-white rounded-lg border border-neutral-200 shadow-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>In Transit: <strong>{activeShipmentsCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Tab 1: AI Booking Wizard */}
        {activeTab === 'booking' && (
          <div className="space-y-6">
            <AIBookingWizard
              initialOrigin="Mumbai JNPT Port"
              initialDestination="Ahmedabad Changodar Hub"
              initialTruckType="19ft"
              initialWeightKg={12000}
              onBookingSubmitted={handleBookingSubmitted}
            />
          </div>
        )}

        {/* Tab 2: Corridor Shipments Tracker */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            <ShipmentsTrackerTable
              loads={loads}
              loading={loading}
              onRefresh={fetchLoads}
              onViewInvoice={handleViewInvoice}
              onCancelLoad={handleCancelLoad}
            />
          </div>
        )}
      </main>

      {/* Statutory GST Tax Invoice Modal (SAC 9965) */}
      <GSTTaxInvoiceModal
        invoice={selectedInvoice}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </div>
  );
}
