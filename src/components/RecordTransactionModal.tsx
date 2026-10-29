import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Loader2, 
  AlertCircle,
  Pencil
} from 'lucide-react';
import { 
  Transaction, 
  TransactionType, 
  IncomeCategory, 
  ExpenseCategory,
  Language 
} from '../types';
import { formatIDR } from '../utils/calculations';
import { getTranslation } from '../utils/i18n';

interface RecordTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransaction: (tx: Omit<Transaction, 'id'>) => void;
  initialType?: TransactionType;
  lang?: Language;
}

const INCOME_CATEGORIES: IncomeCategory[] = [
  'Gaji', 'Usaha', 'Freelance', 'Bonus', 'Komisi', 'Lainnya'
];

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Makanan', 'Rumah tangga', 'Listrik', 'Air', 'Pendidikan', 
  'Transportasi', 'Kesehatan', 'Tagihan', 'Belanja', 'Hiburan', 'Lainnya'
];

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
  isOpen,
  onClose,
  onSaveTransaction,
  initialType = 'expense',
  lang = 'id',
}) => {
  const t = getTranslation(lang);
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [naturalText, setNaturalText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Editable parsed fields
  const [parsedTx, setParsedTx] = useState<{
    type: TransactionType;
    amount: number;
    category: string;
    description: string;
    date: string;
    confidence: number;
    note?: string;
  } | null>(null);

  // Manual form state
  const [manualType, setManualType] = useState<TransactionType>(initialType);
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState<string>(
    initialType === 'income' ? 'Gaji' : 'Makanan'
  );
  const [manualDesc, setManualDesc] = useState('');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!naturalText.trim()) return;
    setIsParsing(true);
    setParseError(null);

    try {
      const res = await fetch('/api/ai/parse-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: naturalText,
          currentDate: new Date().toISOString().split('T')[0],
          language: lang,
        }),
      });

      if (!res.ok) throw new Error(lang === 'en' ? 'Failed to parse input' : 'Gagal memproses kalimat');
      const data = await res.json();
      setParsedTx({
        type: data.type || 'expense',
        amount: Number(data.amount) || 0,
        category: data.category || (data.type === 'income' ? 'Lainnya' : 'Makanan'),
        description: data.description || naturalText.trim(),
        date: data.date || new Date().toISOString().split('T')[0],
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.9,
        note: data.note,
      });
    } catch (err: any) {
      setParseError(err.message || (lang === 'en' ? 'Error processing transaction' : 'Terjadi kesalahan saat memproses'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmAiParsed = () => {
    if (!parsedTx || parsedTx.amount <= 0) return;
    onSaveTransaction({
      type: parsedTx.type,
      amount: parsedTx.amount,
      category: parsedTx.category,
      description: parsedTx.description || 'Transaksi CukupAI',
      date: parsedTx.date,
    });
    resetAndClose();
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseInt(manualAmount.replace(/[^0-9]/g, ''), 10);
    if (!cleanAmount || cleanAmount <= 0) return;

    onSaveTransaction({
      type: manualType,
      amount: cleanAmount,
      category: manualCategory,
      description: manualDesc.trim() || (manualType === 'income' ? (lang === 'en' ? 'Income' : 'Pemasukan') : (lang === 'en' ? 'Expense' : 'Pengeluaran')),
      date: manualDate,
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setNaturalText('');
    setParsedTx(null);
    setManualAmount('');
    setManualDesc('');
    setParseError(null);
    onClose();
  };

  const examplePrompts = lang === 'en'
    ? [
        'Bought groceries 75k',
        'Paid electricity bill 250k',
        'Got monthly salary 4.5m',
        'Sold 1 bottle of perfume 175k',
      ]
    : [
        'Saya beli beras Rp75.000',
        'Bayar listrik Rp250.000',
        'Gaji masuk Rp4.500.000',
        'Dapat keuntungan jual parfum Rp175.000',
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#FAF9F5] rounded-t-3xl sm:rounded-2xl border border-[#E7E2D6] shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#FAF9F5]/95 backdrop-blur-sm px-5 py-4 border-b border-[#E7E2D6] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0F382A] text-[#F9F3DC] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#C59B27]" />
            </div>
            <h2 className="font-bold text-base text-[#0F382A]">{t.addTransaction}</h2>
          </div>
          <button
            onClick={resetAndClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B7D74] hover:bg-[#EAE5D8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Mode Segmented Control */}
        <div className="p-4 border-b border-[#EAE5D8]">
          <div className="flex p-1 bg-[#ECE7DC] rounded-xl">
            <button
              onClick={() => setMode('ai')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'ai'
                  ? 'bg-white text-[#0F382A] shadow-xs'
                  : 'text-[#6B7D74] hover:text-[#0F382A]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
              {lang === 'en' ? 'Natural Language (AI)' : 'Bahasa Alami (AI)'}
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'manual'
                  ? 'bg-white text-[#0F382A] shadow-xs'
                  : 'text-[#6B7D74] hover:text-[#0F382A]'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Manual Form' : 'Form Manual'}
            </button>
          </div>
        </div>

        <div className="p-5">
          {mode === 'ai' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F382A] mb-1.5">
                  {lang === 'en' ? 'Type or speak your transaction:' : 'Tulis atau ucapkan transaksi Anda:'}
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={naturalText}
                    onChange={(e) => setNaturalText(e.target.value)}
                    placeholder={lang === 'en' ? 'Example: Bought motorcycle petrol 35k this morning...' : 'Contoh: Beli bensin motor Rp35.000 tadi pagi...'}
                    className="w-full text-sm p-3.5 rounded-xl border border-[#D8D2C2] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F382A]/30 focus:border-[#0F382A] placeholder:text-[#9BAAA2] text-[#192A24]"
                  />
                  {naturalText && (
                    <button
                      type="button"
                      onClick={() => setNaturalText('')}
                      className="absolute top-2.5 right-2.5 text-[#8A9C93] hover:text-[#192A24]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Example Prompts */}
              <div>
                <span className="text-[11px] font-medium text-[#7C8F84] block mb-1.5">
                  {lang === 'en' ? 'Quick examples:' : 'Contoh cepat:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {examplePrompts.map((eg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNaturalText(eg)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-[#ECE7DC] text-[#243E32] hover:bg-[#E0D9CB] transition-colors border border-[#DDD6C5]"
                    >
                      {eg}
                    </button>
                  ))}
                </div>
              </div>

              {parseError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Parse Action Button */}
              {!parsedTx && (
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={isParsing || !naturalText.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-[#0F382A] hover:bg-[#164D3B] disabled:opacity-50 text-[#F9F3DC] font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#C59B27]" />
                      <span>{lang === 'en' ? 'Analyzing with AI...' : 'Menganalisis Transaksi...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#C59B27]" />
                      <span>{lang === 'en' ? 'Translate with CukupAI' : 'Terjemahkan dengan CukupAI'}</span>
                    </>
                  )}
                </button>
              )}

              {/* Parsed Preview Card */}
              {parsedTx && (
                <div className="p-4 rounded-xl bg-white border border-[#DDD6C5] shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#EFECE1]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#0F382A]">
                        {lang === 'en' ? 'AI Analysis Result' : 'Hasil Analisis AI'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                        {(parsedTx.confidence * 100).toFixed(0)}% {lang === 'en' ? 'Accurate' : 'Akurat'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setParsedTx(null)}
                      className="text-xs text-[#0F382A] hover:underline flex items-center gap-1"
                    >
                      {lang === 'en' ? 'Edit Text' : 'Ubah Teks'}
                    </button>
                  </div>

                  {/* Form fields for review/edit */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-[#65786D]">
                        {lang === 'en' ? 'Type' : 'Jenis'}
                      </label>
                      <select
                        value={parsedTx.type}
                        onChange={(e) => setParsedTx({ ...parsedTx, type: e.target.value as TransactionType })}
                        className="w-full text-xs p-2 rounded-lg border border-[#D8D2C2] bg-white font-medium text-[#192A24]"
                      >
                        <option value="expense">{lang === 'en' ? 'Expense (-)' : 'Pengeluaran (-)'}</option>
                        <option value="income">{lang === 'en' ? 'Income (+)' : 'Pemasukan (+)'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#65786D]">
                        {lang === 'en' ? 'Amount (IDR)' : 'Jumlah (IDR)'}
                      </label>
                      <input
                        type="number"
                        value={parsedTx.amount}
                        onChange={(e) => setParsedTx({ ...parsedTx, amount: Number(e.target.value) || 0 })}
                        className="w-full text-xs p-2 rounded-lg border border-[#D8D2C2] bg-white font-bold text-[#0F382A]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#65786D]">
                        {lang === 'en' ? 'Category' : 'Kategori'}
                      </label>
                      <select
                        value={parsedTx.category}
                        onChange={(e) => setParsedTx({ ...parsedTx, category: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-[#D8D2C2] bg-white text-[#192A24]"
                      >
                        {(parsedTx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                          <option key={cat} value={cat}>
                            {(t.categories as Record<string, string>)[cat] || cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-[#65786D]">
                        {lang === 'en' ? 'Date' : 'Tanggal'}
                      </label>
                      <input
                        type="date"
                        value={parsedTx.date}
                        onChange={(e) => setParsedTx({ ...parsedTx, date: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-[#D8D2C2] bg-white text-[#192A24]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[#65786D]">
                      {lang === 'en' ? 'Description' : 'Keterangan'}
                    </label>
                    <input
                      type="text"
                      value={parsedTx.description}
                      onChange={(e) => setParsedTx({ ...parsedTx, description: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-[#D8D2C2] bg-white text-[#192A24]"
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmAiParsed}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[#0F382A] hover:bg-[#164D3B] text-[#F9F3DC] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Check className="w-4 h-4 text-[#C59B27]" />
                      {lang === 'en' ? 'Save Transaction' : 'Simpan Transaksi'} ({formatIDR(parsedTx.amount)})
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* MANUAL FORM */
            <form onSubmit={handleSaveManual} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualType('expense');
                    setManualCategory('Makanan');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    manualType === 'expense'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-white text-[#65786D] border-[#DDD6C5]'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4 text-rose-600" />
                  {lang === 'en' ? 'Expense' : 'Pengeluaran'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualType('income');
                    setManualCategory('Gaji');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    manualType === 'income'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-[#65786D] border-[#DDD6C5]'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                  {lang === 'en' ? 'Income' : 'Pemasukan'}
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-[#0F382A] mb-1">
                  {lang === 'en' ? 'Amount (Rp)' : 'Nominal (Rp)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'en' ? 'e.g. 150000' : 'Contoh: 150000'}
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full text-base p-3 rounded-xl border border-[#D8D2C2] bg-white font-bold text-[#0F382A] focus:outline-hidden focus:ring-2 focus:ring-[#0F382A]/30"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-[#0F382A] mb-1.5">
                  {lang === 'en' ? 'Category' : 'Kategori'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-xl border border-[#D8D2C2]">
                  {(manualType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setManualCategory(cat)}
                      className={`text-[11px] py-1.5 px-2 rounded-lg font-medium transition-colors text-center truncate ${
                        manualCategory === cat
                          ? 'bg-[#0F382A] text-[#F9F3DC]'
                          : 'bg-[#F7F5EE] text-[#284437] hover:bg-[#ECE7DC]'
                      }`}
                    >
                      {(t.categories as Record<string, string>)[cat] || cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#0F382A] mb-1">
                  {lang === 'en' ? 'Description' : 'Keterangan'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. Rice, groceries, taxi' : 'Misal: Beli beras, uang bensin, dsb'}
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#D8D2C2] bg-white text-[#192A24]"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-[#0F382A] mb-1">
                  {lang === 'en' ? 'Date' : 'Tanggal'}
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#D8D2C2] bg-white text-[#192A24]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-[#0F382A] hover:bg-[#164D3B] text-[#F9F3DC] font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Check className="w-4 h-4 text-[#C59B27]" />
                {lang === 'en' ? 'Save Transaction' : 'Simpan Transaksi'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
