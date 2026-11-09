'use client';

import React from 'react';
import { Building2, ShieldCheck, LogOut, PackageCheck, Truck, Clock } from 'lucide-react';

interface ShipperHeaderProps {
  tenantName?: string;
  tenantId?: string;
  totalLoadsCount?: number;
  inTransitCount?: number;
  onSignOut: () => void;
}

export default function ShipperHeader({
  tenantName = 'Enterprise Consignor & Shipper',
  tenantId = 'org-enterprise-tenant',
  totalLoadsCount = 0,
  inTransitCount = 0,
  onSignOut,
}: ShipperHeaderProps) {
  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-40 px-6 sm:px-10 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Organization Brand & Tenant Badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-neutral-900 tracking-tight">
                {tenantName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="w-3 h-3" /> Shipper Portal
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-mono">
              Tenant ID: <span className="text-neutral-700">{tenantId}</span> · Western Spine Freight Forwarding
            </p>
          </div>
        </div>

        {/* Live Metrics & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center gap-1.5 text-neutral-700">
              <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Total Loads: <strong>{totalLoadsCount}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center gap-1.5 text-neutral-700">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>In Transit: <strong>{inTransitCount}</strong></span>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
            title="Sign out of shipper session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
