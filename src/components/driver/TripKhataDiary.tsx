'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DriverLanguage, DRIVER_TRANSLATIONS, ExpenseItem } from './types';
import { calculateTripKhata } from '@/lib/algorithms/tripKhata';
import { audioSynth } from './audio';
import {
  Wallet,
  Fuel,
  UtensilsCrossed,
  Wrench,
  ShieldCheck,
  PlusCircle,
  Trash2,
  AlertTriangle,
  Receipt,
} from 'lucide-react';

export interface TripKhataDiaryProps {
  language: DriverLanguage;
  grossFreight?: number;
  initialAdvance?: number;
}

export function TripKhataDiary({
  language,
  grossFreight = 38500, // Agreed freight for JNPT -> Changodar
  initialAdvance = 16000, // Disbursed cash advance in hand
}: TripKhataDiaryProps) {
  const t = DRIVER_TRANSLATIONS[language] || DRIVER_TRANSLATIONS.en;

  const [cashAdvance] = useState<number>(initialAdvance);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    {
      id: 'exp-1',
      timestamp: '08:45 AM',
      category: 'diesel',
      title: {
        hi: 'डीजल पर्ची (HPCL Vapi)',
        gu: 'ડીઝલ પાવતી (HPCL વાપી)',
        mr: 'डिझेल पावती (HPCL वापी)',
        te: 'డీజిల్ రసీదు (HPCL వాపి)',
        en: 'Diesel Slip (HPCL Vapi)',
      },
      amount: 5000,
      note: '54.3 L @ ₹92/L',
    },
    {
      id: 'exp-2',
      timestamp: '11:15 AM',
      category: 'dhaba',
      title: {
        hi: 'ढाबा भोजन व चाय (संजरी ढाबा)',
        gu: 'ઢાબા ભોજન અને ચા',
        mr: 'ढाबा जेवण व चहा',
        te: 'ధాబా భోజనం మరియు టీ',
        en: 'Dhaba Meal & Tea',
      },
      amount: 300,
      note: 'Driver lunch & tea',
    },
  ]);

  // Custom expense input states
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<'diesel' | 'dhaba' | 'puncture' | 'toll' | 'other'>('diesel');
  const [customNote, setCustomNote] = useState<string>('');
  const [inputError, setInputError] = useState<string | null>(null);

  // Compute live aggregates
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingCash = cashAdvance - totalExpenses;
  const isOverspent = remainingCash < 0;

  // Breakdown by category for algorithmic trip khata
  const dieselTotal = expenses.filter((e) => e.category === 'diesel').reduce((s, e) => s + e.amount, 0);
  const tollTotal = expenses.filter((e) => e.category === 'toll').reduce((s, e) => s + e.amount, 0);
  const bhattaTotal = expenses.filter((e) => e.category === 'dhaba').reduce((s, e) => s + e.amount, 0);
  const otherTotal = expenses.filter((e) => e.category === 'puncture' || e.category === 'other').reduce((s, e) => s + e.amount, 0);

  const settlement = calculateTripKhata(
    grossFreight,
    {
      diesel: dieselTotal,
      fastag: tollTotal,
      driverBhatta: bhattaTotal,
      hamali: otherTotal,
    },
    2000 // Maintenance reserve
  );

  const addQuickExpense = (category: 'diesel' | 'dhaba' | 'puncture' | 'toll', amount: number, titleKey: string) => {
    audioSynth.playClickTone();
    const now = new Date();
    const timeStr = now.toLocaleTimeString(language === 'en' ? 'en-IN' : 'hi-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const newItem: ExpenseItem = {
      id: `exp-${Date.now()}`,
      timestamp: timeStr,
      category,
      amount,
      title: {
        hi: titleKey,
        gu: titleKey,
        mr: titleKey,
        te: titleKey,
        en: titleKey,
      },
      note: '1-Tap Quick Log',
    };

    setExpenses((prev) => [newItem, ...prev]);
  };

  const handleAddCustomExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customAmount, 10);
    if (isNaN(parsed) || parsed < 10) {
      setInputError('कृपया न्यूनतम ₹10 या उससे अधिक की वैध राशि दर्ज करें');
      audioSynth.playWarningBuzzer();
      return;
    }

    setInputError(null);
    audioSynth.playClickTone();

    const now = new Date();
    const timeStr = now.toLocaleTimeString(language === 'en' ? 'en-IN' : 'hi-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const categoryTitles: Record<string, string> = {
      diesel: 'डीजल पर्ची (Diesel)',
      dhaba: 'ढाबा भोजन (Dhaba Meal)',
      puncture: 'पंचर / मरम्मत (Tyre Repair)',
      toll: 'टोल / धर्मकांटा (Toll / Weighbridge)',
      other: 'अन्य आकस्मिक खर्च (Miscellaneous)',
    };

    const newItem: ExpenseItem = {
      id: `exp-${Date.now()}`,
      timestamp: timeStr,
      category: customCategory,
      amount: parsed,
      title: {
        hi: categoryTitles[customCategory],
        gu: categoryTitles[customCategory],
        mr: categoryTitles[customCategory],
        te: categoryTitles[customCategory],
        en: categoryTitles[customCategory],
      },
      note: customNote.trim() || undefined,
    };

    setExpenses((prev) => [newItem, ...prev]);
    setCustomAmount('');
    setCustomNote('');
  };

  const removeExpense = (id: string) => {
    audioSynth.playClickTone();
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Cash in Hand */}
        <div
          className={`p-5 rounded-2xl border-2 transition-all ${
            isOverspent
              ? 'bg-red-950/60 border-red-600 text-red-200'
              : remainingCash === 0
              ? 'bg-amber-950/60 border-amber-500 text-amber-200'
              : 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-base font-bold uppercase tracking-wider text-neutral-300">
              {t.cashInHand}
            </span>
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            ₹{remainingCash.toLocaleString('en-IN')}
          </p>
          <span className="text-base font-bold text-neutral-200 mt-1 block">
            {isOverspent
              ? t.overspentAlert
              : remainingCash === 0
              ? t.zeroCashAlert
              : t.safeCashAvailable}
          </span>
        </div>

        {/* Total Advance Received */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base font-bold uppercase tracking-wider text-neutral-300">
              {t.totalAdvanceReceived}
            </span>
            <Receipt className="w-6 h-6 text-sky-400" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            ₹{cashAdvance.toLocaleString('en-IN')}
          </p>
          <span className="text-base font-medium text-neutral-400 mt-1 block">
            {t.subtitle || 'कुल भाड़ा'}: ₹{grossFreight.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Total Expenses Logged */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base font-bold uppercase tracking-wider text-neutral-300">
              {t.totalExpensesLogged}
            </span>
            <Fuel className="w-6 h-6 text-amber-400" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </p>
          <span className="text-base font-medium text-neutral-400 mt-1 block">
            {expenses.length} {t.expenseHistory}
          </span>
        </div>
      </div>

      {/* Quick 1-Tap Expense Buttons (>= 56dp Touch Target) */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-[#0075de]" />
            {t.quickExpense}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              type="button"
              variant="secondary"
              size="touch56"
              onClick={() => addQuickExpense('diesel', 5000, t.dieselBtn)}
              className="bg-neutral-800/90 hover:bg-neutral-700 border-neutral-700 text-white font-black text-lg flex flex-col py-3 min-h-[64px] h-auto"
            >
              <Fuel className="w-6 h-6 text-amber-400 mb-1" />
              <span>{t.dieselBtn}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="touch56"
              onClick={() => addQuickExpense('dhaba', 300, t.dhabaBtn)}
              className="bg-neutral-800/90 hover:bg-neutral-700 border-neutral-700 text-white font-black text-lg flex flex-col py-3 min-h-[64px] h-auto"
            >
              <UtensilsCrossed className="w-6 h-6 text-emerald-400 mb-1" />
              <span>{t.dhabaBtn}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="touch56"
              onClick={() => addQuickExpense('puncture', 200, t.punctureBtn)}
              className="bg-neutral-800/90 hover:bg-neutral-700 border-neutral-700 text-white font-black text-lg flex flex-col py-3 min-h-[64px] h-auto"
            >
              <Wrench className="w-6 h-6 text-sky-400 mb-1" />
              <span>{t.punctureBtn}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="touch56"
              onClick={() => addQuickExpense('toll', 500, t.tollBtn)}
              className="bg-neutral-800/90 hover:bg-neutral-700 border-neutral-700 text-white font-black text-lg flex flex-col py-3 min-h-[64px] h-auto"
            >
              <ShieldCheck className="w-6 h-6 text-purple-400 mb-1" />
              <span>{t.tollBtn}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Expense Entry Form */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl sm:text-2xl font-black text-neutral-200">
            {t.customExpenseTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <form onSubmit={handleAddCustomExpense} className="space-y-3">
            {inputError && (
              <div className="p-3 rounded-xl bg-red-950 text-red-300 border border-red-800 text-base font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{inputError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-base font-bold text-neutral-300 mb-1">
                  {t.categoryLabel}
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as any)}
                  className="w-full min-h-[56px] px-4 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-semibold text-base focus:border-[#0075de] focus:outline-none"
                >
                  <option value="diesel">{t.categoryDiesel}</option>
                  <option value="dhaba">{t.categoryDhaba}</option>
                  <option value="puncture">{t.categoryPuncture}</option>
                  <option value="toll">{t.categoryToll}</option>
                  <option value="other">{t.categoryOther}</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-bold text-neutral-300 mb-1">
                  {t.amountLabel}
                </label>
                <input
                  type="number"
                  min="10"
                  step="1"
                  placeholder="₹ 500"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full min-h-[56px] px-4 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-black text-xl focus:border-[#0075de] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-neutral-300 mb-1">
                  {t.notesLabel}
                </label>
                <input
                  type="text"
                  placeholder="HPCL / ढाबा नाम"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full min-h-[56px] px-4 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-base focus:border-[#0075de] focus:outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="touch56"
              fullWidth
              className="mt-2 text-xl font-black bg-[#0075de] min-h-[56px]"
            >
              {t.addExpenseBtn}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Expense History Ledger Table */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="pb-3 border-b border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-neutral-300" />
              {t.expenseHistory}
            </CardTitle>
            <span className="text-base text-neutral-300 font-bold">
              POD Balance: ₹{settlement.balanceDueOnPODINR.toLocaleString('en-IN')}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="p-6 text-center text-neutral-400 font-medium text-base">
              {t.noExpenses}
            </div>
          ) : (
            <div className="divide-y divide-neutral-800/80">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 flex items-center justify-between hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
                      {exp.category === 'diesel' && <Fuel className="w-6 h-6 text-amber-400" />}
                      {exp.category === 'dhaba' && <UtensilsCrossed className="w-6 h-6 text-emerald-400" />}
                      {exp.category === 'puncture' && <Wrench className="w-6 h-6 text-sky-400" />}
                      {exp.category === 'toll' && <ShieldCheck className="w-6 h-6 text-purple-400" />}
                      {exp.category === 'other' && <Receipt className="w-6 h-6 text-neutral-300" />}
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">
                        {exp.title[language] || exp.title.hi}
                      </p>
                      <p className="text-base text-neutral-400">
                        {exp.timestamp} {exp.note ? `· ${exp.note}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-white">
                      -₹{exp.amount.toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExpense(exp.id)}
                      className="min-h-[56px] min-w-[56px] flex items-center justify-center rounded-xl bg-neutral-800/80 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                      title={t.closeBtn || 'रद्द करें'}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
