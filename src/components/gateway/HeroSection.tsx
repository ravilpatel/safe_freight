'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Calculator, ShieldCheck, Zap, Database } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white pt-16 pb-20 px-6 sm:px-12 border-b border-slate-800">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} 
      />

      <div className="relative max-w-6xl mx-auto text-center space-y-8">
        {/* Compliance and Certification Tags */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> AIS-140 Certified
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-blue-300 font-medium">NH 48 Western Spine (Mumbai–Surat–Ahmedabad)</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-amber-400 font-medium">
            <Database className="w-3.5 h-3.5" /> Viksit Bharat 2047 Target
          </span>
        </div>

        {/* Primary Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Western Freight Corridor <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Operating System
            </span>
          </h1>
          <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-slate-300 font-normal leading-relaxed">
            Eliminating empty deadhead miles, accelerating sub-15m Golden Hour trauma dispatch,
            and automating statutory digital e-Bilti &amp; GST Rule 54(3) compliance along the 525 km spine.
          </p>
        </div>

        {/* High-Impact Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/shipper"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.02]"
          >
            <span>Launch Shipper Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-semibold text-sm transition-all hover:scale-[1.02]"
          >
            <span>Fleet Admin Console</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </Link>

          <Link
            href="/driver"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600/90 border border-emerald-600 text-white font-semibold text-sm transition-all hover:scale-[1.02]"
          >
            <span>Driver PWA Console</span>
          </Link>

          <a
            href="#public-cost-estimator"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-semibold text-sm transition-all"
          >
            <Calculator className="w-4 h-4" />
            <span>Instant Rate Estimator</span>
          </a>
        </div>

        {/* Quick Corridor Performance Counters */}
        <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-800/80 text-left">
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div className="text-2xl font-bold text-emerald-400">-34%</div>
            <div className="text-xs text-slate-400 font-medium">Corridor Dead Mileage</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div className="text-2xl font-bold text-cyan-400">&lt; 15 mins</div>
            <div className="text-xs text-slate-400 font-medium">Golden Hour Dispatch SLA</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div className="text-2xl font-bold text-amber-400">100%</div>
            <div className="text-xs text-slate-400 font-medium">Digital e-Bilti &amp; GST 54(3)</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div className="text-2xl font-bold text-blue-400">₹0 Disputed</div>
            <div className="text-xs text-slate-400 font-medium">Trip Khata Instant Settlement</div>
          </div>
        </div>
      </div>
    </section>
  );
}
