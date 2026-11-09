'use client';

import React, { useState } from 'react';
import { Calendar, Truck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DriverRosterItem } from './types';

interface AdvanceTripPlannerModalProps {
  isOpen: boolean;
  drivers: DriverRosterItem[];
  onClose: () => void;
  onTripScheduled?: (_tripData: any) => Promise<void>;
}

const CORRIDOR_HUBS = [
  'Mumbai JNPT Port Container Terminal',
  'Vapi GIDC Industrial Checkpoint',
  'Surat Kadodara Ring Road Junction',
  'Bharuch Narmada River Toll Plaza',
  'Vadodara Ranoli GIDC Logistics Hub',
  'Ahmedabad Changodar Industrial Hub',
];

export function AdvanceTripPlannerModal({
  isOpen,
  drivers,
  onClose,
  onTripScheduled,
}: AdvanceTripPlannerModalProps) {
  const [origin, setOrigin] = useState(CORRIDOR_HUBS[0]);
  const [destination, setDestination] = useState(CORRIDOR_HUBS[5]);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedDriverId, setSelectedDriverId] = useState(drivers[0]?.id || '');
  const [routeType, setRouteType] = useState<'fastest' | 'toll_optimized' | 'eco_fuel'>('fastest');
  const [grossFreight, setGrossFreight] = useState(54000);
  const [dieselAdvance, setDieselAdvance] = useState(14000);
  const [fastagAdvance, setFastagAdvance] = useState(2400);
  const [driverBhatta, setDriverBhatta] = useState(1600);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (scheduledDate < todayStr) {
      setErrorMsg('Scheduled date cannot be in the past');
      return;
    }

    if (scheduledDate > maxDateStr) {
      setErrorMsg('Cannot schedule dispatches more than 30 days in advance');
      return;
    }

    if (origin === destination) {
      setErrorMsg('Origin and destination cannot be identical');
      return;
    }

    setLoading(true);
    try {
      const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
      const totalAdvances = dieselAdvance + fastagAdvance + driverBhatta;

      const payload = {
        origin,
        destination,
        scheduledDate,
        driverId: selectedDriverId,
        driverName: selectedDriver?.name || 'Assigned Driver',
        driverPhone: selectedDriver?.phone || '+91 98790 54321',
        vehicleNumber: selectedDriver?.vehicleNumber || 'GJ 05 BZ 8821',
        routeType,
        grossFreightINR: grossFreight,
        dieselAdvanceINR: dieselAdvance,
        fastagAdvanceINR: fastagAdvance,
        bhattaAdvanceINR: driverBhatta,
        hamaliAdvanceINR: 0,
        totalAdvancesINR: totalAdvances,
        balanceDueINR: Math.max(0, grossFreight - totalAdvances),
        distanceKm: 525,
        tollINR: routeType === 'toll_optimized' ? 950 : 2450,
      };

      if (onTripScheduled) {
        await onTripScheduled(payload);
      }

      setSuccessMsg('Advance corridor trip scheduled successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to schedule trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-xl w-full shadow-xl space-y-5 animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Advance Corridor Trip Planner
              </h3>
              <p className="text-xs text-neutral-500">
                Schedule NH 48 highway dispatches up to 30 days ahead with route profiling.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                Pickup Origin Hub
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
              >
                {CORRIDOR_HUBS.map((hub) => (
                  <option key={hub} value={hub}>
                    {hub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                Drop Destination Hub
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
              >
                {CORRIDOR_HUBS.map((hub) => (
                  <option key={hub} value={hub}>
                    {hub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Driver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                Scheduled Dispatch Date (up to 30d)
              </label>
              <input
                type="date"
                required
                min={todayStr}
                max={maxDateStr}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                Allocated Driver & Truck
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.vehicleNumber}) · {d.status === 'on_trip' ? '[Currently on trip]' : '[Available]'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Route Profiling Selector */}
          <div>
            <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1.5">
              Corridor Route Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'fastest',
                  title: 'Fastest Highway',
                  desc: '62 km/h avg · ₹1.85/km toll',
                },
                {
                  id: 'toll_optimized',
                  title: 'Toll-Optimized',
                  desc: '48 km/h avg · ₹0.65/km toll',
                },
                {
                  id: 'eco_fuel',
                  title: 'Eco-Fuel Corridor',
                  desc: '54 km/h avg · 4.3 km/L',
                },
              ].map((rt) => (
                <div
                  key={rt.id}
                  onClick={() => setRouteType(rt.id as any)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    routeType === rt.id
                      ? 'border-neutral-900 bg-neutral-50 shadow-xs'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="font-bold text-neutral-900">{rt.title}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{rt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Khata & Advances */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 block">
              Trip Khata Commercials & Advances (₹)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">
                  Gross Freight
                </label>
                <input
                  type="number"
                  min="1000"
                  value={grossFreight}
                  onChange={(e) => setGrossFreight(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">
                  Diesel Advance
                </label>
                <input
                  type="number"
                  min="0"
                  value={dieselAdvance}
                  onChange={(e) => setDieselAdvance(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">
                  FASTag Toll
                </label>
                <input
                  type="number"
                  min="0"
                  value={fastagAdvance}
                  onChange={(e) => setFastagAdvance(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">
                  Driver Bhatta
                </label>
                <input
                  type="number"
                  min="0"
                  value={driverBhatta}
                  onChange={(e) => setDriverBhatta(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs bg-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 flex justify-between text-xs">
              <span className="text-neutral-500">Balance Due on POD:</span>
              <span className="font-extrabold text-neutral-900">
                ₹{Math.max(0, grossFreight - (dieselAdvance + fastagAdvance + driverBhatta)).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition disabled:opacity-50 shadow-xs"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{loading ? 'Scheduling...' : 'Confirm Advance Trip'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
