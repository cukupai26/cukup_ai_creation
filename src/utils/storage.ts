import {
  UserProfile,
  Transaction,
  MonthlyPlan,
  UpcomingMandatoryExpense,
  IncomeOpportunity,
  OpeningBalanceConfig,
  ConfirmedUpcomingIncome,
} from '../types';

export const STORAGE_KEYS = {
  PROFILE: 'cukupai_profile_v1',
  TRANSACTIONS: 'cukupai_transactions_v1',
  UPCOMING: 'cukupai_upcoming_v1',
  PLAN: 'cukupai_plan_v1',
  OPPORTUNITIES: 'cukupai_opportunities_v1',
  IS_DEMO_ACTIVE: 'cukupai_is_demo_active_v1',
  CUSTOM_DAYS_REMAINING: 'cukupai_custom_days_v1',
  LANGUAGE: 'cukupai_language_v1',
  INITIALIZED: 'cukupai_initialized_v1',
  OPENING_BALANCE: 'cukupai_opening_balance_v1',
  CONFIRMED_INCOMES: 'cukupai_confirmed_incomes_v1',
  PRO_BANNER_DISMISSED: 'cukupai_pro_banner_dismissed_v1',
  PRO_WAITLIST: 'cukupai_pro_waitlist_v1',
  PARTNER_LEADS: 'cukupai_partner_leads_v1',
};

export const DEMO_OPENING_BALANCE: OpeningBalanceConfig = {
  amount: 800000,
  effectiveDate: '2026-10-01',
  note: 'Saldo kas awal demo Oktober',
};

export const DEFAULT_OPENING_BALANCE: OpeningBalanceConfig = {
  amount: 0,
  effectiveDate: new Date().toISOString().split('T')[0],
};

export const DEMO_PROFILE: UserProfile = {
  name: 'Budi & Siti (Keluarga Mandiri)',
  householdSize: 4,
  incomeSources: ['Gaji Pokok', 'Usaha Parfum Rumahan'],
  skills: ['Penjualan WhatsApp', 'Membuat Kue Kering', 'Menjahit Sederhana'],
  business: {
    name: 'Aroma Barokah Perfumery',
    product: 'Parfum Spray 50ml Bibit Wangi',
    unitPrice: 250000,
    netProfitPerUnit: 175000,
    currentMonthlySales: 6,
  },
  availableResources: {
    hasVehicle: true,
    vehicleType: 'Sepeda Motor Beat',
    hasSmartphoneInternet: true,
    freeTimeHoursPerDay: 2,
    socialMediaAudience: 'Status WA 250 kontak, Facebook 800 teman',
    hasCustomerNetwork: true,
    availableSmallCapital: 200000,
    existingEquipment: ['Smartphone', 'Motor', 'Kemasan Tester Parfum', 'Timbangan Dapur'],
  },
};

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Keluarga Baru',
  householdSize: 3,
  incomeSources: ['Gaji Pokok'],
  skills: ['Komunikasi', 'Media Sosial'],
  business: {
    name: '',
    product: '',
    unitPrice: 0,
    netProfitPerUnit: 0,
    currentMonthlySales: 0,
  },
  availableResources: {
    hasVehicle: true,
    vehicleType: 'Sepeda Motor',
    hasSmartphoneInternet: true,
    freeTimeHoursPerDay: 2,
    socialMediaAudience: 'Grup WhatsApp',
    hasCustomerNetwork: false,
    availableSmallCapital: 100000,
    existingEquipment: ['Smartphone'],
  },
};

// Demo scenario requirements from prompt:
// Total Income: Rp4.500.000
// Total Expenses: Rp4.100.000
// Current Available Balance: Rp1.200.000 (starting balance Rp800.000 + Rp4.500.000 - Rp4.100.000 = Rp1.200.000)
// Remaining Days: 12
// Upcoming Mandatory Expenses: Rp500.000
export const DEMO_TRANSACTIONS: Transaction[] = [
  // Incomes (Total: 4.500.000)
  {
    id: 'demo-tx-in-1',
    type: 'income',
    amount: 3800000,
    category: 'Gaji',
    description: 'Gaji bulanan masuk rekening',
    date: '2026-10-01',
    isDemo: true,
  },
  {
    id: 'demo-tx-in-2',
    type: 'income',
    amount: 525000,
    category: 'Usaha',
    description: 'Keuntungan jual 3 botol parfum',
    date: '2026-10-06',
    isDemo: true,
  },
  {
    id: 'demo-tx-in-3',
    type: 'income',
    amount: 175000,
    category: 'Usaha',
    description: 'Keuntungan jual 1 botol parfum rekan kerja',
    date: '2026-10-09',
    isDemo: true,
  },

  // Expenses (Total: 4.100.000)
  {
    id: 'demo-tx-ex-1',
    type: 'expense',
    amount: 1200000,
    category: 'Rumah tangga',
    description: 'Sewa kontrakan bulanan',
    date: '2026-10-02',
    isDemo: true,
  },
  {
    id: 'demo-tx-ex-2',
    type: 'expense',
    amount: 850000,
    category: 'Makanan',
    description: 'Belanja sembako bulanan (beras, minyak, telur, bumbu)',
    date: '2026-10-03',
    isDemo: true,
  },
  {
    id: 'demo-tx-ex-3',
    type: 'expense',
    amount: 450000,
    category: 'Pendidikan',
    description: 'Buku pelajaran & perlengkapan sekolah anak',
    date: '2026-10-04',
    isDemo: true,
  },
  {
    id: 'demo-tx-ex-4',
    type: 'expense',
    amount: 300000,
    category: 'Transportasi',
    description: 'Bensin motor & servis ganti oli',
    date: '2026-10-05',
    isDemo: true,
  },
  {
    id: 'demo-tx-ex-5',
    type: 'expense',
    amount: 550000,
    category: 'Makanan',
    description: 'Sayur harian dan lauk pasar minggu ke-1 & ke-2',
    date: '2026-10-07',
    isDemo: true,
  },
  {
    id: 'demo-tx-ex-6',
    type: 'expense',
    amount: 250000,
    category: 'Tagihan',
    description: 'Paket data internet keluarga & pulsa',
    date: '2026-10-08',
    isDemo: true,
  },
  {
    id: 'demo-tx-ex-7',
    type: 'expense',
    amount: 350000,
    category: 'Belanja',
    description: 'Kebutuhan sabun mandi, deterjen, pampers',
    date: '2026-10-10',
    isDemo: true,
  },
  {
    id: 'demo-tx-ex-8',
    type: 'expense',
    amount: 150000,
    category: 'Makanan',
    description: 'Makan di luar saat akhir pekan keluarga',
    date: '2026-10-11',
    isDemo: true,
  },
];

