import {
  AppDataset,
  DateRangePreset,
  EnrichedInventoryItem,
  EnrichedInvoice,
  PeriodSummary,
  ProductPerformance,
  SaleRecord,
  ExpenseRecord,
  InvoiceRecord,
  BusinessInsight
} from '../types';

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Unavailable';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(roundCurrency(value));
}

export function formatIndianDate(isoDate: string | null): string {
  if (!isoDate) return 'No recorded sale';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveDateRange(
  preset: DateRangePreset,
  dataset: AppDataset,
  referenceDate: Date = new Date()
): { startDate: string; endDate: string; label: string; daySpan: number } {
  const todayISO = toISODate(referenceDate);

  if (preset === 'last_7_days') {
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - 6);
    return {
      startDate: toISODate(start),
      endDate: todayISO,
      label: `Last 7 Days (${formatIndianDate(toISODate(start))} – ${formatIndianDate(todayISO)})`,
      daySpan: 7
    };
  }

  if (preset === 'last_30_days') {
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - 29);
    return {
      startDate: toISODate(start),
      endDate: todayISO,
      label: `Last 30 Days (${formatIndianDate(toISODate(start))} – ${formatIndianDate(todayISO)})`,
      daySpan: 30
    };
  }

  if (preset === 'this_month') {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const span = Math.max(1, Math.floor((referenceDate.getTime() - start.getTime()) / 86400000) + 1);
    return {
      startDate: toISODate(start),
      endDate: todayISO,
      label: `This Month (${formatIndianDate(toISODate(start))} – ${formatIndianDate(todayISO)})`,
      daySpan: span
    };
  }

  if (preset === 'previous_month') {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0);
    const span = end.getDate();
    return {
      startDate: toISODate(start),
      endDate: toISODate(end),
      label: `Previous Month (${formatIndianDate(toISODate(start))} – ${formatIndianDate(toISODate(end))})`,
      daySpan: span
    };
  }

  const allDates = [
    ...dataset.sales.map((s) => s.date),
    ...dataset.expenses.map((e) => e.date)
  ].filter(Boolean).sort();

  const earliest = allDates.length > 0 ? allDates[0] : todayISO;
  const latest = allDates.length > 0 ? allDates[allDates.length - 1] : todayISO;
  const startMs = new Date(earliest).getTime();
  const endMs = new Date(latest).getTime();
  const span = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);

  return {
    startDate: earliest,
    endDate: latest,
    label: `All Available Data (${formatIndianDate(earliest)} – ${formatIndianDate(latest)})`,
    daySpan: span
  };
}

export function filterValidSalesInPeriod(
  sales: SaleRecord[],
  startDate: string,
  endDate: string
): SaleRecord[] {
  return sales.filter(
    (s) =>
      s.status === 'posted' &&
      s.date >= startDate &&
      s.date <= endDate
  );
}

export function filterExpensesInPeriod(
  expenses: ExpenseRecord[],
  startDate: string,
  endDate: string
): ExpenseRecord[] {
  return expenses.filter((e) => e.date >= startDate && e.date <= endDate);
}

export function calculatePeriodSummary(
  dataset: AppDataset,
  startDate: string,
  endDate: string,
  label: string,
  referenceDate: Date = new Date()
): PeriodSummary {
  const validSales = filterValidSalesInPeriod(dataset.sales, startDate, endDate);
  const periodExpenses = filterExpensesInPeriod(dataset.expenses, startDate, endDate);

  let netSales = 0;
  let cogsAccumulator = 0;
  let hasMissingCost = false;

  for (const row of validSales) {
    const lineNet = row.quantity * row.unit_price - row.discount_amount;
    netSales += lineNet;
    if (row.unit_cost === null || row.unit_cost === undefined || Number.isNaN(row.unit_cost)) {
      hasMissingCost = true;
    } else {
      cogsAccumulator += row.quantity * row.unit_cost;
    }
  }

  netSales = roundCurrency(netSales);
  const cogs = hasMissingCost ? null : roundCurrency(cogsAccumulator);
  const grossProfit = cogs === null ? null : roundCurrency(netSales - cogs);
  const grossMargin =
    grossProfit !== null && netSales > 0
      ? roundCurrency((grossProfit / netSales) * 100)
      : null;

  const totalExpenses = roundCurrency(
    periodExpenses.reduce((acc, item) => acc + item.amount, 0)
  );

  const estimatedOperatingProfit =
    grossProfit !== null ? roundCurrency(grossProfit - totalExpenses) : null;

  const enrichedInvoices = analyzeInvoices(dataset.invoices, referenceDate);
  const outstandingReceivables = roundCurrency(
    enrichedInvoices
      .filter((inv) => inv.status !== 'void' && inv.outstandingAmount > 0)
      .reduce((acc, inv) => acc + inv.outstandingAmount, 0)
  );
  const overdueReceivables = roundCurrency(
    enrichedInvoices
      .filter((inv) => inv.isOverdue)
      .reduce((acc, inv) => acc + inv.outstandingAmount, 0)
  );

  return {
    startDate,
    endDate,
    label,
    netSales,
    cogs,
    grossProfit,
    grossMargin,
    hasMissingCost,
    totalExpenses,
    estimatedOperatingProfit,
    outstandingReceivables,
    overdueReceivables
  };
}

