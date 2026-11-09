'use client';

import React, { useState } from 'react';

export default function DriverHudPage() {
  const [sosActive, setSosActive] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi' | 'mr' | 'gu' | 'ta'>('en');

  const translations = {
    en: { title: 'Driver Highway HUD', sos: 'SOS', activeTrip: 'Active Trip: Mumbai -> Surat', status: 'On Highway NH 48' },
    hi: { title: 'चालक हाईवे HUD', sos: 'आपातकालीन', activeTrip: 'सक्रिय यात्रा: मुंबई -> सूरत', status: 'राष्ट्रीय राजमार्ग NH 48' },
    mr: { title: 'चालक महामार्ग HUD', sos: 'आपत्कालीन', activeTrip: 'सक्रिय ट्रिप: मुंबई -> सुरत', status: 'महामार्ग NH 48' },
    gu: { title: 'ડ્રાઈવર હાઇવે HUD', sos: 'કટોકટી', activeTrip: 'સક્રિય સફર: મુંબઈ -> સુરત', status: 'હાઇવે NH 48' },
    ta: { title: 'ஓட்டுநர் நெடுஞ்சாலை HUD', sos: 'அவசரம்', activeTrip: 'செயலில் உள்ள பயணம்: மும்பை -> சூரத்', status: 'நெடுஞ்சாலை NH 48' },
  };

  const t = translations[lang] || translations.en;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 flex flex-col justify-between select-none">
      <header className="flex justify-between items-center border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">{t.title}</h1>
          <p className="text-sm text-emerald-400 font-semibold">{t.status}</p>
        </div>
        <div className="flex gap-2">
          {(['en', 'hi', 'mr', 'gu', 'ta'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`min-h-[56px] min-w-[56px] px-2 text-sm font-bold rounded uppercase border ${
                lang === l ? 'bg-amber-500 text-black border-amber-500' : 'bg-neutral-800 text-neutral-300 border-neutral-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center my-8 space-y-8">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-neutral-400 mb-2 font-semibold">AIS-140 Live Link</p>
          <h2 className="text-xl font-bold text-white mb-2">{t.activeTrip}</h2>
          <p className="text-sm text-neutral-300">Vehicle: GJ-05-BZ-8821 · Speed: 62 km/h</p>
        </div>

        {/* SOS Emergency Touch Target: 96dp centered button */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setSosActive(!sosActive)}
            className={`w-24 h-24 rounded-full flex items-center justify-center text-xl font-black shadow-lg transition-transform active:scale-95 border-4 ${
              sosActive
                ? 'bg-red-600 text-white border-red-300 animate-pulse'
                : 'bg-red-700 text-white border-red-500 hover:bg-red-600'
            }`}
            style={{ width: '96px', height: '96px' }}
          >
            {t.sos}
          </button>
          <span className="text-xs text-neutral-400 mt-2 font-medium">
            {sosActive ? '🚨 Golden Hour Protocol Activated' : 'Emergency SOS (96dp)'}
          </span>
        </div>
      </main>

      <footer className="border-t border-neutral-800 pt-4 flex justify-between items-center">
        <span className="text-xs text-neutral-500">SafeFreight OS v4.0.0</span>
        <button
          onClick={() => {
            document.cookie = 'safefreight-token=; path=/; max-age=0';
            window.location.href = '/login';
          }}
          className="min-h-[56px] px-6 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl font-medium text-sm flex items-center justify-center"
        >
          Sign Out
        </button>
      </footer>
    </div>
  );
}
