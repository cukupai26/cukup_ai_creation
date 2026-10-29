import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateCashflowMetrics, 
  isFixedExpense, 
  formatIDR,
  calculateSalesTargetPlan
} from '../src/utils/calculations';
import { 
  Transaction, 
  UpcomingMandatoryExpense, 
  OpeningBalanceConfig, 
  ConfirmedUpcomingIncome,
  SalesTargetCalculationInput
} from '../src/types';

test('1. Opening balance with no transactions', () => {
  const openingBalance: OpeningBalanceConfig = {
    amount: 1000000,
    effectiveDate: '2026-10-01',
  };
  const transactions: Transaction[] = [];
  const upcomingExpenses: UpcomingMandatoryExpense[] = [];

  const metrics = calculateCashflowMetrics(
    transactions,
    upcomingExpenses,
    openingBalance,
    { asOfDate: '2026-10-15', reportingPeriod: '2026-10' }
  );

  // In October (31 days), on Oct 15: remainingDays = 31 - 15 = 16
  assert.equal(metrics.currentBalance, 1000000, 'Current balance should equal opening balance');
  assert.equal(metrics.flexibleFunds, 1000000, 'Flexible funds should equal current balance when no bills');
  assert.equal(metrics.remainingDays, 16, 'Remaining days on Oct 15 in October should be 16');
  assert.equal(metrics.safeDailySpending, Math.floor(1000000 / 16), 'Safe daily should divide evenly');
  assert.equal(metrics.status, 'AMAN', 'Status should be AMAN');
  assert.equal(metrics.periodIncome, 0);
  assert.equal(metrics.periodExpenses, 0);
});

test('2. Negative balance caused by a real recorded deficit', () => {
  const openingBalance: OpeningBalanceConfig = {
    amount: 500000,
    effectiveDate: '2026-10-01',
  };
  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      type: 'expense',
      amount: 700000,
      category: 'Makanan',
      description: 'Belanja sembako & kebutuhan pokok',
      date: '2026-10-05',
    },
  ];
  const upcomingExpenses: UpcomingMandatoryExpense[] = [];

  const metrics = calculateCashflowMetrics(
    transactions,
    upcomingExpenses,
    openingBalance,
    { asOfDate: '2026-10-10', reportingPeriod: '2026-10' }
  );

  assert.equal(metrics.currentBalance, -200000, 'Current balance must accurately reflect -Rp200.000');
  assert.equal(metrics.flexibleFunds, -200000, 'Flexible funds must be negative');
  assert.equal(metrics.safeDailySpending, 0, 'Safe daily spending must be 0 when in deficit');
  assert.equal(metrics.status, 'KRITIS', 'Deficit must trigger KRITIS status');
  assert.ok(metrics.projectedDeficit >= 200000, 'Projected deficit must be at least Rp200.000');
});

test('3. Large rent payment already paid', () => {
  const openingBalance: OpeningBalanceConfig = {
    amount: 2000000,
    effectiveDate: '2026-10-01',
  };
  const transactions: Transaction[] = [
    {
      id: 'tx-rent',
      type: 'expense',
      amount: 1200000,
      category: 'Rumah tangga',
      description: 'Sewa kontrakan bulanan',
      date: '2026-10-02',
    },
    {
      id: 'tx-food',
      type: 'expense',
      amount: 100000,
      category: 'Makanan',
      description: 'Makan siang & malam',
      date: '2026-10-05',
    },
  ];

  const upcomingExpenses: UpcomingMandatoryExpense[] = [
    {
      id: 'up-rent',
      title: 'Sewa kontrakan bulanan',
      amount: 1200000,
      dueDate: '2026-10-02',
      category: 'Rumah tangga' as any,
      isPaid: true,
    },
  ];

  const metrics = calculateCashflowMetrics(
    transactions,
    upcomingExpenses,
    openingBalance,
    { asOfDate: '2026-10-10', reportingPeriod: '2026-10' }
  );

  // Rent was paid: Current balance = 2,000,000 - 1,200,000 - 100,000 = 700,000
  assert.equal(metrics.currentBalance, 700000);
  assert.equal(metrics.unpaidMandatoryUpcomingExpenses, 0, 'No unpaid bills remain');
  assert.equal(metrics.paidMandatoryUpcomingExpenses, 1200000, 'Paid bills tracked accurately');
  // Flexible funds should NOT subtract rent again:
  assert.equal(metrics.flexibleFunds, 700000, 'Flexible funds must NOT subtract already-paid rent');
  
  // Separation of fixed vs variable spending:
  assert.equal(metrics.periodFixedExpenses, 1200000, 'Rent recognized as fixed periodic expense');
  assert.equal(metrics.periodVariableExpenses, 100000, 'Food recognized as variable expense');
  
  // Daily variable rate must NOT include the Rp1.200.000 rent!
  // daysPassed = 10 -> daily variable spending = 100,000 / 10 = 10,000 (NOT 1,300,000 / 10 = 130,000)
  assert.equal(metrics.dailyVariableSpending, 10000, 'Daily variable spending excludes fixed one-time rent');
});

