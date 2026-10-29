import React from 'react';
import { 
  HeartHandshake, 
  PlusCircle, 
  MinusCircle, 
  AlertOctagon, 
  TrendingUp 
} from 'lucide-react';
import { CashflowMetrics, formatIDR } from '../utils/calculations';
import { Language } from '../types';
import { getTranslation, formatI18n } from '../utils/i18n';

interface DailyCheckInProps {
  metrics: CashflowMetrics;
  onRecordIncome: () => void;
  onRecordExpense: () => void;
  onTriggerDeficitMode: () => void;
  onExploreOpportunities: () => void;
  lang: Language;
}

export const DailyCheckIn: React.FC<DailyCheckInProps> = ({
  metrics,
  onRecordIncome,
  onRecordExpense,
  onTriggerDeficitMode,
  onExploreOpportunities,
  lang,
}) => {
  const t = getTranslation(lang);

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2D6] p-4 shadow-xs">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-md bg-[#F4EFE6] text-[#0F382A] flex items-center justify-center">
          <HeartHandshake className="w-3.5 h-3.5 text-[#C59B27]" />
        </div>
        <h3 className="text-xs font-bold text-[#0F382A]">
          {t.checkInTitle}
        </h3>
      </div>

      <p className="text-xs text-[#52645B] mb-3">
        {formatI18n(t.checkInDesc, { amount: formatIDR(metrics.safeDailySpending) })}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onRecordExpense}
          className="p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE8] border border-[#E3DDD0] text-left transition-colors flex items-center gap-2 group"
        >
          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <MinusCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-[#192A24] truncate">
              {t.checkInExpense}
            </span>
            <span className="block text-[10px] text-[#71847A] truncate">
              {t.checkInExpenseDesc}
            </span>
          </div>
        </button>

        <button
          onClick={onRecordIncome}
          className="p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE8] border border-[#E3DDD0] text-left transition-colors flex items-center gap-2 group"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <PlusCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-[#192A24] truncate">
              {t.checkInIncome}
            </span>
            <span className="block text-[10px] text-[#71847A] truncate">
              {t.checkInIncomeDesc}
            </span>
          </div>
        </button>

        <button
          onClick={onTriggerDeficitMode}
          className={`p-2.5 rounded-xl border text-left transition-colors flex items-center gap-2 group ${
            metrics.status === 'KRITIS'
              ? 'bg-rose-50 hover:bg-rose-100/80 border-rose-300 text-rose-900'
              : 'bg-[#FAF9F5] hover:bg-[#F2EFE8] border-[#E3DDD0] text-[#192A24]'
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            metrics.status === 'KRITIS' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
          }`}>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-semibold truncate">
              {metrics.status === 'KRITIS' ? t.checkInShortfallKritis : t.checkInShortfall}
            </span>
            <span className="block text-[10px] opacity-75 truncate">
              {t.checkInShortfallDesc}
            </span>
          </div>
        </button>

        <button
          onClick={onExploreOpportunities}
          className="p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE8] border border-[#E3DDD0] text-left transition-colors flex items-center gap-2 group"
        >
          <div className="w-7 h-7 rounded-lg bg-[#EBF3ED] text-[#0F382A] flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-[#C59B27]" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-[#192A24] truncate">
              {t.checkInOpportunity}
            </span>
            <span className="block text-[10px] text-[#71847A] truncate">
              {t.checkInOpportunityDesc}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
