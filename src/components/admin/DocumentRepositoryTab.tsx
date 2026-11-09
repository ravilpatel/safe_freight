'use client';

import React, { useState } from 'react';
import {
  FileText,
  PlusCircle,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { StatutoryDocumentItem } from './types';
import { DocumentType } from '@/types/database';
import { computeDocumentExpiryBadge } from '@/lib/algorithms/statutory';

interface DocumentRepositoryTabProps {
  documents: StatutoryDocumentItem[];
  onAddDocument: (_doc: {
    vehicle_number: string;
    doc_type: DocumentType;
    expiry_date?: string;
    document_url?: string;
  }) => Promise<void>;
  onDeleteDocument: (_docId: string) => Promise<void>;
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  national_permit: 'MoRTH National Permit (AITP)',
  fitness: 'Vehicle Fitness Certificate',
  insurance: 'Comprehensive Commercial Insurance',
  puc: 'PUC Emission Certificate',
  rc: 'Vehicle Registration Certificate (RC)',
  driving_license: 'Commercial Driving License',
  lr_eway_bill: 'Statutory e-Way Bill / e-Bilti',
  other: 'Other Statutory Filing',
};

export function DocumentRepositoryTab({
  documents,
  onAddDocument,
  onDeleteDocument,
}: DocumentRepositoryTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [docType, setDocType] = useState<DocumentType>('fitness');
  const [expiryDate, setExpiryDate] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getStatusBadge = (doc: StatutoryDocumentItem) => {
    const badge = computeDocumentExpiryBadge(doc.expiryDate);
    const status = doc.expiryDate ? badge.status : doc.status;

    switch (status) {
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Valid & Certified
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Expiring Soon (&lt;30d)
          </span>
        );
      case 'expired':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            Expired (Vehicle Grounded)
          </span>
        );
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) {
      setErrorMsg('Vehicle plate number is required');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await onAddDocument({
        vehicle_number: vehicleNumber.toUpperCase().trim(),
        doc_type: docType,
        expiry_date: expiryDate || undefined,
        document_url: documentUrl || undefined,
      });
      setIsAddModalOpen(false);
      setVehicleNumber('');
      setExpiryDate('');
      setDocumentUrl('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to register document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900 tracking-tight">
            Statutory Document Repository & VAHAN Compliance
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Mandatory commercial transport paperwork with automated expiration alerting and dispatch grounding enforcement.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAddModalOpen(true);
            setErrorMsg('');
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-xs self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-[#e6e6e6] text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4">Vehicle Registration</th>
                <th className="py-3 px-4">Document Classification</th>
                <th className="py-3 px-4">Statutory Expiration Date</th>
                <th className="py-3 px-4">Compliance Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    <FileText className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm font-medium text-neutral-600">No statutory documents uploaded yet.</p>
                    <p className="text-xs text-neutral-400 mt-1">Upload vehicle RC, Fitness, PUC, and Insurance policies to maintain highway compliance.</p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-neutral-50/50 transition">
                    {/* Vehicle Plate */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-xs text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        {doc.vehicleNumber}
                      </span>
                    </td>

                    {/* Document Type */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900">
                        {DOC_TYPE_LABELS[doc.docType] || doc.docType}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                        ID: {doc.id.slice(0, 8)}...
                      </div>
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-neutral-800">
                        {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : 'Perpetual / Non-Expiring'}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(doc)}
                    </td>

                    {/* Delete Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteDocument(doc.id)}
                        title="Delete Document Record"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-red-50 text-neutral-500 hover:text-red-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                  <FileText className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Register Statutory Compliance Document
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Attach National Permit, Fitness, PUC or Insurance to fleet vehicle.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Vehicle Registration Plate
                </label>
                <input
                  type="text"
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="GJ 05 BZ 8821"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg uppercase font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Document Classification
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white font-medium"
                >
                  <option value="national_permit">MoRTH National Permit (AITP)</option>
                  <option value="fitness">Vehicle Fitness Certificate</option>
                  <option value="insurance">Comprehensive Commercial Insurance</option>
                  <option value="puc">PUC Emission Certificate</option>
                  <option value="rc">Registration Certificate (RC)</option>
                  <option value="driving_license">Commercial Driving License (DL)</option>
                  <option value="lr_eway_bill">Statutory e-Way Bill</option>
                  <option value="other">Other Commercial Document</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Statutory Expiration Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Document Digital Link / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://vahan.parivahan.gov.in/..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition disabled:opacity-50 shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{loading ? 'Uploading...' : 'Save Document'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
