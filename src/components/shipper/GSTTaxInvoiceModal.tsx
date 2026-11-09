'use client';

import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Copy } from 'lucide-react';
import { GSTInvoiceData, formatINR } from '@/lib/algorithms/statutory';

interface GSTTaxInvoiceModalProps {
  invoice: GSTInvoiceData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function GSTTaxInvoiceModal({
  invoice,
  isOpen,
  onClose,
}: GSTTaxInvoiceModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `SafeFreight OS - GST Tax Invoice: ${invoice.invoiceNumber}\nDate: ${invoice.invoiceDate}\nSAC: 9965\nConsignor: ${invoice.consignor.name} (${invoice.consignor.gstin})\nConsignee: ${invoice.consignee.name} (${invoice.consignee.gstin})\nVehicle: ${invoice.vehicleNumber}\nLR No: ${invoice.lrNumber}\nTotal: ${invoice.formattedGrandTotal}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* Top Header Bar */}
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">Official GST Tax Invoice (SAC 9965)</h2>
              <p className="text-[11px] text-neutral-400 font-mono">
                Goods Transport Agency (GTA) · Carriage by Road Act 2007
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-colors flex items-center gap-1.5"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Tax Invoice Slip Canvas */}
        <div className="p-8 space-y-6 text-neutral-800 text-xs font-sans">
          {/* Header & Meta */}
          <div className="flex justify-between items-start border-b border-neutral-300 pb-5">
            <div>
              <div className="text-lg font-black text-neutral-900 tracking-tight">
                SafeFreight OS Logistics Network
              </div>
              <div className="text-neutral-500 text-[11px]">Western Freight Spine GTA Carrier Services</div>
              <div className="text-neutral-500 text-[11px]">SAC Code: <strong>9965</strong> (Road Transport of Goods)</div>
              <div className="text-neutral-500 text-[11px]">Reverse Charge Applicable: <strong>No (Forward Charge)</strong></div>
            </div>

            <div className="text-right font-mono">
              <div className="text-xs font-bold text-neutral-900">
                INVOICE NO: <span className="text-blue-700">{invoice.invoiceNumber}</span>
              </div>
              <div className="text-neutral-500 text-[11px]">DATE: {invoice.invoiceDate}</div>
              <div className="text-neutral-500 text-[11px]">LR NO: {invoice.lrNumber}</div>
              {invoice.ewayBillNumber && (
                <div className="text-emerald-700 font-semibold text-[11px]">
                  e-Way Bill: {invoice.ewayBillNumber}
                </div>
              )}
            </div>
          </div>

          {/* Consignor vs Consignee Entities */}
          <div className="grid grid-cols-2 gap-6 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider font-mono">
                Consignor (Billed By / Shipper)
              </div>
              <div className="font-bold text-neutral-900 text-sm">{invoice.consignor.name}</div>
              <div className="text-neutral-600 text-[11px] leading-relaxed">{invoice.consignor.address}</div>
              <div className="text-neutral-700 font-mono text-[11px] pt-1">
                GSTIN: <strong>{invoice.consignor.gstin}</strong> (State: {invoice.consignor.stateCode})
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider font-mono">
                Consignee (Delivered To / Receiver)
              </div>
              <div className="font-bold text-neutral-900 text-sm">{invoice.consignee.name}</div>
              <div className="text-neutral-600 text-[11px] leading-relaxed">{invoice.consignee.address}</div>
              <div className="text-neutral-700 font-mono text-[11px] pt-1">
                GSTIN: <strong>{invoice.consignee.gstin}</strong> (State: {invoice.consignee.stateCode})
              </div>
            </div>
          </div>

          {/* Transit Particulars */}
          <div className="grid grid-cols-3 gap-4 border border-neutral-200 rounded-lg p-3 bg-white font-mono text-[11px]">
            <div>
              <span className="text-neutral-400 block text-[10px]">CORRIDOR ROUTE</span>
              <strong>{invoice.origin} &rarr; {invoice.destination}</strong>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px]">VEHICLE REGISTRATION</span>
              <strong>{invoice.vehicleNumber}</strong>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px]">BILLABLE WEIGHT</span>
              <strong>{(invoice.weightKg / 1000).toFixed(2)} MT ({invoice.weightKg.toLocaleString('en-IN')} kg)</strong>
            </div>
          </div>

          {/* Itemized Line Items Table */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
                  <th className="py-2.5 px-3">Description of GTA Carriage Service</th>
                  <th className="py-2.5 px-3 font-mono">SAC</th>
                  <th className="py-2.5 px-3 text-right">Distance</th>
                  <th className="py-2.5 px-3 text-right font-mono">Taxable Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-mono text-[11px]">
                <tr>
                  <td className="py-2.5 px-3 font-sans text-neutral-900 font-medium">
                    Freight Transportation Charges (NH 48 Western Spine)
                  </td>
                  <td className="py-2.5 px-3 text-neutral-600">9965</td>
                  <td className="py-2.5 px-3 text-right text-neutral-600">{invoice.distanceKm} km</td>
                  <td className="py-2.5 px-3 text-right font-bold text-neutral-900">
                    {formatINR(invoice.taxableFreightINR)}
                  </td>
                </tr>

                {invoice.hamaliChargesINR > 0 && (
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-neutral-800">
                      Hamali Labor Assistance (Loading/Unloading Dock)
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600">9965</td>
                    <td className="py-2.5 px-3 text-right text-neutral-600">—</td>
                    <td className="py-2.5 px-3 text-right font-bold text-neutral-900">
                      {formatINR(invoice.hamaliChargesINR)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Grand Total */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Sub-Total Taxable Value:</span>
                <span>{formatINR(invoice.totalTaxableValueINR)}</span>
              </div>

              {invoice.isInterState ? (
                <div className="flex justify-between text-neutral-700">
                  <span>Integrated GST (IGST @ 5.0%):</span>
                  <span className="font-bold">{formatINR(invoice.igstAmountINR)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-neutral-700">
                    <span>Central GST (CGST @ 2.5%):</span>
                    <span>{formatINR(invoice.cgstAmountINR)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-700">
                    <span>State GST (SGST @ 2.5%):</span>
                    <span>{formatINR(invoice.sgstAmountINR)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-neutral-600 pt-1 border-t border-neutral-200">
                <span>Total Tax Amount (5%):</span>
                <span>{formatINR(invoice.totalTaxINR)}</span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t-2 border-neutral-900 text-sm">
                <span className="font-bold font-sans text-neutral-900">Grand Total (INR):</span>
                <span className="text-xl font-black text-blue-700 font-mono">
                  {invoice.formattedGrandTotal}
                </span>
              </div>
            </div>
          </div>

          {/* Statutory Sign-off */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-500">
            <div>
              <div>Generated electronically under IT Act 2000 &amp; CGST Act 2017.</div>
              <div>No physical signature required. Lorry Receipt stored immutably.</div>
            </div>
            <div className="text-right font-mono font-semibold text-neutral-700">
              STATUS: {invoice.status}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
