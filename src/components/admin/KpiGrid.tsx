'use client';

import React from 'react';
import { Truck, Percent, IndianRupee, AlertTriangle, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { FleetKpiSummary } from './types';

interface KpiGridProps {
  kpis: FleetKpiSummary;
  onNavigateTab?: (_tab: 'roster' | 'deadhead' | 'alerts' | 'golden_hour') => void;
}

export function KpiGrid({ kpis, onNavigateTab }: KpiGridProps) {
  const formatINR = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Active Fleet Assets */}
      <div
        onClick={() => onNavigateTab?.('roster')}
        className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs hover:border-neutral-400 transition cursor-pointer group"
      >
        <div className="flex items-center justify-between text-neutral-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
            Active Fleet Assets
          </span>
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-100 transition">
            <Truck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-900 tracking-tight">
            {kpis.activeAssets}
          </span>
          <span className="text-xs text-neutral-500 font-medium">vehicles live</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
          <span className="inline-flex items-center text-emerald-600">
            <ArrowUpRight className="w-3 h-3" />
            100% AIS-140 GPS
          </span>
          <span className="text-neutral-300">·</span>
          <span className="text-neutral-500">NH 48 Western Spine</span>
        </div>
      </div>

      {/* 2. Deadhead Reduction % */}
      <div
        onClick={() => onNavigateTab?.('deadhead')}
        className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs hover:border-neutral-400 transition cursor-pointer group"
      >
        <div className="flex items-center justify-between text-neutral-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
            Deadhead Slashed
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-700 tracking-tight">
            {kpis.deadheadReductionPct > 0 ? `${kpis.deadheadReductionPct}%` : '0.0%'}
          </span>
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            Corridor Optimized
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
          <span>{`${kpis.co2SavedKg || 0} kg CO₂ abated`}</span>
        </div>
      </div>

      {/* 3. Fuel Cost Saved */}
      <div
        onClick={() => onNavigateTab?.('deadhead')}
        className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs hover:border-neutral-400 transition cursor-pointer group"
      >
        <div className="flex items-center justify-between text-neutral-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
            Fuel Cost Saved
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-900 tracking-tight">
            {formatINR(kpis.fuelSavedINR || 0)}
          </span>
          <span className="text-xs text-neutral-500 font-medium">diesel cut</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
          <span className="text-emerald-700 font-semibold">
            {formatINR(kpis.totalMoneySavedINR || 0)}
          </span>
          <span className="text-neutral-400">total capital recaptured</span>
        </div>
      </div>

      {/* 4. Active Alerts Count */}
      <div
        onClick={() => onNavigateTab?.(kpis.activeAlertsCount > 0 ? 'alerts' : 'golden_hour')}
        className={`bg-white rounded-xl border p-5 shadow-xs hover:border-neutral-400 transition cursor-pointer group ${
          kpis.activeAlertsCount > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-[#e6e6e6]'
        }`}
      >
        <div className="flex items-center justify-between text-neutral-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
            Active Alerts
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
              kpis.activeAlertsCount > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {kpis.activeAlertsCount > 0 ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
            )}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold tracking-tight ${
              kpis.activeAlertsCount > 0 ? 'text-amber-800' : 'text-neutral-900'
            }`}
          >
            {kpis.activeAlertsCount}
          </span>
          <span className="text-xs text-neutral-500 font-medium">
            {kpis.activeAlertsCount === 1 ? 'incident requiring action' : 'incidents requiring action'}
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium">
          {kpis.activeAlertsCount > 0 ? (
            <span className="text-amber-700 font-semibold">
              Detours & Golden Hour monitors active
            </span>
          ) : (
            <span className="text-emerald-700">All corridor assets within safety geofence</span>
          )}
        </div>
      </div>
    </div>
  );
}
