import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  lang?: 'id' | 'en';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ lang = 'id' }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div 
      role="status" 
      aria-live="polite"
      className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#182B24]/95 text-[#F7F5EE] backdrop-blur-md shadow-xl border border-amber-500/40 text-xs font-medium animate-fadeIn"
    >
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </div>
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>
        {lang === 'en' 
          ? 'Offline Mode — CukupAI works offline with cached data.' 
          : 'Mode Luar Jaringan — CukupAI tetap aktif dengan data tersimpan.'}
      </span>
    </div>
  );
};
