'use client';

import React, { useState } from 'react';
import { Copy, Check, Send, Share2 } from 'lucide-react';
import { TripDispatchItem } from './types';

interface WhatsAppDispatchSlipModalProps {
  isOpen: boolean;
  trip: TripDispatchItem | null;
  onClose: () => void;
}

export function WhatsAppDispatchSlipModal({
  isOpen,
  trip,
  onClose,
}: WhatsAppDispatchSlipModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !trip) return null;

  const generateDispatchSlipText = (t: TripDispatchItem): string => {
    return `📋 *SafeFreight OS — डिजिटल यात्रा पर्ची (Dispatch Slip)*
----------------------------------------------
🚛 *गाड़ी नंबर:* ${t.vehicleNumber}
👤 *चालक का नाम:* ${t.driverName} (${t.driverPhone})
📍 *मार्ग:* ${t.origin} ➔ ${t.destination} (NH 48)
📅 *प्रस्थान तारीख:* ${t.scheduledDate}
🛣️ *रूट प्रकार:* ${t.routeType === 'fastest' ? 'Fastest Highway (62 km/h)' : t.routeType === 'toll_optimized' ? 'Toll-Optimized' : 'Eco-Fuel Corridor'}
📏 *दूरी:* ${t.distanceKm} km | *टोल:* ₹${t.tollINR.toLocaleString('en-IN')}

📄 *बिल्टी (LR) नंबर:* ${t.lrNumber}
📑 *e-Way Bill:* ${t.ewayBill}
💵 *कुल भाड़ा (Gross Freight):* ₹${t.grossFreightINR.toLocaleString('en-IN')}

💰 *अग्रिम पर्ची व खर्चा (Advances Disbursed):*
• ⛽ डीजल पर्ची (Diesel): ₹${t.dieselAdvanceINR.toLocaleString('en-IN')}
• 🛡️ FASTag टोल: ₹${t.fastagAdvanceINR.toLocaleString('en-IN')}
• 🍛 चालक भत्ता (Bhatta): ₹${t.bhattaAdvanceINR.toLocaleString('en-IN')}
• 📦 हमाली (Hamali): ₹${t.hamaliAdvanceINR.toLocaleString('en-IN')}
➡️ *कुल अग्रिम (Total Advances):* ₹${t.totalAdvancesINR.toLocaleString('en-IN')}
✅ *माल खाली पर शेष (Balance Due on POD):* ₹${t.balanceDueINR.toLocaleString('en-IN')}

⚠️ *निर्देश:* AIS-140 जीपीएस 24/7 चालू रखें। गति सीमा 60 km/h का पालन करें।
📞 *24/7 कंट्रोल रूम हेल्पलाइन:* 1800-SAFE-FREIGHT (+91 98250 12345)
📱 *चालक ऐप लिंक:* https://safefreight.in/driver`;
  };

  const slipText = generateDispatchSlipText(trip);

  const cleanPhone = trip.driverPhone.replace(/\D/g, '');
  const phoneWithCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const whatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(slipText)}`;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(slipText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-lg w-full shadow-xl space-y-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                1-Click WhatsApp Trip Dispatch Slip
              </h3>
              <p className="text-xs text-neutral-500">
                Official vernacular Hindi/Hinglish slip with statutory e-Way bill & advances.
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

        {/* Formatted Preview Box */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 max-h-[360px] overflow-y-auto font-mono text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed shadow-inner">
          {slipText}
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white text-neutral-800 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-neutral-500" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Slip to Clipboard'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-lg transition"
            >
              Close
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send to Driver (WhatsApp)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
