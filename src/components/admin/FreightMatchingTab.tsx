'use client';

import React, { useState } from 'react';
import {
  Package,
  ArrowRight,
  Search,
  CheckCircle2,
  TrendingUp,
  Truck,
  Send,
  AlertCircle,
} from 'lucide-react';
import { OpenShipperLoadItem, DriverRosterItem } from './types';

interface FreightMatchingTabProps {
  loads: OpenShipperLoadItem[];
  drivers: DriverRosterItem[];
  onDispatchLoad: (_loadId: string, _driverId: string) => Promise<void>;
}

export function FreightMatchingTab({
  loads,
  drivers,
  onDispatchLoad,
}: FreightMatchingTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loadTypeFilter, setLoadTypeFilter] = useState<'all' | 'LTL' | 'FTL'>('all');
  const [selectedLoadForDispatch, setSelectedLoadForDispatch] = useState<OpenShipperLoadItem | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [dispatching, setDispatching] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const availableDrivers = drivers.filter((d) => d.status === 'idle');

  const filteredLoads = loads.filter((load) => {
    const matchesSearch =
      load.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.cargoCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.shipperName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      loadTypeFilter === 'all' || load.loadType === loadTypeFilter;

    return matchesSearch && matchesType;
  });

  const handleOpenDispatchModal = (load: OpenShipperLoadItem) => {
    setSelectedLoadForDispatch(load);
    setSelectedDriverId(availableDrivers[0]?.id || '');
    setFeedbackMsg(null);
  };

  const handleConfirmDispatch = async () => {
    if (!selectedLoadForDispatch || !selectedDriverId) return;

    setDispatching(true);
    setFeedbackMsg(null);
    try {
      await onDispatchLoad(selectedLoadForDispatch.id, selectedDriverId);
      setFeedbackMsg({
        type: 'success',
        text: `Load successfully dispatched to driver! Trip created with LR Number generated.`,
      });
      setTimeout(() => {
        setSelectedLoadForDispatch(null);
      }, 1500);
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to dispatch load',
      });
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 tracking-tight">
              Freight Requests & Return Backhaul Load Matching
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Live shipper freight demands along NH 48 corridor ranked by algorithmic profitability score.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hub, commodity, shipper..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white"
              />
            </div>

            {/* Filter Toggle */}
            <div className="inline-flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-50 text-xs font-medium">
              {(['all', 'LTL', 'FTL'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLoadTypeFilter(type)}
                  className={`px-3 py-1 rounded-md capitalize transition ${
                    loadTypeFilter === type
                      ? 'bg-white text-neutral-900 font-bold shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {type === 'all' ? 'All Loads' : type === 'LTL' ? 'Part Load (LTL)' : 'Full Truck (FTL)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLoads.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-[#e6e6e6] p-12 text-center text-neutral-400">
            <Package className="w-10 h-10 mx-auto text-neutral-300 mb-2 stroke-1" />
            <p className="text-sm font-medium text-neutral-600">No open freight loads matching your filter.</p>
            <p className="text-xs text-neutral-400 mt-1">Shipper demand updates in real-time along Western Corridor.</p>
          </div>
        ) : (
          filteredLoads.map((load) => (
            <div
              key={load.id}
              className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs hover:border-neutral-400 transition flex flex-col justify-between"
            >
              <div>
                {/* Header Badge Strip */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      load.loadType === 'FTL'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {load.loadType === 'FTL' ? 'Full Truckload (FTL)' : 'Part Load (LTL)'}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    Score {load.profitScore}
                  </span>
                </div>

                {/* Corridor Origin -> Destination */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                    <span className="truncate">{load.origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">{load.destination}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-medium">
                    <span>{load.distanceKm} km transit</span>
                    <span>·</span>
                    <span className="text-amber-700 font-medium">+{load.detourKm} km detour</span>
                  </div>
                </div>

                {/* Cargo Details */}
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100 space-y-1.5 mb-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Commodity:</span>
                    <span className="font-semibold text-neutral-800">{load.cargoCategory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Weight & Vol:</span>
                    <span className="font-semibold text-neutral-800">
                      {(load.weightKg / 1000).toFixed(1)} MT ({load.volumeCft} cft)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Shipper:</span>
                    <span className="font-medium text-neutral-700 truncate max-w-[150px]">
                      {load.shipperName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing & Dispatch Action */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-neutral-400">
                    Gross Freight
                  </span>
                  <span className="text-base font-extrabold text-neutral-900">
                    ₹{load.freightRateINR.toLocaleString('en-IN')}
                  </span>
                </div>

                {load.status === 'matched' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Dispatched
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenDispatchModal(load)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-xs"
                  >
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Assign & Dispatch</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Driver Assignment & Dispatch Modal */}
      {selectedLoadForDispatch && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-md w-full shadow-xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Assign Truck & Dispatch Load
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Route: {selectedLoadForDispatch.origin} → {selectedLoadForDispatch.destination}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLoadForDispatch(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {feedbackMsg && (
              <div
                className={`p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Select Available Driver & Gaadi
                </label>
                {availableDrivers.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    All fleet drivers are currently on trip. You can invite a new driver or wait for an idle vehicle.
                  </div>
                ) : (
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                  >
                    {availableDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.vehicleNumber} · {driver.model})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100 text-xs space-y-1">
                <div className="flex justify-between text-neutral-600">
                  <span>Gross Agreed Freight:</span>
                  <span className="font-bold text-neutral-900">
                    ₹{selectedLoadForDispatch.freightRateINR.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Corridor Transit:</span>
                  <span className="font-medium text-neutral-800">
                    {selectedLoadForDispatch.distanceKm} km (detour +{selectedLoadForDispatch.detourKm} km)
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Payload:</span>
                  <span className="font-medium text-neutral-800">
                    {(selectedLoadForDispatch.weightKg / 1000).toFixed(1)} MT
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setSelectedLoadForDispatch(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={dispatching || availableDrivers.length === 0 || !selectedDriverId}
                onClick={handleConfirmDispatch}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition disabled:opacity-50 shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>{dispatching ? 'Dispatching...' : 'Confirm Dispatch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
