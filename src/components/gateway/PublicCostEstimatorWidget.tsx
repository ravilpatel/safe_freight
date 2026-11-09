'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calculator, ArrowRight, ShieldCheck, Tag, Info, Fuel, Landmark, Sparkles } from 'lucide-react';
import {
  CORRIDOR_HUBS,
  TRUCK_SPECIFICATIONS,
  calculateDynamicFreightQuote,
  DetailedFreightQuote,
} from '@/lib/algorithms/quoteEstimator';
import { formatINR } from '@/lib/algorithms/statutory';

export default function PublicCostEstimatorWidget() {
  const [origin, setOrigin] = useState('Mumbai JNPT Port');
  const [destination, setDestination] = useState('Ahmedabad Changodar Hub');
  const [truckType, setTruckType] = useState('19ft');
  const [weightKg, setWeightKg] = useState(6500);
  const [hasBackhaulDiscount, setHasBackhaulDiscount] = useState(true);
  const [quote, setQuote] = useState<DetailedFreightQuote | null>(null);
  const [loading, setLoading] = useState(false);

  // Recalculate quote on state change
  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      try {
        const result = calculateDynamicFreightQuote({
          origin,
          destination,
          truckType,
          weightKg,
          hasBackhaulDiscount,
        });
        setQuote(result);
      } catch (err) {
        console.error('Failed to compute quote', err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [origin, destination, truckType, weightKg, hasBackhaulDiscount]);

  return (
    <section id="public-cost-estimator" className="py-20 px-6 sm:px-12 bg-[#090d16] text-white border-b border-slate-800">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono uppercase tracking-wider">
            <Calculator className="w-3.5 h-3.5" />
            Unauthenticated Instant Estimator
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Transparent Corridor Freight Calculator
          </h2>
          <p className="text-sm text-slate-400">
            Real-time NH 48 pricing incorporating live diesel index, FASTag tolls, 5% GST (SAC 9965), and algorithmic backhaul discounts.
          </p>
        </div>

        {/* Calculator Main Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl">
          {/* Inputs Column */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Consignment &amp; Route Parameters
            </h3>

            {/* Origin & Destination Hubs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Origin Hub (Pickup)
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {CORRIDOR_HUBS.map((hub) => (
                    <option key={hub.id} value={hub.name}>
                      {hub.name} ({hub.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Destination Hub (Delivery)
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {CORRIDOR_HUBS.map((hub) => (
                    <option key={hub.id} value={hub.name}>
                      {hub.name} ({hub.state})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vehicle Type Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Vehicle Type &amp; Axle Configuration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Object.values(TRUCK_SPECIFICATIONS).map((spec) => (
                  <button
                    key={spec.type}
                    type="button"
                    onClick={() => {
                      setTruckType(spec.type);
                      setWeightKg(Math.min(weightKg, spec.capacityKg));
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      truckType === spec.type
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white truncate">{spec.type}</div>
                    <div className="text-[11px] text-slate-400 truncate">Max {spec.capacityTons} MT</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Weight Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <span className="font-medium text-slate-400">Cargo Weight Payload</span>
                <span className="font-mono text-cyan-400 font-semibold">
                  {weightKg.toLocaleString('en-IN')} kg ({(weightKg / 1000).toFixed(1)} MT)
                </span>
              </div>
              <input
                type="range"
                min="500"
                max={TRUCK_SPECIFICATIONS[truckType]?.capacityKg || 25000}
                step="250"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Backhaul Match Discount Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Apply Algorithmic Backhaul Discount</div>
                  <div className="text-[11px] text-slate-400">
                    Saves up to 12% by matching your cargo with empty returning fleet trucks
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hasBackhaulDiscount}
                onChange={(e) => setHasBackhaulDiscount(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Pricing Summary Output Column */}
          <div className="lg:col-span-5 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-mono text-slate-400">Corridor Freight Estimate</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> 0 DB Writes
                </span>
              </div>

              {quote && (
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Corridor Distance:</span>
                    <span className="font-mono font-medium text-white">{quote.distanceKm} km</span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span>Base Freight ({quote.truckName}):</span>
                    <span className="font-mono font-medium text-white">{formatINR(quote.baseFreightINR)}</span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-amber-400" /> Diesel Fuel Surcharge:
                    </span>
                    <span className="font-mono text-slate-200">{formatINR(quote.dieselSurchargeINR)}</span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span className="flex items-center gap-1">
                      <Landmark className="w-3 h-3 text-blue-400" /> FASTag Highway Tolls:
                    </span>
                    <span className="font-mono text-slate-200">{formatINR(quote.fastagTollINR)}</span>
                  </div>

                  {quote.backhaulDiscountINR > 0 && (
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Backhaul Match Discount (-12%):</span>
                      <span className="font-mono">- {formatINR(quote.backhaulDiscountINR)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                    <span>Taxable Value (SAC 9965):</span>
                    <span className="font-mono">{formatINR(quote.subTotalINR)}</span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>GST (5% GTA Forward Charge):</span>
                    <span className="font-mono">{formatINR(quote.gstINR)}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                    <div>
                      <div className="text-xs text-slate-400">Total Statutory Freight</div>
                      <div className="text-[10px] text-slate-500">Includes 5% GST · Tolls · Fuel</div>
                    </div>
                    <div className="text-2xl font-black font-mono text-cyan-400">
                      {formatINR(quote.totalQuoteINR)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-1">
                    <span>Rate / Ton-Km: <strong>₹{quote.ratePerTonKmINR}</strong></span>
                    <span>Rate / Km: <strong>₹{quote.ratePerKmINR}</strong></span>
                    <span>Transit: <strong>~{quote.estimatedTransitHours}h</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Booking CTA */}
            <div className="pt-2">
              <Link
                href={`/shipper?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&truckType=${encodeURIComponent(truckType)}&weightKg=${weightKg}`}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.01]"
              >
                <span>Book This Load on Shipper Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="text-center text-[11px] text-slate-500 mt-2">
                Requires authenticated shipper account · Tenant isolated RLS
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
