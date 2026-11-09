'use client';

import React from 'react';
import {
  ShieldCheck,
  UserPlus,
  CalendarPlus,
  LogOut,
  Truck,
} from 'lucide-react';

interface OperationsHeaderProps {
  fleetName?: string;
  corridorName?: string;
  onOpenInviteModal: () => void;
  onOpenScheduleModal: () => void;
  onSignOut: () => void;
}

export function OperationsHeader({
  fleetName = 'Western India Fleet Logistics (WIFL)',
  corridorName = 'NH 48 Western Freight Spine (JNPT ⇄ Changodar)',
  onOpenInviteModal,
  onOpenScheduleModal,
  onSignOut,
}: OperationsHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#e6e6e6] px-6 py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Fleet Identity (F16) */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white shadow-xs">
            <Truck className="w-5 h-5 text-emerald-400 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
                {fleetName}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                Tenant Isolated
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
              <span>{corridorName}</span>
              <span className="text-neutral-300">·</span>
              {/* Pulsing Sync Beacon */}
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Telematics Sync: Active (AIS-140 Live)
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & User Session */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenInviteModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Driver</span>
          </button>

          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50 transition shadow-xs"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-neutral-600" />
            <span>Advance Trip</span>
          </button>

          <div className="h-6 w-px bg-neutral-200 mx-1" />

          <button
            type="button"
            onClick={onSignOut}
            title="Sign Out of SafeFreight OS"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
