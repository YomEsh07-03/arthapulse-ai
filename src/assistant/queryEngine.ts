import { AppDataset, AppSettings, DateRangePreset } from '../types';
import {
  resolveDateRange,
  calculatePeriodSummary,
  calculateProductPerformance,
  analyzeInventory,
  analyzeInvoices,
  calculatePreviousEquivalentPeriod,
  formatINR,
  formatIndianDate,
  roundCurrency
} from '../analytics/engine';

export const SUGGESTED_QUESTIONS = [
  'What were my sales this month?',
  'What is my gross profit and margin?',
  'Which products generated the most gross profit?',
  'Which products are low on stock?',
  'Which invoices are overdue?',
  'Compare this month with the previous month.',
  'Why did gross profit change?'
];

export interface AssistantReply {
  text: string;
  periodLabel: string;
  formulaNote: string;
}

export function answerBusinessQuestion(
  question: string,
  dataset: AppDataset,
  settings: AppSettings,
  activePreset: DateRangePreset,
  referenceDate: Date = new Date()
): AssistantReply {
  const q = question.trim().toLowerCase();
  const activeRange = resolveDateRange(activePreset, dataset, referenceDate);
  const activeSummary = calculatePeriodSummary(
    dataset,
    activeRange.startDate,
    activeRange.endDate,
    activeRange.label,
    referenceDate
  );

  if (q.includes('sales this month') || (q.includes('sales') && !q.includes('compare') && !q.includes('why'))) {
    const targetPreset: DateRangePreset = q.includes('this month') ? 'this_month' : activePreset;
    const range = resolveDateRange(targetPreset, dataset, referenceDate);
    const summary = calculatePeriodSummary(dataset, range.startDate, range.endDate, range.label, referenceDate);
    return {
      text: `Net sales for ${range.label} totaled ${formatINR(summary.netSales)}. Recorded expenses in the same window were ${formatINR(summary.totalExpenses)}.`,
      periodLabel: range.label,
      formulaNote: 'Net Sales = sum of (quantity × unit_price − discount_amount) for posted sales rows.'
    };
  }

  if (q.includes('gross profit and margin') || (q.includes('margin') && !q.includes('why'))) {
    if (activeSummary.hasMissingCost || activeSummary.grossProfit === null) {
      return {
        text: `Gross profit and margin are currently Unavailable for ${activeRange.label} because one or more posted sales rows are missing unit_cost. Net sales were ${formatINR(activeSummary.netSales)}.`,
        periodLabel: activeRange.label,
        formulaNote: 'Missing COGS is never treated as zero. Supply unit_cost for all posted rows to unlock Gross Profit.'
      };
    }
    return {
      text: `For ${activeRange.label}, Gross Profit is ${formatINR(activeSummary.grossProfit)} on Net Sales of ${formatINR(activeSummary.netSales)} (COGS: ${formatINR(activeSummary.cogs)}), yielding a Gross Profit Margin of ${activeSummary.grossMargin}%. Estimated Operating Profit after ${formatINR(activeSummary.totalExpenses)} in recorded expenses is ${formatINR(activeSummary.estimatedOperatingProfit)}.`,
      periodLabel: activeRange.label,
      formulaNote: 'Gross Profit = Net Sales − COGS | Gross Margin = (Gross Profit ÷ Net Sales) × 100.'
    };
  }

  if (q.includes('most gross profit') || q.includes('which products generated') || q.includes('top product')) {
    const products = calculateProductPerformance(dataset.sales, activeRange.startDate, activeRange.endDate);
    const withGP = products.filter((p) => p.grossProfit !== null) as Array<
      (typeof products)[number] & { grossProfit: number }
    >;
    if (withGP.length === 0) {
      return {
        text: `No products have complete gross profit data in ${activeRange.label}.`,
        periodLabel: activeRange.label,
        formulaNote: 'Product Gross Profit = Product Net Sales − Product COGS.'
      };
    }
    const topThree = [...withGP].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 3);
    const summaryLines = topThree
      .map(
        (p, idx) =>
          `${idx + 1}. ${p.product_name}: ${formatINR(p.grossProfit)} GP (${p.grossMargin}% margin on ${formatINR(p.netSales)} net sales)`
      )
      .join(' | ');
    return {
      text: `Top gross-profit products in ${activeRange.label}: ${summaryLines}.`,
      periodLabel: activeRange.label,
      formulaNote: 'Grouped by trimmed product name across posted sales rows.'
    };
  }

  if (q.includes('low on stock') || q.includes('low stock') || q.includes('inventory') || q.includes('slow')) {
    const inv = analyzeInventory(dataset, settings.slowMovingDays, settings.leadTimeDays, referenceDate);
    const low = inv.filter((i) => i.isLowStock);
    const slow = inv.filter((i) => i.isSlowMoving);
    const lowText =
      low.length > 0
        ? low.map((i) => `${i.product_name} (${i.current_stock} in stock vs reorder level ${i.reorder_level})`).join('; ')
        : 'None';
    const slowText =
      slow.length > 0
        ? slow.map((i) => `${i.product_name} (last sold: ${formatIndianDate(i.lastSaleDate)})`).join('; ')
        : 'None';

    return {
      text: `Low-stock products (${low.length}): ${lowText}. Slow-moving products with no posted sale in ${settings.slowMovingDays}+ days (${slow.length}): ${slowText}.`,
      periodLabel: `Current Inventory Snapshot (Slow-moving window: ${settings.slowMovingDays} days)`,
      formulaNote: 'Low Stock: current_stock <= reorder_level | Slow Moving: no posted sale within configured threshold.'
    };
  }

  if (q.includes('overdue') || q.includes('invoice') || q.includes('receivable')) {
    const invoices = analyzeInvoices(dataset.invoices, referenceDate);
    const overdue = invoices.filter((i) => i.isOverdue);
    if (overdue.length === 0) {
      return {
        text: `There are currently 0 overdue invoices. Total open receivables stand at ${formatINR(activeSummary.outstandingReceivables)}.`,
        periodLabel: `As of ${formatIndianDate(activeRange.endDate)}`,
        formulaNote: 'Overdue: status is open, due_date < today, and (invoice_amount − amount_paid) > 0.'
      };
    }
    const details = overdue
      .map(
        (i) =>
          `${i.invoice_id} (${i.customer_name}): ${formatINR(i.outstandingAmount)} overdue by ${i.daysOverdue} days (Due ${formatIndianDate(i.due_date)})`
      )
      .join(' | ');
    return {
      text: `You have ${overdue.length} overdue invoice(s) totaling ${formatINR(activeSummary.overdueReceivables)}: ${details}.`,
      periodLabel: `As of ${formatIndianDate(activeRange.endDate)}`,
      formulaNote: 'Outstanding Amount = invoice_amount − amount_paid (excluding paid and void invoices).'
    };
  }

  if (q.includes('compare this month with the previous month') || q.includes('compare')) {
    const thisMonth = resolveDateRange('this_month', dataset, referenceDate);
    const prevMonth = resolveDateRange('previous_month', dataset, referenceDate);
    const cur = calculatePeriodSummary(dataset, thisMonth.startDate, thisMonth.endDate, thisMonth.label, referenceDate);
    const prev = calculatePeriodSummary(dataset, prevMonth.startDate, prevMonth.endDate, prevMonth.label, referenceDate);

    const salesDelta = roundCurrency(cur.netSales - prev.netSales);
    const salesPct = prev.netSales > 0 ? `${roundCurrency((salesDelta / prev.netSales) * 100)}%` : 'N/A';

    const gpComparison =
      cur.grossProfit !== null && prev.grossProfit !== null
        ? `Gross Profit moved from ${formatINR(prev.grossProfit)} to ${formatINR(cur.grossProfit)} (${cur.grossProfit - prev.grossProfit >= 0 ? '+' : ''}${formatINR(cur.grossProfit - prev.grossProfit)}).`
        : 'Gross profit comparison is unavailable due to missing unit_cost in one of the periods.';

    return {
      text: `Comparison: ${thisMonth.label} Net Sales are ${formatINR(cur.netSales)} vs ${prevMonth.label} Net Sales of ${formatINR(prev.netSales)} (Change: ${salesDelta >= 0 ? '+' : ''}${formatINR(salesDelta)}, ${salesPct}). ${gpComparison}`,
      periodLabel: `${thisMonth.label} vs ${prevMonth.label}`,
      formulaNote: 'Percentage growth shows N/A when prior-period baseline is zero.'
    };
  }

  if (q.includes('why did gross profit change') || q.includes('gross profit change')) {
    const prevEq = calculatePreviousEquivalentPeriod(activeRange.startDate, activeRange.endDate);
    const prevSummary = calculatePeriodSummary(
      dataset,
      prevEq.prevStartDate,
      prevEq.prevEndDate,
      prevEq.label,
      referenceDate
    );

    if (
      activeSummary.grossProfit === null ||
      prevSummary.grossProfit === null ||
      activeSummary.cogs === null ||
      prevSummary.cogs === null
    ) {
      return {
        text: `Gross profit change breakdown cannot be computed because unit_cost data is incomplete in either the current period (${activeRange.label}) or prior equivalent period (${prevEq.label}).`,
        periodLabel: `${activeRange.label} vs ${prevEq.label}`,
        formulaNote: 'Requires complete unit_cost on all posted sales rows in both periods.'
      };
    }

    const gpDiff = roundCurrency(activeSummary.grossProfit - prevSummary.grossProfit);
    const salesDiff = roundCurrency(activeSummary.netSales - prevSummary.netSales);
    const cogsDiff = roundCurrency(activeSummary.cogs - prevSummary.cogs);

    return {
      text: `Between the prior equivalent period (${prevEq.label}) and current period (${activeRange.label}), Gross Profit changed by ${gpDiff >= 0 ? '+' : ''}${formatINR(gpDiff)} (from ${formatINR(prevSummary.grossProfit)} to ${formatINR(activeSummary.grossProfit)}). Observed accounting drivers: Net Sales changed by ${salesDiff >= 0 ? '+' : ''}${formatINR(salesDiff)} and recorded COGS changed by ${cogsDiff >= 0 ? '+' : ''}${formatINR(cogsDiff)}. Note: The ledger proves how revenue and unit costs shifted, but external market causes are not established by the data.`,
      periodLabel: `${activeRange.label} vs ${prevEq.label}`,
      formulaNote: 'Δ Gross Profit = Δ Net Sales − Δ COGS.'
    };
  }

  return {
    text: 'I can answer questions about sales, gross profit, expenses, products, stock alerts, and invoices in this MVP. Try one of the suggested questions.',
    periodLabel: activeRange.label,
    formulaNote: 'Built-in deterministic analytics assistant (no fabricated figures).'
  };
}