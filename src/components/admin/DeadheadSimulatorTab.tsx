'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Fuel,
  IndianRupee,
  Gauge,
  Leaf,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { calculateDeadMileageSavings } from '@/lib/algorithms/deadMileage';

export function DeadheadSimulatorTab() {
  const [emptyKmAvoided, setEmptyKmAvoided] = useState<number>(350);

  // Clamped between 0 and 1000 km
  const clampedKm = Math.min(Math.max(0, isNaN(emptyKmAvoided) ? 0 : emptyKmAvoided), 1000);

  // Total corridor trip reference: 1000 km total, loaded = total - emptyKmAvoided
  const savings = calculateDeadMileageSavings(1000, 1000 - clampedKm);

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 tracking-tight">
              Interactive Corridor Deadhead Reduction Simulator
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Simulate cash flow, diesel recapture, FASTag toll mitigation, and carbon abatement by converting empty backhauls into loaded freight.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEmptyKmAvoided(350)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Baseline (350 km)</span>
          </button>
        </div>
      </div>

      {/* Simulator Control Card */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] p-6 shadow-xs space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Avoided Empty Mileage Slider (Corridor Backhaul)
            </label>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-neutral-900 font-mono">
                {clampedKm}
              </span>
              <span className="text-xs text-neutral-500 font-semibold">km empty avoided</span>
            </div>
          </div>

          {/* Range Slider */}
          <input
            type="range"
            min="0"
            max="1000"
            step="10"
            value={clampedKm}
            onChange={(e) => setEmptyKmAvoided(parseInt(e.target.value, 10))}
            className="w-full h-2.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900 focus:outline-none"
          />

          <div className="flex justify-between text-[11px] text-neutral-400 mt-1.5 font-medium">
            <span>0 km (No Reduction)</span>
            <span>250 km (Single Leg)</span>
            <span>500 km (Roundtrip Spine)</span>
            <span>750 km</span>
            <span>1,000 km (Full Multi-Drop)</span>
          </div>
        </div>

        {/* 6 Simulation Outcome Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {/* Total Capital Recaptured */}
          <div className="bg-emerald-50/60 rounded-xl border border-emerald-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-emerald-800 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Total Capital Recaptured
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-900 tracking-tight">
              ₹{savings.totalMoneySavedINR.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-emerald-700 mt-1.5 font-medium">
              Net operating profit increase across fleet
            </p>
          </div>

          {/* Diesel Cost Saved */}
          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Diesel Cost Saved
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Fuel className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">
              ₹{savings.fuelCostSavedINR.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1.5 font-medium">
              {savings.fuelSavedLiters} Liters @ ₹92.00/L (3.8 km/L)
            </p>
          </div>

          {/* Wear & Tear Saved */}
          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Wear & Tear Amortization
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Gauge className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">
              ₹{savings.wearTearSavedINR.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1.5 font-medium">
              Tyres, brakes & lubricants @ ₹4.50/km
            </p>
          </div>

          {/* FASTag Tolls Saved */}
          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                FASTag Tolls Recaptured
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">
              ₹{savings.tollSavedINR.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1.5 font-medium">
              Highway toll rate @ ₹2.20/km
            </p>
          </div>

          {/* CO2 Emissions Abated */}
          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                CO₂ Emissions Abated
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Leaf className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">
              {savings.co2SavedKg} kg
            </div>
            <p className="text-[11px] text-neutral-500 mt-1.5 font-medium">
              Carbon footprint factor: 2.68 kg CO₂/L
            </p>
          </div>

          {/* Efficiency Index */}
          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Backhaul Utilization
              </span>
              <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">
              {Math.min(100, Math.round((clampedKm / 1000) * 100))}%
            </div>
            <p className="text-[11px] text-neutral-500 mt-1.5 font-medium">
              Spine load factor improvement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
