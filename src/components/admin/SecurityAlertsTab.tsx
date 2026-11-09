'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Check,
  AlertOctagon,
  Info,
} from 'lucide-react';
import { SecurityAlertItem } from './types';
import { AlertSeverity } from '@/types/database';

interface SecurityAlertsTabProps {
  alerts: SecurityAlertItem[];
  onResolveAlert: (_alertId: string, _notes?: string) => Promise<void>;
}

export function SecurityAlertsTab({
  alerts,
  onResolveAlert,
}: SecurityAlertsTabProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !a.resolved;
    if (filter === 'resolved') return a.resolved;
    return true;
  });

  const handleOpenResolve = (alert: SecurityAlertItem) => {
    setResolvingId(alert.id);
    setResolutionNote('');
    setErrorMsg('');
  };

  const handleConfirmResolve = async () => {
    if (!resolvingId) return;

    setLoading(true);
    setErrorMsg('');
    try {
      await onResolveAlert(resolvingId, resolutionNote || 'Verified with driver via control room phone call');
      setResolvingId(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to resolve alert');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
            <AlertOctagon className="w-3 h-3 text-red-600" />
            Critical Detour
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Warning
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
            <Info className="w-3 h-3 text-sky-600" />
            Advisory
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Filter Header */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900 tracking-tight">
            Security & Route Deviation Alerts Monitor
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time geofence violation stream for corridor detours &gt;5 km or unauthorized stationary halts &gt;45 min.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="inline-flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-50 text-xs font-medium self-start sm:self-auto">
          {(['active', 'resolved', 'all'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-md capitalize transition ${
                filter === tab
                  ? 'bg-white text-neutral-900 font-bold shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {tab === 'active' ? 'Active Alerts' : tab === 'resolved' ? 'Resolved' : 'All Alerts'}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e6e6e6] p-12 text-center text-neutral-400">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 stroke-1" />
            <p className="text-sm font-medium text-neutral-700">No active security alerts.</p>
            <p className="text-xs text-neutral-400 mt-1">All fleet vehicles are operating strictly along the NH 48 corridor.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border p-5 shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                alert.resolved
                  ? 'border-[#e6e6e6] opacity-75'
                  : alert.severity === 'critical'
                  ? 'border-red-300 bg-red-50/10'
                  : 'border-amber-300 bg-amber-50/10'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {getSeverityBadge(alert.severity)}
                  <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                    {alert.vehicleNumber || 'GJ 05 BZ 8821'}
                  </span>
                  <span className="text-xs font-bold text-neutral-800">
                    {alert.driverName || 'Assigned Driver'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    · {new Date(alert.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs font-medium text-neutral-900">
                  {alert.message}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                  <span>Type: <strong className="text-neutral-700 capitalize">{alert.alertType.replace('_', ' ')}</strong></span>
                  {alert.tripId && (
                    <>
                      <span>·</span>
                      <span className="font-mono">Trip: {alert.tripId.slice(0, 8)}...</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {alert.resolved ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                    Resolved
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenResolve(alert)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resolve Alert</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolve Dialog Modal */}
      {resolvingId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900">
                Resolve Security Deviation Alert
              </h3>
              <button
                type="button"
                onClick={() => setResolvingId(null)}
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

            <div className="space-y-3 text-xs">
              <label className="block text-neutral-700 font-bold uppercase tracking-wider">
                Resolution Notes / Driver Justification
              </label>
              <textarea
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. Driver refueled at Reliance Highway Plaza, confirmed via WhatsApp voice call"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
              />
              <p className="text-[11px] text-neutral-500">
                Action will be permanently recorded in the immutable audit log trail.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setResolvingId(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmResolve}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition disabled:opacity-50 shadow-xs"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{loading ? 'Resolving...' : 'Confirm Resolution'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
