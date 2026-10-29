import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Calculator, 
  CheckCircle2, 
  Circle, 
  Loader2, 
  Edit3, 
  RefreshCw,
  PlusCircle,
  ShoppingBag,
  Smartphone,
  AlertTriangle,
  ArrowRight,
  Info,
  ShieldCheck,
  Check,
  Coins,
  Package,
  Layers
} from 'lucide-react';
import { 
  IncomeOpportunity, 
  UserProfile, 
  Language,
  SalesTargetCalculationInput
} from '../types';
import { 
  CashflowMetrics, 
  formatIDR, 
  calculateSalesTargetPlan 
} from '../utils/calculations';
import { getTranslation, formatI18n } from '../utils/i18n';
import { 
  PartnerOpportunityModal, 
  PartnerOpportunityType 
} from './PartnerOpportunityModal';

interface PeluangTabProps {
  profile: UserProfile;
  metrics: CashflowMetrics;
  opportunities: IncomeOpportunity[];
  onUpdateProfile: (updated: UserProfile) => void;
  onUpdateOpportunities: (opps: IncomeOpportunity[]) => void;
  onRecordQuickIncome: (amount: number, description: string) => void;
  onOpenProModal?: () => void;
  lang: Language;
}

export const PeluangTab: React.FC<PeluangTabProps> = ({
  profile,
  metrics,
  opportunities,
  onUpdateProfile,
  onUpdateOpportunities,
  onRecordQuickIncome,
  onOpenProModal,
  lang,
}) => {
  const t = getTranslation(lang);

  // Income Target Calculator state (5 required inputs)
  const defaultTarget = metrics.projectedDeficit > 0 
    ? metrics.projectedDeficit 
    : 700000;

  const [calcTarget, setCalcTarget] = useState(defaultTarget);
  const [daysRemaining, setDaysRemaining] = useState(metrics.remainingDays || 12);
  const [productName, setProductName] = useState(profile.business.product || 'Parfum Spray 50ml');
  const [sellingPrice, setSellingPrice] = useState(profile.business.unitPrice || 25000);
  const [costPerUnit, setCostPerUnit] = useState(
    profile.business.unitPrice && profile.business.netProfitPerUnit 
      ? Math.max(0, profile.business.unitPrice - profile.business.netProfitPerUnit) 
      : 15000
  );
  const [additionalCostPerTx, setAdditionalCostPerTx] = useState(2000);

  // Dynamic Progress Tracking
  const [reportedIncome, setReportedIncome] = useState(0);
  const [customReportAmount, setCustomReportAmount] = useState('150000');
  const [showProgressSuccess, setShowProgressSuccess] = useState(false);

  // Profile Editor modal/accordion state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfile>(profile);

  // AI Generator loading state
  const [isGenerating, setIsGenerating] = useState(false);

  // Partner Opportunity Modal state
  const [activePartnerModal, setActivePartnerModal] = useState<PartnerOpportunityType | null>(null);

  // Calculate Sales Target Plan using pure math calculation engine
  const calculationPlan = calculateSalesTargetPlan({
    targetAmount: calcTarget,
    daysAvailable: daysRemaining,
    sellingPrice,
    costPerUnit,
    additionalCostPerTx,
    lang,
  });

  const remainingTarget = Math.max(0, calcTarget - reportedIncome);

  // Toggle Action Plan Checkbox
  const handleToggleTask = (oppId: string, taskIndex: number) => {
    const updated = opportunities.map((opp) => {
      if (opp.id === oppId) {
        const newPlan = opp.actionPlan.map((item, idx) => {
          if (idx === taskIndex) {
            return { ...item, completed: !item.completed };
          }
          return item;
        });
        return { ...opp, actionPlan: newPlan };
      }
      return opp;
    });
    onUpdateOpportunities(updated);
  };

  // Report Realization ("Hari ini saya mendapat Rp150.000")
  const handleReportRealization = () => {
    const amt = parseInt(customReportAmount.replace(/[^0-9]/g, ''), 10);
    if (!amt || amt <= 0) return;

    setReportedIncome((prev) => prev + amt);
    onRecordQuickIncome(
      amt, 
      lang === 'en' 
        ? `Sales realization / revenue: ${productName}` 
        : `Hasil penjualan/tambahan: ${productName}`
    );
    setShowProgressSuccess(true);
    setTimeout(() => setShowProgressSuccess(false), 4000);
  };

  const handleGenerateFreshOpportunities = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          deficitTarget: calcTarget,
          remainingDays: daysRemaining,
          language: lang,
        }),
      });

      if (!res.ok) throw new Error('Gagal memuat peluang');
      const data = await res.json();
      if (data.opportunities && Array.isArray(data.opportunities)) {
        onUpdateOpportunities(data.opportunities);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(tempProfile);
    setIsEditingProfile(false);
    // Sync price if changed
    if (tempProfile.business.unitPrice) {
      setSellingPrice(tempProfile.business.unitPrice);
      if (tempProfile.business.netProfitPerUnit) {
        setCostPerUnit(Math.max(0, tempProfile.business.unitPrice - tempProfile.business.netProfitPerUnit));
      }
    }
  };

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#0F382A]">{t.opportunityTitle}</h2>
          <p className="text-xs text-[#6B7D74]">
            {t.opportunitySub}
          </p>
        </div>
        <button
          onClick={() => setIsEditingProfile(!isEditingProfile)}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#EBF3ED] text-[#0F382A] hover:bg-[#DEECE1] flex items-center gap-1.5 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#C59B27]" />
          <span>{t.resourceProfileBtn}</span>
        </button>
      </div>

      {/* 1. RESOURCE PROFILE DRAWER */}
      {isEditingProfile && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-[#DDD6C5] p-4 shadow-sm space-y-3.5 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0EDE4]">
            <h3 className="font-bold text-xs text-[#0F382A]">
              {t.profileDrawerTitle}
            </h3>
            <span className="text-[11px] text-[#7A8E83]">
              {t.profileDrawerSub}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <label className="font-semibold text-[#65786D] block mb-1">
                {t.businessNameLabel}
              </label>
              <input
                type="text"
                value={tempProfile.business.name}
                onChange={(e) => setTempProfile({
                  ...tempProfile,
                  business: { ...tempProfile.business, name: e.target.value }
                })}
                placeholder={t.businessNamePlaceholder}
                className="w-full p-2 rounded-lg border border-[#D5CEBD]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#65786D] block mb-1">
                {t.primaryProductLabel}
              </label>
              <input
                type="text"
                value={tempProfile.business.product}
                onChange={(e) => {
                  setTempProfile({
                    ...tempProfile,
                    business: { ...tempProfile.business, product: e.target.value }
                  });
                  setProductName(e.target.value);
                }}
                placeholder="Parfum Spray 50ml"
                className="w-full p-2 rounded-lg border border-[#D5CEBD]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#65786D] block mb-1">
                {t.sellingPriceLabel}
              </label>
              <input
                type="number"
                value={tempProfile.business.unitPrice}
                onChange={(e) => setTempProfile({
                  ...tempProfile,
                  business: { ...tempProfile.business, unitPrice: Number(e.target.value) || 0 }
                })}
                className="w-full p-2 rounded-lg border border-[#D5CEBD]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#65786D] block mb-1">
                {t.netProfitPerUnitLabel}
              </label>
              <input
                type="number"
                value={tempProfile.business.netProfitPerUnit}
                onChange={(e) => setTempProfile({
                  ...tempProfile,
                  business: { ...tempProfile.business, netProfitPerUnit: Number(e.target.value) || 0 }
                })}
                className="w-full p-2 rounded-lg border border-[#D5CEBD]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="py-1.5 px-3 rounded-lg border text-xs text-[#65786D]"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="py-1.5 px-3 rounded-lg bg-[#0F382A] text-white text-xs font-semibold"
            >
              {t.saveResourcesBtn}
            </button>
          </div>
        </form>
      )}

      {/* 2. ENHANCED SALES TARGET CALCULATOR (FITUR 2A) */}
      <div className="bg-white rounded-2xl border border-[#E7E2D6] p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#F0EDE4]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EBF3ED] text-[#0F382A] flex items-center justify-center">
              <Calculator className="w-4 h-4 text-[#C59B27]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#0F382A]">{t.salesCalcTitle}</h3>
              <p className="text-[10px] text-[#71847A]">
                {t.salesCalcSub}
              </p>
            </div>
          </div>
        </div>

        {/* 5 Explicit User Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <label className="font-semibold text-[#4A5D54] block mb-1">
              {t.inputTargetAmount}
            </label>
            <input
              type="number"
              min="0"
              value={calcTarget}
              onChange={(e) => setCalcTarget(Math.max(0, Number(e.target.value) || 0))}
              className="w-full p-2 rounded-xl border border-[#D5CEBD] font-bold text-[#0F382A] bg-[#FAF9F5]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#4A5D54] block mb-1">
              {t.inputDaysAvailable}
            </label>
            <input
              type="number"
              min="1"
              value={daysRemaining}
              onChange={(e) => setDaysRemaining(Math.max(1, Number(e.target.value) || 1))}
              className="w-full p-2 rounded-xl border border-[#D5CEBD] font-bold text-[#0F382A] bg-[#FAF9F5]"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="font-semibold text-[#4A5D54] block mb-1">
              {t.inputSellingPrice}
            </label>
            <input
              type="number"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value) || 0))}
              className="w-full p-2 rounded-xl border border-[#D5CEBD] font-bold text-[#0F382A] bg-[#FAF9F5]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#4A5D54] block mb-1">
              {t.inputCostPerUnit}
            </label>
            <input
              type="number"
              min="0"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(Math.max(0, Number(e.target.value) || 0))}
              className="w-full p-2 rounded-xl border border-[#D5CEBD] font-bold text-amber-900 bg-[#FAF9F5]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#4A5D54] block mb-1">
              {t.inputAdditionalFee}
            </label>
            <input
              type="number"
              min="0"
              value={additionalCostPerTx}
              onChange={(e) => setAdditionalCostPerTx(Math.max(0, Number(e.target.value) || 0))}
              placeholder={t.inputFeePlaceholder}
              className="w-full p-2 rounded-xl border border-[#D5CEBD] font-bold text-rose-900 bg-[#FAF9F5]"
            />
          </div>

          <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
            <div className="p-2 rounded-xl bg-[#F0F7F3] border border-[#D5E8DD] text-[11px]">
              <span className="text-[#65786D] block">{t.netProfitPerUnitDisplay}</span>
              <span className={`font-bold ${calculationPlan.netProfitPerUnit > 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                {formatIDR(calculationPlan.netProfitPerUnit)} ({calculationPlan.profitMarginPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Calculation Result Hero Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F382A] via-[#144734] to-[#1C5E43] text-[#F7F5EE] space-y-3.5 shadow-md">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[#C8DBD1] font-medium">{t.dailySalesTargetTitle}</span>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#F9F3DC] font-display">
                {calculationPlan.dailyTargetUnits} {t.unitsPerDay}
              </span>
              <span className="text-[11px] text-[#A9C1B5] block mt-0.5">
                {formatI18n(t.totalUnitsInDays, { units: calculationPlan.totalUnitsNeeded, days: daysRemaining })}
              </span>
            </div>
          </div>

          {/* Differentiated Metrics: Omzet vs Gross Profit vs Net Profit */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#25684C] text-xs">
            <div className="p-2 rounded-xl bg-black/25">
              <span className="text-[10px] text-[#A9C1B5] block">{t.projectedOmzet}</span>
              <span className="font-bold text-[#F9F3DC] block text-[11px] sm:text-xs truncate">
                {formatIDR(calculationPlan.projectedRevenue)}
              </span>
              <span className="text-[9px] text-[#8EAFA0]">{t.grossValue}</span>
            </div>

            <div className="p-2 rounded-xl bg-black/25">
              <span className="text-[10px] text-[#A9C1B5] block">{t.grossProfitLabel}</span>
              <span className="font-bold text-[#F9F3DC] block text-[11px] sm:text-xs truncate">
                {formatIDR(calculationPlan.projectedGrossProfit)}
              </span>
              <span className="text-[9px] text-[#8EAFA0]">{t.beforeTxCosts}</span>
            </div>

            <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-300 font-bold block">{t.netProfitLabel}</span>
              <span className="font-extrabold text-emerald-200 block text-[11px] sm:text-xs truncate">
                {formatIDR(calculationPlan.projectedNetProfit)}
              </span>
              <span className="text-[9px] text-emerald-400">~{formatIDR(calculationPlan.dailyNetProfitTarget)}/{lang === 'en' ? 'day' : 'hari'}</span>
            </div>
          </div>

          {/* Capital & Cost Breakdown */}
          <div className="p-2.5 rounded-xl bg-[#09251C]/60 border border-[#27644B] text-[10px] text-[#C8DBD1] space-y-1">
            <div className="flex justify-between">
              <span>{t.stockCapitalRequired}</span>
              <span className="font-semibold text-white">{formatIDR(calculationPlan.projectedCapitalRequired)}</span>
            </div>
            {calculationPlan.projectedTransactionCosts > 0 && (
              <div className="flex justify-between text-rose-300">
                <span>{t.totalTxCosts}</span>
                <span className="font-semibold">-{formatIDR(calculationPlan.projectedTransactionCosts)}</span>
              </div>
            )}
          </div>

          {/* Feasibility Assessment & Alternatives */}
          <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
            calculationPlan.isFeasible 
              ? 'bg-[#184F39]/80 border-emerald-400/40 text-emerald-100'
              : 'bg-rose-950/70 border-rose-400/50 text-rose-100'
          }`}>
            <div className="flex items-center gap-1.5 font-bold">
              {calculationPlan.isFeasible ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{calculationPlan.isFeasible ? t.feasibilityRealistic : t.feasibilityAdjust}</span>
            </div>

            <p className="text-[11px] leading-relaxed text-[#D8E6DF]">
              {calculationPlan.feasibilityExplanation}
            </p>

            {calculationPlan.recommendedAlternatives.length > 0 && (
              <div className="pt-2 border-t border-white/10 space-y-1 text-[10px]">
                <strong className="block text-[#F9F3DC]">{t.alternativesHeading}</strong>
                {calculationPlan.recommendedAlternatives.map((alt, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[#C8DBD1]">
                    <span className="text-[#C59B27]">•</span>
                    <span>{alt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Realization Progress Logger */}
        <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E7E2D6] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0F382A]">
              {t.recordRealizationToday}
            </span>
            <span className="text-[10px] text-[#6B7D74]">
              {formatI18n(t.remainingTargetIs, { amount: formatIDR(remainingTarget) })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#65786D]">Rp</span>
            <input
              type="text"
              value={customReportAmount}
              onChange={(e) => setCustomReportAmount(e.target.value)}
              placeholder="150000"
              className="flex-1 text-xs font-bold p-2 rounded-xl border border-[#D5CEBD] bg-white text-[#0F382A]"
            />
            <button
              onClick={handleReportRealization}
              className="py-2 px-3 rounded-xl bg-[#0F382A] hover:bg-[#164D3B] text-[#F9F3DC] text-xs font-bold flex items-center gap-1 transition-colors shrink-0 shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>{t.saveOmzetBtn}</span>
            </button>
          </div>

          {showProgressSuccess && (
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200 animate-in fade-in">
              {formatI18n(t.progressSavedNotice, { amount: formatIDR(remainingTarget) })}
            </div>
          )}
        </div>
      </div>

      {/* 3. REKOMENDASI PELUANG PEMASUKAN MITRA (FITUR 2B & 2C) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#0F382A] flex items-center gap-1.5 uppercase tracking-wider">
              <ShoppingBag className="w-4 h-4 text-[#C59B27]" />
              <span>{t.partnerRecommendationsTitle}</span>
            </h3>
            <p className="text-[10px] text-[#6B7D74]">
              {t.partnerRecommendationsSub}
            </p>
          </div>
        </div>

        {/* Empathetic Financial Caution Banner */}
        <div className="p-3.5 rounded-2xl bg-[#FFF8EB] border border-[#F2DCA5] text-amber-950 text-xs flex items-start gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold">{t.partnerCautionTitle}</span> {t.partnerCautionDesc}
          </div>
        </div>

        {/* 2 Partner Opportunity Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* PELUANG 1 — DISTRIBUTOR SEMBAKO PROMO */}
          <div className="bg-white rounded-2xl border border-[#DDD6C5] p-4 shadow-xs space-y-3 flex flex-col justify-between hover:border-[#1C5E43] transition-all">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#1C5E43]" />
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#0F382A]">
                    {t.partnerCard1Title}
                  </h4>
                </div>
              </div>

              <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {t.partnerCard1Badge}
              </span>

              <p className="text-xs text-[#4A5D54] leading-relaxed">
                {t.partnerCard1Desc}
              </p>

              <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EAE5D8] space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#65786D]">{t.partnerCard1CommissionLabel}</span>
                  <span className="font-bold text-emerald-800">{t.partnerCard1CommissionVal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65786D]">{t.partnerCard1CapitalLabel}</span>
                  <span className="font-semibold text-[#0F382A]">{t.partnerCard1CapitalVal}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActivePartnerModal('reseller_sembako')}
              className="w-full py-2.5 px-3 rounded-xl bg-[#0F382A] hover:bg-[#184F3B] text-[#F9F3DC] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs mt-2"
            >
              <span>{t.partnerCard1Cta}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* PELUANG 2 — KEAGENAN PPOB/PULSA */}
          <div className="bg-white rounded-2xl border border-[#DDD6C5] p-4 shadow-xs space-y-3 flex flex-col justify-between hover:border-[#1C5E43] transition-all">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0">
                    <Smartphone className="w-3.5 h-3.5 text-blue-700" />
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#0F382A]">
                    {t.partnerCard2Title}
                  </h4>
                </div>
              </div>

              <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                {t.partnerCard2Badge}
              </span>

              <p className="text-xs text-[#4A5D54] leading-relaxed">
                {t.partnerCard2Desc}
              </p>

              <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EAE5D8] space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#65786D]">{t.partnerCard2ProfitLabel}</span>
                  <span className="font-bold text-emerald-800">{t.partnerCard2ProfitVal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65786D]">{t.partnerCard2ReqLabel}</span>
                  <span className="font-semibold text-amber-900">{t.partnerCard2ReqVal}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActivePartnerModal('keagenan_ppob')}
              className="w-full py-2.5 px-3 rounded-xl bg-[#1C5E43] hover:bg-[#237554] text-[#F9F3DC] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs mt-2"
            >
              <span>{t.partnerCard2Cta}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. BUSINESS ACTION PLAN & OPPORTUNITIES (PRESERVED) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0F382A] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
            <span>{t.aiActionPlanHeading}</span>
          </h3>
          <button
            onClick={handleGenerateFreshOpportunities}
            disabled={isGenerating}
            className="text-xs text-[#0F382A] font-semibold hover:underline flex items-center gap-1"
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            <span>{t.refreshStrategyBtn}</span>
          </button>
        </div>

        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className="bg-white rounded-2xl border border-[#E7E2D6] p-4 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF3ED] text-[#0F382A]">
                  {opp.category === 'existing_business'
                    ? (lang === 'en' ? 'Optimize Existing Business' : 'Optimalisasi Usaha yang Ada')
                    : opp.category === 'service'
                    ? (lang === 'en' ? 'Zero-Capital Service' : 'Jasa Tanpa Modal')
                    : (lang === 'en' ? 'Side Opportunity' : 'Peluang Tambahan')}
                </span>
                <h4 className="font-bold text-sm text-[#0F382A] mt-1.5">
                  {opp.title}
                </h4>
              </div>
              <span className="text-xs font-bold text-emerald-700 font-mono-num shrink-0">
                {lang === 'en' ? 'Potential' : 'Potensi'} ~{formatIDR(opp.estimatedPotential)}
              </span>
            </div>

            <p className="text-xs text-[#52645B] leading-relaxed">
              {opp.description}
            </p>

            {/* Assumptions */}
            <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EBE6DB] text-[11px] text-[#4F6258]">
              <strong>{t.assumptionsLabel}</strong> {opp.assumptions}
            </div>

            {/* Step-by-Step Action Plan with Interactive Checkboxes */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-[#0F382A] block">
                {t.stepByStepPlan}
              </span>
              <div className="space-y-1.5">
                {opp.actionPlan.map((step, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleToggleTask(opp.id, idx)}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                      step.completed
                        ? 'bg-[#F2EFE8] border-[#E0D8C8] opacity-70'
                        : 'bg-white border-[#E7E2D6] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-0.5 shrink-0 text-[#0F382A]"
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#A89F8B]" />
                      )}
                    </button>
                    <div className="min-w-0 text-xs">
                      <span className={`font-semibold mr-1.5 ${
                        step.completed ? 'text-[#7A8E83]' : 'text-[#0F382A]'
                      }`}>
                        {step.day}:
                      </span>
                      <span className={`${
                        step.completed ? 'line-through text-[#7A8E83]' : 'text-[#192A24]'
                      }`}>
                        {step.task}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Partner Opportunity Modal */}
      {activePartnerModal && (
        <PartnerOpportunityModal
          isOpen={true}
          onClose={() => setActivePartnerModal(null)}
          opportunityType={activePartnerModal}
          lang={lang}
        />
      )}
    </div>
  );
};
