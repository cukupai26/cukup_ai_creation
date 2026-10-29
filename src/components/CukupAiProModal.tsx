import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Sparkles, 
  Camera, 
  ShieldCheck, 
  Info, 
  Clock, 
  HeartHandshake,
  CheckCircle2
} from 'lucide-react';
import { Language } from '../types';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';
import { getTranslation } from '../utils/i18n';

interface CukupAiProModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const CukupAiProModal: React.FC<CukupAiProModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [whatsappContact, setWhatsappContact] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(() => {
    const list = loadFromStorage<string[]>(STORAGE_KEYS.PRO_WAITLIST, []);
    return list.length > 0;
  });

  const t = getTranslation(lang);

  if (!isOpen) return null;

  const handleRegisterWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappContact.trim()) return;

    const list = loadFromStorage<string[]>(STORAGE_KEYS.PRO_WAITLIST, []);
    if (!list.includes(whatsappContact.trim())) {
      list.push(whatsappContact.trim());
      saveToStorage(STORAGE_KEYS.PRO_WAITLIST, list);
    }

    setIsSubmitted(true);
    setAlreadyRegistered(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#FAF9F5] w-full max-w-lg rounded-3xl shadow-2xl border border-[#DCD5C4] flex flex-col overflow-hidden text-[#192A24] max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0F382A] via-[#164736] to-[#0A261C] text-[#F7F5EE] border-b border-[#1E5740] relative shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C59B27] to-[#8C6B13] text-[#0F382A] flex items-center justify-center shadow-md shrink-0">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="pro-modal-title" className="text-base sm:text-lg font-bold text-[#F9F3DC] tracking-tight">
                    {t.proCardTitle}
                  </h2>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#C59B27]/25 text-[#F9F3DC] border border-[#C59B27]/40 tracking-wider">
                    {t.proMonthlyPrice}
                  </span>
                </div>
                <p className="text-[11px] text-[#A9C1B5] font-medium leading-tight mt-0.5">
                  {t.proModalTagline}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#F9F3DC] flex items-center justify-center transition-colors shrink-0"
              title={t.closeBtn}
              aria-label={t.proDismissAria}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Transparency Status Pill */}
          <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] leading-relaxed">
              <span className="font-bold block">{t.proPrototypeWarningTitle}</span>
              <p className="text-amber-900/90">
                {t.proPrototypeWarningDesc}
              </p>
            </div>
          </div>

          {/* Pricing Highlight Card */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2DCce] shadow-xs space-y-3">
            <div className="flex items-baseline justify-between border-b border-[#F0EDE4] pb-2.5">
              <div>
                <span className="text-xs font-bold text-[#0F382A] block">{t.proMonthlySubscription}</span>
                <span className="text-[10px] text-[#71847A]">{t.proFamilyAccess}</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-[#0F382A] font-display">Rp15.000</span>
                <span className="text-[11px] text-[#71847A]"> {t.proPerMonth}</span>
              </div>
            </div>

            {/* Features genuinely verified */}
            <div className="space-y-2 pt-1 text-xs">
              <span className="font-bold text-[#0F382A] block text-[11px] uppercase tracking-wider">
                {t.proIncludedFeatures}
              </span>

              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE5D8]">
                <div className="w-5 h-5 rounded-md bg-[#0F382A] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Camera className="w-3 h-3 text-[#C59B27]" />
                </div>
                <div>
                  <strong className="text-[#192A24] block">{t.proFeatureOcrTitle}</strong>
                  <span className="text-[11px] text-[#63766D]">
                    {t.proFeatureOcrDesc}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE5D8]">
                <div className="w-5 h-5 rounded-md bg-[#0F382A] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-[#C59B27]" />
                </div>
                <div>
                  <strong className="text-[#192A24] block">{t.proFeatureGuidanceTitle}</strong>
                  <span className="text-[11px] text-[#63766D]">
                    {t.proFeatureGuidanceDesc}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#FAF9F5] border border-[#EAE5D8]">
                <div className="w-5 h-5 rounded-md bg-[#0F382A] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-[#C59B27]" />
                </div>
                <div>
                  <strong className="text-[#192A24] block">{t.proFeatureNoAdsTitle}</strong>
                  <span className="text-[11px] text-[#63766D]">
                    {t.proFeatureNoAdsDesc}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Non-Aggressive & Ethical Notice */}
          <div className="p-3.5 rounded-2xl bg-[#F0F7F3] border border-[#C5DEC9] text-[#1D4A38] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#0F382A]">
              <HeartHandshake className="w-4 h-4 text-[#1C5E43]" />
              <span>{t.proEthicalTitle}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#2A4D3E]">
              {t.proEthicalDesc}
            </p>
          </div>

          {/* Interactive Waitlist / Demo Interest Form */}
          <div className="p-4 rounded-2xl bg-white border border-[#DDD6C5] shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-[#0F382A] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#C59B27]" />
              <span>{t.proWaitlistHeading}</span>
            </h4>

            {isSubmitted || alreadyRegistered ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{t.proWaitlistSuccessTitle}</span>
                </div>
                <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                  {t.proWaitlistSuccessDesc}
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegisterWaitlist} className="space-y-2.5">
                <p className="text-[11px] text-[#63766D] leading-relaxed">
                  {t.proWaitlistPrompt}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder={t.proWaitlistPlaceholder}
                    value={whatsappContact}
                    onChange={(e) => setWhatsappContact(e.target.value)}
                    className="flex-1 p-2.5 text-xs rounded-xl border border-[#D5CEBD] bg-[#FAF9F5] focus:outline-hidden focus:ring-2 focus:ring-[#0F382A]"
                  />
                  <button
                    type="submit"
                    className="py-2.5 px-4 rounded-xl bg-[#0F382A] hover:bg-[#184F3B] text-[#F9F3DC] font-bold text-xs transition-colors shrink-0 shadow-xs"
                  >
                    {t.proJoinWaitlist}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#E5E0D3] flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-[#71847A]">
            {t.proModalFooter}
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
