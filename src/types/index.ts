export type SaleStatus = 'posted' | 'cancelled' | 'void' | 'returned';

export interface SaleRecord {
  id: string;
  date: string;
  invoice_id: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  unit_cost: number | null;
  status: SaleStatus;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export interface InventoryRecord {
  id: string;
  product_name: string;
  current_stock: number;
  reorder_level: number;
}

export type InvoiceStatus = 'open' | 'paid' | 'void';

export interface InvoiceRecord {
  id: string;
  invoice_id: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  invoice_amount: number;
  amount_paid: number;
  status: InvoiceStatus;
}

export interface AppDataset {
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  inventory: InventoryRecord[];
  invoices: InvoiceRecord[];
  isDemo: boolean;
}

export interface AppSettings {
  businessName: string;
  currency: 'INR';
  slowMovingDays: number;
  leadTimeDays: number;
}

export type DateRangePreset =
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'previous_month'
  | 'all_data';

export type InsightSeverity = 'Urgent' | 'Review' | 'Info';

export interface BusinessInsight {
  id: string;
  title: string;
  severity: InsightSeverity;
  evidence: string;
  explanation: string;
  factVsHypothesis: string;
  nextAction: string;
}

export interface ProductPerformance {
  product_name: string;
  quantitySold: number;
  netSales: number;
  cogs: number | null;
  grossProfit: number | null;
  grossMargin: number | null;
  hasMissingCost: boolean;
}

export interface EnrichedInventoryItem extends InventoryRecord {
  recentSalesQty: number;
  lastSaleDate: string | null;
  daysSinceLastSale: number | null;
  isLowStock: boolean;
  isSlowMoving: boolean;
  suggestedReorderQty: number | null;
}

export interface EnrichedInvoice extends InvoiceRecord {
  outstandingAmount: number;
  daysOverdue: number;
  isOverdue: boolean;
  isInvalid: boolean;
  validationIssue: string | null;
}

export interface PeriodSummary {
  startDate: string;
  endDate: string;
  label: string;
  netSales: number;
  cogs: number | null;
  grossProfit: number | null;
  grossMargin: number | null;
  hasMissingCost: boolean;
  totalExpenses: number;
  estimatedOperatingProfit: number | null;
  outstandingReceivables: number;
  overdueReceivables: number;
}

export interface ValidationRowError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ImportParseResult<T> {
  validRows: T[];
  errors: ValidationRowError[];
  missingHeaders: string[];
  warnings: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  periodLabel?: string;
  formulaNote?: string;
  timestamp: string;
}