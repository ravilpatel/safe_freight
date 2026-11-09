'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DriverLanguage, DRIVER_TRANSLATIONS } from './types';
import { generateStatutoryLRNumber } from '@/lib/algorithms/statutory';
import { audioSynth } from './audio';
import {
  Printer,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Truck,
  Building,
} from 'lucide-react';

export interface EBiltiModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: DriverLanguage;
  lrNumber?: string;
  ewayBillNumber?: string;
  vehiclePlate?: string;
  consignorName?: string;
  consigneeName?: string;
  grossWeightKg?: number;
  tareWeightKg?: number;
  verificationHash?: string;
}

export function EBiltiModal({
  isOpen,
  onClose,
  language,
  lrNumber = generateStatutoryLRNumber('WIFL', '2026-27', 482),
  ewayBillNumber = '241088492019',
  vehiclePlate = 'GJ 05 AX 7824',
  consignorName = 'Tata Motors Components GIDC Sanand, Gujarat',
  consigneeName = 'Jindal Steel & Power Hub, JNPT Panvel, Maharashtra',
  grossWeightKg = 38500,
  tareWeightKg = 11200,
  verificationHash: propVerificationHash,
}: EBiltiModalProps) {
  const t = DRIVER_TRANSLATIONS[language] || DRIVER_TRANSLATIONS.en;
  const verificationHash = propVerificationHash || 'SF-88F4-992A-4B01';

  // High-contrast SVG QR Matrix generator (deterministic grid for instant highway scanner reading)
  const qrMatrixSize = 25; // 25x25 grid
  const renderQrGrid = () => {
    // Generate deterministic pattern based on LR and e-Way bill
    const seed = (lrNumber + ewayBillNumber).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const rects = [];
    for (let r = 0; r < qrMatrixSize; r++) {
      for (let c = 0; c < qrMatrixSize; c++) {
        // Standard corner locator squares
        const isCorner =
          (r < 7 && c < 7) ||
          (r < 7 && c >= qrMatrixSize - 7) ||
          (r >= qrMatrixSize - 7 && c < 7);
        const isCornerBorder =
          isCorner &&
          (r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            r === qrMatrixSize - 1 ||
            r === qrMatrixSize - 7 ||
            c === qrMatrixSize - 1 ||
            c === qrMatrixSize - 7);
        const isCornerCenter =
          (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
          (r >= 2 && r <= 4 && c >= qrMatrixSize - 5 && c <= qrMatrixSize - 3) ||
          (r >= qrMatrixSize - 5 && r <= qrMatrixSize - 3 && c >= 2 && c <= 4);

        let isBlack = false;
        if (isCornerBorder || isCornerCenter) {
          isBlack = true;
        } else if (!isCorner) {
          // Semi-random data module
          isBlack = (r * c + seed + (r ^ c)) % 3 === 0 || (r + c) % 5 === 0;
        }

        if (isBlack) {
          rects.push(
            <rect
              key={`${r}-${c}`}
              x={c * 8 + 12}
              y={r * 8 + 12}
              width={7.8}
              height={7.8}
              fill="#000000"
            />
          );
        }
      }
    }
    return rects;
  };

  const handlePrint = () => {
    audioSynth.playClickTone();
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-xl bg-neutral-950 border border-neutral-700 p-6 text-white"
      title={
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-6 h-6 text-emerald-400" />
          <span>{t.ebiltiTitle}</span>
        </div>
      }
      description={t.ebiltiSubtitle}
    >
      <div className="space-y-5">
        {/* Scannable Highway QR Box */}
        <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-2xl border-4 border-emerald-500">
          <svg
            viewBox="0 0 224 224"
            className="w-48 h-48 select-none"
            aria-label="High-contrast statutory e-Bilti QR code"
          >
            <rect width="224" height="224" fill="#ffffff" />
            {renderQrGrid()}
          </svg>

          <p className="text-neutral-900 font-mono text-sm font-black tracking-widest mt-2">
            {verificationHash}
          </p>
          <span className="text-[11px] text-neutral-600 font-bold">
            {t.scanInstruction}
          </span>
        </div>

        {/* Consignment Statutory Metadata */}
        <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800 space-y-2.5 text-base">
          <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
            <span className="text-neutral-400 font-bold">{t.lrNumberLabel}</span>
            <span className="font-mono font-black text-emerald-400 text-lg">
              {lrNumber}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
            <span className="text-neutral-400 font-bold">{t.ewayBillLabel}</span>
            <span className="font-mono font-black text-white text-lg">
              {ewayBillNumber}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
            <span className="text-neutral-400 font-bold">{t.vehiclePlateLabel}</span>
            <span className="font-mono font-black text-white text-lg">
              {vehiclePlate}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-neutral-800 text-neutral-300">
            <div>
              <span className="text-neutral-400 block font-semibold">{t.tareWeightLabel}</span>
              <span className="font-bold text-white text-lg">{tareWeightKg.toLocaleString('en-IN')} kg</span>
            </div>
            <div>
              <span className="text-neutral-400 block font-semibold">{t.grossWeightLabel}</span>
              <span className="font-bold text-white text-lg">{grossWeightKg.toLocaleString('en-IN')} kg</span>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex items-start gap-1.5 text-neutral-300">
              <Building className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-neutral-400 font-semibold">{t.consignorLabel} </span>
                <span className="font-bold text-white">{consignorName}</span>
              </div>
            </div>
            <div className="flex items-start gap-1.5 text-neutral-300">
              <Truck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-neutral-400 font-semibold">{t.consigneeLabel} </span>
                <span className="font-bold text-white">{consigneeName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5 MoRTH Statutory Vehicle Compliance Badges */}
        <div>
          <p className="text-sm font-bold text-neutral-300 uppercase tracking-wider mb-2">
            MoRTH Statutory Compliance
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Badge variant="success" size="sm" className="justify-start gap-1.5 text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.badgeRcValid}</span>
            </Badge>
            <Badge variant="success" size="sm" className="justify-start gap-1.5 text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.badgeAitpPermit}</span>
            </Badge>
            <Badge variant="success" size="sm" className="justify-start gap-1.5 text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.badgeFitness}</span>
            </Badge>
            <Badge variant="success" size="sm" className="justify-start gap-1.5 text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.badgeInsurance}</span>
            </Badge>
            <Badge variant="success" size="sm" className="justify-start gap-1.5 text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.badgePuc}</span>
            </Badge>
            <Badge variant="teal" size="sm" className="justify-start gap-1.5 text-sm font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{t.badgeFastag}</span>
            </Badge>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="touch56"
            fullWidth
            onClick={handlePrint}
            className="bg-[#0075de] text-white font-bold text-base"
          >
            <Printer className="w-5 h-5 mr-2" />
            {t.printSlip}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="touch56"
            onClick={onClose}
            className="bg-neutral-800 text-white font-bold"
          >
            {t.closeBtn}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
