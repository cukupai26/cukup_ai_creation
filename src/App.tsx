import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  Transaction, 
  UpcomingMandatoryExpense, 
  IncomeOpportunity, 
  TransactionType,
  Language,
  CukupAiExportData,
  OpeningBalanceConfig,
  ConfirmedUpcomingIncome
} from './types';
import { 
  DEMO_PROFILE, 
  DEFAULT_PROFILE, 
  DEMO_TRANSACTIONS, 
  DEMO_UPCOMING_EXPENSES, 
  DEMO_OPPORTUNITIES,
  DEMO_OPENING_BALANCE,
  DEFAULT_OPENING_BALANCE,
  STORAGE_KEYS, 
  loadFromStorage, 
  saveToStorage 
} from './utils/storage';
import { calculateCashflowMetrics } from './utils/calculations';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { BerandaTab } from './components/BerandaTab';
import { TransaksiTab } from './components/TransaksiTab';
import { RencanaTab } from './components/RencanaTab';
import { PeluangTab } from './components/PeluangTab';
import { AiAgentTab } from './components/AiAgentTab';
import { RecordTransactionModal } from './components/RecordTransactionModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { BackupModal } from './components/BackupModal';
import { SetOpeningBalanceModal } from './components/SetOpeningBalanceModal';
import { BansosModal } from './components/BansosModal';
import { CukupAiProModal } from './components/CukupAiProModal';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // 1. Language State with localStorage persistence
  const [lang, setLang] = useState<Language>(() => {
    return loadFromStorage(STORAGE_KEYS.LANGUAGE, 'id');
  });

  // Check if initial first-time bootstrap has occurred
  const isInitialized = loadFromStorage<boolean>(STORAGE_KEYS.INITIALIZED, false);

  // 2. Demo State
  const [isDemoActive, setIsDemoActive] = useState<boolean>(() => {
    return loadFromStorage(STORAGE_KEYS.IS_DEMO_ACTIVE, !isInitialized);
  });

  // 3. User Profile State (Stable across reloads)
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (!isInitialized) return DEMO_PROFILE;
    return loadFromStorage(STORAGE_KEYS.PROFILE, DEMO_PROFILE);
  });

  // 4. Transactions State (Stable across reloads)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (!isInitialized) return DEMO_TRANSACTIONS;
    return loadFromStorage(STORAGE_KEYS.TRANSACTIONS, DEMO_TRANSACTIONS);
  });

  // 5. Upcoming Mandatory Expenses State (Stable across reloads)
  const [upcomingExpenses, setUpcomingExpenses] = useState<UpcomingMandatoryExpense[]>(() => {
    if (!isInitialized) return DEMO_UPCOMING_EXPENSES;
    return loadFromStorage(STORAGE_KEYS.UPCOMING, DEMO_UPCOMING_EXPENSES);
  });

  // 6. Opportunities State
  const [opportunities, setOpportunities] = useState<IncomeOpportunity[]>(() => {
    if (!isInitialized) return DEMO_OPPORTUNITIES;
    return loadFromStorage(STORAGE_KEYS.OPPORTUNITIES, DEMO_OPPORTUNITIES);
  });

  // 7. Opening Balance State (Persisted, safe to update without wiping transactions)
  const [openingBalance, setOpeningBalance] = useState<OpeningBalanceConfig>(() => {
    if (!isInitialized) return DEMO_OPENING_BALANCE;
    return loadFromStorage(STORAGE_KEYS.OPENING_BALANCE, DEMO_OPENING_BALANCE);
  });

  // 8. Confirmed Upcoming Incomes State
  const [confirmedIncomes, setConfirmedIncomes] = useState<ConfirmedUpcomingIncome[]>(() => {
    return loadFromStorage(STORAGE_KEYS.CONFIRMED_INCOMES, []);
  });

  // Mark as initialized once loaded
  useEffect(() => {
    if (!isInitialized) {
      saveToStorage(STORAGE_KEYS.INITIALIZED, true);
    }
  }, [isInitialized]);

  // Navigation state
  const [currentTab, setCurrentTab] = useState<TabType>('beranda');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [isBansosModalOpen, setIsBansosModalOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [recordInitialType, setRecordInitialType] = useState<TransactionType>('expense');

  const customDays = isDemoActive ? 12 : undefined;

  // Persist language updates
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LANGUAGE, lang);
  }, [lang]);

  // Persist state updates to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.IS_DEMO_ACTIVE, isDemoActive);
  }, [isDemoActive]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PROFILE, profile);
  }, [profile]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
  }, [transactions]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.UPCOMING, upcomingExpenses);
  }, [upcomingExpenses]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.OPPORTUNITIES, opportunities);
  }, [opportunities]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.OPENING_BALANCE, openingBalance);
  }, [openingBalance]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CONFIRMED_INCOMES, confirmedIncomes);
  }, [confirmedIncomes]);

  // Derived financial metrics using robust calculation engine
  const metrics = calculateCashflowMetrics(
    transactions,
    upcomingExpenses,
    openingBalance,
    {
      confirmedIncomes,
      customDaysRemaining: customDays,
      lang,
    }
  );

  // Toggle Language Handler (ID <-> EN)
  const handleToggleLang = () => {
    setLang((prev) => (prev === 'id' ? 'en' : 'id'));
  };

  // Toggle Demo Data vs Clean State
  const handleToggleDemo = () => {
    if (isDemoActive) {
      // Switch to clean empty data
      setIsDemoActive(false);
      setProfile(DEFAULT_PROFILE);
      setTransactions([]);
      setUpcomingExpenses([]);
      setOpportunities([]);
      setOpeningBalance(DEFAULT_OPENING_BALANCE);
      setConfirmedIncomes([]);
    } else {
      // Load rich demo scenario
      setIsDemoActive(true);
      setProfile(DEMO_PROFILE);
      setTransactions(DEMO_TRANSACTIONS);
      setUpcomingExpenses(DEMO_UPCOMING_EXPENSES);
      setOpportunities(DEMO_OPPORTUNITIES);
      setOpeningBalance(DEMO_OPENING_BALANCE);
      setConfirmedIncomes([]);
    }
  };

  // Add new transaction
  const handleSaveTransaction = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isDemo: isDemoActive,
    };
    setTransactions((prev) => [...prev, newTx]);
  };

  // Delete transaction
  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Add upcoming mandatory expense
  const handleAddUpcomingExpense = (expense: Omit<UpcomingMandatoryExpense, 'id'>) => {
    const newExp: UpcomingMandatoryExpense = {
      ...expense,
      id: `up-${Date.now()}`,
    };
    setUpcomingExpenses((prev) => [...prev, newExp]);
  };

  // Toggle paid state
  const handleTogglePaidUpcoming = (id: string) => {
    setUpcomingExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isPaid: !e.isPaid } : e))
    );
  };

  // Delete upcoming expense
  const handleDeleteUpcoming = (id: string) => {
    setUpcomingExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Open transaction modal specifically for income or expense
  const handleOpenRecord = (type: TransactionType = 'expense') => {
    setRecordInitialType(type);
    setIsRecordModalOpen(true);
  };

  // Restore imported JSON backup
  const handleImportBackup = (backup: CukupAiExportData) => {
    if (backup.profile) setProfile(backup.profile);
    if (Array.isArray(backup.transactions)) setTransactions(backup.transactions);
    if (Array.isArray(backup.upcomingExpenses)) setUpcomingExpenses(backup.upcomingExpenses);
    if (Array.isArray(backup.opportunities)) setOpportunities(backup.opportunities);
    if (backup.openingBalance) setOpeningBalance(backup.openingBalance);
    if (Array.isArray(backup.confirmedIncomes)) setConfirmedIncomes(backup.confirmedIncomes);
    if (typeof backup.isDemoActive === 'boolean') setIsDemoActive(backup.isDemoActive);
    if (backup.language) setLang(backup.language);
  };

  // Reset to clean state
  const handleResetClean = () => {
    setIsDemoActive(false);
    setProfile(DEFAULT_PROFILE);
    setTransactions([]);
    setUpcomingExpenses([]);
    setOpportunities([]);
    setOpeningBalance(DEFAULT_OPENING_BALANCE);
    setConfirmedIncomes([]);
  };

  const exportData: CukupAiExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    transactions,
    upcomingExpenses,
    opportunities,
    openingBalance,
    confirmedIncomes,
    isDemoActive,
    language: lang,
  };

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#192A24] flex flex-col font-sans">
      {/* Offline Connectivity Status Notification */}
      <OfflineIndicator lang={lang} />

      {/* Top Header with Language Switcher and Backup */}
      <Header
        metrics={metrics}
        isDemoActive={isDemoActive}
        onToggleDemo={handleToggleDemo}
        lang={lang}
        onToggleLang={handleToggleLang}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenBansos={() => setIsBansosModalOpen(true)}
        onOpenProModal={() => setIsProModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 pt-4">
        {currentTab === 'beranda' && (
          <BerandaTab
            metrics={metrics}
            transactions={transactions}
            upcomingExpenses={upcomingExpenses}
            isDemoActive={isDemoActive}
            onOpenRecordTx={() => handleOpenRecord('expense')}
            onOpenScanReceipt={() => setIsReceiptScannerOpen(true)}
            onOpenAiAgent={() => setCurrentTab('ai_agent')}
            onGoToRencana={() => setCurrentTab('rencana')}
            onGoToPeluang={() => setCurrentTab('peluang')}
            onGoToTransaksi={() => setCurrentTab('transaksi')}
            onRecordIncome={() => handleOpenRecord('income')}
            onRecordExpense={() => handleOpenRecord('expense')}
            onOpenSetOpeningBalance={() => setIsOpeningBalanceModalOpen(true)}
            onOpenBansos={() => setIsBansosModalOpen(true)}
            onOpenProModal={() => setIsProModalOpen(true)}
            lang={lang}
          />
        )}

        {currentTab === 'transaksi' && (
          <TransaksiTab
            transactions={transactions}
            onOpenRecordTx={() => handleOpenRecord('expense')}
            onOpenScanReceipt={() => setIsReceiptScannerOpen(true)}
            onDeleteTransaction={handleDeleteTransaction}
            lang={lang}
          />
        )}

        {currentTab === 'rencana' && (
          <RencanaTab
            metrics={metrics}
            upcomingExpenses={upcomingExpenses}
            profile={profile}
            transactions={transactions}
            onAddUpcomingExpense={handleAddUpcomingExpense}
            onTogglePaidUpcomingExpense={handleTogglePaidUpcoming}
            onDeleteUpcomingExpense={handleDeleteUpcoming}
            onGoToPeluang={() => setCurrentTab('peluang')}
            onOpenBansos={() => setIsBansosModalOpen(true)}
            lang={lang}
          />
        )}

        {currentTab === 'peluang' && (
          <PeluangTab
            profile={profile}
            metrics={metrics}
            opportunities={opportunities}
            onUpdateProfile={setProfile}
            onUpdateOpportunities={setOpportunities}
            onRecordQuickIncome={(amount, desc) => {
              handleSaveTransaction({
                type: 'income',
                amount,
                category: 'Usaha',
                description: desc,
                date: new Date().toISOString().split('T')[0],
              });
            }}
            onOpenProModal={() => setIsProModalOpen(true)}
            lang={lang}
          />
        )}

        {currentTab === 'ai_agent' && (
          <AiAgentTab
            metrics={metrics}
            profile={profile}
            transactions={transactions}
            upcomingExpenses={upcomingExpenses}
            lang={lang}
          />
        )}
      </main>

      {/* Record Transaction Modal */}
      <RecordTransactionModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSaveTransaction={handleSaveTransaction}
        initialType={recordInitialType}
        lang={lang}
      />

      {/* Receipt & E-Wallet Multimodal OCR Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onSaveTransaction={handleSaveTransaction}
        lang={lang}
      />

      {/* Data Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        exportData={exportData}
        onImportSuccess={handleImportBackup}
        onResetData={handleResetClean}
        lang={lang}
      />

      {/* Set Opening Balance Modal */}
      <SetOpeningBalanceModal
        isOpen={isOpeningBalanceModalOpen}
        onClose={() => setIsOpeningBalanceModalOpen(false)}
        currentOpeningBalance={openingBalance}
        onSaveOpeningBalance={(newConfig) => setOpeningBalance(newConfig)}
        lang={lang}
      />

      {/* Pusat Bantuan Sosial Guidance & Referral Modal */}
      <BansosModal
        isOpen={isBansosModalOpen}
        onClose={() => setIsBansosModalOpen(false)}
        lang={lang}
      />

      {/* CukupAI Pro Prototype Subscription Modal */}
      <CukupAiProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        lang={lang}
      />

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        hasDeficitAlert={metrics.status === 'KRITIS'}
        lang={lang}
      />
    </div>
  );
}
