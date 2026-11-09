'use client';

import React, { useState } from 'react';
import {
  Truck,
  ArrowRight,
  Share2,
  CalendarPlus,
  Wallet,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { TripDispatchItem } from './types';

interface TripDispatchTabProps {
  trips: TripDispatchItem[];
  onOpenScheduleModal: () => void;
  onOpenWhatsAppSlip: (_trip: TripDispatchItem) => void;
  onSelectTripForKhata?: (_trip: TripDispatchItem) => void;
}

export function TripDispatchTab({
  trips,
  onOpenScheduleModal,
  onOpenWhatsAppSlip,
  onSelectTripForKhata,
}: TripDispatchTabProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'planned' | 'completed'>('all');

  const filteredTrips = trips.filter((t) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'planned') return t.milestoneStatus === 'created' || t.milestoneStatus === 'assigned';
    if (statusFilter === 'completed') return t.milestoneStatus === 'completed';
    if (statusFilter === 'active') {
      return (
        t.milestoneStatus !== 'completed' &&
        t.milestoneStatus !== 'created' &&
        t.milestoneStatus !== 'cancelled'
      );
    }
    return true;
  });

  const getMilestoneBadge = (status: string) => {
    switch (status) {
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            In Transit (हाइवे पर)
          </span>
        );
      case 'loaded':
      case 'at_pickup':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Loading (लोडिंग चालू)
          </span>
        );
      case 'dhaba_break':
      case 'halt':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Dhaba Break (विश्राम)
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Delivered (माल खाली)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
            <Clock className="w-3 h-3" />
            Planned (शेड्यूल)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900 tracking-tight">
            Trip Dispatch Center & Advance Corridor Planner
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Active, scheduled, and completed NH 48 corridor journeys with milestone progress and 1-click WhatsApp slips.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="inline-flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-50 text-xs font-medium">
            {(['all', 'active', 'planned', 'completed'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-md capitalize transition ${
                  statusFilter === filter
                    ? 'bg-white text-neutral-900 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {filter === 'all' ? 'All Trips' : filter}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-xs"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Schedule Advance Trip</span>
          </button>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-[#e6e6e6] text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4">LR Number & e-Way Bill</th>
                <th className="py-3 px-4">Driver & Gaadi</th>
                <th className="py-3 px-4">Route & Profile</th>
                <th className="py-3 px-4">Milestone Status</th>
                <th className="py-3 px-4">Khata: Freight & Advances</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <Truck className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm font-medium text-neutral-600">No corridor trips match this status filter.</p>
                    <p className="text-xs text-neutral-400 mt-1">Schedule advance trips to organize upcoming freight dispatches.</p>
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-neutral-50/50 transition">
                    {/* LR & e-Way Bill */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-xs text-neutral-900">
                        {trip.lrNumber}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                        e-Way: {trip.ewayBill}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        Date: {trip.scheduledDate}
                      </div>
                    </td>

                    {/* Driver & Gaadi */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900 text-sm">
                        {trip.driverName}
                      </div>
                      <div className="font-mono text-xs font-semibold text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 inline-block mt-0.5">
                        {trip.vehicleNumber}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {trip.driverPhone}
                      </div>
                    </td>

                    {/* Route & Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                        <span className="truncate max-w-[130px]">{trip.origin.split(' ')[0]}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-[130px]">{trip.destination.split(' ')[0]}</span>
                      </div>
                      <div className="text-[11px] text-neutral-600 mt-0.5">
                        {trip.distanceKm} km · Toll ₹{trip.tollINR.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-emerald-700 capitalize font-medium mt-0.5">
                        {trip.routeType.replace('_', ' ')}
                      </div>
                    </td>

                    {/* Milestone Status */}
                    <td className="py-3.5 px-4">
                      {getMilestoneBadge(trip.milestoneStatus)}
                    </td>

                    {/* Khata Financials */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase">Gross:</span>{' '}
                        <span className="font-bold text-neutral-900">₹{trip.grossFreightINR.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Advances: ₹{trip.totalAdvancesINR.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                        Due: ₹{trip.balanceDueINR.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => onOpenWhatsAppSlip(trip)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-xs"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp Slip</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectTripForKhata?.(trip)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
                        >
                          <Wallet className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="hidden sm:inline">Khata</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
