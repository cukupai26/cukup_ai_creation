import React, { useState } from 'react';
import { 
  Plus, 
  Bot, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight,
  Receipt,
  HelpCircle,
  AlertOctagon,
  Camera,
  Building2
} from 'lucide-react';
import { CashflowMetrics, formatIDR } from '../utils/calculations';
import { Transaction, UpcomingMandatoryExpense, Language } from '../types';
import { DailyCheckIn } from './DailyCheckIn';
import { CukupAiProCard } from './CukupAiProCard';
import { getTranslation, formatI18n } from '../utils/i18n';
import { PWAInstallButton } from './PWAInstallButton';

interface BerandaTabProps {
  metrics: CashflowMetrics;
  transactions: Transaction[];
  upcomingExpenses: UpcomingMandatoryExpense[];
  isDemoActive: boolean;
  onOpenRecordTx: () => void;
  onOpenScanReceipt: () => void;
  onOpenAiAgent: () => void;
  onGoToRencana: () => void;
  onGoToPeluang: () => void;
  onGoToTransaksi: () => void;
  onRecordIncome: () => void;
  onRecordExpense: () => void;
  onOpenSetOpeningBalance?: () => void;
  onOpenBansos?: () => void;
  onOpenProModal?: () => void;
  lang: Language;
}

