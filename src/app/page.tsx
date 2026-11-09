'use client';

import React from 'react';
import Link from 'next/link';
import CorridorStatusBar from '@/components/gateway/CorridorStatusBar';
import HeroSection from '@/components/gateway/HeroSection';
import FourPillarsBento from '@/components/gateway/FourPillarsBento';
import IsometricHighwayVisualizer from '@/components/gateway/IsometricHighwayVisualizer';
import PublicCostEstimatorWidget from '@/components/gateway/PublicCostEstimatorWidget';
import PortalLauncher from '@/components/gateway/PortalLauncher';
import ViksitBharatComparison from '@/components/gateway/ViksitBharatComparison';
import { ShieldCheck, Truck, ArrowRight, ExternalLink } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col selection:bg-blue-500 selection:text-white">
      {/* 1. Live Telematics Status Bar */}
      <CorridorStatusBar />

      {/* 2. Primary Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 px-6 sm:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              SafeFreight OS
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                v4.0.0
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Western Freight Corridor Gateway</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <a href="#public-cost-estimator" className="hover:text-white transition-colors">
            Cost Estimator
          </a>
          <Link href="/shipper" className="hover:text-white transition-colors">
            Shipper Portal
          </Link>
          <Link href="/admin" className="hover:text-white transition-colors">
            Fleet Admin
          </Link>
          <Link href="/driver" className="hover:text-white transition-colors">
            Driver Console
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/shipper"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20"
          >
            <span>Book Freight</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 3. Hero Section */}
      <HeroSection />

      {/* 4. 4 Pillars Bento Grid */}
      <FourPillarsBento />

      {/* 5. Isometric Highway 3D Architecture Visualizer (Feature 37) */}
      <IsometricHighwayVisualizer />

      {/* 6. Embedded Public Rate-Limited Freight Cost Estimator (Feature 35) */}
      <PublicCostEstimatorWidget />

      {/* 7. Role-Based Portal Launcher */}
      <PortalLauncher />

      {/* 8. Viksit Bharat 2047 Logistics Benchmark Comparison */}
      <ViksitBharatComparison />

      {/* 9. Enterprise Compliance & Legal Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-[#070b14] text-slate-400 py-12 px-6 sm:px-12 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="text-white font-semibold">SafeFreight OS — National Logistics Gateway</div>
            <div className="text-[11px] text-slate-500">
              Corridor Operating System for NH 48 (Mumbai JNPT · Vapi · Surat · Vadodara · Changodar)
            </div>
            <div className="text-[11px] text-slate-500">
              Compliant with Carriage by Road Act 2007, CGST Rule 54(3), AIS-140 MORTH, and SAC Code 9965.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> RLS Multi-Tenant Isolated
            </span>
            <span>•</span>
            <span className="text-cyan-400">Zero DB Writes on Estimator</span>
            <span>•</span>
            <span className="text-blue-400">60 req/min Rate-Limited</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
