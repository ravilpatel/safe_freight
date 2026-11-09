'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DriverLanguage, DRIVER_TRANSLATIONS } from './types';
import { calculate3WayRoutes, RouteOption, RouteType } from '@/lib/algorithms/routeOptimizer';
import { audioSynth, speakText } from './audio';
import {
  Zap,
  Shield,
  Leaf,
  Volume2,
  MapPin,
  Navigation,
} from 'lucide-react';

export interface RouteSelectorProps {
  language: DriverLanguage;
  origin?: string;
  destination?: string;
  onRouteSelect?: (_route: RouteOption) => void;
}

export function RouteSelector({
  language,
  origin = 'Mumbai JNPT',
  destination = 'Ahmedabad Changodar',
  onRouteSelect,
}: RouteSelectorProps) {
  const t = DRIVER_TRANSLATIONS[language] || DRIVER_TRANSLATIONS.en;

  // Compute 3-way route options from algorithmic engine
  const routes = calculate3WayRoutes(origin, destination, true, 525);
  const [selectedType, setSelectedType] = useState<RouteType>('fastest');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const selectedRoute = routes.find((r) => r.type === selectedType) || routes[0];

  // NH 48 Corridor Checkpoints
  const checkpoints = [
    {
      name: 'मुंबई जेएनपीटी पोर्ट हब (JNPT Panvel)',
      km: 0,
      status: 'passed',
      plaza: 'क्रीक ब्रिज टोल',
      toll: 180,
    },
    {
      name: 'वापी चेकपोस्ट (गुजरात बॉर्डर)',
      km: 165,
      status: 'current',
      plaza: 'भिलाड टोल प्लाजा',
      toll: 235,
    },
    {
      name: 'सूरत इंडस्ट्रियल हब (सचिन GIDC)',
      km: 280,
      status: 'upcoming',
      plaza: 'चोरयासी टोल प्लाजा',
      toll: 190,
    },
    {
      name: 'भरूच नर्मदा ब्रिज',
      km: 360,
      status: 'upcoming',
      plaza: 'नर्मदा न्यू केबल ब्रिज',
      toll: 145,
    },
    {
      name: 'वडोदरा एक्सप्रेसवे बाईपास',
      km: 430,
      status: 'upcoming',
      plaza: 'कर्जन टोल प्लाजा',
      toll: 220,
    },
    {
      name: 'अहमदाबाद चांगोदर लॉजिस्टिक्स पार्क',
      km: 525,
      status: 'upcoming',
      plaza: 'चांगोदर प्रवेश नाका',
      toll: 0,
    },
  ];

  const handleSelect = (route: RouteOption) => {
    audioSynth.playClickTone();
    setSelectedType(route.type);
    if (onRouteSelect) {
      onRouteSelect(route);
    }
  };

  const handleVoiceGuidance = () => {
    audioSynth.playClickTone();
    setIsSpeaking(true);

    let summary = '';
    if (language === 'hi') {
      summary = `चालक महोदय, ${selectedRoute.name} चुना गया है। कुल दूरी ${selectedRoute.distanceKm} किलोमीटर है। अनुमानित समय ${selectedRoute.durationFormatted} है। फास्टैग टोल लगभग ${selectedRoute.fastagTollINR} रुपये और डीजल ${selectedRoute.fuelLiters} लीटर लगेगा। अगला चेकपॉइंट वापी टोल प्लाजा है। कृपया गति 80 किमी प्रति घंटा से नीचे रखें।`;
    } else if (language === 'gu') {
      summary = `ડ્રાઈવર સાહેબ, ${selectedRoute.name} પસંદ કરેલ છે. કુલ અંતર ${selectedRoute.distanceKm} કિલોમીટર છે. અંદાજિત સમય ${selectedRoute.durationFormatted} છે. વાપી ટોલ પ્લાઝા પર આગળ ચેકિંગ છે. સુરક્ષિત રીતે વાહન ચલાવો.`;
    } else if (language === 'mr') {
      summary = `चालक महोदय, ${selectedRoute.name} निवडला आहे. एकूण अंतर ${selectedRoute.distanceKm} किलोमीटर आहे. प्रवासाची वेळ ${selectedRoute.durationFormatted} आहे. पुढील थांबा वापी चेकपोस्ट आहे.`;
    } else if (language === 'te') {
      summary = `డ్రైవర్ గారు, ${selectedRoute.name} ఎంచుకున్నారు. మొత్తం దూరం ${selectedRoute.distanceKm} కిలోమీటర్లు. ప్రయాణ సమయం ${selectedRoute.durationFormatted}. సురక్షితంగా నడపండి.`;
    } else {
      summary = `Attention driver. You have selected ${selectedRoute.name}. Total distance is ${selectedRoute.distanceKm} kilometers with an estimated travel duration of ${selectedRoute.durationFormatted}. FASTag tolls total ₹${selectedRoute.fastagTollINR} and estimated diesel is ${selectedRoute.fuelLiters} liters. Next waypoint is Vapi border checkpoint. Maintain safe speeds.`;
    }

    speakText(summary, language);
    setTimeout(() => setIsSpeaking(false), 5000);
  };

  return (
    <div className="space-y-4">
      {/* 3-Way Corridor Route Cards Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {routes.map((route) => {
          const isSelected = route.type === selectedType;
          let RouteIcon = Zap;
          let iconColor = 'text-amber-400';
          let borderAccent = 'hover:border-amber-500/80';

          if (route.type === 'toll_optimized') {
            RouteIcon = Shield;
            iconColor = 'text-emerald-400';
            borderAccent = 'hover:border-emerald-500/80';
          } else if (route.type === 'eco_fuel') {
            RouteIcon = Leaf;
            iconColor = 'text-sky-400';
            borderAccent = 'hover:border-sky-500/80';
          }

          return (
            <div
              key={route.type}
              onClick={() => handleSelect(route)}
              className={`p-4 rounded-2xl cursor-pointer border-2 transition-all select-none ${
                isSelected
                  ? 'bg-neutral-900 border-[#0075de] ring-2 ring-[#0075de]/40 shadow-xl'
                  : `bg-neutral-900/80 border-neutral-800 ${borderAccent} text-neutral-300`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RouteIcon className={`w-6 h-6 ${iconColor}`} />
                  <span className="text-xl sm:text-2xl font-black text-white">
                    {route.name}
                  </span>
                </div>
                {isSelected && (
                  <Badge variant="teal" size="sm" className="text-sm font-bold">
                    {t.activeRouteBadge}
                  </Badge>
                )}
              </div>

              <p className="text-base text-neutral-300 mb-3 line-clamp-1">
                {route.description}
              </p>

              <div className="grid grid-cols-2 gap-2 text-base pt-2 border-t border-neutral-800/80">
                <div>
                  <span className="text-neutral-400 block font-semibold">{t.distance}</span>
                  <span className="font-bold text-white text-lg">{route.distanceKm} km</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">{t.estTime}</span>
                  <span className="font-bold text-white text-lg">{route.durationFormatted}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">{t.tollFee}</span>
                  <span className="font-bold text-emerald-400 text-lg">₹{route.fastagTollINR}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-semibold">{t.fuelEst}</span>
                  <span className="font-bold text-amber-400 text-lg">{route.fuelLiters} L</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-base">
                <span className="text-neutral-300 font-semibold">{t.totalCostLabel}</span>
                <span className="text-xl font-black text-white">
                  ₹{route.totalCostINR.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Voice Guidance & Active Route Banner */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-sky-950/80 border border-sky-700/60 flex items-center justify-center shrink-0">
              <Navigation className="w-7 h-7 text-sky-400" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-white">
                {t.selectedRouteInfo} {selectedRoute.name} ({selectedRoute.distanceKm} km · {selectedRoute.speedKmh} km/h)
              </p>
              <p className="text-base text-neutral-300 font-medium">
                {origin} ➔ {destination} · {t.stateTax}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="touch56"
            onClick={handleVoiceGuidance}
            className="bg-[#0075de] hover:bg-[#0060b8] text-white font-black text-xl sm:text-2xl shadow-lg min-h-[56px] px-8"
          >
            <Volume2 className={`w-6 h-6 mr-2 ${isSpeaking ? 'animate-bounce text-emerald-300' : ''}`} />
            {isSpeaking ? t.speakingPrompt : t.audioListenBtn}
          </Button>
        </CardContent>
      </Card>

      {/* NH 48 Corridor Checkpoints Table */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="pb-3 border-b border-neutral-800">
          <CardTitle className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-400" />
            {t.corridorCheckpointsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-neutral-800/80 text-base">
            {checkpoints.map((cp, idx) => (
              <div
                key={idx}
                className="p-3.5 flex items-center justify-between hover:bg-neutral-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] ${
                      cp.status === 'passed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                        : cp.status === 'current'
                        ? 'bg-sky-950 text-sky-400 border border-sky-500 animate-pulse'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{cp.name}</p>
                    <p className="text-neutral-400 text-[11px]">
                      प्लाजा: {cp.plaza} · किमी {cp.km}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-neutral-200">
                    {cp.toll > 0 ? `₹${cp.toll} टोल` : 'बॉर्डर नाका'}
                  </span>
                  <span className="block text-[10px] text-neutral-500 uppercase font-semibold">
                    {cp.status === 'passed'
                      ? 'पार किया'
                      : cp.status === 'current'
                      ? 'वर्तमान'
                      : 'आगामी'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
