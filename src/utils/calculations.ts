import { 
  Transaction, 
  UpcomingMandatoryExpense, 
  OpeningBalanceConfig, 
  ConfirmedUpcomingIncome,
  SalesTargetCalculationInput,
  SalesTargetCalculationResult,
  Language
} from '../types';

export interface CashflowMetrics {
  currentBalance: number;
  openingBalance: number;
  openingBalanceDate: string;
  periodIncome: number;
  periodExpenses: number;
  periodVariableExpenses: number;
  periodFixedExpenses: number;
  netCashflow: number;
  remainingDays: number;
  daysPassed: number;
  daysInMonth: number;
  reportingPeriod: string;
  unpaidMandatoryUpcomingExpenses: number;
  paidMandatoryUpcomingExpenses: number;
  confirmedUpcomingIncome: number;
  flexibleFunds: number;
  safeDailySpending: number;
  dailyVariableSpending: number;
  projectedEndOfMonthBalance: number;
  projectedDeficit: number;
  status: 'AMAN' | 'PERLU_WASPADA' | 'KRITIS';
  statusReason: string;
  notes: string[];

  // Aliases for backwards compatibility with existing UI components
  totalIncome: number;
  totalExpenses: number;
  mandatoryUpcomingExpenses: number;
  averageDailySpending: number;
}

export interface CalculationOptions {
  reportingPeriod?: string; // YYYY-MM
  asOfDate?: string | Date; // YYYY-MM-DD or Date object
  confirmedIncomes?: ConfirmedUpcomingIncome[];
  customDaysRemaining?: number;
  lang?: Language;
}

export function formatIDR(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString('id-ID');
  return isNegative ? `-Rp${formatted}` : `Rp${formatted}`;
}

export function formatShortIDR(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const jt = (amount / 1_000_000).toFixed(1).replace('.0', '');
    return `${jt} jt`;
  }
  if (abs >= 1_000) {
    const rb = (amount / 1_000).toFixed(0);
    return `${rb} rb`;
  }
  return formatIDR(amount);
}

/**
 * Checks whether an expense is a fixed/mandatory scheduled obligation 
 * (e.g. rent/kontrakan, tuition/SPP, utilities/PLN, debts/installments)
 * rather than regular daily variable spending (food, daily transport, snacks).
 */
export function isFixedExpense(
  transaction: Transaction,
  upcomingExpenses: UpcomingMandatoryExpense[] = []
): boolean {
  if (transaction.type !== 'expense') return false;

  // 1. Categories inherently considered fixed / mandatory bills
  const fixedCategories = ['Listrik', 'Air', 'Tagihan', 'Pendidikan'];
  if (fixedCategories.includes(transaction.category)) {
    return true;
  }

  // 2. Keyword patterns in description
  const fixedKeywords = /(sewa|kontrakan|kost|kosan|spp|sekolah|kuliah|cicilan|angsuran|asuransi|bpjs|pdam|pln|token\s*listrik|wifi|indihome|tuition|rent|hutang|pinjaman)/i;
  if (fixedKeywords.test(transaction.description)) {
    return true;
  }

  // 3. Match against upcoming mandatory expenses titles
  const isMatchedToBill = upcomingExpenses.some(bill => {
    if (!bill.title) return false;
    const cleanBillTitle = bill.title.toLowerCase();
    const cleanDesc = transaction.description.toLowerCase();
    return cleanDesc.includes(cleanBillTitle) || cleanBillTitle.includes(cleanDesc);
  });

  return isMatchedToBill;
}

/**
 * Comprehensive financial calculation engine for CukupAI.
 * Fully isolates reporting periods, distinguishes fixed vs variable spending,
 * integrates confirmed upcoming income, safely manages opening balances,
 * and eliminates double-counting of bills.
 */
