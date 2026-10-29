import React from 'react';
import { 
  Home, 
  Receipt, 
  CalendarClock, 
  TrendingUp, 
  Bot 
} from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/i18n';

export type TabType = 'beranda' | 'transaksi' | 'rencana' | 'peluang' | 'ai_agent';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  hasDeficitAlert?: boolean;
  lang: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  hasDeficitAlert = false,
  lang,
}) => {
  const t = getTranslation(lang);

  const navItems: { id: TabType; label: string; icon: React.FC<{ className?: string }>; badge?: boolean }[] = [
    { id: 'beranda', label: t.navBeranda, icon: Home },
    { id: 'transaksi', label: t.navTransaksi, icon: Receipt },
    { id: 'rencana', label: t.navRencana, icon: CalendarClock, badge: hasDeficitAlert },
    { id: 'peluang', label: t.navPeluang, icon: TrendingUp },
    { id: 'ai_agent', label: t.navAiAgent, icon: Bot },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E5E0D3] shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      <div className="max-w-lg mx-auto px-2 py-1 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center relative transition-colors ${
                isActive
                  ? 'text-[#0F382A]'
                  : 'text-[#6B7D74] hover:text-[#254234]'
              }`}
            >
              <div className="relative">
                <div
                  className={`w-9 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-[#EBF3ED] text-[#0F382A]' : ''
                  }`}
                >
                  <IconComponent className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                </div>
                {item.badge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#DC2626] rounded-full border-2 border-white ring-1 ring-red-400" />
                )}
              </div>
              <span
                className={`text-[11px] mt-0.5 tracking-tight ${
                  isActive ? 'font-bold text-[#0F382A]' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
