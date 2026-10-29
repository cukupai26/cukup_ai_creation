import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  FileJson, 
  RotateCcw 
} from 'lucide-react';
import { Language, CukupAiExportData } from '../types';
import { getTranslation } from '../utils/i18n';
import { exportDataAsJson, parseImportedJson } from '../utils/storage';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportData: CukupAiExportData;
  onImportSuccess: (data: CukupAiExportData) => void;
  onResetData: () => void;
  lang: Language;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  exportData,
  onImportSuccess,
  onResetData,
  lang,
}) => {
  const t = getTranslation(lang);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    exportDataAsJson(exportData);
    setImportStatus({
      success: true,
      message: lang === 'en' ? 'Backup file downloaded successfully!' : 'File cadangan JSON berhasil diunduh!',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseImportedJson(content);
      if (parsed) {
        onImportSuccess(parsed);
        setImportStatus({
          success: true,
          message: `${lang === 'en' ? 'Restored' : 'Berhasil memulihkan'} ${parsed.transactions?.length || 0} ${lang === 'en' ? 'transactions and profile!' : 'transaksi dan profil keluarga!'}`,
        });
      } else {
        setImportStatus({
          success: false,
          message: t.importErrorMsg,
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#FAF9F5] rounded-2xl border border-[#E7E2D6] shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E2D6]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0F382A] text-[#F9F3DC] flex items-center justify-center">
              <FileJson className="w-4 h-4 text-[#C59B27]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F382A]">
                {t.backupModalTitle}
              </h3>
              <span className="text-[10px] text-[#71847A] block">
                {lang === 'en' ? 'Protect your daily records' : 'Lindungi catatan kas Anda'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#6B7D74] hover:bg-[#EAE5D8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#52645B] leading-relaxed">
          {t.backupModalSub}
        </p>

        {importStatus && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
              importStatus.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {importStatus.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}

        {/* Current status stats */}
        <div className="p-3 rounded-xl bg-white border border-[#DDD6C5] text-xs space-y-1">
          <div className="flex justify-between text-[#65786D]">
            <span>{lang === 'en' ? 'Stored Transactions:' : 'Transaksi Tersimpan:'}</span>
            <span className="font-bold text-[#0F382A]">{exportData.transactions.length}</span>
          </div>
          <div className="flex justify-between text-[#65786D]">
            <span>{lang === 'en' ? 'Mandatory Bills:' : 'Pos Wajib Terdaftar:'}</span>
            <span className="font-bold text-[#0F382A]">{exportData.upcomingExpenses.length}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#0F382A] hover:bg-[#164D3B] text-[#F9F3DC] font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-[#C59B27]" />
            {t.exportJsonBtn}
          </button>

          {/* Import Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3.5 rounded-xl bg-white hover:bg-[#FAF9F5] border border-[#DDD6C5] text-[#0F382A] font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
          >
            <Upload className="w-4 h-4 text-[#1B5E43]" />
            {t.importJsonBtn}
          </button>

          {/* Reset button */}
          <button
            onClick={() => {
              if (confirm(lang === 'en' ? 'Are you sure you want to clear all data?' : 'Yakin ingin mengosongkan seluruh data?')) {
                onResetData();
                onClose();
              }
            }}
            className="w-full py-2 px-3 text-[11px] text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Reset to Clean State' : 'Kosongkan Semua Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
