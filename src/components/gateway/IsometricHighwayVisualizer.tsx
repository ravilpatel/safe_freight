'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Zap, RefreshCw, AlertTriangle, Radio, Navigation } from 'lucide-react';

export type InspectionLayer = 'golden_hour' | 'ais140' | 'rollover' | 'empty_miles';

interface VisualizerHub {
  name: string;
  chainage: string;
  x: number;
  y: number;
  state: 'MH' | 'GJ';
}

const HUBS: VisualizerHub[] = [
  { name: 'Mumbai JNPT', chainage: 'KM 0', x: 80, y: 340, state: 'MH' },
  { name: 'Bhiwandi Hub', chainage: 'KM 45', x: 180, y: 290, state: 'MH' },
  { name: 'Vapi GIDC', chainage: 'KM 165', x: 320, y: 230, state: 'GJ' },
  { name: 'Surat Ring Rd', chainage: 'KM 280', x: 460, y: 180, state: 'GJ' },
  { name: 'Bharuch Zone', chainage: 'KM 355', x: 580, y: 140, state: 'GJ' },
  { name: 'Vadodara GIDC', chainage: 'KM 430', x: 700, y: 100, state: 'GJ' },
  { name: 'Ahmedabad Changodar', chainage: 'KM 525', x: 820, y: 60, state: 'GJ' },
];

