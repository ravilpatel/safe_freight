'use client';

import React from 'react';
import { TrendingUp, TrendingDown, ShieldCheck, AlertCircle } from 'lucide-react';
import { VehiclePnlItem } from './types';

interface GaadiWisePnlTabProps {
  vehicles: VehiclePnlItem[];
}

export function GaadiWisePnlTab({ vehicles }: GaadiWisePnlTabProps) {
  const totalFleetRevenue = vehicles.reduce((sum, v) => sum + v.grossRevenueINR, 0);
  const totalFleetOperatingCost = vehicles.reduce((sum, v) => sum + v.totalOperatingCostINR, 0);
  const totalFleetNetMargin = vehicles.reduce((sum, v) => sum + v.netMarginINR, 0);
  const averageFleetMarginPct = totalFleetRevenue > 0
    ? Math.round((totalFleetNetMargin / totalFleetRevenue) * 100)
    : 0;

  const getHealthBadge = (health: VehiclePnlItem['health'], marginPct: number) => {
    switch (health) {
      case 'excellent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            Excellent ({marginPct}%)
          </span>
        );
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            <ShieldCheck className="w-3 h-3 text-sky-600" />
            Healthy ({marginPct}%)
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Low Margin ({marginPct}%)
          </span>
        );
      case 'loss':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
            <TrendingDown className="w-3 h-3 text-red-600" />
            Review Ops ({marginPct}%)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Fleet Topline */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 tracking-tight">
              Truck-wise Gross P&L Analytics (&ldquo;Gaadi-wise Kamai&rdquo;)
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Unit-level commercial economics per asset: freight revenue, fuel, tolls, maintenance reserve, and net gross margin.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-neutral-50 px-3.5 py-2 rounded-lg border border-neutral-200 text-xs self-start sm:self-auto">
            <span className="text-neutral-500 font-medium">Corridor Fleet Spread:</span>
            <span className="font-extrabold text-neutral-900">{averageFleetMarginPct}% Avg Margin</span>
          </div>
        </div>

        {/* 3 Executive Metric Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
              Monthly Gross Revenue
            </span>
            <div className="text-2xl font-bold text-neutral-900">
              ₹{totalFleetRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Aggregated across all vehicles</div>
          </div>

          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
              Total Operating Costs
            </span>
            <div className="text-2xl font-bold text-neutral-900">
              ₹{totalFleetOperatingCost.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">Diesel, tolls, wear-and-tear & bhatta</div>
          </div>

          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
              Net Fleet Contribution
            </span>
            <div className="text-2xl font-bold text-emerald-700">
              ₹{totalFleetNetMargin.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              {averageFleetMarginPct}% operating gross margin
            </div>
          </div>
        </div>
      </div>

      {/* Gaadi-wise Table */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e6e6e6] flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">
            Asset Profitability Ledger
          </h3>
          <span className="text-xs text-neutral-400 font-mono">
            {vehicles.length} commercial vehicles tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-[#e6e6e6] text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4">Vehicle Plate & Model</th>
                <th className="py-3 px-4 text-center">Monthly Trips</th>
                <th className="py-3 px-4 text-right">Gross Revenue</th>
                <th className="py-3 px-4 text-right">Diesel Cost</th>
                <th className="py-3 px-4 text-right">Toll Cost</th>
                <th className="py-3 px-4 text-right">Maintenance / Bhatta</th>
                <th className="py-3 px-4 text-right">Net Margin (₹)</th>
                <th className="py-3 px-4 text-center">Profitability Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {vehicles.map((v) => (
                <tr key={v.vehicleNumber} className="hover:bg-neutral-50/50 transition">
                  {/* Plate & Model */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-xs text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 inline-block">
                      {v.vehicleNumber}
                    </div>
                    <div className="text-[11px] text-neutral-600 font-medium mt-1">
                      {v.model}
                    </div>
                  </td>

                  {/* Monthly Trips */}
                  <td className="py-3.5 px-4 text-center font-bold text-neutral-900">
                    {v.monthlyTrips}
                  </td>

                  {/* Gross Revenue */}
                  <td className="py-3.5 px-4 text-right font-bold text-neutral-900">
                    ₹{v.grossRevenueINR.toLocaleString('en-IN')}
                  </td>

                  {/* Diesel Cost */}
                  <td className="py-3.5 px-4 text-right text-neutral-700">
                    ₹{v.dieselCostINR.toLocaleString('en-IN')}
                  </td>

                  {/* Toll Cost */}
                  <td className="py-3.5 px-4 text-right text-neutral-700">
                    ₹{v.tollCostINR.toLocaleString('en-IN')}
                  </td>

                  {/* Maintenance / Bhatta */}
                  <td className="py-3.5 px-4 text-right text-neutral-700">
                    ₹{(v.maintenanceReserveINR + v.driverBhattaINR).toLocaleString('en-IN')}
                  </td>

                  {/* Net Margin (₹) */}
                  <td className="py-3.5 px-4 text-right font-extrabold text-emerald-800 text-sm">
                    ₹{v.netMarginINR.toLocaleString('en-IN')}
                  </td>

                  {/* Profitability Health Badge */}
                  <td className="py-3.5 px-4 text-center">
                    {getHealthBadge(v.health, v.marginPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
