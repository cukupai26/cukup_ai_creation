import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles,
  PieChart,
  Camera
} from 'lucide-react';
import { Transaction, Language } from '../types';
import { formatIDR } from '../utils/calculations';
import { getTranslation, formatI18n } from '../utils/i18n';

interface TransaksiTabProps {
  transactions: Transaction[];
  onOpenRecordTx: () => void;
  onOpenScanReceipt: () => void;
  onDeleteTransaction: (id: string) => void;
  lang: Language;
}

export const TransaksiTab: React.FC<TransaksiTabProps> = ({
  transactions,
  onOpenRecordTx,
  onOpenScanReceipt,
  onDeleteTransaction,
  lang,
}) => {
  const t = getTranslation(lang);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filtered transactions
  const filtered = transactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tx.description.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.amount.toString().includes(q)
      );
    }
    return true;
  });

  // Calculate category totals for expenses
  const categoryTotals: Record<string, number> = {};
  transactions
    .filter((tx) => tx.type === 'expense')
    .forEach((tx) => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const totalExpenseAmount = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Top Banner & Quick Add */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#0F382A]">{t.txListTitle}</h2>
          <p className="text-xs text-[#6B7D74]">
            {formatI18n(t.txCount, { count: transactions.length })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenScanReceipt}
            className="py-2 px-2.5 rounded-xl bg-[#1B5E43] hover:bg-[#237554] text-[#F9F3DC] font-semibold text-xs flex items-center gap-1 transition-colors shadow-2xs"
          >
            <Camera className="w-3.5 h-3.5 text-[#F9F3DC]" />
            <span>{t.scanReceipt}</span>
          </button>
          <button
            onClick={onOpenRecordTx}
            className="py-2 px-3 rounded-xl bg-[#0F382A] hover:bg-[#164D3B] text-[#F9F3DC] font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#C59B27] stroke-[3]" />
            {t.addNewTx}
          </button>
        </div>
      </div>

      {/* Two Quick Action Entry Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Natural Language Quick Input Banner */}
        <div 
          onClick={onOpenRecordTx}
          className="p-3 rounded-2xl bg-[#F4EFE6] border border-[#E0D8C8] flex items-center justify-between cursor-pointer hover:bg-[#EBE4D6] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#0F382A] text-[#F9F3DC] flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#0F382A] block truncate">
                {t.naturalPromptBanner}
              </span>
              <span className="text-[10px] text-[#5A6D63] block truncate">
                {t.naturalPromptSub}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#0F382A] px-2 py-0.5 rounded-md bg-white border border-[#DDD6C5] shrink-0">
            {t.open}
          </span>
        </div>

        {/* Scan Struk Quick Banner */}
        <div 
          onClick={onOpenScanReceipt}
          className="p-3 rounded-2xl bg-[#EBF3ED] border border-[#CCE2D4] flex items-center justify-between cursor-pointer hover:bg-[#DEEDE2] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#1B5E43] text-[#F9F3DC] flex items-center justify-center shrink-0">
              <Camera className="w-3.5 h-3.5 text-[#C59B27]" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#0F382A] block truncate">
                {t.scanPromptBanner}
              </span>
              <span className="text-[10px] text-[#4A6E59] block truncate">
                {t.scanPromptSub}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#0F382A] px-2 py-0.5 rounded-md bg-white border border-[#BBD7C5] shrink-0">
            Scan
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#7A8E83] absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#DCD5C6] focus:outline-hidden focus:ring-2 focus:ring-[#0F382A]/20 text-[#192A24]"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterType === 'all'
                ? 'bg-[#0F382A] text-white'
                : 'bg-white text-[#65786D] border border-[#DDD6C5] hover:bg-[#F7F5EE]'
            }`}
          >
            {t.filterAll}
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterType === 'expense'
                ? 'bg-rose-700 text-white'
                : 'bg-white text-rose-700 border border-[#DDD6C5] hover:bg-rose-50'
            }`}
          >
            {t.filterExpense}
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterType === 'income'
                ? 'bg-[#165B3F] text-white'
                : 'bg-white text-[#165B3F] border border-[#DDD6C5] hover:bg-emerald-50'
            }`}
          >
            {t.filterIncome}
          </button>
        </div>
      </div>

      {/* Category Breakdown (Top Expenses) */}
      {sortedCategories.length > 0 && filterType !== 'income' && (
        <div className="p-3.5 bg-white rounded-2xl border border-[#E7E2D6] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0F382A] flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-[#C59B27]" />
              {t.spendingDistribution}
            </span>
            <span className="text-[11px] text-[#6B7D74]">
              {formatI18n(t.totalExpense, { amount: formatIDR(totalExpenseAmount) })}
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {sortedCategories.slice(0, 4).map(([cat, amount]) => {
              const pct = totalExpenseAmount > 0 ? Math.round((amount / totalExpenseAmount) * 100) : 0;
              return (
                <div key={cat} className="space-y-0.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#192A24] font-medium">{(t.categories as Record<string, string>)[cat] || cat}</span>
                    <span className="text-[#55695F] font-mono-num">{formatIDR(amount)} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#EAE5D8]">
                    <div
                      className="h-full rounded-full bg-[#0F382A]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-[#E7E2D6] overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[#7A8E83]">
            <p className="text-xs font-medium">{t.noTxMatch}</p>
            <button
              onClick={onOpenRecordTx}
              className="mt-2 text-xs font-bold text-[#0F382A] underline"
            >
              {t.recordFirstTx}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F0EDE4]">
            {filtered.slice().reverse().map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 flex items-center justify-between hover:bg-[#FAF9F5] transition-colors text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#192A24] truncate">
                        {tx.description}
                      </span>
                      {tx.isDemo && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {t.demoBadge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#71847A] mt-0.5">
                      <span className="font-medium text-[#0F382A]">{(t.categories as Record<string, string>)[tx.category] || tx.category}</span>
                      <span>·</span>
                      <span>{tx.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-bold font-mono-num text-xs ${
                      tx.type === 'income' ? 'text-emerald-700' : 'text-[#192A24]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}{formatIDR(tx.amount)}
                  </span>

                  <button
                    onClick={() => onDeleteTransaction(tx.id)}
                    title={lang === 'en' ? 'Delete transaction' : 'Hapus transaksi'}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#95A59D] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
