'use client';

import React, { useState } from 'react';
import { Target, TrendingDown, Clock, ShieldCheck } from 'lucide-react';

export default function ViksitBharatComparison() {
  const [viewMode, setViewMode] = useState<'target2047' | 'current2026'>('target2047');

  const benchmarks = [
    {
      metric: 'National Logistics Cost (% of GDP)',
      current: '14.0% of GDP',
      safeFreight: '8.8% of GDP',
      global: '7.8% (US / Germany benchmark)',
      impact: 'Reduces consumer retail pricing by 4.2% across Western India',
      icon: TrendingDown,
    },
    {
      metric: 'Corridor Empty Deadhead Ratio',
      current: '42% Empty Running',
      safeFreight: '18% with Algorithmic Backhauls',
      global: '22% Global Corridor Average',
      impact: 'Avoids 34% of unladen truck journeys, saving ₹92/L diesel and wear',
      icon: Target,
    },
    {
      metric: 'Highway Trauma Golden Hour Response',
      current: '54 mins Average Trauma Window',
      safeFreight: '&lt; 15 mins (T0 &rarr; T1 &rarr; T2 ERSS)',
      global: '12 mins (EU eCall Standard)',
      impact: 'Reduces preventable highway trauma fatalities by up to 68%',
      icon: Clock,
    },
    {
      metric: 'Statutory Documentation & GST Compliance',
      current: '65% Physical Paper Bilti / Unorganized',
      safeFreight: '100% Digital e-Bilti QR & GST Rule 54(3)',
      global: '100% Digital Waybill (e-CMR)',
      impact: 'Eliminates roadside RTO checkpost extortion and dispute friction',
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="py-20 px-6 sm:px-12 bg-[#090d16] text-white">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono uppercase tracking-wider">
              National Logistics Policy (NLP 2022) Alignment
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Viksit Bharat 2047 Logistics Benchmark
            </h2>
            <p className="text-sm text-slate-400">
              Transforming Western India&apos;s logistics spine to global competitiveness.
            </p>
          </div>

          <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setViewMode('target2047')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'target2047'
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SafeFreight OS vs National Average
            </button>
            <button
              onClick={() => setViewMode('current2026')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'current2026'
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Global Best Practices Comparison
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {benchmarks.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-sm text-white">{item.metric}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] text-slate-500 mb-1">
                      {viewMode === 'target2047' ? 'India National Status Quo' : 'SafeFreight Target'}
                    </div>
                    <div className="text-base font-bold text-rose-400">
                      {viewMode === 'target2047' ? item.current : item.safeFreight}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[11px] text-slate-500 mb-1">
                      {viewMode === 'target2047' ? 'SafeFreight Corridor Impact' : 'Global Frontier (US / EU)'}
                    </div>
                    <div className="text-base font-bold text-emerald-400">
                      {viewMode === 'target2047' ? item.safeFreight : item.global}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                  <strong className="text-slate-300">Economic Value:</strong> {item.impact}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
