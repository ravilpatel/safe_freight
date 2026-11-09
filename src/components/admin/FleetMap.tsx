'use client';

import React, { useState } from 'react';
import { Truck, Compass } from 'lucide-react';
import { DriverRosterItem } from './types';

interface FleetMapProps {
  drivers: DriverRosterItem[];
  onSelectDriver?: (_driver: DriverRosterItem) => void;
}

const NH48_WAYPOINTS = [
  { id: 'WP1', name: 'Mumbai JNPT Port', km: 0, x: 18, y: 88, state: 'MH' },
  { id: 'WP2', name: 'Vapi GIDC Hub', km: 165, x: 30, y: 68, state: 'GJ' },
  { id: 'WP3', name: 'Surat Kadodara Junction', km: 285, x: 44, y: 52, state: 'GJ' },
  { id: 'WP4', name: 'Bharuch Narmada Bridge', km: 360, x: 58, y: 40, state: 'GJ' },
  { id: 'WP5', name: 'Vadodara Ranoli Hub', km: 440, x: 72, y: 28, state: 'GJ' },
  { id: 'WP6', name: 'Ahmedabad Changodar', km: 525, x: 86, y: 14, state: 'GJ' },
];

export function FleetMap({ drivers, onSelectDriver }: FleetMapProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<DriverRosterItem | null>(drivers[0] || null);

  // Map drivers onto corridor waypoints for visual placement
  const getDriverCoordinates = (index: number) => {
    // Distribute along the spine
    const positions = [
      { x: 38, y: 60 },
      { x: 50, y: 46 },
      { x: 65, y: 34 },
      { x: 80, y: 20 },
      { x: 24, y: 78 },
    ];
    return positions[index % positions.length];
  };

  return (
    <div className="bg-white rounded-xl border border-[#e6e6e6] shadow-xs overflow-hidden">
      {/* Map Header */}
      <div className="px-5 py-4 border-b border-[#e6e6e6] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
            <Compass className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              NH 48 Western Freight Spine — Live Corridor Map
            </h3>
            <p className="text-[11px] text-neutral-500">
              525 km continuous AIS-140 telematics tracking (JNPT Port ⇄ Changodar Logistics Hub)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {drivers.filter((d) => d.status === 'on_trip').length} Vehicles In Transit
          </span>
        </div>
      </div>

      {/* Map Canvas Visual Area */}
      <div className="relative w-full h-[380px] bg-neutral-900/95 overflow-hidden select-none">
        {/* Subtle Map Grid / Contour Pattern */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #0f172a 1px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px',
          }}
        />

        {/* Corridor Polyline SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Main Highway Route Glow */}
          <path
            d="M 18% 88% Q 34% 65%, 44% 52% T 86% 14%"
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeOpacity="0.4"
            strokeLinecap="round"
          />
          {/* Main Highway Route Line */}
          <path
            d="M 18% 88% Q 34% 65%, 44% 52% T 86% 14%"
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
        </svg>

        {/* Waypoints along NH 48 */}
        {NH48_WAYPOINTS.map((wp) => (
          <div
            key={wp.id}
            style={{ left: `${wp.x}%`, top: `${wp.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-neutral-900 border-2 border-emerald-400 flex items-center justify-center shadow-lg group-hover:scale-125 transition">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>

            {/* Waypoint Label */}
            <div className="absolute left-1/2 -translate-x-1/2 top-4 whitespace-nowrap bg-neutral-950/90 border border-neutral-700 text-neutral-200 text-[10px] font-bold px-2 py-0.5 rounded shadow-md pointer-events-none">
              {wp.name} <span className="text-emerald-400 font-mono">({wp.km} km)</span>
            </div>
          </div>
        ))}

        {/* Live Truck Markers */}
        {drivers.map((driver, idx) => {
          const coords = getDriverCoordinates(idx);
          const isSelected = selectedVehicle?.id === driver.id;

          return (
            <div
              key={driver.id}
              onClick={() => {
                setSelectedVehicle(driver);
                onSelectDriver?.(driver);
              }}
              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 transition group"
            >
              {/* Truck Marker Pin */}
              <div
                className={`relative flex items-center justify-center p-2 rounded-xl transition shadow-xl ${
                  isSelected
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30 scale-110'
                    : driver.status === 'on_trip'
                    ? 'bg-neutral-900 text-emerald-400 border border-emerald-400 hover:scale-110'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:scale-105'
                }`}
              >
                <Truck className="w-4 h-4 stroke-[2.2]" />

                {driver.status === 'on_trip' && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                )}
              </div>

              {/* Truck Info Tooltip */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 -top-10 whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold shadow-lg transition ${
                  isSelected
                    ? 'bg-emerald-600 text-white border border-emerald-400'
                    : 'bg-neutral-900 text-neutral-200 border border-neutral-700 opacity-90 group-hover:opacity-100'
                }`}
              >
                {driver.vehicleNumber} · {driver.currentSpeedKmH} km/h
              </div>
            </div>
          );
        })}

        {/* Selected Vehicle Floating HUD Overlay */}
        {selectedVehicle && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 bg-neutral-950/90 backdrop-blur-md border border-neutral-800 rounded-xl p-3.5 text-neutral-100 shadow-2xl z-30 space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span className="font-mono font-bold text-xs">{selectedVehicle.vehicleNumber}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                {selectedVehicle.status === 'on_trip' ? `${selectedVehicle.currentSpeedKmH} km/h` : selectedVehicle.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase">Driver:</span>
                <span className="font-semibold text-white truncate block">{selectedVehicle.name}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase">Location:</span>
                <span className="font-semibold text-neutral-300 truncate block">{selectedVehicle.currentLocation}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase">Payload:</span>
                <span className="font-semibold text-neutral-300">{selectedVehicle.payloadCapacityMT} MT</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase">FASTag ID:</span>
                <span className="font-mono text-neutral-400 truncate block">{selectedVehicle.fastagId}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
