'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { DriverLanguage, DRIVER_TRANSLATIONS } from './types';
import { audioSynth, speakCountdownNumber, speakRolloverWarning } from './audio';
import { deviceMotionService, MotionData } from '@/lib/telematics/deviceMotion';
import { offlineTelemetryQueue, QueueStatus } from '@/lib/telematics/offlineQueue';
import {
  PhoneCall,
  MessageCircle,
  FileText,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';

export interface EmergencyBarProps {
  language: DriverLanguage;
  onOpenEBilti: () => void;
  ownerPhone?: string;
  consigneePhone?: string;
  vehiclePlate?: string;
  currentCoords?: { lat: number; lng: number };
  currentSpeed?: number;
}

export function EmergencyBar({
  language,
  onOpenEBilti,
  ownerPhone = '+919820098200',
  consigneePhone = '+919876543210',
  vehiclePlate = 'GJ 05 AX 7824',
  currentCoords = { lat: 20.3712, lng: 72.9106 },
  currentSpeed = 62,
}: EmergencyBarProps) {
  const t = DRIVER_TRANSLATIONS[language] || DRIVER_TRANSLATIONS.en;

  // Emergency SOS modal and countdown states
  const [sosModalOpen, setSosModalOpen] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);
  const [emergencyType, setEmergencyType] = useState<string>('driver_sos_manual');
  const [currentGForce, setCurrentGForce] = useState<number>(1.0);
  const [simulationFeedback, setSimulationFeedback] = useState<string | null>(null);

  // Telematics & Offline Queue state
  const [queueStatus, setQueueStatus] = useState<QueueStatus>(offlineTelemetryQueue.getStatus());
  const [motionData, setMotionData] = useState<MotionData>(deviceMotionService.getCurrentMotion());

  // WhatsApp pre-filled text
  const whatsappText = encodeURIComponent(
    `[SafeFreight OS — Driver Update]\nVehicle: ${vehiclePlate}\nSpeed: ${currentSpeed} km/h\nLocation: ${currentCoords.lat}°N, ${currentCoords.lng}°E\nStatus: On Highway NH 48\nTracking URL: https://safefreight.in/track?v=${encodeURIComponent(vehiclePlate)}`
  );
  const whatsappUrl = `https://wa.me/${ownerPhone.replace(/[^0-9]/g, '')}?text=${whatsappText}`;

  // Telemetry & Hardware Sensors Listener
  useEffect(() => {
    deviceMotionService.startListening();

    const unsubMotion = deviceMotionService.onMotion((data) => {
      setMotionData(data);
    });

    const unsubCollision = deviceMotionService.onCollision((triage) => {
      setEmergencyType('crash');
      setCurrentGForce(triage.totalG);
      setCountdown(30);
      setIsDispatched(false);
      setSosModalOpen(true);
      audioSynth.startEmergencySiren();
      speakCountdownNumber(30, language);
    });

    const unsubRollover = deviceMotionService.onRollover(() => {
      audioSynth.playWarningBuzzer();
      speakRolloverWarning(language);
      setSimulationFeedback('⚠️ Rollover Warning! Chassis tilt > 30°. Voice alert triggered.');
      setTimeout(() => setSimulationFeedback(null), 5000);
    });

    const unsubQueue = offlineTelemetryQueue.subscribe((status) => {
      setQueueStatus(status);
    });

    return () => {
      deviceMotionService.stopListening();
      unsubMotion();
      unsubCollision();
      unsubRollover();
      unsubQueue();
    };
  }, [language]);

  // Periodic Telemetry Ping Enqueue
  useEffect(() => {
    const pingTimer = setInterval(() => {
      offlineTelemetryQueue.enqueuePing({
        latitude: currentCoords.lat,
        longitude: currentCoords.lng,
        speed_kmh: currentSpeed,
        g_force: motionData.totalG,
        ax: motionData.ax,
        ay: motionData.ay,
        az: motionData.az,
        timestamp: new Date().toISOString(),
      });
    }, 15000); // 15-second highway ping cadence

    return () => clearInterval(pingTimer);
  }, [currentCoords, currentSpeed, motionData]);

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (sosModalOpen && countdown > 0 && !isDispatched) {
      timer = setTimeout(() => {
        const next = countdown - 1;
        setCountdown(next);
        speakCountdownNumber(next, language);

        if (next === 0) {
          audioSynth.stopEmergencySiren();
          setIsDispatched(true);
          const payload = {
            vehicle_plate: vehiclePlate,
            coords: currentCoords,
            speed: currentSpeed,
            timestamp: new Date().toISOString(),
            emergency_type: emergencyType,
            g_force: currentGForce || 4.5,
          };

          if (!offlineTelemetryQueue.isOnline()) {
            offlineTelemetryQueue.enqueueDistress(payload);
          } else {
            fetch('/api/v1/safety/sos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }).catch(() => {
              offlineTelemetryQueue.enqueueDistress(payload);
            });
          }
        }
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [sosModalOpen, countdown, isDispatched, language, currentCoords, currentSpeed, vehiclePlate, emergencyType, currentGForce]);

  const handleStartSos = (type: string = 'driver_sos_manual', gForce: number = 4.5) => {
    audioSynth.playClickTone();
    setEmergencyType(type);
    setCurrentGForce(gForce);
    setCountdown(30);
    setIsDispatched(false);
    setSosModalOpen(true);
    audioSynth.startEmergencySiren();
    speakCountdownNumber(30, language);
  };

  const handleCancelSos = () => {
    audioSynth.stopEmergencySiren();
    audioSynth.playAffirmativeChime();
    setSosModalOpen(false);
    setIsDispatched(false);
    setCountdown(30);

    // Call cancellation API
    try {
      fetch('/api/v1/safety/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_plate: vehiclePlate,
          reason: 'Driver tapped 96dp cancellation button (False Alarm)',
        }),
      }).catch(() => {});
    } catch {
      // Degrade gracefully
    }
  };

  return (
    <>
      {/* Telemetry Status & Hardware Simulator Strip */}
      <div className="bg-neutral-950/90 border-t border-neutral-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3">
        {/* Connectivity Dot & AIS-140 Live Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold">
            {queueStatus.isOnline ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3.5 h-3.5" />
                <span>Online (Sync Active)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline ({queueStatus.queuedPingsCount} queued)</span>
              </span>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-neutral-400 font-mono">
            <span>AIS-140 G: <strong className="text-white">{motionData.totalG.toFixed(2)}G</strong></span>
            <span>·</span>
            <span>Tilt: <strong className="text-white">{motionData.tiltAngle.toFixed(1)}°</strong></span>
          </div>
        </div>

        {/* In-App Crash Simulation Test Suite (PRD v3 FR-SF-01) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider hidden md:inline">
            AIS-140 Sim:
          </span>
          <button
            type="button"
            onClick={() => {
              const res = deviceMotionService.simulatePothole();
              setSimulationFeedback(`Road Pothole (${res.totalG}G < 2.5G threshold): Filtered as normal road noise.`);
              setTimeout(() => setSimulationFeedback(null), 4000);
            }}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[11px] border border-neutral-700 transition"
          >
            Pothole (2.05G)
          </button>
          <button
            type="button"
            onClick={() => {
              const res = deviceMotionService.simulatePhoneDrop();
              setSimulationFeedback(`Phone Drop (${res.totalG}G on az alone): Filtered as single-axis vertical transient.`);
              setTimeout(() => setSimulationFeedback(null), 4000);
            }}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[11px] border border-neutral-700 transition"
          >
            Phone Drop (3.57G)
          </button>
          <button
            type="button"
            onClick={() => {
              deviceMotionService.simulateCollision();
            }}
            className="px-2.5 py-1 rounded bg-red-950 hover:bg-red-900 text-red-200 font-mono text-[11px] border border-red-700 transition font-bold"
          >
            Crash (4.60G)
          </button>
          <button
            type="button"
            onClick={() => {
              deviceMotionService.simulateRollover(34.5);
            }}
            className="px-2.5 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-200 font-mono text-[11px] border border-amber-700 transition font-bold"
          >
            Rollover (&gt;30°)
          </button>
        </div>
      </div>

      {simulationFeedback && (
        <div className="bg-sky-950 border-b border-sky-800 text-sky-200 text-xs px-4 py-1.5 text-center font-medium">
          {simulationFeedback}
        </div>
      )}

      {/* Highway Persistent Bottom Action Bar */}
      <div className="bg-neutral-900 border-t-2 border-neutral-800 p-4 rounded-2xl shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left/Middle Action Links (>= 56dp Touch Target) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto flex-1">
            {/* Call Fleet Owner */}
            <a
              href={`tel:${ownerPhone}`}
              onClick={() => audioSynth.playClickTone()}
              className="min-h-[56px] min-w-[56px] px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-base flex items-center justify-center gap-2 border border-neutral-700 transition-colors active:scale-95"
            >
              <PhoneCall className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="truncate">{t.callOwner}</span>
            </a>

            {/* WhatsApp Chat with Owner */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => audioSynth.playClickTone()}
              className="min-h-[56px] min-w-[56px] px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-base flex items-center justify-center gap-2 border border-neutral-700 transition-colors active:scale-95"
            >
              <MessageCircle className="w-5 h-5 text-green-400 shrink-0" />
              <span className="truncate">{t.whatsappOwner}</span>
            </a>

            {/* Call Consignee / Party Hub */}
            <a
              href={`tel:${consigneePhone}`}
              onClick={() => audioSynth.playClickTone()}
              className="min-h-[56px] min-w-[56px] px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-base flex items-center justify-center gap-2 border border-neutral-700 transition-colors active:scale-95"
            >
              <PhoneCall className="w-5 h-5 text-sky-400 shrink-0" />
              <span className="truncate">{t.callParty}</span>
            </a>

            {/* Statutory e-Bilti / RTO Pass Modal Trigger */}
            <button
              type="button"
              onClick={() => {
                audioSynth.playClickTone();
                onOpenEBilti();
              }}
              className="min-h-[56px] min-w-[56px] px-3.5 py-2.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-200 font-bold text-base flex items-center justify-center gap-2 border border-sky-700 transition-colors active:scale-95"
            >
              <FileText className="w-5 h-5 text-sky-400 shrink-0" />
              <span className="truncate">{t.rtoQrPass}</span>
            </button>
          </div>

          {/* Centered 96dp Emergency SOS Touch Target */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <button
              type="button"
              onClick={() => handleStartSos('driver_sos_manual', 4.5)}
              className="w-24 h-24 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex flex-col items-center justify-center shadow-2xl border-4 border-red-300 transition-transform active:scale-90 animate-pulse select-none"
              style={{ width: '96px', height: '96px', minWidth: '96px', minHeight: '96px' }}
              aria-label="Emergency SOS (96dp)"
            >
              <AlertOctagon className="w-8 h-8 text-white" />
              <span className="text-sm font-black uppercase tracking-wider mt-0.5">
                SOS
              </span>
            </button>
            <span className="text-sm font-bold text-red-400 mt-1">
              {t.sosAlarmLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 30-Second Audible Emergency SOS Countdown Modal */}
      <Modal
        isOpen={sosModalOpen}
        onClose={handleCancelSos}
        showCloseButton={false}
        className="bg-neutral-950 border-2 border-red-600 text-center max-w-md p-6"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-950 border-2 border-red-500 flex items-center justify-center animate-bounce">
            <ShieldAlert className="w-9 h-9 text-red-500" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {emergencyType === 'crash' ? '⚠️ CRASH IMPACT DETECTED (AIS-140)' : t.sosButton}
            </h2>
            <p className="text-base text-red-300 font-medium mt-1">
              {isDispatched ? t.distressDispatched : t.sosPrompt}
            </p>
          </div>

          {!isDispatched ? (
            <>
              {/* Giant Countdown Digits */}
              <div className="w-32 h-32 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-950/60 shadow-inner">
                <span className="text-6xl font-black text-white font-mono">
                  {countdown}
                </span>
              </div>
              <p className="text-base text-neutral-300 font-semibold">
                {t.sirenActiveInfo}
              </p>

              {/* Centered 96dp False Alarm Cancel Button */}
              <div className="pt-2 w-full">
                <Button
                  type="button"
                  variant="teal"
                  size="emergency96"
                  fullWidth
                  onClick={handleCancelSos}
                  className="bg-[#10b981] hover:bg-[#059669] text-neutral-950 font-black text-2xl min-h-[96px] border-4 border-emerald-300 shadow-2xl"
                >
                  <ShieldCheck className="w-7 h-7 mr-2" />
                  {t.safeCancelBtn}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-red-900/50 border border-red-700 text-left text-base text-white space-y-1">
                <p>• {t.distressPoint1}</p>
                <p>• {t.distressPoint2}</p>
                <p>• {t.distressPoint3}</p>
                <p>• {vehiclePlate} · {currentCoords.lat}°N, {currentCoords.lng}°E</p>
                <p>• Emergency T0/T1 logged into national corridor Golden Hour console.</p>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="touch56"
                fullWidth
                onClick={handleCancelSos}
                className="bg-neutral-800 text-white font-bold text-xl min-h-[56px]"
              >
                {t.dismissBtn}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