test('4. An unpaid rent bill due before payday', () => {
  const openingBalance: OpeningBalanceConfig = {
    amount: 1500000,
    effectiveDate: '2026-10-01',
  };
  const transactions: Transaction[] = [];
  const upcomingExpenses: UpcomingMandatoryExpense[] = [
    {
      id: 'up-rent-unpaid',
      title: 'Sewa Kontrakan',
      amount: 1200000,
      dueDate: '2026-10-15',
      category: 'Rumah tangga' as any,
      isPaid: false,
    },
  ];

  const metrics = calculateCashflowMetrics(
    transactions,
    upcomingExpenses,
    openingBalance,
    { asOfDate: '2026-10-05', customDaysRemaining: 15, reportingPeriod: '2026-10' }
  );

  assert.equal(metrics.currentBalance, 1500000);
  assert.equal(metrics.unpaidMandatoryUpcomingExpenses, 1200000);
  // Flexible funds must hold back the Rp1.200.000 for rent:
  assert.equal(metrics.flexibleFunds, 300000, 'Flexible cash is protected: 1.5m - 1.2m = 300k');
  assert.equal(metrics.safeDailySpending, Math.floor(300000 / 15), 'Safe daily is based on flexible cash: 300k / 15 = 20k');
  assert.equal(metrics.safeDailySpending, 20000);
});

test('5. Confirmed salary arriving before a bill', () => {
  const openingBalance: OpeningBalanceConfig = {
    amount: 500000,
    effectiveDate: '2026-10-01',
  };
  const confirmedIncomes: ConfirmedUpcomingIncome[] = [
    {
      id: 'inc-salary',
      title: 'Gaji Pokok',
      amount: 4000000,
      expectedDate: '2026-10-25',
      category: 'Gaji',
      isReceived: false,
    },
  ];
  const upcomingExpenses: UpcomingMandatoryExpense[] = [
    {
      id: 'up-tuition',
      title: 'SPP Kampus',
      amount: 1000000,
      dueDate: '2026-10-26',
      category: 'Pendidikan',
      isPaid: false,
    },
  ];

  const metrics = calculateCashflowMetrics(
    [],
    upcomingExpenses,
    openingBalance,
    {
      asOfDate: '2026-10-10',
      customDaysRemaining: 20,
      confirmedIncomes,
      reportingPeriod: '2026-10',
    }
  );

  assert.equal(metrics.currentBalance, 500000);
  assert.equal(metrics.confirmedUpcomingIncome, 4000000);
  assert.equal(metrics.unpaidMandatoryUpcomingExpenses, 1000000);
  // Flexible funds = 500k + 4m - 1m = 3.5m
  assert.equal(metrics.flexibleFunds, 3500000, 'Flexible funds includes confirmed incoming salary');
  assert.equal(metrics.safeDailySpending, Math.floor(3500000 / 20));
  assert.equal(metrics.status, 'AMAN');
});

