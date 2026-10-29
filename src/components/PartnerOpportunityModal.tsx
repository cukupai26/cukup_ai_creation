import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  HeartHandshake,
  ArrowRight,
  Lock
} from 'lucide-react';
import { Language, PartnerOpportunityLead } from '../types';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';
import { getTranslation } from '../utils/i18n';

export type PartnerOpportunityType = 'reseller_sembako' | 'keagenan_ppob';

interface PartnerOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityType: PartnerOpportunityType;
  lang: Language;
}

export const PartnerOpportunityModal: React.FC<PartnerOpportunityModalProps> = ({
  isOpen,
  onClose,
  opportunityType,
  lang,
}) => {
  const isSembako = opportunityType === 'reseller_sembako';
  const t = getTranslation(lang);

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const titleText = isSembako ? t.partnerCard1Title : t.partnerCard2Title;

  const handleSubmitLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !whatsapp.trim()) return;

    const newLead: PartnerOpportunityLead = {
      opportunityId: opportunityType,
      opportunityTitle: titleText,
      userName: name.trim(),
      whatsappContact: whatsapp.trim(),
      notes: notes.trim() || undefined,
      registeredAt: new Date().toISOString(),
    };

    const existingLeads = loadFromStorage<PartnerOpportunityLead[]>(STORAGE_KEYS.PARTNER_LEADS, []);
    existingLeads.push(newLead);
    saveToStorage(STORAGE_KEYS.PARTNER_LEADS, existingLeads);

    setIsSubmitted(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#FAF9F5] w-full max-w-lg rounded-3xl shadow-2xl border border-[#DCD5C4] flex flex-col overflow-hidden text-[#192A24] max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0F382A] via-[#164736] to-[#0A261C] text-[#F7F5EE] border-b border-[#1E5740] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#C59B27]/25 text-[#F9F3DC] border border-[#C59B27]/40 flex items-center justify-center shadow-md shrink-0">
                {isSembako ? (
                  <ShoppingBag className="w-5 h-5 text-[#F9F3DC]" />
                ) : (
                  <Smartphone className="w-5 h-5 text-[#F9F3DC]" />
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-[#F9F3DC] border border-amber-400/30 inline-block mb-1">
                  {t.partnerModalBadge}
                </span>
                <h2 id="partner-modal-title" className="text-base sm:text-lg font-bold text-[#F9F3DC] tracking-tight">
                  {titleText}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#F9F3DC] flex items-center justify-center transition-colors shrink-0"
              title={t.closeBtn}
              aria-label={t.closeBtn}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Status & Simulation Badge */}
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="block text-amber-900">
                {isSembako ? t.partnerModalDisclaimerSembako : t.partnerModalDisclaimerPpob}
              </strong>
              <p className="text-amber-900/90 mt-0.5">
                {t.partnerModalPrototypeExpl}
              </p>
            </div>
          </div>

          {/* Business Model Detail */}
          <div className="p-4 rounded-2xl bg-white border border-[#DDD6C5] shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-[#0F382A] uppercase tracking-wider">
              {isSembako ? t.partnerTermsSembako : t.partnerTermsPpob}
            </h3>

            {isSembako ? (
              <div className="space-y-2 text-[#33463E] text-xs">
                <p className="leading-relaxed">
                  {t.partnerTermsSembakoDesc}
                </p>
                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#EAE5D8] space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#65786D]">{t.partnerCommissionLabel}</span>
                    <span className="font-bold text-emerald-800">{t.partnerCommissionVal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#65786D]">{t.partnerStockCapitalReqLabel}</span>
                    <span className="font-bold text-[#0F382A]">{t.partnerStockCapitalReqVal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#65786D]">{t.partnerDeviceRequiredLabel}</span>
                    <span>{t.partnerDeviceSembakoVal}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-[#33463E] text-xs">
                <p className="leading-relaxed">
                  {t.partnerTermsPpobDesc}
                </p>
                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#EAE5D8] space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#65786D]">{t.partnerProfitPerTxLabel}</span>
                    <span className="font-bold text-emerald-800">{t.partnerProfitPerTxVal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#65786D]">{t.partnerDepositBalanceReqLabel}</span>
                    <span className="font-bold text-amber-900">{t.partnerDepositBalanceReqVal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#65786D]">{t.partnerDeviceRequiredLabel}</span>
                    <span>{t.partnerDevicePpobVal}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Empathetic Financial Safety Warning */}
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{t.partnerEmpatheticReminderTitle}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-900/90">
              {t.partnerEmpatheticReminderDesc}
            </p>
          </div>

          {/* Interactive Form */}
          <div className="p-4 rounded-2xl bg-white border border-[#DDD6C5] shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-[#0F382A] flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-[#C59B27]" />
              <span>{isSubmitted ? t.partnerLeadSavedTitle : t.partnerLeadFormTitle}</span>
            </h4>

            {isSubmitted ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{t.partnerLeadSuccessTitle}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-900/90">
                  {t.partnerLeadSuccessDesc}
                </p>
                <div className="pt-2 border-t border-emerald-200 text-[10px] text-emerald-700 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>{t.partnerLeadPrivacyNote}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitLead} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#192A24] mb-1">
                    {t.partnerLeadNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.partnerLeadNamePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-[#D5CEBD] bg-[#FAF9F5] focus:outline-hidden focus:ring-2 focus:ring-[#0F382A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#192A24] mb-1">
                    {t.partnerLeadPhoneLabel}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder={t.partnerLeadPhonePlaceholder}
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-[#D5CEBD] bg-[#FAF9F5] focus:outline-hidden focus:ring-2 focus:ring-[#0F382A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#192A24] mb-1">
                    {t.partnerLeadNotesLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={t.partnerLeadNotesPlaceholder}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-[#D5CEBD] bg-[#FAF9F5] focus:outline-hidden focus:ring-2 focus:ring-[#0F382A]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F382A] hover:bg-[#184F3B] text-[#F9F3DC] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>{isSembako ? t.partnerLeadSubmitSembako : t.partnerLeadSubmitPpob}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#E5E0D3] flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-[#71847A]">
            {t.partnerModalFooter}
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-[#F0EDE4] hover:bg-[#E5DFD3] text-[#192A24] font-semibold text-xs transition-colors"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
