import React, { useState, useEffect } from 'react';
import { X, Wallet, Calendar, Info, Check } from 'lucide-react';
import { OpeningBalanceConfig, Language } from '../types';
import { formatIDR } from '../utils/calculations';

interface SetOpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOpeningBalance: OpeningBalanceConfig;
  onSaveOpeningBalance: (config: OpeningBalanceConfig) => void;
  lang: Language;
}

export const SetOpeningBalanceModal: React.FC<SetOpeningBalanceModalProps> = ({
  isOpen,
  onClose,
  currentOpeningBalance,
  onSaveOpeningBalance,
  lang,
}) => {
  const [amountInput, setAmountInput] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setAmountInput(currentOpeningBalance.amount ? currentOpeningBalance.amount.toString() : '0');
      setEffectiveDate(
        currentOpeningBalance.effectiveDate || new Date().toISOString().split('T')[0]
      );
      setNote(currentOpeningBalance.note || '');
    }
  }, [isOpen, currentOpeningBalance]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseInt(amountInput.replace(/\D/g, ''), 10) || 0;
    onSaveOpeningBalance({
      amount: cleanAmount,
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      note: note.trim() || undefined,
    });
    onClose();
  };

  const parsedAmount = parseInt(amountInput.replace(/\D/g, ''), 10) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF9F5] border border-[#27644B]/20 w-full max-w-md rounded-3xl p-5 shadow-2xl relative text-[#192A24] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D3] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0F382A] text-[#F9F3DC] flex items-center justify-center shadow-xs">
              <Wallet className="w-4 h-4 text-[#C59B27]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F382A]">
                {lang === 'en' ? 'Set Opening Balance' : 'Atur Saldo Kas Awal'}
              </h3>
              <p className="text-[11px] text-[#60776D]">
                {lang === 'en' ? 'Base cash in hand & effective date' : 'Saldo riil dan tanggal mulai pencatatan'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#60776D] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-[#0F382A] mb-1.5">
              {lang === 'en' ? 'Opening Balance Amount (IDR)' : 'Jumlah Saldo Awal (Rp)'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#60776D]">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setAmountInput(raw ? parseInt(raw, 10).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID') : '');
                }}
                placeholder={lang === 'en' ? 'e.g. 1,500,000' : 'Contoh: 1.500.000'}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#D5CFBF] bg-white text-base font-bold text-[#0F382A] focus:outline-none focus:ring-2 focus:ring-[#0F382A]"
                required
              />
            </div>
            {parsedAmount > 0 && (
              <p className="text-[11px] text-[#27644B] font-medium mt-1">
                {lang === 'en' ? 'Set to: ' : 'Terbaca: '}
                {formatIDR(parsedAmount)}
              </p>
            )}
          </div>

          {/* Effective Date input */}
          <div>
            <label className="block text-xs font-semibold text-[#0F382A] mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#27644B]" />
              <span>{lang === 'en' ? 'Effective Date' : 'Tanggal Efektif Saldo Awal'}</span>
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#D5CFBF] bg-white text-sm font-semibold text-[#0F382A] focus:outline-none focus:ring-2 focus:ring-[#0F382A]"
              required
            />
          </div>

          {/* Note input */}
          <div>
            <label className="block text-xs font-semibold text-[#0F382A] mb-1.5">
              {lang === 'en' ? 'Note (Optional)' : 'Catatan / Sumber Kas (Opsional)'}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={lang === 'en' ? 'e.g. Cash in wallet & BCA account' : 'Contoh: Dompet fisik & rekening BCA'}
              className="w-full px-3 py-2 rounded-xl border border-[#D5CFBF] bg-white text-xs text-[#0F382A] focus:outline-none focus:ring-2 focus:ring-[#0F382A]"
            />
          </div>

          {/* Educational / Explanatory Card */}
          <div className="bg-[#EBF3EF] border border-[#BBD5C9] rounded-2xl p-3 text-[11px] text-[#193F30] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#0F382A]">
              <Info className="w-3.5 h-3.5 text-[#27644B] shrink-0" />
              <span>{lang === 'en' ? 'How does Opening Balance work?' : 'Bagaimana Saldo Awal Bekerja?'}</span>
            </div>
            <p className="leading-relaxed text-[#2C4E40]">
              {lang === 'en'
                ? '• Transactions on or after this date will automatically add or subtract from this opening balance.'
                : '• Transaksi yang dicatat pada atau setelah tanggal ini akan otomatis menambah atau mengurangi saldo awal ini.'}
            </p>
            <p className="leading-relaxed text-[#2C4E40]">
              {lang === 'en'
                ? '• Past transactions before this date are safely preserved in history without distorting your current liquid balance.'
                : '• Transaksi sebelum tanggal ini tetap aman tersimpan dalam riwayat tanpa mendistorsi saldo kas berjalan Anda.'}
            </p>
            <p className="leading-relaxed text-[#27644B] font-semibold">
              {lang === 'en'
                ? '✓ Existing user data is never wiped or reset.'
                : '✓ Data transaksi Anda tidak akan dihapus atau di-reset.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#D5CFBF] text-xs font-semibold text-[#60776D] hover:bg-black/5 transition-colors"
            >
              {lang === 'en' ? 'Cancel' : 'Batal'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0F382A] hover:bg-[#164736] text-[#F9F3DC] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md active:scale-95"
            >
              <Check className="w-4 h-4 text-[#C59B27]" />
              <span>{lang === 'en' ? 'Save Balance' : 'Simpan Saldo Awal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
