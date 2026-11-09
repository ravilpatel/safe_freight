'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  CheckCircle2,
  Ambulance,
  Radio,
  XCircle,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { SafetyIncidentItem } from './types';

interface GoldenHourConsoleTabProps {
  incidents: SafetyIncidentItem[];
  onLogT2Arrival: (_incidentId: string) => Promise<void>;
}

export function GoldenHourConsoleTab({
  incidents,
  onLogT2Arrival,
}: GoldenHourConsoleTabProps) {
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const formatTimestamp = (iso?: string | null) => {
    if (!iso) return 'Pending';
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleLogT2 = async (incident: SafetyIncidentItem) => {
    // Edge case 17: Cannot log T2 arrival on a cancelled incident
    if (incident.status === 'cancelled') {
      setErrorMsg('Cannot confirm arrival on a cancelled incident (marked as false alarm by driver).');
      return;
    }

    setLoggingId(incident.id);
    setErrorMsg('');
    try {
      await onLogT2Arrival(incident.id);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to log T2 arrival');
    } finally {
      setLoggingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Console Header */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-xs">
              <Ambulance className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight">
                Golden Hour Safety Incident Command Console
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                AIS-140 G-force multi-axial crash detection, 112 ERSS highway patrol dispatch, and T0/T1/T2 resolution timeline.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>112 ERSS Highway Dispatch Relay: Active</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Incident Cards Feed */}
      <div className="space-y-4">
        {incidents.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e6e6e6] p-12 text-center text-neutral-400">
            <ShieldAlert className="w-10 h-10 mx-auto text-neutral-300 mb-2 stroke-1" />
            <p className="text-sm font-medium text-neutral-700">No active Golden Hour safety incidents.</p>
            <p className="text-xs text-neutral-400 mt-1">
              All commercial vehicles operating normally with G-force readings &lt; 2.5G.
            </p>
          </div>
        ) : (
          incidents.map((incident) => {
            const isCancelled = incident.status === 'cancelled';
            const isResolved = incident.status === 'resolved';

            return (
              <div
                key={incident.id}
                className={`bg-white rounded-xl border p-6 shadow-xs space-y-5 transition ${
                  isCancelled
                    ? 'border-neutral-200 opacity-70 bg-neutral-50/50'
                    : isResolved
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-red-300 bg-red-50/20'
                }`}
              >
                {/* Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isCancelled
                          ? 'bg-neutral-200 text-neutral-700'
                          : isResolved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800 animate-pulse'
                      }`}
                    >
                      {isCancelled
                        ? 'False Alarm (Cancelled by Driver)'
                        : isResolved
                        ? 'Resolved (Responders Arrived)'
                        : 'Active Crash Event (T0 Initiated)'}
                    </span>

                    <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                      {incident.vehicleNumber}
                    </span>
                    <span className="text-xs font-bold text-neutral-800">
                      {incident.driverName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                      G-Force: {incident.gForce ? `${incident.gForce}G` : '4.5G Multi-Axial'}
                    </span>
                    {incident.driverPhone && (
                      <a
                        href={`tel:${incident.driverPhone}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition"
                      >
                        <PhoneCall className="w-3 h-3 text-emerald-400" />
                        <span>Call Driver</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Golden Hour Timeline (T0, T1, T2) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* T0: Impact */}
                  <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 space-y-1">
                    <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase">
                      <span>T0: Impact Detected</span>
                      <Activity className="w-3.5 h-3.5 text-red-600" />
                    </div>
                    <div className="text-base font-bold font-mono text-neutral-900">
                      {formatTimestamp(incident.t0)}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      AIS-140 G-force vector multi-axial trigger
                    </div>
                  </div>

                  {/* T1: ERSS Dispatched */}
                  <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 space-y-1">
                    <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase">
                      <span>T1: 112 ERSS ACK</span>
                      <Radio className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="text-base font-bold font-mono text-neutral-900">
                      {formatTimestamp(incident.t1)}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Highway patrol & ambulance webhook dispatched
                    </div>
                  </div>

                  {/* T2: First Responders Arrived */}
                  <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 space-y-1">
                    <div className="flex items-center justify-between text-neutral-500 text-[11px] font-bold uppercase">
                      <span>T2: Responders Arrived</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-base font-bold font-mono text-neutral-900">
                      {formatTimestamp(incident.t2)}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {incident.rescueDurationMinutes !== null
                        ? `Rescue duration: ${incident.rescueDurationMinutes} minutes`
                        : isCancelled
                        ? 'Alarm cancelled by driver'
                        : 'First responders in transit'}
                    </div>
                  </div>
                </div>

                {/* Resolution Action */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100">
                  <div className="text-xs text-neutral-500 font-medium">
                    {incident.location && <span>Location: <strong>{incident.location}</strong></span>}
                  </div>

                  <div>
                    {isResolved ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        T2 Arrival Confirmed & Resolved
                      </span>
                    ) : isCancelled ? (
                      <span
                        title="Incident was marked as false alarm by driver. Logging T2 is disabled."
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        T2 Disabled (Alarm Cancelled by Driver)
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={loggingId === incident.id}
                        onClick={() => handleLogT2(incident)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition disabled:opacity-50 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>{loggingId === incident.id ? 'Logging T2...' : 'Confirm Arrival (Log T2)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
