export type TransactionType = 'income' | 'expense';

export type IncomeCategory = 
  | 'Gaji' 
  | 'Usaha' 
  | 'Freelance' 
  | 'Bonus' 
  | 'Komisi' 
  | 'Lainnya';

export type ExpenseCategory = 
  | 'Makanan' 
  | 'Rumah tangga' 
  | 'Listrik' 
  | 'Air' 
  | 'Pendidikan' 
  | 'Transportasi' 
  | 'Kesehatan' 
  | 'Tagihan' 
  | 'Belanja' 
  | 'Hiburan' 
  | 'Lainnya';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  isDemo?: boolean;
}

export interface OpeningBalanceConfig {
  amount: number;
  effectiveDate: string; // YYYY-MM-DD
  note?: string;
}

export interface ConfirmedUpcomingIncome {
  id: string;
  title: string;
  amount: number;
  expectedDate: string; // YYYY-MM-DD
  category: IncomeCategory | string;
  isReceived?: boolean;
}

export interface UpcomingMandatoryExpense {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  category: ExpenseCategory;
  isPaid?: boolean;
}

export interface UserBusiness {
  name: string;
  product: string;
  unitPrice: number;
  netProfitPerUnit: number;
  currentMonthlySales: number;
}

export interface AvailableResources {
  hasVehicle: boolean;
  vehicleType: string;
  hasSmartphoneInternet: boolean;
  freeTimeHoursPerDay: number;
  socialMediaAudience: string;
  hasCustomerNetwork: boolean;
  availableSmallCapital: number;
  existingEquipment: string[];
}

export interface UserProfile {
  name: string;
  householdSize: number;
  incomeSources: string[];
  skills: string[];
  business: UserBusiness;
  availableResources: AvailableResources;
}

export interface MonthlyPlan {
  month: string;
  startingBalance: number;
  expectedIncome: number;
  mandatoryExpenses: number;
  flexibleBudget: number;
  savingsTarget: number;
  deficitTarget: number;
}

export interface OpportunityActionItem {
  day: string;
  task: string;
  completed?: boolean;
}

export interface IncomeOpportunity {
  id: string;
  title: string;
  category: 'existing_business' | 'service' | 'commission_affiliate' | 'product_sales';
  description: string;
  requiredResources: string[];
  estimatedPotential: number;
  assumptions: string;
  salesCalculation?: {
    productOrService: string;
    price: number;
    netProfitPerUnit: number;
    unitsNeeded: number;
    dailyTargetUnits: number;
  };
  actionPlan: OpportunityActionItem[];
  status: 'active' | 'saved' | 'completed';
}

export interface DeficitPlan {
  targetAmount: number;
  planA_additionalIncome: {
    title: string;
    amount: number;
    assumptions: string;
    concreteSteps: string[];
  };
  planB_expenseReduction: {
    title: string;
    amount: number;
    targetCategories: string[];
    concreteSteps: string[];
  };
  planC_businessOptimization: {
    title: string;
    amount: number;
    assumptions: string;
    concreteSteps: string[];
  };
  totalImprovement: number;
  summary: string;
  assumptionsDisclaimer: string;
}

export interface CashflowAnalysis {
  status: 'AMAN' | 'PERLU_WASPADA' | 'KRITIS';
  summary: string;
  keyObservations: string[];
  topSpendingCategories: {
    category: string;
    amount: number;
    percentage: number;
    note: string;
  }[];
  immediateActions: string[];
  safeDailyExplanation: string;
}

export type Language = 'id' | 'en';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface ReceiptScanResult {
  type: TransactionType;
  amount: number;
  merchantOrItem: string;
  description: string;
  date: string;
  category: string;
  detectedType: 'receipt' | 'ewallet_screenshot' | 'invoice' | 'other';
  confidence: number;
  note?: string;
  items?: { name: string; price: number }[];
}

export interface CukupAiExportData {
  version: number;
  exportedAt: string;
  profile: UserProfile;
  transactions: Transaction[];
  upcomingExpenses: UpcomingMandatoryExpense[];
  opportunities: IncomeOpportunity[];
  openingBalance?: OpeningBalanceConfig;
  confirmedIncomes?: ConfirmedUpcomingIncome[];
  isDemoActive: boolean;
  language?: Language;
}

export interface BansosVerifiedOffice {
  id: string;
  province: string;
  cityOrRegency: string;
  officeName: string;
  address: string;
  phone: string;
  email?: string;
  websiteUrl: string;
  sourceUrl: string;
  lastVerifiedDate: string;
  isVerified: boolean;
  notes?: string;
}

export interface BansosSourceReference {
  title: string;
  url: string;
  domain: string;
}

export interface BansosProgram {
  id: string;
  code: string;
  name: string;
  agency: string;
  purpose: string;
  targetGroup: string;
  officialProcedure: string;
  sourceUrl: string;
  lastCheckedDate: string;
  category: 'keluarga' | 'pangan' | 'kesehatan' | 'desa' | 'khusus';
}

export interface BansosSearchResponse {
  answer: string;
  sources: BansosSourceReference[];
  disclaimer: string;
  warning: string;
  timestamp: string;
}

export interface SalesTargetCalculationInput {
  targetAmount: number;
  daysAvailable: number;
  sellingPrice: number;
  costPerUnit: number;
  additionalCostPerTx: number;
  lang?: Language;
}

export interface SalesTargetCalculationResult {
  targetAmount: number;
  daysAvailable: number;
  sellingPrice: number;
  costPerUnit: number;
  additionalCostPerTx: number;
  grossProfitPerUnit: number;
  netProfitPerUnit: number;
  profitMarginPercent: number;
  totalUnitsNeeded: number;
  dailyTargetUnits: number;
  dailyNetProfitTarget: number;
  projectedRevenue: number;
  projectedGrossProfit: number;
  projectedNetProfit: number;
  projectedCapitalRequired: number;
  projectedTransactionCosts: number;
  isFeasible: boolean;
  feasibilityIssue?: 'margin_deficit' | 'high_daily_volume' | 'zero_target';
  feasibilityExplanation: string;
  recommendedAlternatives: string[];
  assumptions: string[];
}

export interface PartnerOpportunityLead {
  opportunityId: 'reseller_sembako' | 'keagenan_ppob';
  opportunityTitle: string;
  userName: string;
  whatsappContact: string;
  notes?: string;
  registeredAt: string;
}