export default function IsometricHighwayVisualizer() {
  const [activeLayer, setActiveLayer] = useState<InspectionLayer>('golden_hour');
  const [truckOffset, setTruckOffset] = useState(0.45);
  const [radarPulse, setRadarPulse] = useState(false);

  useEffect(() => {
    const truckTimer = setInterval(() => {
      setTruckOffset((prev) => (prev >= 0.95 ? 0.05 : prev + 0.015));
    }, 200);

    const pulseTimer = setInterval(() => {
      setRadarPulse((p) => !p);
    }, 1500);

    return () => {
      clearInterval(truckTimer);
      clearInterval(pulseTimer);
    };
  }, []);

  // Compute truck coordinates along isometric corridor spine
  const truckX = 80 + truckOffset * (820 - 80);
  const truckY = 340 + truckOffset * (60 - 340);

  return (
    <section className="py-16 px-6 sm:px-12 bg-[#0b1120] text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Feature 37: 3D Corridor Visualizer
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Isometric NH 48 Spine Architecture
            </h2>
            <p className="text-sm text-slate-400">
              Interactive 525 km telemetry layer mapping Mumbai JNPT to Ahmedabad Changodar.
            </p>
          </div>

          {/* Segmented Layer Tabs */}
          <div className="flex flex-wrap p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveLayer('golden_hour')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                activeLayer === 'golden_hour'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Golden Hour (&lt;15m)</span>
            </button>
            <button
              onClick={() => setActiveLayer('ais140')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                activeLayer === 'ais140'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>AIS-140 (4.0G Gate)</span>
            </button>
            <button
              onClick={() => setActiveLayer('rollover')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                activeLayer === 'rollover'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Rollover (&gt;30°)</span>
            </button>
            <button
              onClick={() => setActiveLayer('empty_miles')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                activeLayer === 'empty_miles'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Empty Miles (-34%)</span>
            </button>
          </div>
        </div>

        {/* 3D Isometric Canvas Container */}
        <div className="relative rounded-2xl bg-gradient-to-b from-slate-950 to-[#070b14] border border-slate-800 overflow-hidden p-6 sm:p-10 shadow-2xl">
          {/* Top Status Overlay */}
          <div className="absolute top-6 left-6 z-10 flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700 text-slate-300">
              Active Layer: <strong className="text-white uppercase">{activeLayer.replace('_', ' ')}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700 text-slate-300">
              Corridor Elevation: <span className="text-cyan-400">12m &rarr; 54m AMSL</span>
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700 text-slate-300">
              State Border: <span className="text-amber-400">MH / GJ Interstate @ Talasari (KM 130)</span>
            </span>
          </div>

          {/* SVG Isometric Visualization */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 920 400"
              className="w-full min-w-[750px] h-[360px] select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Highway Gradient */}
                <linearGradient id="corridorRoadGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>

                {/* Backhaul Circular Flow Gradient */}
                <linearGradient id="backhaulLoopGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Grid Baseline Iso Lines */}
              <g stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3">
                <line x1="40" y1="360" x2="880" y2="360" />
                <line x1="40" y1="280" x2="880" y2="280" />
                <line x1="40" y1="200" x2="880" y2="200" />
                <line x1="40" y1="120" x2="880" y2="120" />
              </g>

              {/* Highway Base Strip (Isometric Road Polygon) */}
              <polygon
                points="70,360 810,80 830,40 90,320"
                fill="url(#corridorRoadGrad)"
                stroke="#475569"
                strokeWidth="1.5"
                opacity="0.85"
              />

              {/* Median Divider Strip */}
              <line
                x1="80"
                y1="340"
                x2="820"
                y2="60"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="12 8"
                opacity="0.7"
              />

              {/* Backhaul Circular Return Route (visible in empty_miles layer) */}
              {activeLayer === 'empty_miles' && (
                <path
                  d="M 820 60 C 600 0, 300 200, 80 340"
                  fill="none"
                  stroke="url(#backhaulLoopGrad)"
                  strokeWidth="3.5"
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
              )}

              {/* Hub Markers along the Spine */}
              {HUBS.map((hub, idx) => (
                <g key={idx} transform={`translate(${hub.x}, ${hub.y})`}>
                  {/* Outer Hub Ring */}
                  <circle
                    r="8"
                    fill="#0f172a"
                    stroke={hub.state === 'MH' ? '#38bdf8' : '#34d399'}
                    strokeWidth="2.5"
                  />
                  <circle
                    r="3.5"
                    fill={hub.state === 'MH' ? '#38bdf8' : '#34d399'}
                  />

                  {/* Hub Vertical Leader Line */}
                  <line
                    x1="0"
                    y1="-8"
                    x2="0"
                    y2="-22"
                    stroke="#64748b"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />

                  {/* Hub Label Callout */}
                  <rect
                    x="-45"
                    y="-42"
                    width="90"
                    height="18"
                    rx="4"
                    fill="#090d16"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="-30"
                    textAnchor="middle"
                    fill="#f1f5f9"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {hub.name}
                  </text>
                  <text
                    x="0"
                    y="20"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {hub.chainage} ({hub.state})
                  </text>
                </g>
              ))}

              {/* Animated Vehicle / Telematics Sensor Node */}
              <g transform={`translate(${truckX}, ${truckY})`}>
                {/* Active Layer Radar Halo */}
                {activeLayer === 'golden_hour' && (
                  <circle
                    r={radarPulse ? '28' : '20'}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    opacity={radarPulse ? '0.3' : '0.8'}
                    className="transition-all duration-700"
                  />
                )}

                {activeLayer === 'ais140' && (
                  <circle
                    r={radarPulse ? '24' : '16'}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    opacity={radarPulse ? '0.2' : '0.7'}
                  />
                )}

                {activeLayer === 'rollover' && (
                  <circle
                    r={radarPulse ? '24' : '16'}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    opacity={radarPulse ? '0.2' : '0.7'}
                  />
                )}

                {activeLayer === 'empty_miles' && (
                  <circle
                    r={radarPulse ? '24' : '16'}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    opacity={radarPulse ? '0.2' : '0.7'}
                  />
                )}

                {/* Truck Body Icon */}
                <rect
                  x="-12"
                  y="-7"
                  width="24"
                  height="14"
                  rx="3"
                  fill="#1e293b"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <circle cx="7" cy="-7" r="1.5" fill="#38bdf8" />
                <circle cx="-7" cy="-7" r="1.5" fill="#38bdf8" />

                {/* Truck Live HUD Tag */}
                <rect
                  x="-35"
                  y="-26"
                  width="70"
                  height="14"
                  rx="3"
                  fill="#020617"
                  stroke="#38bdf8"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="-16"
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  GJ-01-XX-9821
                </text>
              </g>
            </svg>
          </div>

          {/* Bottom Layer Inspection Explainer Card */}
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {activeLayer === 'golden_hour' && (
              <>
                <div className="bg-rose-950/20 p-3 rounded-lg border border-rose-900/30">
                  <div className="font-semibold text-rose-400 mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Sub-15m Rescue Window
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    NH 48 trauma centers alerted automatically at T0. ERSS 112 API payload dispatches nearest ambulance within 4 km radius.
                  </p>
                </div>
                <div className="bg-rose-950/20 p-3 rounded-lg border border-rose-900/30">
                  <div className="font-semibold text-rose-400 mb-1">Impact G-Force Triangulation</div>
                  <p className="text-slate-400 text-[11px]">
                    Total G-vector &ge; 4.0G triggers automated 30s audio siren countdown. False alarms cancelled via centered 96dp touch target.
                  </p>
                </div>
                <div className="bg-rose-950/20 p-3 rounded-lg border border-rose-900/30">
                  <div className="font-semibold text-rose-400 mb-1">Survivor Durability</div>
                  <p className="text-slate-400 text-[11px]">
                    Offline telemetry queue buffers pings and emergency countdown state in memory even through remote highway shadow zones.
                  </p>
                </div>
              </>
            )}

            {activeLayer === 'ais140' && (
              <>
                <div className="bg-blue-950/20 p-3 rounded-lg border border-blue-900/30">
                  <div className="font-semibold text-blue-400 mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> 4.0G Vector Impact Classifier
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Strict multi-axial algorithm ignores single-axis phone drops and pothole jolts (2.2G). Only genuine crashes trigger distress.
                  </p>
                </div>
                <div className="bg-blue-950/20 p-3 rounded-lg border border-blue-900/30">
                  <div className="font-semibold text-blue-400 mb-1">AIS-140 MORTH Certification</div>
                  <p className="text-slate-400 text-[11px]">
                    Emergency SOS button, dual IP server telemetry redundancy, and GPS/IRNSS tracking compliant with Central Motor Vehicle Rules.
                  </p>
                </div>
                <div className="bg-blue-950/20 p-3 rounded-lg border border-blue-900/30">
                  <div className="font-semibold text-blue-400 mb-1">Continuous Telemetry Buffer</div>
                  <p className="text-slate-400 text-[11px]">
                    High-throughput batched ingestion (/api/v1/pings) with tenant isolation derived strictly from verified JWT tokens.
                  </p>
                </div>
              </>
            )}

            {activeLayer === 'rollover' && (
              <>
                <div className="bg-amber-950/20 p-3 rounded-lg border border-amber-900/30">
                  <div className="font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Gyroscopic Roll Angle (&gt;30°)
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Chassis tilt monitoring warns commercial drivers before rollover on high-camber curves near Manor Ghat and Vapi flyovers.
                  </p>
                </div>
                <div className="bg-amber-950/20 p-3 rounded-lg border border-amber-900/30">
                  <div className="font-semibold text-amber-400 mb-1">Voice Pre-Warning Guidance</div>
                  <p className="text-slate-400 text-[11px]">
                    Synthesized highway native voice audio warns: &quot;गाड़ी झुक रही है — कृपया गति धीमी करें (Vehicle tilting — please slow down)&quot;.
                  </p>
                </div>
                <div className="bg-amber-950/20 p-3 rounded-lg border border-amber-900/30">
                  <div className="font-semibold text-amber-400 mb-1">Fleet Security Alerts</div>
                  <p className="text-slate-400 text-[11px]">
                    Automated security alert logged to fleet console if vehicle sustains roll angle or stops unauthorized for &gt;45 mins.
                  </p>
                </div>
              </>
            )}

            {activeLayer === 'empty_miles' && (
              <>
                <div className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30">
                  <div className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Circular Backhaul Matching
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Turns empty return trips into paying revenue legs. Changodar machinery loads paired with Surat textiles and JNPT export boxes.
                  </p>
                </div>
                <div className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30">
                  <div className="font-semibold text-emerald-400 mb-1">Up to 34% Deadhead Avoided</div>
                  <p className="text-slate-400 text-[11px]">
                    Empty km avoided = max(0, Total Trip - Loaded km). Saves ₹92/L diesel, ₹2.20/km toll, and 2.68 kg CO₂ per litre saved.
                  </p>
                </div>
                <div className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30">
                  <div className="font-semibold text-emerald-400 mb-1">Shipper Discount Benefit</div>
                  <p className="text-slate-400 text-[11px]">
                    Backhaul matches unlock dynamic deadhead reduction discounts (-10% to -14%) passed directly to shippers.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
