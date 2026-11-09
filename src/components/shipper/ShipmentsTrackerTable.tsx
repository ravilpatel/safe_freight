'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  Truck,
  Phone,
  FileText,
  Ban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Load } from '@/types/database';
import { formatINR } from '@/lib/algorithms/statutory';

interface ShipmentsTrackerTableProps {
  loads: Load[];
  loading: boolean;
  onRefresh: () => void;
  onViewInvoice: (load: Load) => void;
  onCancelLoad: (loadId: string, reason?: string) => Promise<boolean>;
}

type FilterTab = 'all' | 'open' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';

export default function ShipmentsTrackerTable({
  loads,
  loading,
  onRefresh,
  onViewInvoice,
  onCancelLoad,
}: ShipmentsTrackerTableProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelModalLoad, setCancelModalLoad] = useState<Load | null>(null);
  const [cancelReason, setCancelReason] = useState('Production schedule adjustment');
  const [actionError, setActionError] = useState<string | null>(null);

  const getStatusBadge = (status: Load['status']) => {
    switch (status) {
      case 'open':
      case 'posted':
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Open · Bidding Active
          </span>
        );
      case 'matched':
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Truck className="w-3 h-3 text-blue-600" />
            Truck Dispatched
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <Clock className="w-3 h-3 text-purple-600" />
            In Transit (NH 48)
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Delivered · Closed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
            <Ban className="w-3 h-3 text-neutral-400" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-700">
            {status}
          </span>
        );
    }
  };

  const filteredLoads = loads.filter((load) => {
    // Tab filter
    if (activeTab === 'open' && load.status !== 'open' && load.status !== 'posted' && load.status !== 'draft') {
      return false;
    }
    if (activeTab === 'assigned' && load.status !== 'matched' && load.status !== 'assigned') {
      return false;
    }
    if (activeTab === 'in_transit' && load.status !== 'in_transit') {
      return false;
    }
    if (activeTab === 'delivered' && load.status !== 'delivered') {
      return false;
    }
    if (activeTab === 'cancelled' && load.status !== 'cancelled') {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchOrigin = load.origin_name?.toLowerCase().includes(q);
      const matchDest = load.destination_name?.toLowerCase().includes(q);
      const matchId = load.id?.toLowerCase().includes(q);
      const matchConsignee = load.consignee_name?.toLowerCase().includes(q);
      return matchOrigin || matchDest || matchId || matchConsignee;
    }

    return true;
  });

  const handleConfirmCancel = async () => {
    if (!cancelModalLoad) return;
    setCancellingId(cancelModalLoad.id);
    setActionError(null);
    try {
      const success = await onCancelLoad(cancelModalLoad.id, cancelReason);
      if (success) {
        setCancelModalLoad(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden space-y-4">
      {/* Top Header & Filters */}
      <div className="p-6 pb-2 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-neutral-900 tracking-tight">
              Active &amp; Past Shipments Tracker
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
              {loads.length} Records
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Real-time status updates along the Western Freight Corridor (Mumbai–Surat–Ahmedabad).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search route, ID, consignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-lg border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-blue-500 w-52 sm:w-64"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors"
            title="Refresh shipments table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 flex flex-wrap gap-2 text-xs font-medium border-b border-neutral-100 pb-3">
        {[
          { id: 'all', label: 'All Shipments' },
          { id: 'open', label: 'Open · Bidding' },
          { id: 'assigned', label: 'Truck Dispatched' },
          { id: 'in_transit', label: 'In Transit' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FilterTab)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Shipments Table */}
      <div className="overflow-x-auto">
        {filteredLoads.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 space-y-2">
            <Truck className="w-8 h-8 mx-auto text-neutral-300" />
            <div className="text-xs font-medium">No shipments found for this filter.</div>
            <div className="text-[11px] text-neutral-400">Post a new freight load using the wizard above.</div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-6">Tracking ID &amp; Route</th>
                <th className="py-3 px-4">Vehicle &amp; Cargo</th>
                <th className="py-3 px-4">Schedule &amp; Driver</th>
                <th className="py-3 px-4 text-right">Freight Value</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-sans">
              {filteredLoads.map((load) => {
                const canCancel =
                  load.status === 'open' ||
                  load.status === 'posted' ||
                  load.status === 'draft' ||
                  load.status === 'matched' ||
                  load.status === 'assigned';

                return (
                  <tr key={load.id} className="hover:bg-neutral-50/70 transition-colors">
                    {/* Route Column */}
                    <td className="py-4 px-6">
                      <div className="font-mono text-[10px] text-neutral-400 mb-0.5">
                        REF: {load.id.substring(0, 8)}...
                      </div>
                      <div className="font-semibold text-neutral-900 text-xs">
                        {load.origin_name} &rarr; {load.destination_name}
                      </div>
                      {load.distance_km && (
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {load.distance_km} km corridor leg
                        </div>
                      )}
                    </td>

                    {/* Cargo & Truck Column */}
                    <td className="py-4 px-4">
                      <div className="font-medium text-neutral-800">
                        {load.truck_type || 'Shared LTL'}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {(load.weight_kg / 1000).toFixed(1)} MT ({load.weight_kg.toLocaleString('en-IN')} kg)
                      </div>
                      {load.cargo_category && (
                        <div className="text-[10px] text-blue-600 uppercase font-mono">
                          {load.cargo_category.replace('_', ' ')}
                        </div>
                      )}
                    </td>

                    {/* Schedule & Driver Column */}
                    <td className="py-4 px-4 font-mono text-[11px]">
                      <div>{load.scheduled_date || 'Immediate Today'}</div>
                      <div className="text-[10px] text-neutral-400">{load.scheduled_slot || 'Standard Slot'}</div>
                      {load.matched_driver_id ? (
                        <div className="pt-1 flex items-center gap-1.5 text-emerald-700">
                          <a
                            href="tel:+919825099999"
                            className="inline-flex items-center gap-1 text-[11px] hover:underline"
                            title="Call commercial driver"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Driver Assigned</span>
                          </a>
                        </div>
                      ) : (
                        <div className="text-[10px] text-neutral-400 italic">Matching drivers...</div>
                      )}
                    </td>

                    {/* Freight Value Column */}
                    <td className="py-4 px-4 text-right font-mono">
                      <div className="font-bold text-neutral-900 text-xs">
                        {formatINR(load.pricing_inr)}
                      </div>
                      <div className="text-[10px] text-neutral-400">Includes 5% GST</div>
                      {load.bid_bonus_inr && load.bid_bonus_inr > 0 ? (
                        <div className="text-[10px] text-blue-600 font-semibold">
                          +{formatINR(load.bid_bonus_inr)} bonus
                        </div>
                      ) : null}
                    </td>

                    {/* Status Column */}
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(load.status)}
                    </td>

                    {/* Actions Column */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1-Click GST Invoice Generator */}
                        <button
                          onClick={() => onViewInvoice(load)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-medium transition-colors"
                          title="Generate official SAC 9965 GST Tax Invoice"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tax Invoice</span>
                        </button>

                        {/* Load Cancellation Button */}
                        {canCancel ? (
                          <button
                            onClick={() => {
                              setActionError(null);
                              setCancelModalLoad(load);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-medium transition-colors"
                            title="Cancel load request and release hold"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        ) : (
                          <span
                            className="text-[10px] text-neutral-400 cursor-not-allowed italic"
                            title={
                              load.status === 'in_transit'
                                ? 'Load in transit cannot be cancelled'
                                : load.status === 'delivered'
                                  ? 'Delivered shipment is completed'
                                  : 'Cancellation unavailable'
                            }
                          >
                            {load.status === 'in_transit' ? 'Locked (In Transit)' : 'Closed'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModalLoad && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Cancel Freight Booking Request?
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Load Ref: <span className="font-mono text-neutral-800">{cancelModalLoad.id.substring(0, 8)}...</span>
                </p>
                <p className="text-xs text-neutral-600 mt-1">
                  Route: {cancelModalLoad.origin_name} &rarr; {cancelModalLoad.destination_name}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {actionError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-700">
                Reason for Cancellation (Logged in Audit Trail):
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-blue-500"
              >
                <option value="Production schedule adjustment">Production schedule adjustment</option>
                <option value="Warehouse dock capacity unavailable">Warehouse dock capacity unavailable</option>
                <option value="Consignee requested delivery postponement">Consignee requested delivery postponement</option>
                <option value="Duplicate booking entry">Duplicate booking entry</option>
                <option value="Other statutory or commercial change">Other statutory or commercial change</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setCancelModalLoad(null)}
                className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 text-xs font-semibold hover:bg-neutral-50"
              >
                Keep Booking
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancellingId !== null}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                {cancellingId !== null ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
