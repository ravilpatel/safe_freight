/**
 * SafeFreight OS — Web Audio API Synthesizer & Spoken Countdown Vocabulary Engine
 * Reference: PRD v4.0.0 Phase 3, PRD v3 FR-AU-01, FR-AU-02, FR-AU-03, FR-SF-02
 */

import { DriverLanguage } from './types';

// Browser-safe AudioContext getter
class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: ReturnType<typeof setInterval> | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playClickTone(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Degrade gracefully
    }
  }

  public playAffirmativeChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Dual harmonic chime
      [880, 1320].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch {
      // Degrade gracefully
    }
  }

  public playWarningBuzzer(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Degrade gracefully
    }
  }

  public startEmergencySiren(): void {
    const ctx = this.getContext();
    if (!ctx || this.sirenOsc) return;

    try {
      this.sirenOsc = ctx.createOscillator();
      this.sirenGain = ctx.createGain();
      this.sirenOsc.type = 'sine';
      this.sirenGain.gain.setValueAtTime(0.35, ctx.currentTime);

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(ctx.destination);
      this.sirenOsc.start();

      let high = false;
      this.sirenInterval = setInterval(() => {
        if (!this.sirenOsc || !this.ctx) return;
        const targetFreq = high ? 700 : 1100;
        high = !high;
        this.sirenOsc.frequency.linearRampToValueAtTime(targetFreq, this.ctx.currentTime + 0.5);
      }, 500);
    } catch {
      // Degrade gracefully
    }
  }

  public stopEmergencySiren(): void {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
      } catch {
        // Ignore
      }
      this.sirenOsc = null;
    }
    if (this.sirenGain) {
      try {
        this.sirenGain.disconnect();
      } catch {
        // Ignore
      }
      this.sirenGain = null;
    }
  }
}

export const audioSynth = new AudioSynthesizer();

// Spoken Countdown numbers 30 down to 0 in 5 languages
const SPOKEN_NUMBERS: Record<DriverLanguage, string[]> = {
  hi: [
    'शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
    'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस',
    'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस', 'तीस',
  ],
  gu: [
    'શૂન્ય', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ', 'દસ',
    'અગિયાર', 'બાર', 'તેર', 'ચૌદ', 'પંદર', 'સોળ', 'સત્તર', 'અઢાર', 'ઓગણીસ', 'વીસ',
    'એકવીસ', 'બાવીસ', 'તેવીસ', 'ચોવીસ', 'પચ્ચીસ', 'છવ્વીસ', 'સત્તાવીસ', 'અઠ્ઠાવીસ', 'ઓગણત્રીસ', 'ત્રીસ',
  ],
  mr: [
    'शून्य', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ', 'दहा',
    'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस', 'वीस',
    'एकवीस', 'बावीस', 'तेवीस', 'चोवीस', 'पंचवीस', 'सव्वीस', 'सत्तावीस', 'अठ्ठावीस', 'एकोणतीस', 'तीस',
  ],
  te: [
    'సున్నా', 'ఒకటి', 'రెండు', 'మూడు', 'నాలుగు', 'ఐదు', 'ఆరు', 'ఏడు', 'ఎనిమిది', 'తొమ్మిది', 'పది',
    'పదకొండు', 'పన్నెండు', 'పదమూడు', 'పద్నాలుగు', 'పదిహేను', 'పదహారు', 'పదిహేడు', 'పద్దెనిమిది', 'పంతొమ్మిది', 'ఇరవై',
    'ఇరవై ఒకటి', 'ఇరవై రెండు', 'ఇరవై మూడు', 'ఇరవై నాలుగు', 'ఇరవై ఐదు', 'ఇరవై ఆరు', 'ఇరవై ఏడు', 'ఇరవై ఎనిమిది', 'ఇరవై తొమ్మిది', 'ముప్పై',
  ],
  en: [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
    'twenty one', 'twenty two', 'twenty three', 'twenty four', 'twenty five', 'twenty six', 'twenty seven', 'twenty eight', 'twenty nine', 'thirty',
  ],
};

const BROWSER_LOCALE_MAP: Record<DriverLanguage, string> = {
  hi: 'hi-IN',
  gu: 'gu-IN',
  mr: 'mr-IN',
  te: 'te-IN',
  en: 'en-IN',
};

export function speakText(text: string, lang: DriverLanguage = 'hi'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = BROWSER_LOCALE_MAP[lang] || 'hi-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Graceful degradation
  }
}

export function speakCountdownNumber(num: number, lang: DriverLanguage = 'hi'): void {
  if (num < 0 || num > 30) return;
  const wordList = SPOKEN_NUMBERS[lang] || SPOKEN_NUMBERS.hi;
  const word = wordList[num];
  if (word) {
    speakText(word, lang);
  }
}

const ROLLOVER_WARNINGS: Record<DriverLanguage, string> = {
  hi: 'गाड़ी की गति धीमी करें, आगे खतरनाक मोड़ है',
  gu: 'વાહનની ગતિ ધીમી કરો, આગળ જોખમી વળાંક છે',
  mr: 'वाहनाचा वेग कमी करा, पुढे धोकादायक वळण आहे',
  te: 'వాహనం వేగాన్ని తగ్గించండి, ముందు ప్రమాదకరమైన మలుపు ఉంది',
  en: 'Caution: Reduce vehicle speed, sharp curve ahead',
};

export function speakRolloverWarning(lang: DriverLanguage = 'hi'): void {
  const warning = ROLLOVER_WARNINGS[lang] || ROLLOVER_WARNINGS.hi;
  speakText(warning, lang);
}