export function calculateProductPerformance(
  sales: SaleRecord[],
  startDate: string,
  endDate: string
): ProductPerformance[] {
  const validSales = filterValidSalesInPeriod(sales, startDate, endDate);
  const map = new Map<
    string,
    {
      product_name: string;
      quantitySold: number;
      netSales: number;
      cogs: number;
      hasMissingCost: boolean;
    }
  >();

  for (const row of validSales) {
    const key = row.product_name.trim().toLowerCase();
    const existing = map.get(key) || {
      product_name: row.product_name.trim(),
      quantitySold: 0,
      netSales: 0,
      cogs: 0,
      hasMissingCost: false
    };

    existing.quantitySold += row.quantity;
    existing.netSales += row.quantity * row.unit_price - row.discount_amount;

    if (row.unit_cost === null || row.unit_cost === undefined) {
      existing.hasMissingCost = true;
    } else {
      existing.cogs += row.quantity * row.unit_cost;
    }

    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((item) => {
      const netSales = roundCurrency(item.netSales);
      const cogs = item.hasMissingCost ? null : roundCurrency(item.cogs);
      const grossProfit = cogs !== null ? roundCurrency(netSales - cogs) : null;
      const grossMargin =
        grossProfit !== null && netSales > 0
          ? roundCurrency((grossProfit / netSales) * 100)
          : null;

      return {
        product_name: item.product_name,
        quantitySold: item.quantitySold,
        netSales,
        cogs,
        grossProfit,
        grossMargin,
        hasMissingCost: item.hasMissingCost
      };
    })
    .sort((a, b) => b.netSales - a.netSales);
}

export function analyzeInventory(
  dataset: AppDataset,
  slowMovingDays: number,
  leadTimeDays: number,
  referenceDate: Date = new Date()
): EnrichedInventoryItem[] {
  const todayISO = toISODate(referenceDate);
  const todayMs = new Date(todayISO).getTime();
  const windowStart = new Date(referenceDate);
  windowStart.setDate(windowStart.getDate() - 29);
  const last30StartISO = toISODate(windowStart);

  const postedSales = dataset.sales.filter((s) => s.status === 'posted');

  return dataset.inventory.map((item) => {
    const key = item.product_name.trim().toLowerCase();
    const productSales = postedSales.filter(
      (s) => s.product_name.trim().toLowerCase() === key
    );

    const recentSalesQty = productSales
      .filter((s) => s.date >= last30StartISO && s.date <= todayISO)
      .reduce((acc, s) => acc + s.quantity, 0);

    const sortedDates = productSales.map((s) => s.date).sort();
    const lastSaleDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

    const daysSinceLastSale = lastSaleDate
      ? Math.max(0, Math.round((todayMs - new Date(lastSaleDate).getTime()) / 86400000))
      : null;

    const isLowStock = item.current_stock <= item.reorder_level;
    const isSlowMoving =
      daysSinceLastSale === null || daysSinceLastSale >= slowMovingDays;

    const avgDailySales = recentSalesQty / 30;
    const targetStock = Math.ceil(avgDailySales * leadTimeDays + item.reorder_level);
    const suggestedReorderQty =
      isLowStock && avgDailySales > 0
        ? Math.max(1, targetStock - item.current_stock)
        : null;

    return {
      ...item,
      recentSalesQty,
      lastSaleDate,
      daysSinceLastSale,
      isLowStock,
      isSlowMoving,
      suggestedReorderQty
    };
  });
}

export function analyzeInvoices(
  invoices: InvoiceRecord[],
  referenceDate: Date = new Date()
): EnrichedInvoice[] {
  const todayISO = toISODate(referenceDate);
  const todayMs = new Date(todayISO).getTime();

  return invoices.map((inv) => {
    const rawOutstanding = roundCurrency(inv.invoice_amount - inv.amount_paid);
    const outstandingAmount = Math.max(0, rawOutstanding);

    let isInvalid = false;
    let validationIssue: string | null = null;

    if (inv.amount_paid > inv.invoice_amount) {
      isInvalid = true;
      validationIssue = `Recorded payment (${formatINR(inv.amount_paid)}) exceeds invoice total (${formatINR(inv.invoice_amount)}).`;
    } else if (inv.status === 'paid' && rawOutstanding > 0) {
      isInvalid = true;
      validationIssue = `Status is marked "paid", but ${formatINR(rawOutstanding)} remains unpaid.`;
    } else if (inv.status === 'open' && rawOutstanding === 0 && inv.invoice_amount > 0) {
      isInvalid = true;
      validationIssue = `Full amount is paid, but status is still marked "open".`;
    }

    const dueMs = new Date(inv.due_date).getTime();
    const daysOverdue =
      inv.due_date < todayISO
        ? Math.max(0, Math.round((todayMs - dueMs) / 86400000))
        : 0;

    const isOverdue =
      inv.status !== 'paid' &&
      inv.status !== 'void' &&
      !isInvalid &&
      inv.due_date < todayISO &&
      outstandingAmount > 0;

    return {
      ...inv,
      outstandingAmount,
      daysOverdue,
      isOverdue,
      isInvalid,
      validationIssue
    };
  });
}

export function calculatePreviousEquivalentPeriod(
  startDate: string,
  endDate: string
): { prevStartDate: string; prevEndDate: string; label: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (spanDays - 1));

  const prevStartISO = toISODate(prevStart);
  const prevEndISO = toISODate(prevEnd);

  return {
    prevStartDate: prevStartISO,
    prevEndDate: prevEndISO,
    label: `${formatIndianDate(prevStartISO)} – ${formatIndianDate(prevEndISO)}`
  };
}

