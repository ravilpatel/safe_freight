'use client';

import React from 'react';
import {
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Truck,
  DollarSign,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  validateGSTIN,
  validateEWayBillNumber,
  calculateEWayBillValidity,
  formatINR,
} from '@/lib/algorithms/statutory';

export interface ConsignmentData {
  consignorName: string;
  consignorGstin: string;
  consigneeName: string;
  consigneeGstin: string;
  goodsDescription: string;
  declaredValueINR: number;
  hasEwayBill: boolean;
  ewayBillNumber: string;
  hasHamali: boolean;
  hasInsurance: boolean;
}

interface ConsignmentTogglesProps {
  data: ConsignmentData;
  distanceKm: number;
  onChange: (updated: Partial<ConsignmentData>) => void;
}

export default function ConsignmentToggles({
  data,
  distanceKm,
  onChange,
}: ConsignmentTogglesProps) {
  const isConsignorGstinValid = validateGSTIN(data.consignorGstin);
  const isConsigneeGstinValid = validateGSTIN(data.consigneeGstin);
  const isEwayBillValid = !data.hasEwayBill || validateEWayBillNumber(data.ewayBillNumber);

  const ewayValidity = calculateEWayBillValidity(distanceKm);
  const insurancePremium = Math.round(data.declaredValueINR * 0.0015);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Statutory Compliance
            </span>
            <h3 className="text-sm font-bold text-neutral-900">
              Commercial &amp; CGST Rule 54(3) Consignment Fields
            </h3>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Mandatory consignment note metadata for Goods Transport Agency (GTA) Carriage by Road Act 2007.
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-1 bg-neutral-100 text-neutral-600 rounded">
          SAC 9965
        </span>
      </div>

      {/* Consignor & Consignee GSTIN Validation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Consignor (Dispatch) */}
        <div className="space-y-2 p-4 rounded-lg bg-neutral-50 border border-neutral-200">
          <label className="block text-xs font-semibold text-neutral-700">
            Consignor (Sender) Legal Entity
          </label>
          <input
            type="text"
            placeholder="e.g. National Freight Logistics Ltd"
            value={data.consignorName}
            onChange={(e) => onChange({ consignorName: e.target.value })}
            className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-blue-500"
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-neutral-600">Consignor 15-Digit GSTIN:</span>
              {data.consignorGstin ? (
                isConsignorGstinValid ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valid Format
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                    <XCircle className="w-3.5 h-3.5" /> Invalid GSTIN
                  </span>
                )
              ) : (
                <span className="text-neutral-400">Required</span>
              )}
            </div>
            <input
              type="text"
              maxLength={15}
              placeholder="e.g. 27AAACW1234F1Z1"
              value={data.consignorGstin}
              onChange={(e) => onChange({ consignorGstin: e.target.value.toUpperCase() })}
              className={`w-full bg-white font-mono border rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none ${
                data.consignorGstin && !isConsignorGstinValid
                  ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                  : 'border-neutral-300 focus:border-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Consignee (Receiver) */}
        <div className="space-y-2 p-4 rounded-lg bg-neutral-50 border border-neutral-200">
          <label className="block text-xs font-semibold text-neutral-700">
            Consignee (Receiver) Legal Entity
          </label>
          <input
            type="text"
            placeholder="e.g. Gujarat Industrial Machinery Pvt Ltd"
            value={data.consigneeName}
            onChange={(e) => onChange({ consigneeName: e.target.value })}
            className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-blue-500"
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-neutral-600">Consignee 15-Digit GSTIN:</span>
              {data.consigneeGstin ? (
                isConsigneeGstinValid ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valid Format
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                    <XCircle className="w-3.5 h-3.5" /> Invalid GSTIN
                  </span>
                )
              ) : (
                <span className="text-neutral-400">Required</span>
              )}
            </div>
            <input
              type="text"
              maxLength={15}
              placeholder="e.g. 24AAACW5678G1Z2"
              value={data.consigneeGstin}
              onChange={(e) => onChange({ consigneeGstin: e.target.value.toUpperCase() })}
              className={`w-full bg-white font-mono border rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none ${
                data.consigneeGstin && !isConsigneeGstinValid
                  ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                  : 'border-neutral-300 focus:border-blue-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Cargo Declared Value & Description */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Description of Consigned Goods (Rule 54(3))
          </label>
          <input
            type="text"
            placeholder="e.g. Automotive components & industrial steel parts"
            value={data.goodsDescription}
            onChange={(e) => onChange({ goodsDescription: e.target.value })}
            className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Declared Consignment Commercial Value (INR)
          </label>
          <input
            type="number"
            min="10000"
            step="5000"
            value={data.declaredValueINR}
            onChange={(e) => onChange({ declaredValueINR: Number(e.target.value) })}
            className="w-full bg-white font-mono border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-blue-500"
          />
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            {formatINR(data.declaredValueINR)}
          </span>
        </div>
      </div>

      {/* Statutory Toggles */}
      <div className="space-y-3 pt-2 border-t border-neutral-100">
        <h4 className="text-xs font-bold text-neutral-800">Operational &amp; Statutory Add-ons</h4>

        {/* 1. e-Way Bill Toggle */}
        <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="toggle-eway"
                checked={data.hasEwayBill}
                onChange={(e) => onChange({ hasEwayBill: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="toggle-eway" className="cursor-pointer">
                <span className="text-xs font-semibold text-neutral-900">
                  Inter-State 12-Digit e-Way Bill (CGST Rule 138)
                </span>
                <p className="text-[11px] text-neutral-500">
                  Required for consignments exceeding ₹50,000 across state borders.
                </p>
              </label>
            </div>
            <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {ewayValidity.daysValid} Day{ewayValidity.daysValid > 1 ? 's' : ''} Validity
            </span>
          </div>

          {data.hasEwayBill && (
            <div className="pt-2 pl-6 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-600 font-medium">12-Digit Numeric Identifier:</span>
                {data.ewayBillNumber ? (
                  isEwayBillValid ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 12 Digits Valid
                    </span>
                  ) : (
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Must be exactly 12 numeric digits
                    </span>
                  )
                ) : null}
              </div>
              <input
                type="text"
                maxLength={12}
                placeholder="e.g. 241098234512"
                value={data.ewayBillNumber}
                onChange={(e) => onChange({ ewayBillNumber: e.target.value.replace(/\D/g, '') })}
                className={`w-full max-w-sm bg-white font-mono border rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:outline-none ${
                  data.ewayBillNumber && !isEwayBillValid
                    ? 'border-rose-400 bg-rose-50/20'
                    : 'border-neutral-300 focus:border-blue-500'
                }`}
              />
              <p className="text-[10px] text-neutral-400">
                {ewayValidity.description} ({distanceKm} km route).
              </p>
            </div>
          )}
        </div>

        {/* 2. Hamali Charges Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="toggle-hamali"
              checked={data.hasHamali}
              onChange={(e) => onChange({ hasHamali: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
            <label htmlFor="toggle-hamali" className="cursor-pointer">
              <span className="text-xs font-semibold text-neutral-900">
                Hamali (Loading &amp; Unloading Labor Assistance)
              </span>
              <p className="text-[11px] text-neutral-500">
                Guarantees certified labor at pickup dock and destination warehouse.
              </p>
            </label>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-800">
            +₹800 Flat
          </span>
        </div>

        {/* 3. Transit Cargo Insurance Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="toggle-insurance"
              checked={data.hasInsurance}
              onChange={(e) => onChange({ hasInsurance: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
            <label htmlFor="toggle-insurance" className="cursor-pointer">
              <span className="text-xs font-semibold text-neutral-900">
                All-Risk Highway Transit Cargo Insurance
              </span>
              <p className="text-[11px] text-neutral-500">
                0.15% premium against fire, accident, or overturning on NH 48 corridor.
              </p>
            </label>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-800">
            +{formatINR(insurancePremium)}
          </span>
        </div>
      </div>
    </div>
  );
}
