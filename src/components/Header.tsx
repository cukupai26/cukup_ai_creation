import React from 'react';
import { ShieldCheck, RefreshCw, FileJson, Building2, Crown } from 'lucide-react';
import { CashflowMetrics } from '../utils/calculations';
import { Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  metrics: CashflowMetrics;
  isDemoActive: boolean;
  onToggleDemo: () => void;
  lang: Language;
  onToggleLang: () => void;
  onOpenBackup: () => void;
  onOpenBansos?: () => void;
  onOpenProModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  isDemoActive,
  onToggleDemo,
  lang,
  onToggleLang,
  onOpenBackup,
  onOpenBansos,
  onOpenProModal,
}) => {
  const t = getTranslation(lang);

  return (
    <header className="sticky top-0 z-30 bg-[#0F382A] text-[#F7F5EE] border-b border-[#1B5E43] shadow-md">
      <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B5E43] to-[#0A261C] border border-[#C59B27]/40 flex items-center justify-center text-[#F9F3DC] shadow-inner">
            <ShieldCheck className="w-5 h-5 text-[#C59B27]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-[#F9F3DC]">
                {t.brandName}
              </span>
              {isDemoActive && (
                <span className="text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.2 rounded bg-[#C59B27]/20 text-[#F9F3DC] border border-[#C59B27]/40">
                  {t.demoBadge}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#A3B8AD] font-medium tracking-wide">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Right Action Tools: PWA Install, Language Switcher, Bansos Help, Backup, and Demo Toggle */}
        <div className="flex items-center gap-1.5">
          {/* PWA Mobile App Install Button */}
          <PWAInstallButton lang={lang} variant="header" />

          {/* CukupAI Pro Prototype Access */}
          {onOpenProModal && (
            <button
              onClick={onOpenProModal}
              title={t.headerProTooltip}
              className="flex items-center gap-1 text-[11px] font-extrabold px-2 py-1.5 rounded-lg bg-gradient-to-r from-[#C59B27] to-[#A47F1D] text-[#0F382A] transition-all active:scale-95 shadow-2xs"
            >
              <Crown className="w-3.5 h-3.5 fill-[#0F382A]" />
              <span className="hidden sm:inline">PRO</span>
            </button>
          )}

          {/* Pusat Bantuan Sosial (Secondary Help Access) */}
          {onOpenBansos && (
            <button
              onClick={onOpenBansos}
              title={t.headerBansosTooltip}
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-[#144734] hover:bg-[#1A573F] text-[#F9F3DC] border border-[#2B7A58] transition-all active:scale-95 shadow-2xs"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C59B27]" />
              <span className="hidden sm:inline">{t.headerBansosBtn}</span>
            </button>
          )}

          {/* Dynamic Bilingual Switcher */}
          <button
            onClick={onToggleLang}
            title={t.switchLangTooltip}
            className="flex items-center gap-1 text-[11px] font-bold px-2 py-1.5 rounded-lg bg-[#144734] hover:bg-[#1A573F] text-[#F9F3DC] border border-[#2B7A58] transition-all active:scale-95 shadow-2xs"
          >
            <span>{lang === 'id' ? '🇮🇩' : '🇬🇧'}</span>
          </button>

          {/* Backup / Export / Import JSON */}
          <button
            onClick={onOpenBackup}
            title={t.backup}
            className="w-8 h-8 rounded-lg bg-[#144734] hover:bg-[#1A573F] text-[#F9F3DC] border border-[#2B7A58] flex items-center justify-center transition-all active:scale-95 shadow-2xs"
          >
            <FileJson className="w-3.5 h-3.5 text-[#C59B27]" />
          </button>

          {/* Demo Data Switcher */}
          <button
            onClick={onToggleDemo}
            title={isDemoActive ? t.resetDemo : t.loadDemo}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-[#144734] hover:bg-[#1A573F] text-[#F7F5EE] border border-[#2B7A58] transition-all active:scale-95"
          >
            <RefreshCw className="w-3 h-3 text-[#C59B27]" />
            <span className="hidden sm:inline">{isDemoActive ? t.resetDemo : t.loadDemo}</span>
            <span className="sm:hidden">{isDemoActive ? 'Demo' : t.demoToggleFill}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
