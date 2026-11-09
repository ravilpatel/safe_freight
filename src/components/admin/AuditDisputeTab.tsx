'use client';

import React, { useState, useMemo } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Database,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { AuditLogEntry } from '@/types/database';

interface AuditDisputeTabProps {
  initialEntries?: AuditLogEntry[];
  tenantId?: string;
}

export function AuditDisputeTab({
  initialEntries = [],
  tenantId,
}: AuditDisputeTabProps) {
  const [entries] = useState<AuditLogEntry[]>(initialEntries);
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectingEntry, setInspectingEntry] = useState<AuditLogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (selectedTable !== 'all' && entry.table_name !== selectedTable) {
        return false;
      }
      if (selectedAction !== 'all' && entry.action !== selectedAction) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesRecord = entry.record_id?.toLowerCase().includes(query);
        const matchesRow = entry.row_id?.toLowerCase().includes(query);
        const matchesActor = (entry.performed_by || entry.actor_id || '').toLowerCase().includes(query);
        const matchesTable = entry.table_name?.toLowerCase().includes(query);
        const matchesAction = entry.action?.toLowerCase().includes(query);
        if (!matchesRecord && !matchesRow && !matchesActor && !matchesTable && !matchesAction) {
          return false;
        }
      }
      return true;
    });
  }, [entries, selectedTable, selectedAction, searchQuery]);

  const getActionBadge = (action: string) => {
    const act = (action || '').toUpperCase();
    switch (act) {
      case 'INSERT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            INSERT
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            UPDATE
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            DELETE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
            {act}
          </span>
        );
    }
  };

  const getTableBadge = (tableName: string) => {
    switch (tableName) {
      case 'trips':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'loads':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'documents':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'safety_incidents':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'security_alerts':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ebilti_consignments':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
  };

  const renderDiffKeys = (before: Record<string, unknown> | null, after: Record<string, unknown> | null) => {
    const b = before || {};
    const a = after || {};
    const allKeys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));

    return (
      <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
        {allKeys.map((key) => {
          const valB = b[key];
          const valA = a[key];
          const changed = JSON.stringify(valB) !== JSON.stringify(valA);

          return (
            <div
              key={key}
              className={`p-2 rounded border transition ${
                changed
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-neutral-50/50 border-neutral-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-neutral-800">{key}</span>
                {changed && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                    MODIFIED
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                <div className="bg-white p-1.5 rounded border border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">Before</span>
                  <pre className="text-neutral-700 overflow-x-auto whitespace-pre-wrap">
                    {valB !== undefined ? JSON.stringify(valB, null, 2) : '<undefined>'}
                  </pre>
                </div>
                <div className="bg-white p-1.5 rounded border border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">After</span>
                  <pre className="text-neutral-900 font-semibold overflow-x-auto whitespace-pre-wrap">
                    {valA !== undefined ? JSON.stringify(valA, null, 2) : '<undefined>'}
                  </pre>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Statutory & Regulatory Compliance Guarantee */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-neutral-800/80 rounded-lg border border-neutral-700 text-emerald-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Append-Only Audit Dispute Trail & Replay</h2>
              <p className="text-xs text-neutral-300">
                Immutable, cryptographically verifiable transaction ledger for freight contracts, GPS milestones, and advance reconciliation.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              CGST Rule 54(3) 8-Yr Retention
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              Append-Only Immutability
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Record ID, Actor ID, or entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white"
            />
          </div>

          {/* Table Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-neutral-500" />
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="text-xs py-2 px-3 bg-neutral-50 rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option value="all">All Tables</option>
              <option value="trips">Trips</option>
              <option value="loads">Loads</option>
              <option value="documents">Statutory Docs</option>
              <option value="safety_incidents">Safety Incidents</option>
              <option value="security_alerts">Security Alerts</option>
              <option value="ebilti_consignments">e-Bilti Consignments</option>
            </select>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs py-2 px-3 bg-neutral-50 rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option value="all">All Actions</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>

        {/* Counter & Status */}
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
          <span>
            Showing <strong className="text-neutral-900">{filteredEntries.length}</strong> of{' '}
            <strong className="text-neutral-900">{entries.length}</strong> audit records
          </span>
          {tenantId && (
            <span className="font-mono text-[11px] text-neutral-400">
              Tenant: {tenantId}
            </span>
          )}
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] shadow-xs overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <FileText className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
            <p className="text-sm font-medium text-neutral-700">No audit trail records found</p>
            <p className="text-xs text-neutral-400 mt-1">
              Events are recorded append-only as trips, loads, and statutory operations occur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 font-semibold text-neutral-600">
                <tr>
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Table / Entity</th>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4 text-right">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredEntries.map((entry) => {
                  const hasStateDiff = !!(entry.before_state || entry.after_state || entry.old_record || entry.new_record);
                  const isCopied = copiedId === entry.id;

                  return (
                    <tr key={entry.id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-600 whitespace-nowrap">
                        {entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(entry.action)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${getTableBadge(entry.table_name)}`}>
                          {entry.table_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-700">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[140px]">{entry.record_id || entry.row_id || '—'}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(entry.record_id || entry.id, entry.id)}
                            className="text-neutral-400 hover:text-neutral-600 p-0.5 rounded"
                            title="Copy ID"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500 truncate max-w-[120px]">
                        {entry.performed_by || entry.actor_id || 'system'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {hasStateDiff ? (
                          <button
                            type="button"
                            onClick={() => setInspectingEntry(entry)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-neutral-600" />
                            Inspect Diff
                          </button>
                        ) : (
                          <span className="text-neutral-400 italic text-[11px]">No state change</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* State Diff Modal */}
      {inspectingEntry && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-neutral-700" />
                <h3 className="font-bold text-neutral-900">
                  Audit State Diff — {inspectingEntry.table_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingEntry(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              <div>
                <span className="text-neutral-500 block text-[10px]">Action</span>
                <span className="font-bold text-neutral-900">{inspectingEntry.action}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Record ID</span>
                <span className="font-mono text-neutral-900 truncate block">{inspectingEntry.record_id}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Actor ID</span>
                <span className="font-mono text-neutral-900 truncate block">{inspectingEntry.performed_by || inspectingEntry.actor_id}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Timestamp</span>
                <span className="text-neutral-900 text-[11px] truncate block">
                  {new Date(inspectingEntry.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Before / After Field-Level Diff
              </h4>
              {renderDiffKeys(
                inspectingEntry.before_state || inspectingEntry.old_record || null,
                inspectingEntry.after_state || inspectingEntry.new_record || null
              )}
            </div>

            <div className="pt-3 border-t border-neutral-200 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingEntry(null)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
