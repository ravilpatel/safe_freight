'use client';

import React from 'react';
import { Zap, Clock, TrendingUp, Info } from 'lucide-react';
import {
  calculateAcceptanceProbability,
  DispatchSpeedBand,
} from '@/lib/algorithms/acceptanceProbability';
import { formatINR } from '@/lib/algorithms/statutory';

interface AcceptanceSliderProps {
  basePriceINR: number;
  bonusAmountINR: number;
  onChangeBonus: (bonus: number) => void;
}

export default function AcceptanceSlider({
  basePriceINR,
  bonusAmountINR,
  onChangeBonus,
}: AcceptanceSliderProps) {
  const result = calculateAcceptanceProbability(bonusAmountINR, basePriceINR);
  const totalOfferINR = basePriceINR + bonusAmountINR;

  const getSpeedBandColor = (band: DispatchSpeedBand) => {
    switch (band) {
      case 'Instant (< 10 mins)':
        return 'text-emerald-700 bg-emerald-50 border-emerald-300';
      case '15 – 30 mins':
        return 'text-blue-700 bg-blue-50 border-blue-300';
      case '45 – 60 mins':
        return 'text-indigo-700 bg-indigo-50 border-indigo-300';
      default:
        return 'text-amber-800 bg-amber-50 border-amber-300';
    }
  };

  const getProbabilityColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-600';
    if (pct >= 80) return 'text-blue-600';
    if (pct >= 65) return 'text-indigo-600';
    return 'text-amber-600';
  };

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-emerald-500';
    if (pct >= 80) return 'bg-blue-500';
    if (pct >= 65) return 'bg-indigo-500';
    return 'bg-amber-500';
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              InDrive Dynamic Bidding
            </span>
            <h3 className="text-sm font-bold text-neutral-900">
              Acceptance Probability Slider
            </h3>
          </div>
          <p className="text-xs text-neutral-500">
            Increase your freight offer above statutory base to secure priority carrier dispatch.
          </p>
        </div>

        {/* Probability Gauge Badge */}
        <div className="text-right">
          <div className={`text-3xl font-black font-mono tracking-tight ${getProbabilityColor(result.probabilityPercent)}`}>
            {result.probabilityPercent}%
          </div>
          <div className="text-[11px] text-neutral-500 font-medium">Driver Acceptance Probability</div>
        </div>
      </div>

      {/* Probability Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden p-0.5 border border-neutral-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getBarColor(result.probabilityPercent)}`}
            style={{ width: `${result.probabilityPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-neutral-400">
          <span>Baseline Floor (48%)</span>
          <span>Fast Matching (80%)</span>
          <span>Instant Cap (99%)</span>
        </div>
      </div>

      {/* Bid Addition Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Shipper Priority Incentive (Bid Bonus):
          </span>
          <span className="font-mono text-sm font-bold text-neutral-900">
            +{formatINR(bonusAmountINR)}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="15000"
          step="250"
          value={bonusAmountINR}
          onChange={(e) => onChangeBonus(Number(e.target.value))}
          className="w-full accent-blue-600 h-2.5 bg-neutral-200 rounded-lg cursor-pointer"
        />

        <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
          <span>₹0 (Standard Queue)</span>
          <span>+₹5,000 (Expedited)</span>
          <span>+₹15,000 (VIP Corridor Urgent)</span>
        </div>
      </div>

      {/* Summary Box */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
        <div>
          <div className="text-neutral-500 text-[11px]">Base Floor Pricing</div>
          <div className="text-sm font-bold font-mono text-neutral-800">
            {formatINR(basePriceINR)}
          </div>
        </div>

        <div>
          <div className="text-neutral-500 text-[11px]">Total Offered Bid</div>
          <div className="text-base font-extrabold font-mono text-blue-600">
            {formatINR(totalOfferINR)}
          </div>
        </div>

        <div>
          <div className="text-neutral-500 text-[11px]">Estimated Pickup Speed</div>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border mt-0.5 ${getSpeedBandColor(result.dispatchSpeedBand)}`}>
            {result.dispatchSpeedBand === 'Instant (< 10 mins)' ? (
              <Zap className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            <span>{result.dispatchSpeedBand}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
        <Info className="w-3.5 h-3.5 text-blue-500" />
        <span>
          Higher bids incentivize commercial drivers in nearby corridor dhabas and rest areas to accept immediately.
        </span>
      </div>
    </div>
  );
}