export const BerandaTab: React.FC<BerandaTabProps> = ({
  metrics,
  transactions,
  upcomingExpenses,
  isDemoActive,
  onOpenRecordTx,
  onOpenScanReceipt,
  onOpenAiAgent,
  onGoToRencana,
  onGoToPeluang,
  onGoToTransaksi,
  onRecordIncome,
  onRecordExpense,
  onOpenSetOpeningBalance,
  onOpenBansos,
  onOpenProModal,
  lang,
}) => {
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);
  const t = getTranslation(lang);

  const getStatusBadge = () => {
    switch (metrics.status) {
      case 'KRITIS':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            <span>{t.statusKritis}</span>
          </div>
        );
      case 'PERLU_WASPADA':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>{t.statusWaspada}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.statusAman}</span>
          </div>
        );
    }
  };

  const recentTransactions = transactions.slice(-4).reverse();

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300">
      {/* PWA Mobile Web App Install Banner */}
      <PWAInstallButton lang={lang} variant="banner" />

      {/* 1. HERO CARD: Uang Aman Hari Ini & Saldo Tersedia */}
      <div className="bg-gradient-to-b from-[#0F382A] to-[#164736] text-[#F7F5EE] rounded-3xl p-5 shadow-lg border border-[#1E5740] relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#C59B27]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header inside Hero */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#A9C1B5]">
              {t.cashStatusLabel}
            </span>
            {isDemoActive && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-[#F9F3DC] border border-amber-400/30 font-medium">
                {t.demoBadge}
              </span>
            )}
          </div>
          {getStatusBadge()}
        </div>

        {/* UANG AMAN HARI INI */}
        <div className="mb-4 bg-[#09251C]/60 rounded-2xl p-4 border border-[#27644B] backdrop-blur-xs relative z-10">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[#C8DBD1]">{t.safeMoneyToday}</span>
              <button 
                onClick={() => setShowCalculationDetails(!showCalculationDetails)}
                className="text-[#A9C1B5] hover:text-[#F9F3DC] transition-colors"
                title={t.calcDropdownTitle}
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#C59B27]" />
              </button>
            </div>
            <span className="text-[11px] text-[#A9C1B5] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#C59B27]" />
              {formatI18n(t.daysRemaining, { days: metrics.remainingDays })}
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold text-[#F9F3DC] tracking-tight font-display mb-1">
            {formatIDR(metrics.safeDailySpending)}
            <span className="text-xs font-normal text-[#A9C1B5] ml-1.5">{t.perDay}</span>
          </div>

          <p className="text-xs text-[#C8DBD1] leading-relaxed">
            {formatI18n(t.safeMoneyDesc, { amount: formatIDR(metrics.safeDailySpending) })}
          </p>

          {/* Transparent calculation drop-down */}
          {showCalculationDetails && (
            <div className="mt-3 pt-3 border-t border-[#1F4F3B] text-[11px] text-[#D8E6DF] space-y-1.5 animate-in slide-in-from-top-2 duration-150">
              <div className="flex justify-between">
                <span>{t.activeBalanceLabel}</span>
                <span className="font-semibold text-white">{formatIDR(metrics.currentBalance)}</span>
              </div>
              {metrics.confirmedUpcomingIncome > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>{t.confirmedIncomeAdd}</span>
                  <span className="font-semibold">+{formatIDR(metrics.confirmedUpcomingIncome)}</span>
                </div>
              )}
              <div className="flex justify-between text-rose-300">
                <span>{t.mandatoryRemainingSub}</span>
                <span className="font-semibold">-{formatIDR(metrics.unpaidMandatoryUpcomingExpenses)}</span>
              </div>
              {metrics.paidMandatoryUpcomingExpenses > 0 && (
                <div className="flex justify-between text-[#A9C1B5] italic text-[10px]">
                  <span>{t.paidBillsNotDeducted}</span>
                  <span>{formatIDR(metrics.paidMandatoryUpcomingExpenses)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#1F4F3B] pt-1">
                <span>{t.netFlexibleCash}</span>
                <span className="font-semibold text-[#F9F3DC]">{formatIDR(metrics.flexibleFunds)}</span>
              </div>
              <div className="flex justify-between text-[#A9C1B5]">
                <span>{t.daysRemainingLabel}</span>
                <span>{metrics.remainingDays} {t.daysUnit}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0F382A] text-[10px] text-[#C59B27] mt-1 font-medium">
                {formatI18n(t.formulaText, {
                  flexible: formatIDR(metrics.flexibleFunds),
                  days: metrics.remainingDays,
                  safe: formatIDR(metrics.safeDailySpending),
                })}
              </div>
              {metrics.notes && metrics.notes.length > 0 && (
                <div className="p-2 rounded-lg bg-black/20 text-[10px] text-[#A9C1B5] space-y-0.5">
                  {metrics.notes.map((note, idx) => (
                    <div key={idx}>• {note}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Available Balance & Projected End of Month */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] text-[#A9C1B5]">{t.availableBalance}</span>
              {onOpenSetOpeningBalance && (
                <button
                  onClick={onOpenSetOpeningBalance}
                  className="text-[10px] text-[#C59B27] hover:text-[#F9F3DC] underline underline-offset-2 font-medium transition-colors"
                  title={lang === 'en' ? 'Set Opening Balance' : 'Atur Saldo Kas Awal'}
                >
                  {lang === 'en' ? 'Edit' : 'Atur'}
                </button>
              )}
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              {formatIDR(metrics.currentBalance)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <span className="text-[11px] text-[#A9C1B5] block mb-0.5">{t.projectedEndOfMonth}</span>
            <span className={`text-lg font-bold tracking-tight ${
              metrics.projectedEndOfMonthBalance < 0 ? 'text-rose-300' : 'text-[#F9F3DC]'
            }`}>
              {formatIDR(metrics.projectedEndOfMonthBalance)}
            </span>
          </div>
        </div>

        {/* Main Action Buttons (Catat Transaksi, Scan Struk, Tanya CukupAI) */}
        <div className="space-y-2 mt-4 relative z-10">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenRecordTx}
              className="py-3 px-3 rounded-xl bg-[#C59B27] hover:bg-[#D4A933] text-[#0F382A] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t.addTransaction}</span>
            </button>

            <button
              onClick={onOpenScanReceipt}
              className="py-3 px-3 rounded-xl bg-[#1B5E43] hover:bg-[#237554] text-[#F9F3DC] border border-[#3E8B69] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Camera className="w-4 h-4 text-[#F9F3DC]" />
              <span>{t.scanReceipt}</span>
            </button>
          </div>

          <button
            onClick={onOpenAiAgent}
            className="w-full py-2.5 px-3.5 rounded-xl bg-white/15 hover:bg-white/20 text-[#F9F3DC] border border-white/20 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Bot className="w-4 h-4 text-[#F9F3DC]" />
            <span>{t.askCukupAi}</span>
          </button>
        </div>
      </div>

      {/* 2. EARLY WARNING / DEFICIT BANNER IF AT RISK */}
      {metrics.status !== 'AMAN' && (
        <div className={`rounded-2xl p-4 border transition-all ${
          metrics.status === 'KRITIS' 
            ? 'bg-rose-50 border-rose-200 text-rose-950' 
            : 'bg-amber-50 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              metrics.status === 'KRITIS' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  {metrics.status === 'KRITIS' ? t.warningDeficitTitle : t.warningCautionTitle}
                </h3>
              </div>

              <p className="text-xs leading-relaxed mb-3">
                {metrics.statusReason}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onGoToRencana}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                    metrics.status === 'KRITIS'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  {t.openDeficitMode}
                </button>

                <button
                  onClick={onGoToPeluang}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-[#DDD6C5] text-[#192A24] hover:bg-[#FAF9F5]"
                >
                  {t.viewOpportunities}
                </button>
              </div>

              {/* Subtle Pusat Bantuan Sosial Card (only shown when status is KRITIS) */}
              {metrics.status === 'KRITIS' && onOpenBansos && (
                <div className="mt-3.5 pt-3 border-t border-rose-200/80">
                  <div className="p-3 rounded-xl bg-white/90 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Building2 className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                        <span className="text-xs font-bold text-rose-950">
                          {t.bansosReferralTitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-900/90 leading-tight">
                        {t.bansosReferralDesc}
                      </p>
                      <span className="text-[10px] text-rose-700/80 block mt-0.5 italic">
                        {t.bansosReferralNote}
                      </span>
                    </div>

                    <button
                      onClick={onOpenBansos}
                      className="shrink-0 py-1.5 px-3 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition-colors shadow-2xs text-center"
                    >
                      {t.bansosReferralBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CukupAI Pro Contextual & Dismissible Offer */}
      <CukupAiProCard
        metrics={metrics}
        onOpenProModal={onOpenProModal || (() => {})}
        lang={lang}
      />

      {/* 3. DAILY FINANCIAL CHECK-IN */}
      <DailyCheckIn
        metrics={metrics}
        onRecordIncome={onRecordIncome}
        onRecordExpense={onRecordExpense}
        onTriggerDeficitMode={onGoToRencana}
        onExploreOpportunities={onGoToPeluang}
        lang={lang}
      />

      {/* 4. CASHFLOW SUMMARY CARDS */}
      <div className="bg-white rounded-2xl border border-[#E7E2D6] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0F382A]">
            {t.cashflowTitle}
          </h3>
          <span className="text-[11px] text-[#6B7D74] font-medium">
            {formatI18n(t.dailyAvg, { amount: formatIDR(metrics.averageDailySpending) })}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Pemasukan */}
          <div className="p-3 rounded-xl bg-[#F0F7F3] border border-[#D5E8DD]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#1C5E43] flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {t.income}
              </span>
            </div>
            <span className="text-base font-extrabold text-[#114631] font-display">
              {formatIDR(metrics.totalIncome)}
            </span>
          </div>

          {/* Pengeluaran */}
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-rose-800 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {t.expense}
              </span>
            </div>
            <span className="text-base font-extrabold text-rose-900 font-display">
              {formatIDR(metrics.totalExpenses)}
            </span>
          </div>
        </div>

        {/* Visual Progress Bar of Cashflow Burn */}
        <div>
          <div className="flex justify-between text-[11px] text-[#65786D] mb-1">
            <span>{t.spendRatio}</span>
            <span className="font-semibold text-[#192A24]">
              {metrics.totalIncome > 0
                ? `${Math.min(100, Math.round((metrics.totalExpenses / metrics.totalIncome) * 100))}%`
                : '0%'}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#EAE5D8] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.totalExpenses > metrics.totalIncome
                  ? 'bg-rose-500'
                  : metrics.totalExpenses > metrics.totalIncome * 0.8
                  ? 'bg-amber-500'
                  : 'bg-[#1C5E43]'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  metrics.totalIncome > 0 ? (metrics.totalExpenses / metrics.totalIncome) * 100 : 0
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 5. UPCOMING MANDATORY EXPENSES PREVIEW */}
      {upcomingExpenses.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E7E2D6] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#0F382A]">{t.mandatoryBillsRemaining}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                {formatIDR(metrics.mandatoryUpcomingExpenses)}
              </span>
            </div>
            <button
              onClick={onGoToRencana}
              className="text-xs font-semibold text-[#0F382A] hover:underline flex items-center gap-0.5"
            >
              {t.manage} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {upcomingExpenses.filter(e => !e.isPaid).slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EBE6DB] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-[#192A24] block">{item.title}</span>
                  <span className="text-[10px] text-[#71847A]">{t.duePrefix} {item.dueDate}</span>
                </div>
                <span className="font-bold text-rose-800">{formatIDR(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. RECENT TRANSACTIONS PREVIEW */}
      <div className="bg-white rounded-2xl border border-[#E7E2D6] p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-[#C59B27]" />
            <h3 className="text-xs font-bold text-[#0F382A]">{t.recentTransactions}</h3>
          </div>
          <button
            onClick={onGoToTransaksi}
            className="text-xs font-semibold text-[#0F382A] hover:underline flex items-center gap-0.5"
          >
            {formatI18n(t.viewAll, { count: transactions.length })} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-6 text-center text-[#71847A]">
            <p className="text-xs">{t.noTransactionsYet}</p>
            <button
              onClick={onOpenRecordTx}
              className="mt-2 text-xs font-bold text-[#0F382A] underline"
            >
              {t.recordFirstTx}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F0EDE4]">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#192A24] truncate">{tx.description}</span>
                    {tx.isDemo && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        {t.demoBadge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#71847A] mt-0.5">
                    <span>{(t.categories as Record<string, string>)[tx.category] || tx.category}</span>
                    <span>·</span>
                    <span>{tx.date}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-bold text-xs ${
                      tx.type === 'income' ? 'text-emerald-700' : 'text-[#192A24]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}{formatIDR(tx.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
