'use client';

import React from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AdvanceCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  selectedSlot: string;
  onChangeDate: (date: string) => void;
  onChangeSlot: (slot: string) => void;
}

export const TIME_SLOTS = [
  { id: 'morning', label: 'Morning Slot', time: '08:00 – 12:00', desc: 'Fast morning highway dispatch before toll congestion' },
  { id: 'afternoon', label: 'Afternoon Slot', time: '12:00 – 16:00', desc: 'Standard warehouse dock turnaround' },
  { id: 'evening', label: 'Evening Slot', time: '16:00 – 20:00', desc: 'Post-manufacturing factory floor pickup' },
  { id: 'night', label: 'Night Highway Slot', time: '20:00 – 04:00', desc: 'Unrestricted corridor transit speed across Manor Ghat' },
];

export default function AdvanceCalendar({
  selectedDate,
  selectedSlot,
  onChangeDate,
  onChangeSlot,
}: AdvanceCalendarProps) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Calculate day difference from today
  const diffDays = Math.round(
    (new Date(selectedDate).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24)
  );

  const isValidBoundary = diffDays >= 0 && diffDays <= 30;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Corridor Dispatch Window
            </span>
            <h3 className="text-sm font-bold text-neutral-900">
              Advance Freight Pickup Calendar
            </h3>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Strictly bounded: schedule from Day 0 (today) up to Day 30 advance along NH 48 corridor.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
            {diffDays === 0 ? 'Day 0 (Today)' : `Day ${diffDays} Advance`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date Picker Input */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Select Scheduled Loading Date:</span>
          </label>

          <input
            type="date"
            min={todayStr}
            max={maxDateStr}
            value={selectedDate}
            onChange={(e) => onChangeDate(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm text-neutral-900 font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
          />

          <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>Min: {todayStr} (Today)</span>
            <span>Max: {maxDateStr} (+30 Days)</span>
          </div>

          {!isValidBoundary && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Selection must be within the valid statutory horizon (Day 0 to Day 30).
              </span>
            </div>
          )}

          {isValidBoundary && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                Loading date verified: <strong>{selectedDate}</strong> (Within corridor 30-day capacity reserve).
              </span>
            </div>
          )}
        </div>

        {/* Time Window Slots */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Preferred Loading Dock Time Window:</span>
          </label>

          <div className="space-y-2">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => onChangeSlot(slot.time)}
                className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                  selectedSlot === slot.time
                    ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-sm'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <div>
                  <div className="font-semibold text-xs flex items-center gap-2">
                    <span>{slot.label}</span>
                    <span className="font-mono text-[11px] text-neutral-500">({slot.time})</span>
                  </div>
                  <div className="text-[10px] text-neutral-400">{slot.desc}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedSlot === slot.time
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-neutral-300'
                  }`}
                >
                  {selectedSlot === slot.time && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
