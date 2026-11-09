'use client';

import React from 'react';
import {
  Phone,
  MessageSquare,
  KeyRound,
  ShieldAlert,
  UserPlus,
  Truck,
  CheckCircle,
} from 'lucide-react';
import { DriverRosterItem } from './types';

interface RosterTabProps {
  drivers: DriverRosterItem[];
  onOpenInviteModal: () => void;
  onOpenPasswordModal: (_driver: DriverRosterItem) => void;
}

export function RosterTab({
  drivers,
  onOpenInviteModal,
  onOpenPasswordModal,
}: RosterTabProps) {
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    return phone;
  };

  const getWhatsAppLink = (driver: DriverRosterItem) => {
    const rawNumber = driver.phone.replace(/\D/g, '');
    const phoneWithCountry = rawNumber.startsWith('91') ? rawNumber : `91${rawNumber}`;
    const text = encodeURIComponent(
      `नमस्ते ${driver.name} जी (गाड़ी: ${driver.vehicleNumber})\nकंट्रोल रूम से संपर्क: आपकी वर्तमान स्थिति ${driver.currentLocation} (${driver.currentSpeedKmH} km/h).\nकृपया किसी भी सहायता के लिए रिप्लाई करें।`
    );
    return `https://wa.me/${phoneWithCountry}?text=${text}`;
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900 tracking-tight">
            Driver & Vehicle Allocation Roster
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Commercial highway fleet registry with real-time AIS-140 telematics status, vehicle specs, and direct communication.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenInviteModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-xs self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          <span>Register New Driver</span>
        </button>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-xl border border-[#e6e6e6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-[#e6e6e6] text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4">Driver & License</th>
                <th className="py-3 px-4">Vehicle Plate & Model</th>
                <th className="py-3 px-4">Tare / Payload</th>
                <th className="py-3 px-4">Live Status & Speed</th>
                <th className="py-3 px-4">Corridor Location</th>
                <th className="py-3 px-4 text-right">Direct Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <Truck className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm font-medium text-neutral-600">No fleet drivers enrolled yet.</p>
                    <p className="text-xs text-neutral-400 mt-1">Issue driver invitations to expand your carrier organization.</p>
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-neutral-50/50 transition">
                    {/* Driver Name & Phone & DL */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900 text-sm">
                        {driver.name}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                        {formatPhone(driver.phone)}
                      </div>
                      <div className="text-[10px] text-neutral-400 uppercase mt-0.5">
                        DL: {driver.drivingLicense || 'MH04201800912'}
                      </div>
                    </td>

                    {/* Vehicle Plate & Model */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold font-mono text-xs text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 inline-block">
                        {driver.vehicleNumber}
                      </div>
                      <div className="text-[11px] text-neutral-600 mt-1 font-medium">
                        {driver.model}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        FASTag: {driver.fastagId}
                      </div>
                    </td>

                    {/* Tare & Payload */}
                    <td className="py-3.5 px-4 text-neutral-700">
                      <div>
                        <span className="text-neutral-400 text-[10px] uppercase block">Payload:</span>
                        <span className="font-bold text-neutral-900">{driver.payloadCapacityMT} MT</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Tare: {driver.tareWeightMT} MT
                      </div>
                    </td>

                    {/* Status & Speed */}
                    <td className="py-3.5 px-4">
                      {driver.status === 'on_trip' && (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            On Trip · {driver.currentSpeedKmH} km/h
                          </span>
                        </div>
                      )}

                      {driver.status === 'idle' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                          <CheckCircle className="w-3 h-3 text-sky-600" />
                          Idle (Ready for Dispatch)
                        </span>
                      )}

                      {driver.status === 'alert' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          Corridor Alert
                        </span>
                      )}
                    </td>

                    {/* Corridor Location */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-neutral-900 font-medium">
                        {driver.currentLocation}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        Ping: {driver.lastPingTime}
                      </div>
                    </td>

                    {/* Actions: 1-Click Calling & WhatsApp & Password */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* 1-Click Call */}
                        <a
                          href={`tel:${driver.phone}`}
                          title={`Call Driver ${driver.name}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>

                        {/* 1-Click WhatsApp with prefilled message */}
                        <a
                          href={getWhatsAppLink(driver)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open WhatsApp Chat"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>

                        {/* Credential Management */}
                        <button
                          type="button"
                          onClick={() => onOpenPasswordModal(driver)}
                          title="Manage Driver Credentials"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
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