test('6. Transactions from previous months', () => {
  const openingBalance: OpeningBalanceConfig = {
    amount: 1000000,
    effectiveDate: '2026-10-01',
  };
  const transactions: Transaction[] = [
    // Previous month (September)
    {
      id: 'tx-sep-1',
      type: 'expense',
      amount: 5000000,
      category: 'Rumah tangga',
      description: 'Pengeluaran besar bulan September',
      date: '2026-09-25',
    },
    // Current month (October)
    {
      id: 'tx-oct-1',
      type: 'income',
      amount: 3000000,
      category: 'Gaji',
      description: 'Gaji Oktober',
      date: '2026-10-01',
    },
    {
      id: 'tx-oct-2',
      type: 'expense',
      amount: 500000,
      category: 'Makanan',
      description: 'Belanja mingguan Oktober',
      date: '2026-10-03',
    },
  ];

  const metrics = calculateCashflowMetrics(
    transactions,
    [],
    openingBalance,
    { asOfDate: '2026-10-10', reportingPeriod: '2026-10' }
  );

  // Reporting period metrics must be isolated strictly to October
  assert.equal(metrics.periodIncome, 3000000, 'Period income must only include October');
  assert.equal(metrics.periodExpenses, 500000, 'Period expenses must exclude September Rp5.000.000');
  assert.equal(metrics.periodVariableExpenses, 500000);

  // Balance starting from Oct 1 snapshot:
  // 1,000,000 + 3,000,000 - 500,000 = 3,500,000
  // (September expense prior to Oct 1 is not subtracted again from Oct 1 opening balance)
  assert.equal(metrics.currentBalance, 3500000, 'Current balance starts from effectiveDate snapshot');
});

test('7. Zero income and irregular income', () => {
  const openingBalance: OpeningBalanceConfig = {
    amount: 600000,
    effectiveDate: '2026-10-01',
  };
  const transactions: Transaction[] = [
    {
      id: 'tx-var-1',
      type: 'expense',
      amount: 150000,
      category: 'Makanan',
      description: 'Makan sehari-hari',
      date: '2026-10-04',
    },
  ];

  const metrics = calculateCashflowMetrics(
    transactions,
    [],
    openingBalance,
    { asOfDate: '2026-10-10', customDaysRemaining: 10, reportingPeriod: '2026-10' }
  );

  assert.equal(metrics.periodIncome, 0, 'Handles zero income cleanly');
  assert.equal(metrics.currentBalance, 450000);
  assert.equal(metrics.flexibleFunds, 450000);
  assert.equal(metrics.safeDailySpending, 45000, '450,000 / 10 = 45,000/day');
  assert.ok(!Number.isNaN(metrics.safeDailySpending));
  assert.ok(!Number.isNaN(metrics.projectedEndOfMonthBalance));
});

test('8. No upcoming bills', () => {
  const openingBalance: OpeningBalanceConfig = {
    amount: 1000000,
    effectiveDate: '2026-10-01',
  };
  const emptyBills: UpcomingMandatoryExpense[] = [];

  const metrics = calculateCashflowMetrics(
    [],
    emptyBills,
    openingBalance,
    { asOfDate: '2026-10-10', customDaysRemaining: 10, reportingPeriod: '2026-10' }
  );

  assert.equal(metrics.unpaidMandatoryUpcomingExpenses, 0);
  assert.equal(metrics.paidMandatoryUpcomingExpenses, 0);
  assert.equal(metrics.flexibleFunds, 1000000);
  assert.equal(metrics.safeDailySpending, 100000);
  assert.equal(metrics.status, 'AMAN');
});

test('9. The last day of a month', () => {
  const openingBalance: OpeningBalanceConfig = {
    amount: 250000,
    effectiveDate: '2026-10-01',
  };

  const metrics = calculateCashflowMetrics(
    [],
    [],
    openingBalance,
    { asOfDate: '2026-10-31', reportingPeriod: '2026-10' }
  );

  assert.equal(metrics.remainingDays, 1, 'On the 31st of Oct, remaining days is 1');
  assert.equal(metrics.daysPassed, 31, 'Days passed is 31');
  assert.equal(metrics.currentBalance, 250000);
  assert.equal(metrics.safeDailySpending, 250000, 'On last day, safeDaily equals all remaining flexible cash');
  assert.ok(!Number.isNaN(metrics.safeDailySpending));
});

