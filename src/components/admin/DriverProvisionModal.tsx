'use client';

import React, { useState } from 'react';
import { UserPlus, Copy, Check, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

interface DriverProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriverEnrolled?: () => void;
}

export function DriverProvisionModal({
  isOpen,
  onClose,
  onDriverEnrolled,
}: DriverProvisionModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [truckModel, setTruckModel] = useState('Tata Signa 4825.T');
  const [drivingLicense, setDrivingLicense] = useState('');
  const [fastagId, setFastagId] = useState('');
  const [payloadMT, setPayloadMT] = useState(28);
  const [tareMT, setTareMT] = useState(12.5);
  const [expiresInHours, setExpiresInHours] = useState(48);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<{ token: string; phone: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/fleet/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          fullName,
          vehicleNumber,
          model: truckModel,
          drivingLicense,
          fastagId,
          payloadMT,
          tareMT,
          expiresInHours,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to issue driver invitation');
      }

      setGeneratedInvite({
        token: data.invitation.token,
        phone,
      });
      onDriverEnrolled?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generating driver invitation');
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = generatedInvite
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://safefreight.in'}/login?invite=${generatedInvite.token}`
    : '';

  const getWhatsAppInviteUrl = () => {
    if (!generatedInvite) return '';
    const cleanPhone = generatedInvite.phone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const text = encodeURIComponent(
      `नमस्ते ${fullName || 'ड्राइवर साथी'}!\nआपको SafeFreight OS में Western India Fleet Logistics द्वारा आमंत्रित किया गया है।\nड्राइवर ऐप से जुड़ने के लिए इस लिंक पर क्लिक करें:\n${inviteLink}\n(टोकन: ${generatedInvite.token})`
    );
    return `https://wa.me/${phoneWithCode}?text=${text}`;
  };

  const handleCopyLink = () => {
    if (inviteLink && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-lg w-full shadow-xl space-y-5 animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Register & Invite Commercial Driver
              </h3>
              <p className="text-xs text-neutral-500">
                Issues a secure single-use invitation token bound to your fleet tenant.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {generatedInvite ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Driver Invitation Generated
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Tenant Scoped
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-0.5">
                  Single-Use Token:
                </span>
                <code className="text-sm font-mono font-extrabold text-emerald-900 bg-emerald-100/70 px-2 py-1 rounded block select-all">
                  {generatedInvite.token}
                </code>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100/50 transition shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied Invite Link!' : 'Copy Invite Link'}</span>
                </button>

                <a
                  href={getWhatsAppInviteUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-800 text-white hover:bg-emerald-700 transition shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setGeneratedInvite(null);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Driver Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Commercial Driver Full Name"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Driver Phone (AIS-140)
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Vehicle Plate Mark
                </label>
                <input
                  type="text"
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="GJ 05 BZ 8821"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg uppercase focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Truck Model
                </label>
                <input
                  type="text"
                  value={truckModel}
                  onChange={(e) => setTruckModel(e.target.value)}
                  placeholder="Tata Signa 4825.T"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Driving License Number
                </label>
                <input
                  type="text"
                  value={drivingLicense}
                  onChange={(e) => setDrivingLicense(e.target.value.toUpperCase())}
                  placeholder="GJ0520180012345"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg uppercase focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  FASTag Tag ID
                </label>
                <input
                  type="text"
                  value={fastagId}
                  onChange={(e) => setFastagId(e.target.value)}
                  placeholder="34161FA820392019"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Payload Limit (MT)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={payloadMT}
                  onChange={(e) => setPayloadMT(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Tare Weight (MT)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  step="0.5"
                  value={tareMT}
                  onChange={(e) => setTareMT(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold uppercase tracking-wider mb-1">
                  Validity (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition disabled:opacity-50 shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>{loading ? 'Issuing...' : 'Generate Invite Link'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
