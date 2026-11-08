'use client';

import React from 'react';

export default function ShipperDashboardPage() {
  return (
    <div className="min-h-screen bg-[#f6f5f4] text-[#191919]">
      <header className="border-b border-neutral-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">SafeFreight OS · Shipper Enterprise</h1>
          <p className="text-xs text-neutral-500">Logistics Forwarding & Dispatch Console</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Tenant Isolated · Shipper
          </span>
          <button
            onClick={() => {
              document.cookie = 'safefreight-token=; path=/; max-age=0';
              window.location.href = '/login';
            }}
            className="text-xs text-neutral-600 hover:text-neutral-900"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-2">Shipper Freight Management</h2>
          <p className="text-xs text-neutral-500">
            Post FTL/LTL loads across Mumbai–Surat–Ahmedabad NH 48 corridor with 5% GST calculation.
          </p>
        </div>
      </main>
    </div>
  );
}
