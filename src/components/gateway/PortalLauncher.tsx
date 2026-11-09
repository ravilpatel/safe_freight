'use client';

import React from 'react';
import Link from 'next/link';
import { Truck, ShieldCheck, Building2, ArrowRight } from 'lucide-react';

export default function PortalLauncher() {
  const portals = [
    {
      id: 'shipper',
      title: 'Shipper Freight Booking Portal',
      role: 'Enterprise Consignor & Shipper',
      path: '/shipper',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: Building2,
      description:
        'Post FTL/LTL freight, set InDrive-style bidding bonus, validate GSTIN/e-Way bills, and schedule corridor pickups up to 30 days ahead.',
      features: [
        'AI Freight Booking Assistant',
        'Dynamic Bidding Probability Slider (48%-99%)',
        '1-Click Official GST Tax Invoice Generator',
        'Real-time Consignment Milestone Tracker',
      ],
      ctaText: 'Enter Shipper Portal',
      btnClass: 'bg-blue-600 hover:bg-blue-500 text-white',
    },
    {
      id: 'admin',
      title: 'Fleet Admin Command Center',
      role: 'Fleet Owner & Transport Operator',
      path: '/admin',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: ShieldCheck,
      description:
        'Corridor operations hub: live Leaflet GPS fleet tracking, automated WhatsApp dispatch slips, Trip Khata ledger, and Golden Hour emergency monitor.',
      features: [
        'Live NH 48 Truck Fleet Leaflet Map',
        'Gaadi-wise Kamai & Trip Khata Ledger',
        'Deadhead Reduction Simulator (-34%)',
        'Golden Hour T0/T1/T2 Safety Incident Console',
      ],
      ctaText: 'Enter Admin Console',
      btnClass: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
    },
    {
      id: 'driver',
      title: 'Commercial Driver PWA Console',
      role: 'Highway Commercial Driver',
      path: '/driver',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: Truck,
      description:
        'Driver HUD built for 24/7 highway conditions. 1-tap milestone progress, voice guidance in native speech, e-Bilti QR code, and Bhatta expense diary.',
      features: [
        'High-Contrast 56dp/96dp Touch Targets',
        '1-Tap 6-Stage Milestone Tracker',
        'Digital e-Bilti High-Contrast QR Code',
        '30s Audible Emergency SOS Countdown',
      ],
      ctaText: 'Enter Driver Console',
      btnClass: 'bg-emerald-700 hover:bg-emerald-600 text-white',
    },
  ];

  return (
    <section className="py-20 px-6 sm:px-12 bg-[#0b1120] text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono uppercase tracking-wider">
            Workspace Hub
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Role-Based Portal Launcher
          </h2>
          <p className="text-sm text-slate-400">
            Dedicated consoles tailored for shippers, fleet operators, and highway drivers with strict tenant isolation.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <div
                key={portal.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-7 flex flex-col justify-between space-y-6 transition-all group hover:shadow-xl hover:shadow-black/50"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-full border ${portal.badgeColor}`}>
                      {portal.role}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                    {portal.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {portal.description}
                  </p>

                  <ul className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                    {portal.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <Link
                    href={portal.path}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold transition-all ${portal.btnClass}`}
                  >
                    <span>{portal.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
