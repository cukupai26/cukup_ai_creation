import React, { useState, useRef } from 'react';
import { 
  X, 
  Camera, 
  UploadCloud, 
  Sparkles, 
  Check, 
  Loader2, 
  AlertCircle, 
  Receipt, 
  Store, 
  Calendar, 
  Tag, 
  RefreshCw,
  FileText,
  CreditCard
} from 'lucide-react';
import { Language, Transaction, TransactionType, ReceiptScanResult } from '../types';
import { getTranslation } from '../utils/i18n';
import { formatIDR } from '../utils/calculations';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransaction: (tx: Omit<Transaction, 'id'>) => void;
  lang: Language;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveTransaction,
  lang,
}) => {
  const t = getTranslation(lang);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Editable parsed result
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setScanError(lang === 'en' ? 'Please upload an image file (PNG, JPG, WEBP).' : 'Silakan pilih file gambar (PNG, JPG, dsb).');
      return;
    }

    setScanError(null);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      // Auto trigger scan
      scanImage(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const scanImage = async (base64Data: string, mime: string) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const res = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mime,
          currentDate: new Date().toISOString().split('T')[0],
          language: lang,
        }),
      });

      if (!res.ok) throw new Error(lang === 'en' ? 'Failed to analyze receipt' : 'Gagal memproses struk');
      const data: ReceiptScanResult = await res.json();
      setScanResult(data);
    } catch (err: any) {
      setScanError(err.message || (lang === 'en' ? 'Scan failed. Please try again.' : 'Pemindaian gagal. Coba lagi.'));
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmSave = () => {
    if (!scanResult || scanResult.amount <= 0) return;
    onSaveTransaction({
      type: scanResult.type,
      amount: scanResult.amount,
      category: scanResult.category,
      description: scanResult.description || scanResult.merchantOrItem || (lang === 'en' ? 'Shopping Receipt' : 'Struk Belanja'),
      date: scanResult.date,
    });
    handleResetAndClose();
  };

  const handleResetAndClose = () => {
    setSelectedImage(null);
    setScanResult(null);
    setScanError(null);
    setIsScanning(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#FAF9F5] rounded-t-3xl sm:rounded-2xl border border-[#E7E2D6] shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#FAF9F5]/95 backdrop-blur-sm px-5 py-4 border-b border-[#E7E2D6] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0F382A] text-[#F9F3DC] flex items-center justify-center">
              <Camera className="w-4 h-4 text-[#C59B27]" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[#0F382A] leading-tight">
                {t.scannerModalTitle}
              </h2>
              <span className="text-[10px] text-[#6B7D74] block">
                Indomaret, Alfamart, GoPay, BCA, QRIS & Nota
              </span>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B7D74] hover:bg-[#EAE5D8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* File input (Hidden) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Upload Drop Zone if no image selected */}
          {!selectedImage && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#C8BEA7] rounded-2xl p-6 text-center cursor-pointer hover:bg-[#F2ECE0] transition-colors bg-[#FAF8F3] space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#EBF3ED] text-[#0F382A] flex items-center justify-center mx-auto shadow-inner">
                <UploadCloud className="w-6 h-6 text-[#1B5E43]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#0F382A] block">
                  {t.dropOrClickPhoto}
                </span>
                <span className="text-[11px] text-[#71847A] block mt-1 leading-relaxed">
                  {t.supportsFormats}
                </span>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <span className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#0F382A] text-[#F9F3DC] inline-flex items-center gap-1.5 shadow-2xs">
                  <Camera className="w-3.5 h-3.5 text-[#C59B27]" />
                  {lang === 'en' ? 'Take Photo / Upload' : 'Ambil Foto / Unggah'}
                </span>
              </div>
            </div>
          )}

          {/* Preview & Scanner Loading */}
          {selectedImage && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-[#D5CEBD] bg-black/5 max-h-56 flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt="Receipt preview"
                  className="max-h-56 object-contain w-auto mx-auto"
                />

                {isScanning && (
                  <div className="absolute inset-0 bg-[#0F382A]/75 backdrop-blur-xs flex flex-col items-center justify-center text-[#F9F3DC] p-4 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#C59B27] mb-2" />
                    <span className="text-xs font-bold">{t.analyzingReceipt}</span>
                    <span className="text-[10px] text-[#C8DBD1] mt-1">
                      {lang === 'en' ? 'Reading total amount & merchant name...' : 'Membaca total bayar & nama toko...'}
                    </span>
                  </div>
                )}

                {!isScanning && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[11px] px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t.rescanBtn}
                  </button>
                )}
              </div>

              {scanError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Parsed Result Form */}
              {scanResult && !isScanning && (
                <div className="p-4 rounded-xl bg-white border border-[#DDD6C5] shadow-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-[#EFECE1]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#C59B27]" />
                      <span className="text-xs font-bold text-[#0F382A]">{t.extractSuccess}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                      {(scanResult.confidence * 100).toFixed(0)}% {lang === 'en' ? 'Accurate' : 'Akurat'}
                    </span>
                  </div>

                  {/* Form fields pre-filled for user confirmation */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-[#65786D] block mb-1">
                        {lang === 'en' ? 'Transaction Type' : 'Jenis Transaksi'}
                      </label>
                      <select
                        value={scanResult.type}
                        onChange={(e) => setScanResult({ ...scanResult, type: e.target.value as TransactionType })}
                        className="w-full text-xs p-2 rounded-lg border border-[#D8D2C2] bg-white font-medium text-[#192A24]"
                      >
                        <option value="expense">{lang === 'en' ? 'Expense (-)' : 'Pengeluaran (-)'}</option>
                        <option value="income">{lang === 'en' ? 'Income (+)' : 'Pemasukan (+)'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#65786D] block mb-1">
                        {t.detectedAmount} (IDR)
                      </label>
                      <input
                        type="number"
                        value={scanResult.amount}
                        onChange={(e) => setScanResult({ ...scanResult, amount: Number(e.target.value) || 0 })}
                        className="w-full text-xs p-2 rounded-lg border border-[#D8D2C2] bg-white font-bold text-[#0F382A]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#65786D] block mb-1">
                        {t.merchantOrItem}
                      </label>
                      <input
                        type="text"
                        value={scanResult.merchantOrItem}
                        onChange={(e) => setScanResult({ ...scanResult, merchantOrItem: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-[#D8D2C2] bg-white text-[#192A24]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#65786D] block mb-1">
                        {lang === 'en' ? 'Category' : 'Kategori'}
                      </label>
                      <select
                        value={scanResult.category}
                        onChange={(e) => setScanResult({ ...scanResult, category: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-[#D8D2C2] bg-white text-[#192A24]"
                      >
                        {['Makanan', 'Rumah tangga', 'Listrik', 'Air', 'Pendidikan', 'Transportasi', 'Kesehatan', 'Tagihan', 'Belanja', 'Hiburan', 'Lainnya', 'Gaji', 'Usaha'].map((c) => (
                          <option key={c} value={c}>
                            {(t.categories as Record<string, string>)[c] || c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold text-[#65786D] block mb-1">
                        {lang === 'en' ? 'Description' : 'Keterangan'}
                      </label>
                      <input
                        type="text"
                        value={scanResult.description}
                        onChange={(e) => setScanResult({ ...scanResult, description: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-[#D8D2C2] bg-white text-[#192A24]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#65786D] block mb-1">
                        {lang === 'en' ? 'Date' : 'Tanggal'}
                      </label>
                      <input
                        type="date"
                        value={scanResult.date}
                        onChange={(e) => setScanResult({ ...scanResult, date: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-[#D8D2C2] bg-white text-[#192A24]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#65786D] block mb-1">
                        {t.detectedTypeLabel}
                      </label>
                      <span className="inline-block text-xs font-medium px-2 py-2 rounded-lg bg-[#FAF9F5] border border-[#DDD6C5] text-[#2F4A3C] w-full capitalize">
                        {scanResult.detectedType === 'ewallet_screenshot' ? 'E-Wallet / Transfer' : 'Struk / Receipt'}
                      </span>
                    </div>
                  </div>

                  {/* Line items if detected */}
                  {scanResult.items && scanResult.items.length > 0 && (
                    <div className="pt-2 border-t border-[#F0EDE4] space-y-1">
                      <span className="text-[10px] font-bold text-[#65786D] uppercase tracking-wider block">
                        {lang === 'en' ? 'Detected Items:' : 'Item Terdeteksi:'}
                      </span>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                        {scanResult.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] text-[#2F4A3C]">
                            <span className="truncate pr-2">{item.name}</span>
                            <span className="font-mono-num shrink-0 font-medium">{formatIDR(item.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save button */}
                  <button
                    type="button"
                    onClick={handleConfirmSave}
                    className="w-full py-3 px-4 rounded-xl bg-[#0F382A] hover:bg-[#164D3B] text-[#F9F3DC] font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Check className="w-4 h-4 text-[#C59B27]" />
                    {t.saveScannedTx} ({formatIDR(scanResult.amount)})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
