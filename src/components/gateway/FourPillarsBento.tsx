'use client';

import React from 'react';
import { RefreshCw, HeartPulse, FileCheck2, Scale, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function FourPillarsBento() {
  return (
    <section className="py-20 px-6 sm:px-12 bg-[#090d16] text-white">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono uppercase tracking-wider">
            Architecture Matrix
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            4 Pillars of the Western Freight Corridor
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Engineered specifically for the high-density Mumbai JNPT to Ahmedabad industrial spine.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {/* Pillar 1: Dead Mileage Elimination */}
          <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 to-slate-900/60 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />
                </div>
                <span className="text-xs font-mono text-emerald-400 font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Pillar 01
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Dead Mileage Elimination &amp; Backhaul Matching
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                National highways average 42% empty running. SafeFreight OS algorithms predict corridor demand at Bhiwandi, Vapi, Surat, and Changodar, dynamically matching return freight to slash empty deadhead miles by up to 34%.
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  <div className="text-lg font-bold text-emerald-400">₹92/L</div>
                  <div className="text-[11px] text-slate-500">Fuel Index Savings</div>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  <div className="text-lg font-bold text-cyan-400">2.68 kg</div>
                  <div className="text-[11px] text-slate-500">CO₂ Avoided / Litre</div>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  <div className="text-lg font-bold text-blue-400">₹4.50/km</div>
                  <div className="text-[11px] text-slate-500">Wear &amp; Tear Saved</div>
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Algorithmic Backhaul Matching</span>
              <Link href="/shipper" className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1">
                Post Backhaul Load <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Pillar 2: Golden Hour Telematics */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-900/60 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <HeartPulse className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-xs font-mono text-rose-400 font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                  Pillar 02
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Golden Hour AIS-140 Telematics
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Multi-axial vector classifier distinguishes potholes (2.2G) and phone drops (3.2G) from genuine high-impact collisions (&ge;4.0G). Initiates 30s emergency countdown and automated 112 ERSS dispatch.
              </p>
              <div className="bg-rose-950/30 p-3.5 rounded-lg border border-rose-900/40 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-300 font-medium">T0 Impact &rarr; T1 Dispatch &rarr; T2 Arrival</span>
                  <span className="text-rose-400 font-bold font-mono">&lt; 15 mins</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-rose-500 to-amber-500 h-full w-3/4"></div>
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">AIS-140 &amp; MORTH Compliant</span>
              <Link href="/admin" className="text-xs text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1">
                View Incident Monitor <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Pillar 3: Statutory Digital Logistics */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-900/60 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-blue-400 font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                  Pillar 03
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Statutory Digital Logistics &amp; e-Bilti
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Carriage by Road Act 2007 compliant digital Lorry Receipts (LR). Real-time 15-char GSTIN verification, 12-digit e-Way bill distance validity tracking (1 day per 200 km), and SAC 9965 tax invoice generation.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  Rule 54(3) CGST Consignment
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  High-Contrast QR Verification
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">SAC 9965 GTA Invoicing</span>
              <Link href="/shipper" className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1">
                Generate Tax Invoice <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Pillar 4: Real-time Trip Khata */}
          <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 to-slate-900/60 p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Scale className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-amber-400 font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  Pillar 04
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Real-Time Trip Khata &amp; Instant Reconciliation
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Zero friction between fleet owner, driver, and shipper. Immutable audit trail balances gross freight against diesel card advances, toll allowances, and driver bhatta. Mathematical proof: Balance Due = Gross Freight &minus; Total Disbursed Advances.
              </p>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Gross Corridor Freight (525 km):</span>
                  <span className="text-white font-bold">₹42,000</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Disbursed Advances (Diesel + FASTag + Bhatta):</span>
                  <span>&minus; ₹18,500</span>
                </div>
                <div className="flex justify-between text-emerald-400 pt-1 border-t border-slate-800 font-semibold">
                  <span>Instant POD Settlement Balance:</span>
                  <span>₹23,500 (100% Reconciled)</span>
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Immutable Double-Entry Ledger</span>
              <Link href="/admin" className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1">
                Open Khata Ledger <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
