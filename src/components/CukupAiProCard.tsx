import React, { useState } from 'react';
import { Crown, Sparkles, X, ChevronRight, Camera } from 'lucide-react';
import { CashflowMetrics } from '../utils/calculations';
import { Language } from '../types';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';
import { getTranslation } from '../utils/i18n';

interface CukupAiProCardProps {
  metrics: CashflowMetrics;
  onOpenProModal: () => void;
  lang: Language;
}

export const CukupAiProCard: React.FC<CukupAiProCardProps> = ({
  metrics,
  onOpenProModal,
  lang,
}) => {
  const t = getTranslation(lang);
  // Check if user dismissed this banner
  const [isDismissed, setIsDismissed] = useState(() => {
    return loadFromStorage<boolean>(STORAGE_KEYS.PRO_BANNER_DISMISSED, false);
  });

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    saveToStorage(STORAGE_KEYS.PRO_BANNER_DISMISSED, true);
  };

  // If dismissed or if status is AMAN and user dismissed it, do not render
  if (isDismissed) return null;

  // Contextual messaging based on REAL calculated status
  const isStruggling = metrics.status === 'KRITIS' || metrics.status === 'PERLU_WASPADA';

  // If status is AMAN, render a subtle non-intrusive card only if not dismissed
  if (!isStruggling) {
    return (
      <div className="p-3 rounded-2xl bg-gradient-to-r from-[#0F382A]/90 to-[#1A543D]/90 text-[#F7F5EE] border border-[#27644B] flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#C59B27]/25 border border-[#C59B27]/40 text-[#F9F3DC] flex items-center justify-center shrink-0">
            <Crown className="w-3.5 h-3.5 text-[#F9F3DC]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#F9F3DC] truncate">{t.proCardTitle}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-[#F9F3DC] font-semibold border border-amber-400/30">
                {t.proCardBadge}
              </span>
            </div>
            <p className="text-[10px] text-[#A9C1B5] truncate">
              {t.proCardSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenProModal}
            className="text-[11px] font-bold py-1 px-2.5 rounded-lg bg-[#C59B27] hover:bg-[#D4A933] text-[#0F382A] transition-colors"
          >
            {t.proInfoBtn}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-[#A9C1B5] hover:text-[#F9F3DC] transition-colors"
            title={t.proDismissTitle}
            aria-label={t.proDismissAria}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // When status is KRITIS or PERLU_WASPADA:
  // Render a supportive, calm, non-exploitative contextual offer
  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FAF9F5] to-[#F3EDE0] border border-[#DDD5C2] text-[#192A24] shadow-xs relative overflow-hidden animate-in fade-in">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#0F382A] text-white flex items-center justify-center shadow-xs shrink-0">
            <Crown className="w-3.5 h-3.5 text-[#C59B27]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#0F382A]">{t.proCardTitle}</span>
              <span className="text-[10px] text-[#6B7D74] font-medium">{t.proMonthlyPrice}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                {t.proCardBadge}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-md text-[#889B91] hover:text-[#192A24] hover:bg-black/5 transition-colors"
          title={t.proDismissTitle}
          aria-label={t.proDismissAria}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-[#4A5D53] leading-relaxed mb-2.5">
        {t.proCardDescStruggling}
      </p>

      <div className="flex items-center justify-between pt-1 border-t border-[#EAE3D5] text-xs">
        <span className="text-[10px] text-[#71847A] italic">
          {t.proFreeGuarantee}
        </span>

        <button
          onClick={onOpenProModal}
          className="py-1 px-3 rounded-lg bg-[#0F382A] hover:bg-[#184F3B] text-[#F9F3DC] font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
        >
          <span>{t.proJoinWaitlist}</span>
          <ChevronRight className="w-3 h-3 text-[#C59B27]" />
        </button>
      </div>
    </div>
  );
};