export function generateInsights(
  dataset: AppDataset,
  startDate: string,
  endDate: string,
  periodLabel: string,
  slowMovingDays: number,
  leadTimeDays: number,
  referenceDate: Date = new Date()
): BusinessInsight[] {
  const insights: BusinessInsight[] = [];

  const currentSummary = calculatePeriodSummary(
    dataset,
    startDate,
    endDate,
    periodLabel,
    referenceDate
  );

  const prevRange = calculatePreviousEquivalentPeriod(startDate, endDate);
  const prevSummary = calculatePeriodSummary(
    dataset,
    prevRange.prevStartDate,
    prevRange.prevEndDate,
    prevRange.label,
    referenceDate
  );

  const inventoryItems = analyzeInventory(
    dataset,
    slowMovingDays,
    leadTimeDays,
    referenceDate
  );
  const lowStockItems = inventoryItems.filter((i) => i.isLowStock);
  const slowMovingItems = inventoryItems.filter((i) => i.isSlowMoving);

  const enrichedInvoices = analyzeInvoices(dataset.invoices, referenceDate);
  const overdueInvoices = enrichedInvoices.filter((i) => i.isOverdue);

  if (overdueInvoices.length > 0) {
    const overdueTotal = overdueInvoices.reduce((acc, i) => acc + i.outstandingAmount, 0);
    const oldest = [...overdueInvoices].sort((a, b) => b.daysOverdue - a.daysOverdue)[0];
    insights.push({
      id: 'insight-overdue',
      title: `${overdueInvoices.length} Overdue Customer Invoice(s) Requiring Collection`,
      severity: 'Urgent',
      evidence: `${formatINR(overdueTotal)} overdue across ${overdueInvoices.length} invoice(s); oldest is ${oldest.invoice_id} (${oldest.customer_name}, ${oldest.daysOverdue} days past due).`,
      explanation: `These invoices have passed their due dates with unpaid balances remaining.`,
      factVsHypothesis: `Known fact: ${formatINR(overdueTotal)} is past due. The data does not establish whether the delay is due to dispute or credit cycle delay.`,
      nextAction: `Follow up with ${oldest.customer_name} regarding ${oldest.invoice_id} (${formatINR(oldest.outstandingAmount)} outstanding) before dispatching new credit orders.`
    });
  }

  if (lowStockItems.length > 0) {
    const names = lowStockItems.map((i) => `${i.product_name} (${i.current_stock}/${i.reorder_level})`).join(', ');
    insights.push({
      id: 'insight-low-stock',
      title: `${lowStockItems.length} Product(s) At or Below Reorder Threshold`,
      severity: 'Urgent',
      evidence: `Low-stock items: ${names}.`,
      explanation: `Current stock has reached or fallen below the configured reorder level for these SKUs.`,
      factVsHypothesis: `Known fact: Stock is at or below threshold. Stockout risk depends on upcoming order volume and supplier lead time.`,
      nextAction: `Review recent 30-day movement in the Inventory tab and place replenishment orders with suppliers.`
    });
  }

  if (
    currentSummary.grossProfit !== null &&
    prevSummary.grossProfit !== null &&
    prevSummary.netSales > 0
  ) {
    const salesDiff = roundCurrency(currentSummary.netSales - prevSummary.netSales);
    const gpDiff = roundCurrency(currentSummary.grossProfit - prevSummary.grossProfit);
    const cogsDiff =
      currentSummary.cogs !== null && prevSummary.cogs !== null
        ? roundCurrency(currentSummary.cogs - prevSummary.cogs)
        : 0;

    const gpPctChange =
      prevSummary.grossProfit > 0
        ? `${roundCurrency((gpDiff / prevSummary.grossProfit) * 100)}%`
        : 'N/A';

    insights.push({
      id: 'insight-gp-comparison',
      title: `Gross Profit ${gpDiff >= 0 ? 'Increased' : 'Declined'} by ${formatINR(Math.abs(gpDiff))} vs Prior Equivalent Period`,
      severity: gpDiff < 0 ? 'Review' : 'Info',
      evidence: `Current (${periodLabel}): GP ${formatINR(currentSummary.grossProfit)} on Net Sales ${formatINR(currentSummary.netSales)} | Prior (${prevRange.label}): GP ${formatINR(prevSummary.grossProfit)} on Net Sales ${formatINR(prevSummary.netSales)} (${gpPctChange}).`,
      explanation: `Net sales changed by ${salesDiff >= 0 ? '+' : ''}${formatINR(salesDiff)} while recorded COGS changed by ${cogsDiff >= 0 ? '+' : ''}${formatINR(cogsDiff)}.`,
      factVsHypothesis: `Known fact: Gross profit shifted due to observed changes in net sales volume/pricing and recorded COGS. Market demand causes are not established by ledger data alone.`,
      nextAction: `Inspect product-level margins in the Sales & Profit tab to see which items drove the change.`
    });
  }

  if (slowMovingItems.length > 0) {
    const names = slowMovingItems.map((i) => i.product_name).join(', ');
    insights.push({
      id: 'insight-slow-moving',
      title: `${slowMovingItems.length} Slow-Moving Product(s) Blocking Working Capital`,
      severity: 'Review',
      evidence: `No posted sales within the ${slowMovingDays}-day threshold for: ${names}.`,
      explanation: `These inventory items have remained inactive for at least ${slowMovingDays} days.`,
      factVsHypothesis: `Known fact: Zero posted sales in the last ${slowMovingDays} days. Whether caused by seasonal demand or pricing is a hypothesis to verify.`,
      nextAction: `Pause automatic reordering for these items and check if bundled trade discounts can clear existing stock.`
    });
  }

  const products = calculateProductPerformance(dataset.sales, startDate, endDate);
  if (products.length > 0) {
    const topSalesProduct = products[0];
    const withGP = products.filter((p) => p.grossProfit !== null) as Array<
      ProductPerformance & { grossProfit: number }
    >;
    const topGPProduct =
      withGP.length > 0
        ? [...withGP].sort((a, b) => b.grossProfit - a.grossProfit)[0]
        : null;

    insights.push({
      id: 'insight-top-products',
      title: `Top Revenue & Gross Profit Contributors in Period`,
      severity: 'Info',
      evidence: `Highest Net Sales: ${topSalesProduct.product_name} (${formatINR(topSalesProduct.netSales)})${topGPProduct ? ` | Highest Gross Profit: ${topGPProduct.product_name} (${formatINR(topGPProduct.grossProfit)})` : ''}.`,
      explanation: `These products generated the largest share of top-line revenue and gross contribution during the selected period.`,
      factVsHypothesis: `Known fact: Calculated directly from posted sales rows after discounts.`,
      nextAction: `Ensure buffer stock availability for ${topSalesProduct.product_name} to prevent missed wholesale orders.`
    });
  }

  const periodExpenses = filterExpensesInPeriod(dataset.expenses, startDate, endDate);
  if (periodExpenses.length > 0) {
    const catMap = new Map<string, number>();
    for (const exp of periodExpenses) {
      const cat = exp.category.trim();
      catMap.set(cat, (catMap.get(cat) || 0) + exp.amount);
    }
    const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
    const [topCat, topAmount] = sortedCats[0];
    insights.push({
      id: 'insight-top-expense',
      title: `Highest Recorded Expense Category: ${topCat}`,
      severity: 'Info',
      evidence: `${topCat} accounted for ${formatINR(topAmount)} out of ${formatINR(currentSummary.totalExpenses)} total recorded expenses.`,
      explanation: `This category represents ${roundCurrency((topAmount / currentSummary.totalExpenses) * 100)}% of imported expenses in the selected period.`,
      factVsHypothesis: `Known fact: Based strictly on imported expense rows; unrecorded cash or tax obligations are not included.`,
      nextAction: `Review individual vouchers under ${topCat} if operating margin needs tightening.`
    });
  }

  return insights;
}