export const DEMO_UPCOMING_EXPENSES: UpcomingMandatoryExpense[] = [
  {
    id: 'demo-up-1',
    title: 'Listrik PLN Pasca/Token Akhir Bulan',
    amount: 250000,
    dueDate: '2026-10-20',
    category: 'Listrik',
    isPaid: false,
  },
  {
    id: 'demo-up-2',
    title: 'SPP Sekolah Anak & Iuran Komite',
    amount: 250000,
    dueDate: '2026-10-25',
    category: 'Pendidikan',
    isPaid: false,
  },
];

export const DEMO_MONTHLY_PLAN: MonthlyPlan = {
  month: '2026-10',
  startingBalance: 800000,
  expectedIncome: 4500000,
  mandatoryExpenses: 500000,
  flexibleBudget: 700000,
  savingsTarget: 200000,
  deficitTarget: 700000,
};

export const DEMO_OPPORTUNITIES: IncomeOpportunity[] = [
  {
    id: 'demo-opp-1',
    title: 'Optimalisasi Repeat Order Parfum Aroma Barokah',
    category: 'existing_business',
    description: 'Sapa 10 pelanggan lama yang membeli bulan lalu dan tawarkan bundling 2 botol gratis ongkir lokal.',
    requiredResources: ['Smartphone / WhatsApp', 'Kontak pembeli lama', 'Stok tester'],
    estimatedPotential: 700000,
    assumptions: 'Laba bersih Rp175.000 per botol. Cukup jual 4 botol dalam 12 hari ke depan.',
    salesCalculation: {
      productOrService: 'Parfum Spray 50ml Aroma Barokah',
      price: 250000,
      netProfitPerUnit: 175000,
      unitsNeeded: 4,
      dailyTargetUnits: 1,
    },
    actionPlan: [
      { day: 'Hari 1', task: 'Siapkan pesan ramah & hubungi 5 pembeli bulan lalu yang botolnya mulai menipis', completed: true },
      { day: 'Hari 2', task: 'Posting video unboxing / testimoni wangi tahan lama di Status WhatsApp', completed: false },
      { day: 'Hari 3', task: 'Tawarkan promo gajian dini beli 2 dapat tester varian baru', completed: false },
      { day: 'Hari 4', task: 'Follow up rekan kantor/lingkungan yang sempat mencoba tester', completed: false },
    ],
    status: 'active',
  },
  {
    id: 'demo-opp-2',
    title: 'Pre-Order Cemilan / Kering Tempe Rumahan',
    category: 'product_sales',
    description: 'Buka pesanan kering tempe kacang toples untuk teman kantor tanpa modal stok (sistem PO DP 50%).',
    requiredResources: ['Peralatan dapur yang ada', 'Bahan lokal pasar', 'Waktu luang sore hari'],
    estimatedPotential: 350000,
    assumptions: 'Laba bersih Rp25.000 per toples. Target 14 toples terpesan.',
    salesCalculation: {
      productOrService: 'Toples Kering Tempe Gurih',
      price: 45000,
      netProfitPerUnit: 25000,
      unitsNeeded: 14,
      dailyTargetUnits: 2,
    },
    actionPlan: [
      { day: 'Hari 1', task: 'Buat 1 tester kecil dan bawa ke teman kantor/tetangga untuk dicicipi', completed: false },
      { day: 'Hari 2', task: 'Kumpulkan pesanan pre-order dengan batas transfer H-1 masak', completed: false },
      { day: 'Hari 3', task: 'Masak di akhir pekan dan serahkan pesanan hangat', completed: false },
    ],
    status: 'saved',
  },
];

// LocalStorage helpers
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error loading ${key} from storage:`, err);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

// Export backup to JSON file
export function exportDataAsJson(data: any): void {
  try {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `cukupai_backup_${today}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error('Failed to export JSON:', err);
  }
}

// Validate & parse imported JSON backup
export function parseImportedJson(jsonString: string): any | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') return null;
    // Check minimal required properties
    if (
      !Array.isArray(parsed.transactions) ||
      !Array.isArray(parsed.upcomingExpenses) ||
      !parsed.profile
    ) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.error('Invalid JSON file:', err);
    return null;
  }
}

