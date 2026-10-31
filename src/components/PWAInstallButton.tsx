import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  lang?: 'id' | 'en';
  variant?: 'header' | 'banner' | 'menu';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  lang = 'id',
  variant = 'header' 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running inside standalone PWA mode, don't show prompt
  if (isInstalled) {
    return null;
  }

  // Handle click on install trigger
  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback instruction modal for non-iOS browsers without direct beforeinstallprompt
      setShowIOSModal(true);
    }
  };

  // Header mini button variant
  if (variant === 'header') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          aria-label={lang === 'en' ? 'Install CukupAI App' : 'Pasang Aplikasi CukupAI'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-[#C59B27]/15 text-[#9C7716] hover:bg-[#C59B27]/25 hover:text-[#7A5B0B] border border-[#C59B27]/30 transition-all active:scale-95 shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-[#C59B27]" />
          <span>{lang === 'en' ? 'App' : 'Pasang App'}</span>
        </button>

        {showIOSModal && (
          <IOSInstallModal
            lang={lang}
            isIOS={isIOS}
            onClose={() => setShowIOSModal(false)}
          />
        )}
      </>
    );
  }

  // Banner variant (for top of Beranda / Home tab)
  if (variant === 'banner') {
    if (isDismissed) return null;

    return (
      <>
        <aside 
          aria-label={lang === 'en' ? 'PWA Installation' : 'Pemasangan PWA'}
          className="relative overflow-hidden mb-4 rounded-2xl bg-gradient-to-r from-[#0F382A] via-[#154634] to-[#1B5E43] p-4 text-[#F7F5EE] shadow-md border border-[#205C44]/40"
        >
          <button
            onClick={() => setIsDismissed(true)}
            aria-label={lang === 'en' ? 'Dismiss' : 'Tutup'}
            className="absolute top-2.5 right-2.5 p-1 rounded-full text-[#F7F5EE]/60 hover:text-[#F7F5EE] hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            <div className="p-2.5 rounded-xl bg-[#C59B27]/20 border border-[#C59B27]/40 shrink-0 text-[#F3DC7D]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-white">
                  {lang === 'en' ? 'Install CukupAI on Home Screen' : 'Pasang CukupAI di HP Anda'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#C59B27] text-[#0F382A]">
                  PWA Ringan
                </span>
              </div>
              <p className="mt-1 text-xs text-[#F7F5EE]/80 leading-relaxed">
                {lang === 'en'
                  ? 'Access faster directly from home screen without browser url bar. Fast, offline-ready & zero download quota.'
                  : 'Akses instan dari layar utama HP tanpa bar browser. Ringan, cepat, hemat kuota & bisa dipakai offline.'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#C59B27] text-[#0F382A] text-xs font-bold shadow hover:bg-[#d6a92e] active:scale-95 transition"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{lang === 'en' ? 'Add to Home Screen' : 'Pasang ke Layar Utama'}</span>
                </button>
                <button
                  onClick={() => setIsDismissed(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#F7F5EE]/70 hover:text-white"
                >
                  {lang === 'en' ? 'Later' : 'Nanti'}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {showIOSModal && (
          <IOSInstallModal
            lang={lang}
            isIOS={isIOS}
            onClose={() => setShowIOSModal(false)}
          />
        )}
      </>
    );
  }

  // Menu / Settings item variant
  return (
    <>
      <button
        onClick={handleInstallClick}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/70 hover:bg-white border border-[#E5DECD] text-left transition shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#0F382A]/10 text-[#0F382A]">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-xs text-[#192A24]">
              {lang === 'en' ? 'Install CukupAI Web App' : 'Pasang Aplikasi di Layar Utama'}
            </div>
            <div className="text-[11px] text-[#5E7167]">
              {lang === 'en' ? 'Fast, full-screen mobile app' : 'Aplikasi ringan hemat kuota'}
            </div>
          </div>
        </div>
        <Download className="w-4 h-4 text-[#C59B27]" />
      </button>

      {showIOSModal && (
        <IOSInstallModal
          lang={lang}
          isIOS={isIOS}
          onClose={() => setShowIOSModal(false)}
        />
      )}
    </>
  );
};

// Modal for iOS Safari / Manual Add to Home Screen Instructions
interface IOSInstallModalProps {
  lang: 'id' | 'en';
  isIOS: boolean;
  onClose: () => void;
}

const IOSInstallModal: React.FC<IOSInstallModalProps> = ({ lang, isIOS, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#F7F5EE] p-5 shadow-2xl border border-[#D5CEBD] text-[#192A24] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E5DECD]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0F382A] flex items-center justify-center text-white shadow-xs">
              <Smartphone className="w-4 h-4 text-[#F3DC7D]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F382A]">
                {lang === 'en' ? 'Install CukupAI on Mobile' : 'Pasang CukupAI di HP'}
              </h3>
              <p className="text-[11px] text-[#5E7167]">
                {isIOS ? 'Safari iOS (iPhone / iPad)' : 'Browser Mobile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#5E7167] hover:bg-[#E5DECD]/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-3.5">
          {isIOS ? (
            <>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0F382A]/10 text-[#0F382A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-[#192A24] leading-relaxed">
                  {lang === 'en' ? (
                    <>Tap the <strong className="font-semibold text-[#0F382A]">Share</strong> button <Share className="inline w-3.5 h-3.5 text-[#0F382A] mx-0.5" /> in your Safari toolbar.</>
                  ) : (
                    <>Tekan tombol <strong className="font-semibold text-[#0F382A]">Bagikan / Share</strong> <Share className="inline w-3.5 h-3.5 text-[#0F382A] mx-0.5" /> di menu browser Safari.</>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0F382A]/10 text-[#0F382A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-[#192A24] leading-relaxed">
                  {lang === 'en' ? (
                    <>Scroll down and tap <strong className="font-semibold text-[#0F382A]">Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 text-[#0F382A] mx-0.5" />.</>
                  ) : (
                    <>Geser ke bawah dan pilih <strong className="font-semibold text-[#0F382A]">Tambah ke Layar Utama</strong> <PlusSquare className="inline w-3.5 h-3.5 text-[#0F382A] mx-0.5" />.</>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0F382A]/10 text-[#0F382A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-xs text-[#192A24] leading-relaxed">
                  {lang === 'en' ? (
                    <>Tap <strong className="font-semibold text-[#0F382A]">Add</strong> in the top right. CukupAI is now ready on your home screen!</>
                  ) : (
                    <>Tekan <strong className="font-semibold text-[#0F382A]">Tambah / Add</strong> di pojok kanan atas. CukupAI siap diakses seperti aplikasi asli!</>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0F382A]/10 text-[#0F382A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-[#192A24] leading-relaxed">
                  {lang === 'en' ? (
                    <>Open the browser menu (three dots <strong>⋮</strong> at top right).</>
                  ) : (
                    <>Buka menu browser Anda (ikon titik tiga <strong>⋮</strong> di pojok atas).</>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0F382A]/10 text-[#0F382A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-[#192A24] leading-relaxed">
                  {lang === 'en' ? (
                    <>Select <strong className="font-semibold text-[#0F382A]">Install App</strong> or <strong className="font-semibold text-[#0F382A]">Add to Home screen</strong>.</>
                  ) : (
                    <>Pilih <strong className="font-semibold text-[#0F382A]">Pasang Aplikasi</strong> atau <strong className="font-semibold text-[#0F382A]">Tambahkan ke Layar Utama</strong>.</>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0F382A]/10 text-[#0F382A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-xs text-[#192A24] leading-relaxed">
                  {lang === 'en' ? (
                    <>Confirm installation to run CukupAI with full-screen speed & offline support.</>
                  ) : (
                    <>Konfirmasi pemasangan. CukupAI langsung siap dengan kecepatan layar penuh & offline mode.</>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="mt-2 p-2.5 rounded-xl bg-[#EFECE1] flex items-center gap-2 text-[11px] text-[#5E7167]">
            <CheckCircle2 className="w-4 h-4 text-[#1B5E43] shrink-0" />
            <span>
              {lang === 'en'
                ? 'No app store login needed. Less than 1MB storage.'
                : 'Tanpa Play Store / App Store. Sangat ringan (< 1MB).'}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#0F382A] text-white text-xs font-bold hover:bg-[#1B5E43] transition shadow-xs"
        >
          {lang === 'en' ? 'Got It' : 'Saya Mengerti'}
        </button>
      </div>
    </div>
  );
};
