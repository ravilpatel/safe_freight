'use client';

import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Truck, Clock } from 'lucide-react';

export default function CorridorStatusBar() {
  const [activeVehicles, setActiveVehicles] = useState(1428);
  const [pingsPerSec, setPingsPerSec] = useState(146);

  useEffect(() => {
    const timer = setInterval(() => {
      // Natural subtle telemetry fluctuation
      setActiveVehicles((prev) => prev + (Math.random() > 0.5 ? 1 : -1));
      setPingsPerSec((prev) => Math.floor(140 + Math.random() * 15));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-[#0f172a] text-slate-200 border-b border-slate-800 text-xs px-4 py-2 font-mono">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Live Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-emerald-400 tracking-wide uppercase">
              NH 48 Freight Spine Live
            </span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">Mumbai JNPT → Changodar Ahmedabad (525 km)</span>
        </div>

        {/* Telematics Metrics */}
        <div className="flex items-center gap-5 text-slate-300">
          <div className="flex items-center gap-1.5" title="Active Commercial Vehicles along corridor">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-white font-semibold">{activeVehicles.toLocaleString('en-IN')}</span>
            <span className="text-slate-400 text-[11px]">Active Trucks</span>
          </div>

          <div className="flex items-center gap-1.5" title="AIS-140 Telematics Server Sync">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-white font-semibold">{pingsPerSec}</span>
            <span className="text-slate-400 text-[11px]">pings/s</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5" title="AIS-140 Trauma Dispatch Protocol">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">AIS-140 Ready</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5" title="Golden Hour trauma dispatch SLA">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">&lt;15m Golden Hour</span>
          </div>
        </div>
      </div>
    </div>
  );
}
