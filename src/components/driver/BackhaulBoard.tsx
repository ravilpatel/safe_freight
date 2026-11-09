'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DriverLanguage, DRIVER_TRANSLATIONS, BackhaulLoadItem } from './types';
import { audioSynth } from './audio';
import {
  TrendingUp,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export interface BackhaulBoardProps {
  language: DriverLanguage;
  onLoadAccepted?: (_loadId: string) => void;
}

export function BackhaulBoard({ language, onLoadAccepted }: BackhaulBoardProps) {
  const t = DRIVER_TRANSLATIONS[language] || DRIVER_TRANSLATIONS.en;

  const [loads, setLoads] = useState<BackhaulLoadItem[]>([
    {
      id: 'load-ahmd-bom-01',
      commodity: {
        hi: 'ऑटोमोबाइल पार्ट्स व मशीनरी',
        gu: 'ઓટોમોબાઇલ પાર્ટ્સ અને મશીનરી',
        mr: 'ऑटोमोबाईल पार्ट्स आणि मशिनरी',
        te: 'ఆటోమొబైల్ విడిభాగాలు మరియు యంత్రాలు',
        en: 'Automobile Parts & Machinery',
      },
      weightTons: 18.5,
      truckType: {
        hi: 'फुल ट्रक (FTL)',
        gu: 'ફુલ ટ્રક (FTL)',
        mr: 'फुल ट्रक (FTL)',
        te: 'ఫుల్ ట్రక్ (FTL)',
        en: 'Full Truck (FTL)',
      },
      origin: 'Changodar Industrial Estate, Ahmedabad',
      destination: 'Bhiwandi Logistics Hub, Mumbai',
      revenueINR: 42500,
      detourKm: 8,
      profitScorePercent: 96,
      shipperName: 'Tata Motors Component Vendor',
      isAccepted: false,
    },
    {
      id: 'load-ahmd-bom-02',
      commodity: {
        hi: 'कॉटन बेल्स व टेक्सटाइल',
        gu: 'કપાસની ગાંસડીઓ અને કાપડ',
        mr: 'कापूस गाठी व कापड',
        te: 'పత్తి బేళ్లు మరియు వస్త్రాలు',
        en: 'Cotton Bales & Textiles',
      },
      weightTons: 14.0,
      truckType: {
        hi: 'पार्ट लोड (LTL)',
        gu: 'પાર્ટ લોડ (LTL)',
        mr: 'पार्ट लोड (LTL)',
        te: 'పార్ట్ లోడ్ (LTL)',
        en: 'Part Load (LTL)',
      },
      origin: 'Narol Textile Park, Ahmedabad',
      destination: 'Surat Sachin GIDC (Mid-Corridor)',
      revenueINR: 22000,
      detourKm: 4,
      profitScorePercent: 91,
      shipperName: 'Gujarat Cotton Exporters',
      isAccepted: false,
    },
    {
      id: 'load-ahmd-bom-03',
      commodity: {
        hi: 'फार्मास्युटिकल रसायन (Pharma Batch)',
        gu: 'ફાર્મા કેમિકલ્સ (દવા ઉત્પાદન)',
        mr: 'फार्मास्युटिकल रसायने',
        te: 'ఫార్మాస్యూటికల్ రసాయనాలు',
        en: 'Pharmaceutical Chemicals',
      },
      weightTons: 12.5,
      truckType: {
        hi: 'पार्ट लोड (LTL)',
        gu: 'પાર્ટ લોડ (LTL)',
        mr: 'पार्ट लोड (LTL)',
        te: 'పార్ట్ లోడ్ (LTL)',
        en: 'Part Load (LTL)',
      },
      origin: 'Sanand GIDC, Ahmedabad',
      destination: 'JNPT Port Container Terminal, Panvel',
      revenueINR: 36000,
      detourKm: 12,
      profitScorePercent: 88,
      shipperName: 'Zydus Lifesciences Dispatch',
      isAccepted: false,
    },
  ]);

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  const handleAcceptLoad = async (loadId: string) => {
    try {
      setAcceptingId(loadId);
      audioSynth.playClickTone();

      // Invoke POST /api/v1/loads/accept
      try {
        const res = await fetch('/api/v1/loads/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `accept-${loadId}`,
          },
          body: JSON.stringify({ load_id: loadId }),
        });

        if (res.status === 409) {
          audioSynth.playWarningBuzzer();
          setFeedback({
            message: t.alreadyAccepted,
            type: 'error',
          });
          return;
        }
      } catch {
        // Degrade gracefully in local preview
      }

      audioSynth.playAffirmativeChime();
      setLoads((prev) =>
        prev.map((l) => (l.id === loadId ? { ...l, isAccepted: true } : l))
      );
      setFeedback({
        message: t.loadAcceptedSuccess,
        type: 'success',
      });
      setTimeout(() => setFeedback(null), 4000);

      if (onLoadAccepted) {
        onLoadAccepted(loadId);
      }
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="pb-3 border-b border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-400" />
                {t.backhaulTitle}
              </CardTitle>
              <p className="text-base text-neutral-300 mt-1 font-medium">
                {t.backhaulSubtitle}
              </p>
            </div>
            <Badge variant="teal" size="sm" className="text-base px-3 py-1 font-black">
              3 {t.loadsAvailable}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {feedback && (
            <div
              className={`p-4 rounded-xl flex items-center gap-2 text-base font-bold animate-in fade-in ${
                feedback.type === 'error'
                  ? 'bg-red-950/80 text-red-200 border border-red-800'
                  : 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'
              }`}
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {loads.map((load) => {
              const isAccepted = load.isAccepted;
              const isProcessing = acceptingId === load.id;

              return (
                <div
                  key={load.id}
                  className={`p-5 rounded-2xl border-2 transition-all select-none ${
                    isAccepted
                      ? 'bg-emerald-950/30 border-emerald-600/80'
                      : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="navy" size="sm" className="text-sm font-bold">
                          {load.truckType[language] || load.truckType.hi}
                        </Badge>
                        <span className="text-base text-neutral-300 font-semibold">
                          {load.shipperName}
                        </span>
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black text-white mt-1">
                        {load.commodity[language] || load.commodity.hi}
                      </h4>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                        ₹{load.revenueINR.toLocaleString('en-IN')}
                      </span>
                      <span className="text-base font-bold text-neutral-400">
                        ({load.weightTons} MT)
                      </span>
                    </div>
                  </div>

                  {/* Route Corridor & Detour Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-base text-neutral-200 py-2 border-y border-neutral-800/80">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-5 h-5 text-sky-400 shrink-0" />
                      <span className="truncate">
                        {load.origin} ➔ {load.destination}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-neutral-300">
                      <span>{t.detourPrefix} +{load.detourKm} km</span>
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {t.marginPrefix} {load.profitScorePercent}%
                      </span>
                    </div>
                  </div>

                  {/* 1-Tap Accept Action Button (>= 56dp Touch Target) */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-base text-neutral-400 font-medium">
                      {isAccepted
                        ? t.acceptedBadge
                        : t.acceptLoadBtn}
                    </span>

                    {isAccepted ? (
                      <Badge variant="success" size="lg" className="min-h-[56px] px-6 text-xl font-black">
                        <CheckCircle2 className="w-6 h-6 mr-1.5" />
                        {t.acceptedBadge}
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="teal"
                        size="touch56"
                        disabled={isProcessing}
                        onClick={() => handleAcceptLoad(load.id)}
                        className="bg-[#10b981] hover:bg-[#059669] text-neutral-950 font-black text-xl sm:text-2xl shadow-lg min-h-[56px] px-8"
                      >
                        {isProcessing ? t.processingLoad : t.acceptLoadBtn}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
