'use client';

import React, { useState } from 'react';
import { DriverLanguage, DRIVER_TRANSLATIONS } from '@/components/driver/types';
import { GpsHud } from '@/components/driver/GpsHud';
import { MilestoneTracker } from '@/components/driver/MilestoneTracker';
import { TripKhataDiary } from '@/components/driver/TripKhataDiary';
import { RouteSelector } from '@/components/driver/RouteSelector';
import { BackhaulBoard } from '@/components/driver/BackhaulBoard';
import { EmergencyBar } from '@/components/driver/EmergencyBar';
import { EBiltiModal } from '@/components/driver/EBiltiModal';
import { audioSynth } from '@/components/driver/audio';
import {
  Navigation,
  Wallet,
  Compass,
  Package,
  LogOut,
  Infinity,
  ShieldCheck,
} from 'lucide-react';

export default function DriverConsolePage() {
  const [lang, setLang] = useState<DriverLanguage>('hi');
  const [activeTab, setActiveTab] = useState<'hud' | 'khata' | 'route' | 'backhaul'>('hud');
  const [isEBiltiOpen, setIsEBiltiOpen] = useState<boolean>(false);

  const t = DRIVER_TRANSLATIONS[lang] || DRIVER_TRANSLATIONS.en;

  const handleLanguageChange = (newLang: DriverLanguage) => {
    audioSynth.playClickTone();
    setLang(newLang);
  };

  const handleSignOut = () => {
    audioSynth.playClickTone();
    if (typeof document !== 'undefined') {
      document.cookie = 'safefreight-token=; path=/; max-age=0';
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between select-none">
      {/* Operating Command Header */}
      <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 px-3 py-2 sm:px-4 sm:py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Fleet Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0075de] to-sky-400 flex items-center justify-center text-white shadow-md">
              <Infinity className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  SafeFreight OS
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded text-xs font-black bg-emerald-950 text-emerald-400 border border-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  M1 Commercial
                </span>
              </div>
              <p className="text-base text-neutral-300 font-medium">
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* Controls: 5-Language Switcher (>= 56dp Touch Target) & Sign Out */}
          <div className="flex items-center gap-2">
            {/* 5-Language Switcher */}
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-2xl p-1 gap-1">
              {(
                [
                  { code: 'hi', label: 'हिन्दी' },
                  { code: 'gu', label: 'ગુજરાતી' },
                  { code: 'mr', label: 'मराठी' },
                  { code: 'te', label: 'తెలుగు' },
                  { code: 'en', label: 'EN' },
                ] as const
              ).map(({ code, label }) => {
                const isActive = lang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleLanguageChange(code)}
                    className={`min-h-[56px] min-w-[56px] px-3.5 rounded-xl font-black text-base transition-all flex items-center justify-center ${
                      isActive
                        ? 'bg-[#0075de] text-white shadow-md'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Sign Out Button (>= 56dp Touch Target) */}
            <button
              type="button"
              onClick={handleSignOut}
              className="min-h-[56px] min-w-[56px] p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors flex items-center justify-center"
              title="Sign Out"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 4 Console Main Navigation Tabs (>= 56dp Touch Target) */}
        <div className="max-w-7xl mx-auto mt-2 border-t border-neutral-800/80 pt-2">
          <nav className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                audioSynth.playClickTone();
                setActiveTab('hud');
              }}
              className={`min-h-[56px] px-3.5 py-2.5 rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-2 border-2 transition-all ${
                activeTab === 'hud'
                  ? 'bg-[#0075de] border-[#0075de] text-white shadow-lg'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Navigation className="w-5 h-5 shrink-0" />
              <span className="truncate">{t.tabHud}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioSynth.playClickTone();
                setActiveTab('khata');
              }}
              className={`min-h-[56px] px-3.5 py-2.5 rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-2 border-2 transition-all ${
                activeTab === 'khata'
                  ? 'bg-[#0075de] border-[#0075de] text-white shadow-lg'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Wallet className="w-5 h-5 shrink-0" />
              <span className="truncate">{t.tabKhata}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioSynth.playClickTone();
                setActiveTab('route');
              }}
              className={`min-h-[56px] px-3.5 py-2.5 rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-2 border-2 transition-all ${
                activeTab === 'route'
                  ? 'bg-[#0075de] border-[#0075de] text-white shadow-lg'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Compass className="w-5 h-5 shrink-0" />
              <span className="truncate">{t.tabRoute}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioSynth.playClickTone();
                setActiveTab('backhaul');
              }}
              className={`min-h-[56px] px-3.5 py-2.5 rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-2 border-2 transition-all ${
                activeTab === 'backhaul'
                  ? 'bg-[#0075de] border-[#0075de] text-white shadow-lg'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Package className="w-5 h-5 shrink-0" />
              <span className="truncate">{t.tabBackhaul}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Console Work Area */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6 pb-40">
        {activeTab === 'hud' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 24/7 Always-On GPS HUD */}
            <GpsHud language={lang} />
            {/* 1-Tap 6-Stage Milestone Tracker */}
            <MilestoneTracker language={lang} />
          </div>
        )}

        {activeTab === 'khata' && (
          <div className="animate-in fade-in duration-200">
            {/* Trip Khata Cash Expense Diary */}
            <TripKhataDiary language={lang} />
          </div>
        )}

        {activeTab === 'route' && (
          <div className="animate-in fade-in duration-200">
            {/* 3-Way Route Selector with Checkpoints & Voice Guidance */}
            <RouteSelector language={lang} />
          </div>
        )}

        {activeTab === 'backhaul' && (
          <div className="animate-in fade-in duration-200">
            {/* Return Backhaul Load Matching & Acceptance */}
            <BackhaulBoard language={lang} />
          </div>
        )}
      </main>

      {/* Persistent Bottom Emergency & Highway Contacts Bar */}
      <footer className="sticky bottom-0 z-40 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 p-2 sm:p-3">
        <div className="max-w-7xl mx-auto">
          <EmergencyBar
            language={lang}
            onOpenEBilti={() => setIsEBiltiOpen(true)}
          />
        </div>
      </footer>

      {/* Statutory e-Bilti & RTO Inspection View Modal */}
      <EBiltiModal
        isOpen={isEBiltiOpen}
        onClose={() => setIsEBiltiOpen(false)}
        language={lang}
      />
    </div>
  );
}