export function calculateCashflowMetrics(
  transactions: Transaction[],
  upcomingExpenses: UpcomingMandatoryExpense[] = [],
  startingBalance: number | OpeningBalanceConfig = 0,
  optionsOrCustomDays?: number | CalculationOptions
): CashflowMetrics {
  // Normalize options
  let options: CalculationOptions = {};
  if (typeof optionsOrCustomDays === 'number') {
    options = { customDaysRemaining: optionsOrCustomDays };
  } else if (optionsOrCustomDays && typeof optionsOrCustomDays === 'object') {
    options = optionsOrCustomDays;
  }

  // 1. Opening balance & effective date normalization
  let openingBalanceAmount = 0;
  let openingBalanceDate = '';
  if (typeof startingBalance === 'number') {
    openingBalanceAmount = startingBalance;
  } else if (startingBalance && typeof startingBalance === 'object') {
    openingBalanceAmount = startingBalance.amount ?? 0;
    openingBalanceDate = startingBalance.effectiveDate || '';
  }

  // 2. Determine Reference Date & Reporting Period
  let refDate: Date;
  if (options.asOfDate) {
    refDate = typeof options.asOfDate === 'string' 
      ? new Date(options.asOfDate.includes('T') ? options.asOfDate : `${options.asOfDate}T00:00:00`)
      : options.asOfDate;
  } else {
    refDate = new Date();
  }

  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const currentDay = refDate.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const reportingPeriod = options.reportingPeriod || currentMonthStr;

  // 3. Current Available Balance Calculation
  // Opening balance is the baseline at openingBalanceDate.
  // Only transactions on or after openingBalanceDate affect current balance.
  // Transactions before openingBalanceDate are considered incorporated into that opening balance.
  const balanceAffectingTransactions = transactions.filter((t) => {
    if (!openingBalanceDate) return true;
    return t.date >= openingBalanceDate;
  });

  const incomeToBalance = balanceAffectingTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseToBalance = balanceAffectingTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = openingBalanceAmount + incomeToBalance - expenseToBalance;

  // 4. Period Transactions (Isolated strictly to reportingPeriod)
  const periodTransactions = transactions.filter((t) => t.date.startsWith(reportingPeriod));

  const periodIncome = periodTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodExpenses = periodTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Separate fixed periodic expenses vs variable daily living expenses
  let periodFixedExpenses = 0;
  let periodVariableExpenses = 0;

  for (const tx of periodTransactions) {
    if (tx.type === 'expense') {
      if (isFixedExpense(tx, upcomingExpenses)) {
        periodFixedExpenses += tx.amount;
      } else {
        periodVariableExpenses += tx.amount;
      }
    }
  }

  // 5. Days Calculations
  const remainingDays = options.customDaysRemaining !== undefined
    ? Math.max(1, options.customDaysRemaining)
    : Math.max(1, daysInMonth - currentDay);

  const daysPassed = options.customDaysRemaining !== undefined
    ? Math.max(1, daysInMonth - options.customDaysRemaining)
    : Math.max(1, currentDay);

  // 6. Mandatory Upcoming Expenses (Bills) - Double-Counting Prevention
  // Only unpaid bills are future obligations that need to be reserved!
  // Paid bills have already been recorded and deducted from current balance.
  const unpaidMandatoryUpcomingExpenses = upcomingExpenses
    .filter((e) => !e.isPaid)
    .reduce((sum, e) => sum + e.amount, 0);

  const paidMandatoryUpcomingExpenses = upcomingExpenses
    .filter((e) => e.isPaid)
    .reduce((sum, e) => sum + e.amount, 0);

  // 7. Confirmed Upcoming Income
  const confirmedUpcomingIncome = (options.confirmedIncomes || [])
    .filter((inc) => !inc.isReceived)
    .reduce((sum, inc) => sum + inc.amount, 0);

  // 8. Flexible Funds:
  // Liquid funds that can be safely spent over remaining days without failing mandatory bills
  const flexibleFunds = currentBalance + confirmedUpcomingIncome - unpaidMandatoryUpcomingExpenses;

  // 9. Safe Daily Spending
  // If flexibleFunds is <= 0, safeDailySpending is strictly 0.
  // Otherwise, divided evenly across the remaining days.
  const safeDailySpending = Math.max(0, Math.floor(flexibleFunds / remainingDays));

  // 10. Daily Variable Spending & Projection
  // Daily variable spending rate is calculated only from variable expenses (food, daily necessities)
  // so that one-time rent or school tuition does not erroneously multiply across remaining days.
  const dailyVariableSpending = Math.round(periodVariableExpenses / Math.max(1, daysPassed));

  // Projected remaining variable spend if current daily variable rate continues
  const projectedRemainingVariable = dailyVariableSpending * remainingDays;

  // Projected end-of-month balance:
  // currentBalance + confirmedUpcomingIncome - unpaidMandatoryUpcomingExpenses - projectedRemainingVariable
  const projectedEndOfMonthBalance = flexibleFunds - projectedRemainingVariable;

  // 11. Status and Reason determination
  const isEn = options?.lang === 'en';
  let status: 'AMAN' | 'PERLU_WASPADA' | 'KRITIS' = 'AMAN';
  let statusReason = '';
  const notes: string[] = [];

  const isFlexibleNegative = flexibleFunds < 0;
  const isProjectedDeficit = projectedEndOfMonthBalance < 0;

  if (isFlexibleNegative || projectedEndOfMonthBalance < -50000) {
    status = 'KRITIS';
    const deficitAmount = Math.abs(Math.min(flexibleFunds, projectedEndOfMonthBalance));
    statusReason = isEn
      ? `Warning: Cashflow is projected to run a deficit of Rp${deficitAmount.toLocaleString('id-ID')} before month-end.`
      : `Peringatan: Arus kas berpotensi defisit Rp${deficitAmount.toLocaleString('id-ID')} sebelum akhir bulan.`;
  } else if (
    (dailyVariableSpending > 0 && safeDailySpending < dailyVariableSpending * 0.75) || 
    flexibleFunds < 300000
  ) {
    status = 'PERLU_WASPADA';
    statusReason = isEn
      ? `Daily safe spending limit (Rp${safeDailySpending.toLocaleString('id-ID')}) is below your current daily spending pace (Rp${dailyVariableSpending.toLocaleString('id-ID')}).`
      : `Batas aman harian (Rp${safeDailySpending.toLocaleString('id-ID')}) berada di bawah belanja harian berjalan Anda (Rp${dailyVariableSpending.toLocaleString('id-ID')}).`;
  } else {
    status = 'AMAN';
    statusReason = isEn
      ? `Cashflow is within safe limits. Maintain flexible spending below Rp${safeDailySpending.toLocaleString('id-ID')}/day.`
      : `Arus kas berada dalam batas aman. Pertahankan belanja di bawah Rp${safeDailySpending.toLocaleString('id-ID')}/hari.`;
  }

  // Explanatory notes
  if (unpaidMandatoryUpcomingExpenses > 0) {
    notes.push(
      isEn
        ? `Upcoming mandatory bills (${formatIDR(unpaidMandatoryUpcomingExpenses)}) have been reserved from safe funds.`
        : `Kewajiban wajib sisa bulan ini (${formatIDR(unpaidMandatoryUpcomingExpenses)}) sudah disisihkan dari dana aman.`
    );
  }
  if (paidMandatoryUpcomingExpenses > 0) {
    notes.push(
      isEn
        ? `Paid bills of ${formatIDR(paidMandatoryUpcomingExpenses)} have been recorded and are not deducted twice.`
        : `Tagihan sebesar ${formatIDR(paidMandatoryUpcomingExpenses)} telah dibayar dan tidak dihitung ganda.`
    );
  }
  if (confirmedUpcomingIncome > 0) {
    notes.push(
      isEn
        ? `Confirmed incoming income of ${formatIDR(confirmedUpcomingIncome)} has been factored in.`
        : `Pemasukan terkonfirmasi sebesar ${formatIDR(confirmedUpcomingIncome)} telah diperhitungkan.`
    );
  }
  if (openingBalanceDate) {
    notes.push(
      isEn
        ? `Opening balance Rp${openingBalanceAmount.toLocaleString('id-ID')} effective as of ${openingBalanceDate}.`
        : `Saldo awal Rp${openingBalanceAmount.toLocaleString('id-ID')} efektif per tanggal ${openingBalanceDate}.`
    );
  }
  if (periodFixedExpenses > 0) {
    notes.push(
      isEn
        ? `Fixed periodic expenses (${formatIDR(periodFixedExpenses)}) are separated to prevent skewing daily spending estimates.`
        : `Pengeluaran berkala/tetap (${formatIDR(periodFixedExpenses)}) dipisahkan agar tidak melipatgandakan estimasi belanja harian.`
    );
  }

  const projectedDeficit = projectedEndOfMonthBalance < 0 
    ? Math.abs(projectedEndOfMonthBalance)
    : (flexibleFunds < 0 ? Math.abs(flexibleFunds) : 0);

  return {
    currentBalance,
    openingBalance: openingBalanceAmount,
    openingBalanceDate,
    periodIncome,
    periodExpenses,
    periodVariableExpenses,
    periodFixedExpenses,
    netCashflow: periodIncome - periodExpenses,
    remainingDays,
    daysPassed,
    daysInMonth,
    reportingPeriod,
    unpaidMandatoryUpcomingExpenses,
    paidMandatoryUpcomingExpenses,
    confirmedUpcomingIncome,
    flexibleFunds,
    safeDailySpending,
    dailyVariableSpending,
    projectedEndOfMonthBalance,
    projectedDeficit,
    status,
    statusReason,
    notes,

    // Aliases for compatibility
    totalIncome: periodIncome,
    totalExpenses: periodExpenses,
    mandatoryUpcomingExpenses: unpaidMandatoryUpcomingExpenses,
    averageDailySpending: dailyVariableSpending,
  };
}

