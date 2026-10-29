import React, { useState } from 'react';
import { 
  Plus, 
  Check, 
  Trash2, 
  AlertOctagon, 
  Calculator, 
  Loader2, 
  ArrowRight,
  Sparkles,
  Building2
} from 'lucide-react';
import { CashflowMetrics, formatIDR } from '../utils/calculations';
import { 
  UpcomingMandatoryExpense, 
  UserProfile, 
  DeficitPlan, 
  Transaction,
  Language 
} from '../types';
import { getTranslation, formatI18n } from '../utils/i18n';

interface RencanaTabProps {
  metrics: CashflowMetrics;
  upcomingExpenses: UpcomingMandatoryExpense[];
  profile: UserProfile;
  transactions: Transaction[];
  onAddUpcomingExpense: (expense: Omit<UpcomingMandatoryExpense, 'id'>) => void;
  onTogglePaidUpcomingExpense: (id: string) => void;
  onDeleteUpcomingExpense: (id: string) => void;
  onGoToPeluang: () => void;
  onOpenBansos?: () => void;
  lang: Language;
}

export const RencanaTab: React.FC<RencanaTabProps> = ({
  metrics,
  upcomingExpenses,
  profile,
  transactions,
  onAddUpcomingExpense,
  onTogglePaidUpcomingExpense,
  onDeleteUpcomingExpense,
  onGoToPeluang,
  onOpenBansos,
  lang,
}) => {
  const t = getTranslation(lang);

  // New mandatory expense form modal state
  const [showAddMandatory, setShowAddMandatory] = useState(false);
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDueDate, setNewExpenseDueDate] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<'Listrik' | 'Air' | 'Pendidikan' | 'Rumah tangga' | 'Tagihan'>('Listrik');

  // Deficit Mode State
  const defaultDeficitTarget = metrics.projectedDeficit > 0 
    ? metrics.projectedDeficit 
    : (metrics.flexibleFunds < 0 ? Math.abs(metrics.flexibleFunds) : 700000);

  const [deficitTargetInput, setDeficitTargetInput] = useState(defaultDeficitTarget.toString());
  const [deficitPlan, setDeficitPlan] = useState<DeficitPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const handleGenerateDeficitPlan = async () => {
    setIsLoadingPlan(true);
    setPlanError(null);
    const target = parseInt(deficitTargetInput.replace(/[^0-9]/g, ''), 10) || defaultDeficitTarget;

    try {
      const res = await fetch('/api/ai/generate-deficit-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deficitAmount: target,
          remainingDays: metrics.remainingDays,
          currentBalance: metrics.currentBalance,
          profile,
          recentExpenses: transactions.filter(t => t.type === 'expense').slice(-5),
          language: lang,
        }),
      });

      if (!res.ok) throw new Error(lang === 'en' ? 'Failed to generate deficit plan' : 'Gagal merancang rencana penutupan defisit');
      const data = await res.json();
      setDeficitPlan(data);
    } catch (err: any) {
      setPlanError(err.message || (lang === 'en' ? 'System error occurred' : 'Terjadi kesalahan sistem'));
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const handleSaveUpcoming = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(newExpenseAmount.replace(/[^0-9]/g, ''), 10);
    if (!newExpenseTitle.trim() || !amount || amount <= 0) return;

    onAddUpcomingExpense({
      title: newExpenseTitle.trim(),
      amount,
      dueDate: newExpenseDueDate || (lang === 'en' ? 'Month-end' : 'Akhir bulan'),
      category: newExpenseCategory,
      isPaid: false,
    });

    setNewExpenseTitle('');
    setNewExpenseAmount('');
    setNewExpenseDueDate('');
    setShowAddMandatory(false);
  };

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-[#0F382A]">{t.planningTitle}</h2>
        <p className="text-xs text-[#6B7D74]">
          {t.planningSub}
        </p>
      </div>

      {/* 1. TRANSPARENT CASHFLOW BREAKDOWN */}
      <div className="bg-white rounded-2xl border border-[#E7E2D6] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#F0EDE4]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EBF3ED] text-[#0F382A] flex items-center justify-center">
              <Calculator className="w-4 h-4 text-[#C59B27]" />
            </div>
            <h3 className="text-xs font-bold text-[#0F382A]">{t.transparentAnalysis}</h3>
          </div>
          <span className="text-[11px] text-[#6B7D74] font-medium">
            {formatI18n(t.daysRemaining, { days: metrics.remainingDays })}
          </span>
        </div>

        {/* Realistic explanatory block */}
        <div className="space-y-2 text-xs text-[#2A4035] bg-[#FAF9F5] p-3.5 rounded-xl border border-[#ECE7DC] leading-relaxed">
          <p>
            "{formatI18n(t.statement1, { balance: formatIDR(metrics.currentBalance), days: metrics.remainingDays })}"
          </p>
          <p>
            "{formatI18n(t.statement2, { mandatory: formatIDR(metrics.mandatoryUpcomingExpenses), flexible: formatIDR(metrics.flexibleFunds) })}"
          </p>
          <p className="pt-1 font-semibold text-[#0F382A] border-t border-[#E5E0D3]">
            "{formatI18n(t.statement3, { safe: formatIDR(metrics.safeDailySpending) })}"
          </p>
        </div>

        {/* Calculation Table */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between py-1 border-b border-[#F4EFE6]">
            <span className="text-[#65786D]">{t.calcTableBalance}</span>
            <span className="font-bold font-mono-num text-[#0F382A]">{formatIDR(metrics.currentBalance)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#F4EFE6] text-rose-700">
            <span>{t.calcTableMandatory}</span>
            <span className="font-bold font-mono-num">-{formatIDR(metrics.mandatoryUpcomingExpenses)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#F4EFE6]">
            <span className="text-[#65786D]">{t.calcTableFlexible}</span>
            <span className={`font-bold font-mono-num ${metrics.flexibleFunds < 0 ? 'text-rose-700' : 'text-[#0F382A]'}`}>
              {formatIDR(metrics.flexibleFunds)}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#F4EFE6]">
            <span className="text-[#65786D]">{t.calcTableDays}</span>
            <span className="font-bold font-mono-num text-[#0F382A]">{metrics.remainingDays} {lang === 'en' ? 'days' : 'hari'}</span>
          </div>
          <div className="flex justify-between py-1 text-emerald-800 bg-[#EBF3ED]/60 p-2 rounded-lg font-semibold">
            <span>{t.calcTableSafeDaily}</span>
            <span className="font-mono-num font-extrabold text-[#0F382A]">{formatIDR(metrics.safeDailySpending)} / {lang === 'en' ? 'day' : 'hari'}</span>
          </div>
        </div>
      </div>

      {/* 2. UPCOMING MANDATORY EXPENSES */}
      <div className="bg-white rounded-2xl border border-[#E7E2D6] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#0F382A]">{t.mandatoryBillsTitle}</h3>
            <p className="text-[11px] text-[#6B7D74]">
              {t.mandatoryBillsSub}
            </p>
          </div>
          <button
            onClick={() => setShowAddMandatory(true)}
            className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#EBF3ED] text-[#0F382A] hover:bg-[#DEECE1] flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.addMandatoryBtn}
          </button>
        </div>

        {upcomingExpenses.length === 0 ? (
          <p className="text-xs text-[#7A8E83] text-center py-4">
            {t.noMandatoryBills}
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingExpenses.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                  item.isPaid
                    ? 'bg-[#F7F5EE] border-[#E8E4DA] opacity-60'
                    : 'bg-white border-[#E0D9CB]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <button
                    onClick={() => onTogglePaidUpcomingExpense(item.id)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      item.isPaid
                        ? 'bg-[#0F382A] border-[#0F382A] text-white'
                        : 'border-[#B4AA95] hover:border-[#0F382A]'
                    }`}
                  >
                    {item.isPaid && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0">
                    <span className={`text-xs font-semibold block truncate ${
                      item.isPaid ? 'line-through text-[#7A8E83]' : 'text-[#192A24]'
                    }`}>
                      {item.title}
                    </span>
                    <span className="text-[10px] text-[#7A8E83] block">
                      {t.duePrefix} {item.dueDate} · {(t.categories as Record<string, string>)[item.category] || item.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-bold font-mono-num text-xs ${
                    item.isPaid ? 'text-[#7A8E83]' : 'text-rose-800'
                  }`}>
                    {formatIDR(item.amount)}
                  </span>
                  <button
                    onClick={() => onDeleteUpcomingExpense(item.id)}
                    className="text-[#96A69E] hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD MANDATORY EXPENSE */}
      {showAddMandatory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 border border-[#DDD6C5] shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-[#0F382A]">
              {lang === 'en' ? 'Add Mandatory Bill' : 'Tambah Pos Wajib'}
            </h3>
            <form onSubmit={handleSaveUpcoming} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#65786D]">
                  {lang === 'en' ? 'Obligation Name' : 'Nama Kewajiban'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'en' ? 'e.g. Electricity, School Fee' : 'Contoh: Listrik PLN, SPP Anak'}
                  value={newExpenseTitle}
                  onChange={(e) => setNewExpenseTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#D5CEBD] text-[#192A24]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#65786D]">
                  {lang === 'en' ? 'Amount (IDR)' : 'Nominal (Rp)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'en' ? 'e.g. 250000' : '250000'}
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#D5CEBD] font-bold text-[#0F382A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#65786D]">
                    {lang === 'en' ? 'Category' : 'Kategori'}
                  </label>
                  <select
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-[#D5CEBD]"
                  >
                    <option value="Listrik">{(t.categories as Record<string, string>)['Listrik'] || 'Listrik'}</option>
                    <option value="Air">{(t.categories as Record<string, string>)['Air'] || 'Air'}</option>
                    <option value="Pendidikan">{(t.categories as Record<string, string>)['Pendidikan'] || 'Pendidikan'}</option>
                    <option value="Rumah tangga">{(t.categories as Record<string, string>)['Rumah tangga'] || 'Kontrakan/RT'}</option>
                    <option value="Tagihan">{(t.categories as Record<string, string>)['Tagihan'] || 'Tagihan'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#65786D]">
                    {lang === 'en' ? 'Due Date' : 'Jatuh Tempo'}
                  </label>
                  <input
                    type="date"
                    value={newExpenseDueDate}
                    onChange={(e) => setNewExpenseDueDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-[#D5CEBD]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMandatory(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[#F7F5EE] border border-[#DDD6C5] text-[#65786D]"
                >
                  {lang === 'en' ? 'Cancel' : 'Batal'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[#0F382A] text-[#F9F3DC]"
                >
                  {lang === 'en' ? 'Save' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. CORE FEATURE: MODE TUTUP DEFISIT */}
      <div className="bg-gradient-to-br from-[#FAF9F5] to-[#F5EFE4] rounded-2xl border-2 border-[#D97706]/40 p-4 shadow-md space-y-4 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D97706]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0F382A] tracking-tight">
                {t.deficitModeTitle}
              </h3>
              <p className="text-[11px] text-[#6B7D74]">
                {t.deficitModeSub}
              </p>
            </div>
          </div>
        </div>

        {/* Deficit Amount Selector */}
        <div className="p-3 bg-white rounded-xl border border-[#E2DCCE] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0F382A]">
              {t.deficitTargetLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#0F382A]">Rp</span>
            <input
              type="text"
              value={deficitTargetInput}
              onChange={(e) => setDeficitTargetInput(e.target.value)}
              placeholder="850000"
              className="flex-1 text-base font-extrabold p-2 rounded-lg border border-[#D5CEBD] text-[#0F382A] focus:outline-hidden focus:ring-2 focus:ring-[#0F382A]/30"
            />
            <button
              onClick={handleGenerateDeficitPlan}
              disabled={isLoadingPlan}
              className="py-2.5 px-4 rounded-xl bg-[#0F382A] hover:bg-[#164D3B] disabled:opacity-50 text-[#F9F3DC] font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
            >
              {isLoadingPlan ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C59B27]" />
                  <span>{t.buildingPlan}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
                  <span>{t.buildPlanBtn}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex justify-between items-center text-[10px] text-[#71847A]">
            <span>{t.projectedDeficitSystem} <strong>{formatIDR(metrics.projectedDeficit || 700000)}</strong></span>
            <span>{t.timeRemaining} <strong>{metrics.remainingDays} {lang === 'en' ? 'days' : 'hari'}</strong></span>
          </div>
        </div>

        {planError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {planError}
          </div>
        )}

        {/* DEFICIT PLAN DISPLAY */}
        {deficitPlan && (
          <div className="space-y-3 pt-2 animate-in fade-in duration-200">
            {/* Summary */}
            <div className="p-3 rounded-xl bg-white border border-[#DDD6C5] text-xs text-[#2A4035] leading-relaxed">
              <strong className="text-[#0F382A] block mb-1">{t.strategyHeading}</strong>
              {deficitPlan.summary}
            </div>

            {/* 3 Pillars of Improvement */}
            <div className="space-y-2.5">
              {/* Pilar A: Pemasukan Tambahan */}
              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center justify-center">
                      A
                    </span>
                    <span className="text-xs font-bold text-[#0F382A]">
                      {deficitPlan.planA_additionalIncome.title}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-700 font-mono-num">
                    +{formatIDR(deficitPlan.planA_additionalIncome.amount)}
                  </span>
                </div>
                <p className="text-[11px] text-[#5A6D63]">
                  <strong>{lang === 'en' ? 'Assumptions:' : 'Asumsi:'}</strong> {deficitPlan.planA_additionalIncome.assumptions}
                </p>
                <ul className="text-[11px] text-[#2C4237] space-y-1 pl-4 list-disc">
                  {deficitPlan.planA_additionalIncome.concreteSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>

              {/* Pilar B: Pengurangan Pengeluaran Fleksibel */}
              <div className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold flex items-center justify-center">
                      B
                    </span>
                    <span className="text-xs font-bold text-[#0F382A]">
                      {deficitPlan.planB_expenseReduction.title}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-amber-700 font-mono-num">
                    -{formatIDR(deficitPlan.planB_expenseReduction.amount)}
                  </span>
                </div>
                <div className="text-[11px] text-[#5A6D63]">
                  <strong>{lang === 'en' ? 'Targets:' : 'Sasaran:'}</strong> {deficitPlan.planB_expenseReduction.targetCategories.join(', ')}
                </div>
                <ul className="text-[11px] text-[#2C4237] space-y-1 pl-4 list-disc">
                  {deficitPlan.planB_expenseReduction.concreteSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>

              {/* Pilar C: Optimalisasi Usaha yang Sudah Berjalan */}
              <div className="p-3.5 rounded-xl bg-white border border-blue-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold flex items-center justify-center">
                      C
                    </span>
                    <span className="text-xs font-bold text-[#0F382A]">
                      {deficitPlan.planC_businessOptimization.title}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-blue-700 font-mono-num">
                    +{formatIDR(deficitPlan.planC_businessOptimization.amount)}
                  </span>
                </div>
                <p className="text-[11px] text-[#5A6D63]">
                  <strong>{lang === 'en' ? 'Assumptions:' : 'Asumsi:'}</strong> {deficitPlan.planC_businessOptimization.assumptions}
                </p>
                <ul className="text-[11px] text-[#2C4237] space-y-1 pl-4 list-disc">
                  {deficitPlan.planC_businessOptimization.concreteSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Total Balance Check */}
            <div className="p-3 rounded-xl bg-[#0F382A] text-[#F9F3DC] flex items-center justify-between text-xs">
              <span className="font-semibold">{t.totalTargetClosed}</span>
              <span className="font-extrabold text-sm text-[#C59B27] font-mono-num">
                {formatIDR(deficitPlan.totalImprovement)}
              </span>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-[#71847A] italic leading-tight">
              *{deficitPlan.assumptionsDisclaimer}
            </p>

            <button
              onClick={onGoToPeluang}
              className="w-full py-2.5 px-3 rounded-xl bg-white border border-[#DDD6C5] hover:bg-[#FAF9F5] text-[#0F382A] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span>{t.executeInOpportunities}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {!deficitPlan && !isLoadingPlan && (
          <div className="p-3 bg-white/70 rounded-xl text-center text-xs text-[#71847A]">
            {formatI18n(t.clickBuildPlanNotice, {
              amount: formatIDR(parseInt(deficitTargetInput.replace(/[^0-9]/g, ''), 10) || defaultDeficitTarget)
            })}
          </div>
        )}
      </div>

      {/* 4. SECONDARY ASSISTANCE REFERRAL: PUSAT BANTUAN SOSIAL */}
      {onOpenBansos && (
        <div className="p-4 rounded-2xl bg-white border border-[#DDD6C5] shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#F0F7F3] border border-[#CDE5D7] flex items-center justify-center text-[#0F382A] shrink-0">
              <Building2 className="w-4 h-4 text-[#1C5E43]" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-[#0F382A]">
                {t.bansosCardTitle}
              </h4>
              <p className="text-[11px] text-[#63766D] truncate">
                {t.bansosCardSub}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenBansos}
            className="shrink-0 text-xs font-bold py-1.5 px-3 rounded-lg bg-[#FAF9F5] hover:bg-[#EBF3ED] text-[#0F382A] border border-[#C5DEC9] transition-colors"
          >
            {t.bansosCardBtn}
          </button>
        </div>
      )}
    </div>
  );
};
