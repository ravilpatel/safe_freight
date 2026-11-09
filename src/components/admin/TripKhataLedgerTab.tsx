'use client';

import React, { useState } from 'react';
import {
  Wallet,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import { TripDispatchItem } from './types';

interface TripKhataLedgerTabProps {
  trips: TripDispatchItem[];
  onDisburseAdvance: (
    _tripId: string,
    _type: 'diesel' | 'fastag' | 'driverBhatta' | 'hamali',
    _amount: number,
    _notes?: string
  ) => Promise<void>;
}

export function TripKhataLedgerTab({
  trips,
  onDisburseAdvance,
}: TripKhataLedgerTabProps) {
  const [selectedTripForAdvance, setSelectedTripForAdvance] = useState<TripDispatchItem | null>(null);
  const [advanceType, setAdvanceType] = useState<'diesel' | 'fastag' | 'driverBhatta' | 'hamali'>('diesel');
  const [advanceAmount, setAdvanceAmount] = useState(5000);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Aggregated totals across all trips
  const totalGrossFreight = trips.reduce((sum, t) => sum + t.grossFreightINR, 0);
  const totalAdvances = trips.reduce((sum, t) => sum + t.totalAdvancesINR, 0);
  const totalBalanceDue = trips.reduce((sum, t) => sum + t.balanceDueINR, 0);
  const totalDieselAdvances = trips.reduce((sum, t) => sum + t.dieselAdvanceINR, 0);
  const totalFastagAdvances = trips.reduce((sum, t) => sum + t.fastagAdvanceINR, 0);
  const totalBhattaAdvances = trips.reduce((sum, t) => sum + t.bhattaAdvanceINR, 0);

  const handleOpenDisburseModal = (trip: TripDispatchItem) => {
    setSelectedTripForAdvance(trip);
    setAdvanceAmount(2000);
    setAdvanceNotes('');
    setErrorMsg('');
  };

  const handleConfirmDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripForAdvance) return;

    if (advanceAmount <= 0) {
      setErrorMsg('Advance amount must be greater than zero');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await onDisburseAdvance(
        selectedTripForAdvance.id,
        advanceType,
        Math.round(advanceAmount),
        advanceNotes
      );
      setSelectedTripForAdvance(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record advance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Financial Summary Cards */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
          <h2 className="text-base font-bold text-neutral-900 tracking-tight">
            Digital Trip Khata & Advance Bhatta Ledger
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Strict carrier accounting ledger enforcing mathematical consistency: Balance Due on POD = Gross Freight - Total Advances.
          </p>
        </div>

        {/* 4 Financial KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
              Agreed Gross Freight
            </span>
            <div className="text-2xl font-bold text-neutral-900">
              ₹{totalGrossFreight.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Across all corridor trips</div>
          </div>

          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
              Total Advances Disbursed
            </span>
            <div className="text-2xl font-bold text-neutral-900">
              ₹{totalAdvances.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 flex flex-wrap items-center gap-2">
              <span>Diesel ₹{totalDieselAdvances.toLocaleString('en-IN')}</span>
              <span>·</span>
              <span>Toll ₹{totalFastagAdvances.toLocaleString('en-IN')}</span>
              <span>·</span>
              <span>Bhatta ₹{totalBhattaAdvances.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
              Net Balance Due on POD
            </span>
            <div className="text-2xl font-bold text-emerald-700">
              ₹{totalBalanceDue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              Receivable upon consignee delivery
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
              Net Operating Margin
            </span>
            <div className="text-2xl font-bold text-neutral-900">
              {totalGrossFreight > 0
                ? `${Math.round(((totalGrossFreight - totalAdvances) / totalGrossFreight) * 100)}%`
                : '0%'}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Estimated fleet operator gross spread
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e6e6e6] flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">
            Trip-by-Trip Commercials & Advance Breakdown
          </h3>
          <span className="text-xs text-neutral-400 font-mono">
            {trips.length} active ledger entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-[#e6e6e6] text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4">Trip & LR Number</th>
                <th className="py-3 px-4">Driver & Gaadi</th>
                <th className="py-3 px-4 text-right">Gross Freight</th>
                <th className="py-3 px-4 text-right">Diesel Advance</th>
                <th className="py-3 px-4 text-right">FASTag Toll</th>
                <th className="py-3 px-4 text-right">Driver Bhatta</th>
                <th className="py-3 px-4 text-right">Total Advances</th>
                <th className="py-3 px-4 text-right">Balance Due (POD)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {trips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <Wallet className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm font-medium text-neutral-600">No trip khata ledger entries yet.</p>
                  </td>
                </tr>
              ) : (
                trips.map((trip) => {
                  const isExcessAdvance = trip.totalAdvancesINR > trip.grossFreightINR;
                  const excessAmount = isExcessAdvance ? trip.totalAdvancesINR - trip.grossFreightINR : 0;

                  return (
                    <tr key={trip.id} className="hover:bg-neutral-50/50 transition">
                      {/* LR Number */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-neutral-900">{trip.lrNumber}</div>
                        <div className="text-[10px] text-neutral-400">
                          {trip.origin.split(' ')[0]} → {trip.destination.split(' ')[0]}
                        </div>
                      </td>

                      {/* Driver & Gaadi */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900">{trip.driverName}</div>
                        <div className="text-[11px] font-mono text-neutral-600">{trip.vehicleNumber}</div>
                      </td>

                      {/* Gross Freight */}
                      <td className="py-3.5 px-4 text-right font-bold text-neutral-900">
                        ₹{trip.grossFreightINR.toLocaleString('en-IN')}
                      </td>

                      {/* Diesel Advance */}
                      <td className="py-3.5 px-4 text-right text-neutral-700">
                        ₹{trip.dieselAdvanceINR.toLocaleString('en-IN')}
                      </td>

                      {/* FASTag Toll */}
                      <td className="py-3.5 px-4 text-right text-neutral-700">
                        ₹{trip.fastagAdvanceINR.toLocaleString('en-IN')}
                      </td>

                      {/* Driver Bhatta */}
                      <td className="py-3.5 px-4 text-right text-neutral-700">
                        ₹{trip.bhattaAdvanceINR.toLocaleString('en-IN')}
                      </td>

                      {/* Total Advances */}
                      <td className="py-3.5 px-4 text-right font-bold text-neutral-900">
                        ₹{trip.totalAdvancesINR.toLocaleString('en-IN')}
                      </td>

                      {/* Balance Due (POD) with Edge Case 4 warning */}
                      <td className="py-3.5 px-4 text-right">
                        {isExcessAdvance ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-neutral-400 line-through">₹0</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3" />
                              Overpaid by ₹{excessAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <span className="font-extrabold text-emerald-800 text-sm">
                            ₹{trip.balanceDueINR.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      {/* Disburse Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDisburseModal(trip)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-xs"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Disburse</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disburse Advance Modal */}
      {selectedTripForAdvance && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Disburse Advance / Bhatta
                </h3>
                <p className="text-xs text-neutral-500">
                  Trip LR: {selectedTripForAdvance.lrNumber} ({selectedTripForAdvance.driverName})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTripForAdvance(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleConfirmDisburse} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1.5">
                  Advance Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'diesel', label: '⛽ Diesel (डीजल पर्ची)' },
                    { id: 'fastag', label: '🛡️ FASTag Toll (टोल)' },
                    { id: 'driverBhatta', label: '🍛 Driver Bhatta (भत्ता)' },
                    { id: 'hamali', label: '📦 Hamali (हमाली लेबर)' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAdvanceType(cat.id as any)}
                      className={`p-2.5 rounded-lg border text-left font-medium transition ${
                        advanceType === cat.id
                          ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Disbursement Amount (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Notes / Pump Slip / Toll Plaza (Optional)
                </label>
                <input
                  type="text"
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="e.g. Surat Kadodara HPCL pump refill"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                />
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 space-y-1">
                <div className="flex justify-between text-neutral-500">
                  <span>Gross Freight:</span>
                  <span className="font-semibold text-neutral-800">
                    ₹{selectedTripForAdvance.grossFreightINR.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Current Advances:</span>
                  <span className="font-semibold text-neutral-800">
                    ₹{selectedTripForAdvance.totalAdvancesINR.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-900 font-bold pt-1 border-t border-neutral-200">
                  <span>New Balance Due on POD:</span>
                  <span className="text-emerald-700">
                    ₹{Math.max(0, selectedTripForAdvance.grossFreightINR - (selectedTripForAdvance.totalAdvancesINR + advanceAmount)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setSelectedTripForAdvance(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition disabled:opacity-50 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{loading ? 'Disbursing...' : 'Confirm Disbursement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
