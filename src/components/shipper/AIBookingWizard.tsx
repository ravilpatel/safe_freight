'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MapPin,
  Package,
  Truck,
  FileCheck,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import {
  CORRIDOR_HUBS,
  TRUCK_SPECIFICATIONS,
  CARGO_CATEGORIES,
  calculateDynamicFreightQuote,
  calculateCorridorDistance,
  DetailedFreightQuote,
} from '@/lib/algorithms/quoteEstimator';
import { calculateAcceptanceProbability } from '@/lib/algorithms/acceptanceProbability';
import { formatINR } from '@/lib/algorithms/statutory';
import AcceptanceSlider from './AcceptanceSlider';
import ConsignmentToggles, { ConsignmentData } from './ConsignmentToggles';
import AdvanceCalendar from './AdvanceCalendar';

interface AIBookingWizardProps {
  initialOrigin?: string;
  initialDestination?: string;
  initialTruckType?: string;
  initialWeightKg?: number;
  onBookingSubmitted: (loadPayload: Record<string, unknown>) => Promise<boolean>;
}

export default function AIBookingWizard({
  initialOrigin = 'Mumbai JNPT Port',
  initialDestination = 'Ahmedabad Changodar Hub',
  initialTruckType = '19ft',
  initialWeightKg = 6500,
  onBookingSubmitted,
}: AIBookingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Step 1: Origin & Destination
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);

  // Step 2: Cargo Category & Payload
  const [cargoCategory, setCargoCategory] = useState('auto_parts');
  const [weightKg, setWeightKg] = useState(initialWeightKg);
  const [volumeCft, setVolumeCft] = useState(650);

  // Step 3: Vehicle Type Selection
  const [truckType, setTruckType] = useState(initialTruckType);

  // Step 4: Consignment & Commercial Toggles
  const [consignment, setConsignment] = useState<ConsignmentData>({
    consignorName: 'National Freight Logistics Ltd',
    consignorGstin: '27AAACW1234F1Z1',
    consigneeName: 'Gujarat Industrial Machinery Pvt Ltd',
    consigneeGstin: '24AAACW5678G1Z2',
    goodsDescription: 'Industrial precision automotive tooling & gears',
    declaredValueINR: 850000,
    hasEwayBill: true,
    ewayBillNumber: '241098234512',
    hasHamali: true,
    hasInsurance: true,
  });

  // Step 5: Advance Scheduling
  const todayStr = new Date().toISOString().split('T')[0];
  const [scheduledDate, setScheduledDate] = useState(todayStr);
  const [scheduledSlot, setScheduledSlot] = useState('08:00 – 12:00');

  // Step 6: Dynamic Bidding
  const [bonusAmountINR, setBonusAmountINR] = useState(1500);

  // Dynamic Quote Calculation
  const distanceKm = calculateCorridorDistance(origin, destination);
  const quote = calculateDynamicFreightQuote({
    origin,
    destination,
    distanceKm,
    truckType,
    weightKg,
    volumeCft,
  });

  const basePriceINR = quote.totalQuoteINR;
  const probabilityResult = calculateAcceptanceProbability(bonusAmountINR, basePriceINR);
  const finalPriceINR = basePriceINR + bonusAmountINR;

  const handleNextStep = () => {
    setSubmissionError(null);
    if (currentStep === 1 && origin === destination) {
      setSubmissionError('Origin and Destination hubs cannot be identical.');
      return;
    }
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setSubmissionError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    const payload = {
      origin_name: origin,
      destination_name: destination,
      distance_km: distanceKm,
      weight_kg: weightKg,
      volume_cft: volumeCft,
      cargo_category: cargoCategory,
      truck_type: truckType,
      pricing_inr: finalPriceINR,
      bid_bonus_inr: bonusAmountINR,
      acceptance_probability: probabilityResult.probabilityPercent,
      dispatch_speed_band: probabilityResult.dispatchSpeedBand,
      consignor_name: consignment.consignorName,
      consignor_gstin: consignment.consignorGstin,
      consignee_name: consignment.consigneeName,
      consignee_gstin: consignment.consigneeGstin,
      eway_bill_number: consignment.hasEwayBill ? consignment.ewayBillNumber : null,
      hamali_included: consignment.hasHamali,
      insurance_included: consignment.hasInsurance,
      scheduled_date: scheduledDate,
      scheduled_slot: scheduledSlot,
      status: 'open',
    };

    try {
      const success = await onBookingSubmitted(payload);
      if (success) {
        // Reset or jump to confirmation
        setCurrentStep(1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmissionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Corridor Route', icon: MapPin },
    { num: 2, title: 'Cargo & Payload', icon: Package },
    { num: 3, title: 'Vehicle Axle', icon: Truck },
    { num: 4, title: 'Statutory GST', icon: FileCheck },
    { num: 5, title: 'Pickup Window', icon: Calendar },
    { num: 6, title: 'InDrive Bidding', icon: TrendingUp },
  ];

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            AI Freight Booking Assistant (Feature 38)
          </div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            6-Step Corridor Dispatch Wizard
          </h2>
        </div>

        {/* Step Counter */}
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-neutral-500">
            STEP {currentStep} OF 6
          </span>
          <div className="text-xs font-semibold text-blue-600">
            {stepsList[currentStep - 1].title}
          </div>
        </div>
      </div>

      {/* Wizard Stepper Tabs */}
      <div className="grid grid-cols-6 gap-2">
        {stepsList.map((s) => {
          const StepIcon = s.icon;
          const isActive = currentStep === s.num;
          const isCompleted = currentStep > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => setCurrentStep(s.num)}
              className={`p-2 rounded-xl text-center border transition-all ${
                isActive
                  ? 'border-blue-600 bg-blue-50/70 text-blue-700 font-semibold'
                  : isCompleted
                    ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-400'
              }`}
            >
              <div className="flex justify-center mb-1">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>
              <div className="text-[10px] font-mono leading-none truncate hidden sm:block">
                {s.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {submissionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submissionError}</span>
        </div>
      )}

      {/* Step Contents */}
      <div className="min-h-[280px]">
        {/* STEP 1: Route Selection */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Step 1: Origin &amp; Destination Hubs along NH 48 Spine
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Pickup Hub (Consignor Facility)
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-blue-500"
                >
                  {CORRIDOR_HUBS.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name} ({h.state}) · KM {h.chainageKm}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Delivery Hub (Consignee Destination)
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-blue-500"
                >
                  {CORRIDOR_HUBS.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name} ({h.state}) · KM {h.chainageKm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-950 font-mono flex items-center justify-between">
              <div>
                Calculated Corridor Highway Distance: <strong>{distanceKm} km</strong>
              </div>
              <div>Estimated Transit: ~{quote.estimatedTransitHours} hours</div>
            </div>
          </div>
        )}

        {/* STEP 2: Cargo Category & Payload */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Step 2: Cargo Category, Weight &amp; Volumetric Space
            </h3>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-2">
                Cargo Classification Category:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {CARGO_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCargoCategory(cat.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      cargoCategory === cat.id
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold shadow-sm'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <div className="text-xs truncate">{cat.name}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      {cat.requiresReefer ? 'Reefer Required' : 'Standard Carriage'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-neutral-700">Gross Payload Weight</span>
                  <span className="font-mono font-bold text-blue-600">
                    {weightKg.toLocaleString('en-IN')} kg ({(weightKg / 1000).toFixed(1)} MT)
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="25000"
                  step="250"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full accent-blue-600 h-2 bg-neutral-200 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-neutral-700">Volumetric Volume</span>
                  <span className="font-mono font-bold text-blue-600">
                    {volumeCft} CFT ({(volumeCft / 35.315).toFixed(1)} CBM)
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1800"
                  step="25"
                  value={volumeCft}
                  onChange={(e) => setVolumeCft(Number(e.target.value))}
                  className="w-full accent-blue-600 h-2 bg-neutral-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Vehicle Type */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              Step 3: Vehicle Type &amp; Axle Capacity Specification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(TRUCK_SPECIFICATIONS).map((spec) => (
                <button
                  key={spec.type}
                  type="button"
                  onClick={() => setTruckType(spec.type)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    truckType === spec.type
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-sm'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-neutral-900">{spec.type}</span>
                    <span className="font-mono text-[10px] text-blue-700 bg-white px-2 py-0.5 rounded border border-neutral-200">
                      Up to {spec.capacityTons} MT
                    </span>
                  </div>
                  <div className="text-xs text-neutral-800 font-medium">{spec.name}</div>
                  <div className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                    {spec.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Consignment & Statutory Toggles */}
        {currentStep === 4 && (
          <ConsignmentToggles
            data={consignment}
            distanceKm={distanceKm}
            onChange={(updated) => setConsignment((prev) => ({ ...prev, ...updated }))}
          />
        )}

        {/* STEP 5: Advance Calendar Scheduling */}
        {currentStep === 5 && (
          <AdvanceCalendar
            selectedDate={scheduledDate}
            selectedSlot={scheduledSlot}
            onChangeDate={setScheduledDate}
            onChangeSlot={setScheduledSlot}
          />
        )}

        {/* STEP 6: InDrive Dynamic Bidding & Confirmation */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <AcceptanceSlider
              basePriceINR={basePriceINR}
              bonusAmountINR={bonusAmountINR}
              onChangeBonus={setBonusAmountINR}
            />

            {/* Booking Summary Box before submit */}
            <div className="p-5 rounded-xl bg-neutral-900 text-white font-mono text-xs space-y-3">
              <div className="flex justify-between items-center text-sm font-sans font-bold border-b border-neutral-800 pb-2">
                <span>Final Booking Confirmation</span>
                <span className="text-cyan-400 font-mono text-base">{formatINR(finalPriceINR)}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-neutral-500 block">CORRIDOR LEG</span>
                  <strong>{origin.split(' ')[0]} &rarr; {destination.split(' ')[0]}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">CARGO / WEIGHT</span>
                  <strong>{(weightKg / 1000).toFixed(1)} MT ({truckType})</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">SCHEDULE</span>
                  <strong>{scheduledDate} ({scheduledSlot.split(' ')[0]})</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">ACCEPTANCE PROB</span>
                  <strong className="text-emerald-400">{probabilityResult.probabilityPercent}% ({probabilityResult.dispatchSpeedBand})</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Bottom Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
        <div>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevStep}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-neutral-300 text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
        </div>

        <div>
          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <span>Next: {stepsList[currentStep].title}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting Load to Corridor...' : 'Confirm & Post Freight Booking'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
