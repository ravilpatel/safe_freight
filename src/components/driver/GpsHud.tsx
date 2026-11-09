'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DriverLanguage, DRIVER_TRANSLATIONS } from './types';
import { Navigation, Gauge, Wifi, WifiOff, MapPin, Activity, Compass } from 'lucide-react';
import { deviceMotionService, MotionData } from '@/lib/telematics/deviceMotion';

export interface GpsHudProps {
  language: DriverLanguage;
  isOnline?: boolean;
}

export function GpsHud({ language, isOnline = true }: GpsHudProps) {
  const t = DRIVER_TRANSLATIONS[language] || DRIVER_TRANSLATIONS.en;

  // Real-time HUD states
  const [speed, setSpeed] = useState<number>(62);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 20.3712, // Near Vapi / Valsad on NH 48
    lng: 72.9106,
  });
  const [altitude] = useState<number>(42);
  const [heading] = useState<number>(14); // North-North-East along NH 48
  const [pingTime, setPingTime] = useState<string>('');
  const [routeProgress] = useState<number>(48); // % along Mumbai-Ahmedabad
  const [motion, setMotion] = useState<MotionData>(deviceMotionService.getCurrentMotion());

  useEffect(() => {
    return deviceMotionService.onMotion((data) => {
      setMotion(data);
    });
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setPingTime(
        now.toLocaleTimeString(language === 'en' ? 'en-IN' : 'hi-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(() => {
      updateTime();
      // Realistic highway telemetry fluctuation
      setSpeed((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.min(78, Math.max(54, prev + delta));
      });
      setCoords((prev) => ({
        lat: Number((prev.lat + 0.0002).toFixed(4)),
        lng: Number((prev.lng + 0.0001).toFixed(4)),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [language]);

  return (
    <div className="space-y-4">
      {/* Top Telematics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                {t.aisBeacon}
              </span>
              <span className="text-xs text-neutral-400">· {pingTime}</span>
            </div>
            <p className="text-base font-black text-white tracking-wide">
              {t.activeVehicle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 text-xs font-mono">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-neutral-400">G:</span>
            <span className="text-white font-bold">{motion.totalG.toFixed(2)}G</span>
            <span className="text-neutral-600">|</span>
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-neutral-400">Tilt:</span>
            <span className="text-white font-bold">{motion.tiltAngle.toFixed(1)}°</span>
          </div>

          {isOnline ? (
            <Badge variant="teal" size="sm" className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" />
              <span>{t.online}</span>
            </Badge>
          ) : (
            <Badge variant="warning" size="sm" className="flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" />
              <span>{t.offline}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Main Speedometer & Live Navigation HUD */}
      <Card className="bg-gradient-to-b from-neutral-900 to-neutral-950 border-neutral-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Speedometer Gauge */}
            <div className="flex flex-col items-center justify-center p-4 bg-neutral-950/80 rounded-2xl border border-neutral-800/80 shadow-inner">
              <div className="flex items-center gap-2 text-neutral-400 mb-1">
                <Gauge className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Live Speed
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white tracking-tighter">
                  {speed}
                </span>
                <span className="text-lg font-bold text-emerald-400">
                  {t.speedUnit}
                </span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    speed > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(speed / 80) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-neutral-400 mt-1.5 font-medium">
                Speed Limit: 80 km/h · Safe Highway Cruising
              </span>
            </div>

            {/* Coordinates & Corridor Status */}
            <div className="flex flex-col justify-center space-y-3 p-4 bg-neutral-950/80 rounded-2xl border border-neutral-800/80">
              <div className="flex items-center gap-2 text-sky-400">
                <Navigation className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Corridor Waypoint
                </span>
              </div>

              <div>
                <p className="text-lg font-bold text-white tracking-tight">
                  {t.corridorName}
                </p>
                <p className="text-xs text-neutral-400 font-medium mt-0.5">
                  Currently Passing: Vapi / Valsad Toll Plaza (KM 165)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80 text-xs">
                <div>
                  <span className="text-neutral-500 font-semibold block">GPS Coordinates</span>
                  <span className="font-mono text-neutral-200 font-bold">
                    {coords.lat}°N, {coords.lng}°E
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 font-semibold block">Altitude / Heading</span>
                  <span className="font-mono text-neutral-200 font-bold">
                    {altitude}m · {heading}° NNE
                  </span>
                </div>
              </div>
            </div>

            {/* Corridor Journey Mini Preview */}
            <div className="flex flex-col justify-between p-4 bg-neutral-950/80 rounded-2xl border border-neutral-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Trip Progress (NH 48)
                </span>
                <span className="text-xs font-black text-emerald-400">
                  {routeProgress}%
                </span>
              </div>

              {/* Highway Route Spine Visualizer */}
              <div className="relative py-3">
                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500"
                    style={{ width: `${routeProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-neutral-400 mt-2">
                  <span>Mumbai (0 km)</span>
                  <span className="text-sky-400">Surat (280 km)</span>
                  <span>Ahmd (525 km)</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
                <span>Completed: 252 km</span>
                <span className="text-white font-bold">Remaining: 273 km</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