/**
 * Pure calculation engine for Daily Sales Target Calculator
 * Accurately differentiates Gross Revenue (Omzet), Gross Profit (Laba Kotor),
 * and Net Profit (Laba Bersih), and validates commercial feasibility.
 */
export function calculateSalesTargetPlan(input: SalesTargetCalculationInput): SalesTargetCalculationResult {
  const targetAmount = Math.max(0, input.targetAmount || 0);
  const daysAvailable = Math.max(1, Math.round(input.daysAvailable || 1));
  const sellingPrice = Math.max(0, input.sellingPrice || 0);
  const costPerUnit = Math.max(0, input.costPerUnit || 0);
  const additionalCostPerTx = Math.max(0, input.additionalCostPerTx || 0);

  const grossProfitPerUnit = sellingPrice - costPerUnit;
  const netProfitPerUnit = sellingPrice - costPerUnit - additionalCostPerTx;
  const profitMarginPercent = sellingPrice > 0 
    ? Math.round((netProfitPerUnit / sellingPrice) * 1000) / 10 
    : 0;

  const dailyNetProfitTarget = Math.round(targetAmount / daysAvailable);

  let totalUnitsNeeded = 0;
  let dailyTargetUnits = 0;
  let projectedRevenue = 0;
  let projectedGrossProfit = 0;
  let projectedNetProfit = 0;
  let projectedCapitalRequired = 0;
  let projectedTransactionCosts = 0;

  const isEn = input.lang === 'en';
  let isFeasible = true;
  let feasibilityIssue: 'margin_deficit' | 'high_daily_volume' | 'zero_target' | undefined = undefined;
  let feasibilityExplanation = '';
  const recommendedAlternatives: string[] = [];

  const assumptions = isEn
    ? [
        `Selling price Rp${sellingPrice.toLocaleString('id-ID')} and unit cost Rp${costPerUnit.toLocaleString('id-ID')} are assumed constant.`,
        `Transaction/packaging fee Rp${additionalCostPerTx.toLocaleString('id-ID')} is deducted on each unit sold.`,
        `All sold units are assumed to be paid in full cash by buyers without bad debt.`,
        `This calculation does not account for business premise rent or taxes.`
      ]
    : [
        `Harga jual Rp${sellingPrice.toLocaleString('id-ID')} dan modal pokok Rp${costPerUnit.toLocaleString('id-ID')} bersifat tetap.`,
        `Biaya transaksi/kemasan Rp${additionalCostPerTx.toLocaleString('id-ID')} dibebankan pada setiap unit yang terjual.`,
        `Seluruh unit yang terjual diasumsikan lunas dibayar tunai oleh pembeli tanpa piutang macet.`,
        `Perhitungan ini belum memperhitungkan biaya tempat usaha atau pajak.`
      ];

  if (targetAmount === 0) {
    isFeasible = true;
    feasibilityIssue = 'zero_target';
    feasibilityExplanation = isEn
      ? 'Target fund entered is Rp0. You have not set an additional income target.'
      : 'Target dana yang dimasukkan Rp0. Anda belum menetapkan target penambahan pemasukan.';
  } else if (netProfitPerUnit <= 0) {
    isFeasible = false;
    feasibilityIssue = 'margin_deficit';
    feasibilityExplanation = isEn
      ? `Margin Deficit Warning: Selling price (Rp${sellingPrice.toLocaleString('id-ID')}) does not cover unit cost (Rp${costPerUnit.toLocaleString('id-ID')}) and transaction fee (Rp${additionalCostPerTx.toLocaleString('id-ID')}). Each unit sold results in a net loss of Rp${Math.abs(netProfitPerUnit).toLocaleString('id-ID')}.`
      : `Peringatan Defisit Margin: Harga jual (Rp${sellingPrice.toLocaleString('id-ID')}) tidak menutup total biaya modal pokok (Rp${costPerUnit.toLocaleString('id-ID')}) dan biaya transaksi (Rp${additionalCostPerTx.toLocaleString('id-ID')}). Setiap unit yang terjual menghasilkan rugi bersih Rp${Math.abs(netProfitPerUnit).toLocaleString('id-ID')}.`;
    
    if (isEn) {
      recommendedAlternatives.push(
        `Raise selling price to at least Rp${(costPerUnit + additionalCostPerTx + 2000).toLocaleString('id-ID')} to yield a positive net profit.`,
        `Negotiate unit cost with suppliers to reduce it below Rp${(sellingPrice - additionalCostPerTx).toLocaleString('id-ID')}.`,
        `Reduce or eliminate per-unit transaction fees (e.g. use budget packaging or customer pickup).`
      );
    } else {
      recommendedAlternatives.push(
        `Naikkan harga jual minimal menjadi Rp${(costPerUnit + additionalCostPerTx + 2000).toLocaleString('id-ID')} agar menghasilkan laba bersih.`,
        `Negosiasikan harga pokok barang dengan pemasok agar modal per unit turun di bawah Rp${(sellingPrice - additionalCostPerTx).toLocaleString('id-ID')}.`,
        `Tekan atau hilangkan biaya transaksi per unit (misal gunakan kemasan hemat atau sistem ambil di tempat).`
      );
    }
  } else {
    totalUnitsNeeded = Math.ceil(targetAmount / netProfitPerUnit);
    dailyTargetUnits = Math.ceil(totalUnitsNeeded / daysAvailable);
    projectedRevenue = totalUnitsNeeded * sellingPrice;
    projectedGrossProfit = totalUnitsNeeded * grossProfitPerUnit;
    projectedNetProfit = totalUnitsNeeded * netProfitPerUnit;
    projectedCapitalRequired = totalUnitsNeeded * costPerUnit;
    projectedTransactionCosts = totalUnitsNeeded * additionalCostPerTx;

    if (dailyTargetUnits > 35) {
      isFeasible = false;
      feasibilityIssue = 'high_daily_volume';
      feasibilityExplanation = isEn
        ? `Target Too Heavy: Selling ${dailyTargetUnits} units per day (${totalUnitsNeeded} units in ${daysAvailable} days) is very challenging for a home business without an active sales team.`
        : `Target Terlalu Berat: Menjual ${dailyTargetUnits} unit per hari (${totalUnitsNeeded} unit dalam ${daysAvailable} hari) sangat menantang untuk usaha rumahan tanpa tim penjualan aktif.`;
      
      if (isEn) {
        recommendedAlternatives.push(
          `Extend target duration to ${Math.ceil(totalUnitsNeeded / 10)} days so the daily target drops to a realistic level (~10 units/day).`,
          `Use wholesale or bundling offers (packs of 3 or 5) to increase sales value per customer.`,
          `Offer complementary products with higher net profit margins (at least Rp${Math.round(targetAmount / (10 * daysAvailable)).toLocaleString('id-ID')}/unit).`,
          `Combine with dropship grocery or service opportunities to avoid upfront inventory capital of Rp${projectedCapitalRequired.toLocaleString('id-ID')}.`
        );
      } else {
        recommendedAlternatives.push(
          `Perpanjang durasi target menjadi ${Math.ceil(totalUnitsNeeded / 10)} hari agar target harian turun ke angka realistis (~10 unit/hari).`,
          `Gunakan strategi penawaran paket grosir/bundling (isi 3 atau 5) untuk menaikkan nilai penjualan per pembeli.`,
          `Tawarkan produk komplementer dengan margin keuntungan bersih lebih tinggi (minimal Rp${Math.round(targetAmount / (10 * daysAvailable)).toLocaleString('id-ID')}/unit).`,
          `Kombinasikan dengan peluang kemitraan dropship sembako atau jasa agar tidak memerlukan modal stok awal sebesar Rp${projectedCapitalRequired.toLocaleString('id-ID')}.`
        );
      }
    } else {
      isFeasible = true;
      feasibilityExplanation = isEn
        ? `Realistic Target: Selling an average of ${dailyTargetUnits} units per day for ${daysAvailable} days is achievable via WhatsApp contacts and local customers.`
        : `Target Realistis: Menjual rata-rata ${dailyTargetUnits} unit per hari selama ${daysAvailable} hari dapat dicapai dengan pemasaran ke jejaring kontak WhatsApp dan pelanggan sekitar.`;
    }
  }

  return {
    targetAmount,
    daysAvailable,
    sellingPrice,
    costPerUnit,
    additionalCostPerTx,
    grossProfitPerUnit,
    netProfitPerUnit,
    profitMarginPercent,
    totalUnitsNeeded,
    dailyTargetUnits,
    dailyNetProfitTarget,
    projectedRevenue,
    projectedGrossProfit,
    projectedNetProfit,
    projectedCapitalRequired,
    projectedTransactionCosts,
    isFeasible,
    feasibilityIssue,
    feasibilityExplanation,
    recommendedAlternatives,
    assumptions,
  };
}