test('10. Prevention of double-counted expenses', () => {
  const openingBalance: OpeningBalanceConfig = {
    amount: 1000000,
    effectiveDate: '2026-10-01',
  };
  const transactions: Transaction[] = [
    {
      id: 'tx-pln-paid',
      type: 'expense',
      amount: 500000,
      category: 'Listrik',
      description: 'Tagihan Listrik PLN Pasca',
      date: '2026-10-05',
    },
  ];
  const upcomingExpenses: UpcomingMandatoryExpense[] = [
    {
      id: 'up-pln',
      title: 'Tagihan Listrik PLN Pasca',
      amount: 500000,
      dueDate: '2026-10-05',
      category: 'Listrik',
      isPaid: true, // Marked paid!
    },
  ];

  const metrics = calculateCashflowMetrics(
    transactions,
    upcomingExpenses,
    openingBalance,
    { asOfDate: '2026-10-10', customDaysRemaining: 10, reportingPeriod: '2026-10' }
  );

  // 1. Transaction already reduced currentBalance: 1,000,000 - 500,000 = 500,000
  assert.equal(metrics.currentBalance, 500000);

  // 2. Since upcomingExpense isPaid is true, unpaidMandatoryUpcomingExpenses MUST be 0
  assert.equal(metrics.unpaidMandatoryUpcomingExpenses, 0);
  assert.equal(metrics.paidMandatoryUpcomingExpenses, 500000);

  // 3. Flexible funds must NOT subtract the 500,000 a second time!
  // If it double-counted, flexibleFunds would erroneously be 0.
  // With fix, flexibleFunds remains 500,000:
  assert.equal(metrics.flexibleFunds, 500000, 'Paid bill is NOT subtracted twice');
  assert.equal(metrics.safeDailySpending, 50000, '500,000 / 10 = 50,000/day');
});

test('11. Sales Target Plan: Standard realistic scenario with fee deduction', () => {
  const input: SalesTargetCalculationInput = {
    targetAmount: 500000,        // Target net profit Rp500.000
    daysAvailable: 10,           // 10 days
    sellingPrice: 35000,         // Selling price Rp35.000/unit
    costPerUnit: 20000,          // Modal / HPP Rp20.000/unit
    additionalCostPerTx: 2000,   // Biaya admin / kemasan Rp2.000/unit
  };

  const result = calculateSalesTargetPlan(input);

  // Gross profit = 35,000 - 20,000 = 15,000
  assert.equal(result.grossProfitPerUnit, 15000, 'Gross profit per unit should be 15,000');
  // Net profit per unit = 15,000 - 2,000 = 13,000
  assert.equal(result.netProfitPerUnit, 13000, 'Net profit per unit should be 13,000');
  // Daily net profit target = 500,000 / 10 = 50,000
  assert.equal(result.dailyNetProfitTarget, 50000, 'Daily net target is 50,000');
  // Total units needed = ceil(500,000 / 13,000) = ceil(38.46) = 39 units
  assert.equal(result.totalUnitsNeeded, 39, 'Total units needed should be 39');
  // Daily target units = ceil(39 / 10) = 4 units/day
  assert.equal(result.dailyTargetUnits, 4, 'Daily target should be 4 units/day');
  // Total projected revenue (omzet) = 39 * 35,000 = 1,365,000
  assert.equal(result.projectedRevenue, 1365000, 'Omzet matches 39 * 35,000');
  // Total gross profit = 39 * 15,000 = 585,000
  assert.equal(result.projectedGrossProfit, 585000);
  // Total net profit = 39 * 13,000 = 507,000 (>= 500,000 target)
  assert.equal(result.projectedNetProfit, 507000);
  assert.ok(result.projectedNetProfit >= input.targetAmount);

  // Feasibility
  assert.equal(result.isFeasible, true);
  assert.equal(result.feasibilityIssue, undefined);
  assert.match(result.feasibilityExplanation, /Target Realistis/);
});

