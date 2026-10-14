import { describe, it, expect } from 'vitest';
import {
  calculatePeriodSummary,
  analyzeInvoices,
  analyzeInventory
} from '../src/analytics/engine';
import { validateSalesRows } from '../src/utils/importer';
import { AppDataset } from '../src/types';

const mockDataset: AppDataset = {
  isDemo: true,
  sales: [
    {
      id: 's1',
      date: '2026-10-10',
      invoice_id: 'INV-1',
      customer_name: 'Buyer A',
      product_name: 'Wheat 50kg',
      quantity: 10,
      unit_price: 2000,
      discount_amount: 500,
      unit_cost: 1500,
      status: 'posted'
    },
    {
      id: 's2',
      date: '2026-10-11',
      invoice_id: 'INV-2',
      customer_name: 'Buyer B',
      product_name: 'Wheat 50kg',
      quantity: 5,
      unit_price: 2000,
      discount_amount: 0,
      unit_cost: 1500,
      status: 'cancelled'
    }
  ],
  expenses: [
    {
      id: 'e1',
      date: '2026-10-10',
      category: 'Transport',
      description: 'Freight',
      amount: 1200
    }
  ],
  inventory: [
    {
      id: 'i1',
      product_name: 'Wheat 50kg',
      current_stock: 15,
      reorder_level: 20
    },
    {
      id: 'i2',
      product_name: 'Idle Spice 10kg',
      current_stock: 30,
      reorder_level: 10
    }
  ],
  invoices: [
    {
      id: 'inv1',
      invoice_id: 'INV-OLD',
      customer_name: 'Buyer A',
      invoice_date: '2026-09-01',
      due_date: '2026-09-20',
      invoice_amount: 15000,
      amount_paid: 5000,
      status: 'open'
    },
    {
      id: 'inv2',
      invoice_id: 'INV-BAD',
      customer_name: 'Buyer B',
      invoice_date: '2026-10-01',
      due_date: '2026-10-20',
      invoice_amount: 10000,
      amount_paid: 12000,
      status: 'open'
    }
  ]
};

describe('ArthaPulse Analytics Engine', () => {
  it('calculates net sales, COGS, gross profit, and operating profit excluding cancelled rows', () => {
    const res = calculatePeriodSummary(
      mockDataset,
      '2026-10-01',
      '2026-10-14',
      'Oct Window',
      new Date('2026-10-14')
    );
    expect(res.netSales).toBe(19500);
    expect(res.cogs).toBe(15000);
    expect(res.grossProfit).toBe(4500);
    expect(res.totalExpenses).toBe(1200);
    expect(res.estimatedOperatingProfit).toBe(3300);
  });

  it('marks gross profit unavailable when unit_cost is null instead of assuming zero', () => {
    const missingCostDataset: AppDataset = {
      ...mockDataset,
      sales: [{ ...mockDataset.sales[0], unit_cost: null }]
    };
    const res = calculatePeriodSummary(
      missingCostDataset,
      '2026-10-01',
      '2026-10-14',
      'Oct Window',
      new Date('2026-10-14')
    );
    expect(res.hasMissingCost).toBe(true);
    expect(res.cogs).toBeNull();
    expect(res.grossProfit).toBeNull();
  });

  it('identifies overdue and invalid overpaid invoices accurately', () => {
    const list = analyzeInvoices(mockDataset.invoices, new Date('2026-10-14'));
    expect(list[0].isOverdue).toBe(true);
    expect(list[0].outstandingAmount).toBe(10000);
    expect(list[1].isInvalid).toBe(true);
    expect(list[1].isOverdue).toBe(false);
  });

  it('detects low-stock and slow-moving inventory items', () => {
    const inv = analyzeInventory(mockDataset, 30, 7, new Date('2026-10-14'));
    const wheat = inv.find((x) => x.product_name === 'Wheat 50kg')!;
    const spice = inv.find((x) => x.product_name === 'Idle Spice 10kg')!;
    expect(wheat.isLowStock).toBe(true);
    expect(wheat.isSlowMoving).toBe(false);
    expect(spice.isSlowMoving).toBe(true);
  });

  it('flags discounts greater than gross line amount during CSV validation', () => {
    const parsed = validateSalesRows([
      {
        date: '2026-10-10',
        invoice_id: 'INV-9',
        customer_name: 'Test Trader',
        product_name: 'Oil 15L',
        quantity: 2,
        unit_price: 1000,
        discount_amount: 2500,
        unit_cost: 800,
        status: 'posted'
      }
    ]);
    expect(parsed.validRows.length).toBe(0);
    expect(parsed.errors.length).toBe(1);
    expect(parsed.errors[0].field).toBe('discount_amount');
  });
});