'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DriverLanguage, DRIVER_TRANSLATIONS } from './types';
import { audioSynth } from './audio';
import {
  Warehouse,
  CheckCircle2,
  Truck,
  Coffee,
  Building2,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';

export interface MilestoneTrackerProps {
  language: DriverLanguage;
  tripId?: string;
  onMilestoneChange?: (_stage: number, _statusKey: string) => void;
}

export function MilestoneTracker({
  language,
  tripId = 'trip-nh48-live-01',
  onMilestoneChange,
}: MilestoneTrackerProps) {
  const t = DRIVER_TRANSLATIONS[language] || DRIVER_TRANSLATIONS.en;

  const [currentStep, setCurrentStep] = useState<number>(3); // Currently "हाइवे पर" (On Highway)
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  const stages = [
    {
      step: 1,
      title: t.m1,
      desc: t.m1Desc,
      statusKey: 'at_pickup',
      icon: Warehouse,
    },
    {
      step: 2,
      title: t.m2,
      desc: t.m2Desc,
      statusKey: 'loaded',
      icon: CheckCircle2,
    },
    {
      step: 3,
      title: t.m3,
      desc: t.m3Desc,
      statusKey: 'in_transit',
      icon: Truck,
    },
    {
      step: 4,
      title: t.m4,
      desc: t.m4Desc,
      statusKey: 'halt',
      icon: Coffee,
    },
    {
      step: 5,
      title: t.m5,
      desc: t.m5Desc,
      statusKey: 'at_unloading',
      icon: Building2,
    },
    {
      step: 6,
      title: t.m6,
      desc: t.m6Desc,
      statusKey: 'completed',
      icon: PackageCheck,
    },
  ];

  const handleStageClick = async (step: number, statusKey: string) => {
    // Terminal state protection: if trip is already completed (step 6), prevent reopening
    if (currentStep === 6) {
      audioSynth.playWarningBuzzer();
      setFeedback({
        message: t.tripAlreadyCompletedAlert || 'यह ट्रिप पूरी हो चुकी है और इसमें बदलाव नहीं किया जा सकता',
        type: 'error',
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    // Sequential validation rule: Can only click current step or immediate next step
    if (step !== currentStep && step !== currentStep + 1) {
      audioSynth.playWarningBuzzer();
      setFeedback({
        message: t.milestoneOrderAlert,
        type: 'error',
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    try {
      setLoading(true);
      audioSynth.playAffirmativeChime();

      // Attempt PATCH /api/v1/trips with deterministic Idempotency-Key
      try {
        await fetch('/api/v1/trips', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `milestone-${tripId}-${statusKey}`,
          },
          body: JSON.stringify({
            trip_id: tripId,
            milestone_status: statusKey,
          }),
        });
      } catch {
        // Offline / background fallback
      }

      setCurrentStep(step);
      setFeedback({
        message: `${t.milestoneSuccess} (${stages[step - 1].title})`,
        type: 'success',
      });
      setTimeout(() => setFeedback(null), 3000);

      if (onMilestoneChange) {
        onMilestoneChange(step, statusKey);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-neutral-900 border-neutral-800 shadow-xl">
      <CardHeader className="pb-3 border-b border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-emerald-400" />
              {t.milestoneTrackerTitle}
            </CardTitle>
            <p className="text-base text-neutral-300 mt-1 font-medium">
              {t.milestoneTrackerDesc}
            </p>
          </div>
          <Badge variant="teal" size="sm" className="text-base px-3 py-1 font-black">
            {t.stagePrefix} {currentStep} / 6
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {feedback && (
          <div
            className={`mb-4 p-4 rounded-xl flex items-center gap-2 text-base font-bold animate-in fade-in ${
              feedback.type === 'error'
                ? 'bg-red-950/80 text-red-200 border border-red-800'
                : 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'
            }`}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* 6 Large Buttons (>= 56dp Touch Target) Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const isCompleted = stage.step < currentStep;
            const isCurrent = stage.step === currentStep;
            const isNext = stage.step === currentStep + 1;

            return (
              <button
                key={stage.step}
                type="button"
                disabled={loading}
                onClick={() => handleStageClick(stage.step, stage.statusKey)}
                className={`min-h-[76px] p-4 rounded-2xl flex items-center justify-between transition-all select-none text-left border-2 active:scale-[0.98] ${
                  isCurrent
                    ? 'bg-[#0075de]/20 border-[#0075de] text-white shadow-lg ring-2 ring-[#0075de]/40'
                    : isCompleted
                    ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200 hover:bg-emerald-950/50'
                    : isNext
                    ? 'bg-neutral-800/90 border-neutral-700 text-neutral-200 hover:border-amber-500/80 hover:bg-neutral-800'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-500 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-lg ${
                      isCurrent
                        ? 'bg-[#0075de] text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-neutral-400">
                        #{stage.step}
                      </span>
                      <p className="text-xl sm:text-2xl font-black truncate text-white">
                        {stage.title}
                      </p>
                    </div>
                    <p className="text-base text-neutral-300 truncate mt-0.5">
                      {stage.desc}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {isCurrent && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-black bg-[#0075de] text-white uppercase">
                      {t.activeBadge}
                    </span>
                  )}
                  {isCompleted && (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  )}
                  {isNext && (
                    <span className="text-base font-bold text-amber-400 underline">
                      {t.nextBadge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
