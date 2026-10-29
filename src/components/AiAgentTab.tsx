import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  ShieldCheck, 
  Loader2, 
  User,
  AlertCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { 
  ChatMessage, 
  UserProfile, 
  Transaction, 
  UpcomingMandatoryExpense,
  Language 
} from '../types';
import { CashflowMetrics, formatIDR } from '../utils/calculations';
import { getTranslation, formatI18n } from '../utils/i18n';

interface AiAgentTabProps {
  metrics: CashflowMetrics;
  profile: UserProfile;
  transactions: Transaction[];
  upcomingExpenses: UpcomingMandatoryExpense[];
  lang: Language;
}

export const AiAgentTab: React.FC<AiAgentTabProps> = ({
  metrics,
  profile,
  transactions,
  upcomingExpenses,
  lang,
}) => {
  const t = getTranslation(lang);

  const getInitialWelcome = (l: Language) => {
    const tr = getTranslation(l);
    return formatI18n(tr.aiWelcome, {
      balance: formatIDR(metrics.currentBalance),
      days: metrics.remainingDays,
      safe: formatIDR(metrics.safeDailySpending),
    });
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: getInitialWelcome(lang),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  // Update welcome message if user toggles language and no chat history yet
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome') {
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          content: getInitialWelcome(lang),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [lang]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, errorMessage]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isLoading) return;

    setErrorMessage(null);
    setLastFailedQuery(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const financialContext = {
        currentBalance: metrics.currentBalance,
        totalIncome: metrics.totalIncome,
        totalExpenses: metrics.totalExpenses,
        remainingDays: metrics.remainingDays,
        mandatoryUpcomingExpenses: metrics.mandatoryUpcomingExpenses,
        flexibleFunds: metrics.flexibleFunds,
        safeDailySpending: metrics.safeDailySpending,
        averageDailySpending: metrics.averageDailySpending,
        projectedEndOfMonthBalance: metrics.projectedEndOfMonthBalance,
        status: metrics.status,
        deficitTarget: metrics.projectedDeficit,
        profile: {
          name: profile.name,
          householdSize: profile.householdSize,
          business: profile.business,
          skills: profile.skills,
          availableResources: profile.availableResources,
        },
        recentTransactions: transactions.slice(-8),
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          financialContext,
          language: lang,
        }),
      });

      if (!res.ok) {
        throw new Error(lang === 'en' ? 'Connection to AI service failed.' : 'Koneksi ke asisten AI terganggu.');
      }
      
      const data = await res.json();

      if (data.error && !data.reply) {
        throw new Error(data.error);
      }

      const aiMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: data.reply || (lang === 'en' ? 'Unable to process reply at this time.' : 'Maaf, saya tidak dapat memproses jawaban saat ini.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setLastFailedQuery(query.trim());
      setErrorMessage(
        err?.message || (lang === 'en' ? 'Unable to reach CukupAI. Please try again.' : 'Gagal menghubungi CukupAI. Silakan coba lagi.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastFailedQuery) {
      handleSendMessage(lastFailedQuery);
    }
  };

  const quickQuestions = lang === 'en' ? [
    '💡 How to sell perfume Rp20–50k to earn income?',
    '⚠️ Cash is Rp100k and a bill of Rp150k is due in 3 days. What should I do?',
    '📊 Calculate profit: unit cost Rp15,000 and selling price Rp25,000',
    '✍️ Write a Facebook caption to promote affordable perfume',
    '🛡️ What is my safe spending limit today?',
  ] : [
    '💡 Cara menjual parfum Rp20–50rb agar dapat pemasukan?',
    '⚠️ Saldo tinggal Rp100.000 dan ada tagihan Rp150.000 tiga hari lagi. Apa yang harus saya lakukan?',
    '📊 Bantu hitung keuntungan jika modal parfum Rp15.000 dan dijual Rp25.000',
    '✍️ Buatkan caption Facebook untuk promosi parfum murah',
    '🛡️ Berapa saldo aman saya untuk belanja hari ini?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[820px] pb-16 animate-in fade-in duration-300">
      {/* Context Badge */}
      <div className="mb-2 p-2.5 rounded-xl bg-white border border-[#E7E2D6] shadow-2xs flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-[#0F382A] font-semibold">
          <ShieldCheck className="w-4 h-4 text-[#C59B27]" />
          <span>{t.aiContextBadge}</span>
        </div>
        <div className="flex items-center gap-2 text-[#5A6D63]">
          <span>{lang === 'en' ? 'Cash:' : 'Saldo:'} <strong className="text-[#0F382A]">{formatIDR(metrics.currentBalance)}</strong></span>
          <span>·</span>
          <span>{lang === 'en' ? 'Limit:' : 'Batas:'} <strong className="text-[#0F382A]">{formatIDR(metrics.safeDailySpending)}/{lang === 'en' ? 'd' : 'hr'}</strong></span>
          <span>·</span>
          <span>{metrics.remainingDays} {lang === 'en' ? 'days' : 'hari'}</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2 text-xs ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'model' && (
              <div className="w-7 h-7 rounded-lg bg-[#0F382A] text-[#F9F3DC] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Bot className="w-4 h-4 text-[#C59B27]" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#0F382A] text-[#F9F3DC] rounded-tr-xs'
                  : 'bg-white text-[#192A24] border border-[#E7E2D6] rounded-tl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{m.content}</div>
              <span className={`block text-[9px] mt-1 text-right ${
                m.role === 'user' ? 'text-[#A9C1B5]' : 'text-[#8A9C93]'
              }`}>
                {m.timestamp}
              </span>
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-[#DCD5C6] text-[#0F382A] flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2 text-xs">
            <div className="w-7 h-7 rounded-lg bg-[#0F382A] text-[#F9F3DC] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-[#C59B27]" />
            </div>
            <div className="bg-white text-[#192A24] border border-[#E7E2D6] rounded-2xl rounded-tl-xs px-3.5 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F382A]" />
              <span className="text-xs text-[#52645B]">{t.aiThinking}</span>
            </div>
          </div>
        )}

        {/* Explicit Error State with Retry Button */}
        {errorMessage && (
          <div className="flex items-start gap-2 text-xs">
            <div className="w-7 h-7 rounded-lg bg-rose-700 text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="bg-rose-50 text-rose-900 border border-rose-200 rounded-2xl rounded-tl-xs p-3 space-y-2 max-w-[85%]">
              <div className="font-medium flex items-center gap-1.5">
                <span>{errorMessage}</span>
              </div>
              {lastFailedQuery && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Retry Message' : 'Coba Lagi'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Carousel */}
      <div className="py-2 overflow-x-auto no-scrollbar flex gap-1.5 shrink-0">
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(q)}
            className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg bg-white border border-[#DDD6C5] text-[#243E32] hover:bg-[#FAF9F5] transition-colors shrink-0 shadow-2xs flex items-center gap-1"
          >
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 shrink-0 pt-1"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={t.aiInputPlaceholder}
          disabled={isLoading}
          className="flex-1 text-xs p-3 rounded-xl bg-white border border-[#D5CEBD] focus:outline-hidden focus:ring-2 focus:ring-[#0F382A]/30 text-[#192A24] shadow-2xs"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="w-10 h-10 rounded-xl bg-[#0F382A] hover:bg-[#164D3B] disabled:opacity-50 text-[#F9F3DC] flex items-center justify-center transition-colors shadow-2xs shrink-0"
        >
          <Send className="w-4 h-4 text-[#C59B27]" />
        </button>
      </form>

      {/* Financial Safety Footer */}
      <p className="text-[10px] text-center text-[#82968B] mt-1.5 shrink-0">
        {t.aiSafetyFooter}
      </p>
    </div>
  );
};