test('12. Sales Target Plan: Margin deficit when costs exceed selling price', () => {
  const deficitInput: SalesTargetCalculationInput = {
    targetAmount: 300000,
    daysAvailable: 7,
    sellingPrice: 20000,
    costPerUnit: 19000,
    additionalCostPerTx: 3000, // Total cost 22,000 > price 20,000 -> net profit -2,000
  };

  const result = calculateSalesTargetPlan(deficitInput);

  assert.equal(result.grossProfitPerUnit, 1000);
  assert.equal(result.netProfitPerUnit, -2000, 'Net profit per unit must be negative');
  assert.equal(result.totalUnitsNeeded, 0, 'Cannot achieve target with negative margin');
  assert.equal(result.dailyTargetUnits, 0);
  assert.equal(result.isFeasible, false);
  assert.equal(result.feasibilityIssue, 'margin_deficit');
  assert.ok(result.feasibilityExplanation.includes('Defisit Margin'), 'Must clearly warn about margin deficit');
  assert.ok(result.recommendedAlternatives.length > 0, 'Must provide price/cost recommendations');
});

test('13. Sales Target Plan: High daily volume feasibility warning (>35 units/day)', () => {
  const highVolumeInput: SalesTargetCalculationInput = {
    targetAmount: 2000000, // Rp2.000.000
    daysAvailable: 5,       // In only 5 days
    sellingPrice: 15000,
    costPerUnit: 12000,
    additionalCostPerTx: 1000, // Net profit = 2,000/unit
  };

  const result = calculateSalesTargetPlan(highVolumeInput);

  // Units needed = ceil(2,000,000 / 2,000) = 1,000 units
  // Daily units = ceil(1,000 / 5) = 200 units/day -> high volume warning!
  assert.equal(result.totalUnitsNeeded, 1000);
  assert.equal(result.dailyTargetUnits, 200);
  assert.equal(result.isFeasible, false);
  assert.equal(result.feasibilityIssue, 'high_daily_volume');
  assert.ok(result.feasibilityExplanation.includes('Target Terlalu Berat'), 'Must warn about volume risk');
  assert.ok(result.recommendedAlternatives.some(r => r.includes('Perpanjang durasi') || r.includes('bundling')), 'Must advise bundling or time extension');
});

test('14. Sales Target Plan: Edge cases & zero division protection', () => {
  // Edge case: daysAvailable is 0 or negative
  const zeroDaysResult = calculateSalesTargetPlan({
    targetAmount: 100000,
    daysAvailable: 0,
    sellingPrice: 10000,
    costPerUnit: 5000,
    additionalCostPerTx: 0,
  });
  assert.equal(zeroDaysResult.daysAvailable, 1, 'Days available must clamp to at least 1 day');
  assert.ok(!Number.isNaN(zeroDaysResult.dailyTargetUnits));
  assert.ok(!Number.isNaN(zeroDaysResult.dailyNetProfitTarget));

  // Edge case: targetAmount is 0
  const zeroTargetResult = calculateSalesTargetPlan({
    targetAmount: 0,
    daysAvailable: 7,
    sellingPrice: 10000,
    costPerUnit: 5000,
    additionalCostPerTx: 0,
  });
  assert.equal(zeroTargetResult.totalUnitsNeeded, 0);
  assert.equal(zeroTargetResult.dailyTargetUnits, 0);
  assert.equal(zeroTargetResult.isFeasible, true);

  // Edge case: net profit is exactly 0
  const zeroMarginResult = calculateSalesTargetPlan({
    targetAmount: 50000,
    daysAvailable: 5,
    sellingPrice: 10000,
    costPerUnit: 8000,
    additionalCostPerTx: 2000, // net profit 0
  });
  assert.equal(zeroMarginResult.netProfitPerUnit, 0);
  assert.equal(zeroMarginResult.isFeasible, false);
  assert.equal(zeroMarginResult.feasibilityIssue, 'margin_deficit');
});


