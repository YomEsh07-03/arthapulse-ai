import { AppDataset, SaleRecord, ExpenseRecord, InventoryRecord, InvoiceRecord } from '../types';

function formatDateOffset(daysAgo: number, referenceDate: Date = new Date()): string {
  const d = new Date(referenceDate);
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateDemoDataset(referenceDate: Date = new Date()): AppDataset {
  const inventory: InventoryRecord[] = [
    { id: 'inv-1', product_name: 'Sharbati Wheat Flour 50kg', current_stock: 18, reorder_level: 25 },
    { id: 'inv-2', product_name: 'Refined Sunflower Oil 15L Tin', current_stock: 42, reorder_level: 20 },
    { id: 'inv-3', product_name: 'Toor Dal Unpolished 30kg', current_stock: 9, reorder_level: 15 },
    { id: 'inv-4', product_name: 'Basmati Rice Royal 25kg', current_stock: 64, reorder_level: 25 },
    { id: 'inv-5', product_name: 'Chana Besan Fine 25kg', current_stock: 31, reorder_level: 15 },
    { id: 'inv-6', product_name: 'Jaggery Powder Organic 20kg', current_stock: 12, reorder_level: 18 },
    { id: 'inv-7', product_name: 'Mustard Oil Kachi Ghani 15L', current_stock: 38, reorder_level: 15 },
    { id: 'inv-8', product_name: 'Kashmiri Chilli Whole 10kg', current_stock: 22, reorder_level: 10 },
    { id: 'inv-9', product_name: 'Cardamom Green Bold 5kg', current_stock: 14, reorder_level: 5 },
    { id: 'inv-10', product_name: 'Rock Salt Pink Granules 50kg', current_stock: 45, reorder_level: 12 }
  ];

  const sales: SaleRecord[] = [
    {
      id: 'sal-1',
      date: formatDateOffset(2, referenceDate),
      invoice_id: 'INV-2026-101',
      customer_name: 'Mahalaxmi Kirana Mart',
      product_name: 'Sharbati Wheat Flour 50kg',
      quantity: 35,
      unit_price: 1980,
      discount_amount: 500,
      unit_cost: 1590,
      status: 'posted'
    },
    {
      id: 'sal-2',
      date: formatDateOffset(4, referenceDate),
      invoice_id: 'INV-2026-102',
      customer_name: 'Annapurna Superstore',
      product_name: 'Refined Sunflower Oil 15L Tin',
      quantity: 32,
      unit_price: 2280,
      discount_amount: 400,
      unit_cost: 1870,
      status: 'posted'
    },
    {
      id: 'sal-3',
      date: formatDateOffset(6, referenceDate),
      invoice_id: 'INV-2026-103',
      customer_name: 'Gokul Wholesale Traders',
      product_name: 'Toor Dal Unpolished 30kg',
      quantity: 25,
      unit_price: 3680,
      discount_amount: 750,
      unit_cost: 3020,
      status: 'posted'
    },
    {
      id: 'sal-4',
      date: formatDateOffset(9, referenceDate),
      invoice_id: 'INV-2026-104',
      customer_name: 'Shree Ganesh Provisions',
      product_name: 'Basmati Rice Royal 25kg',
      quantity: 40,
      unit_price: 2490,
      discount_amount: 800,
      unit_cost: 1980,
      status: 'posted'
    },
    {
      id: 'sal-5',
      date: formatDateOffset(12, referenceDate),
      invoice_id: 'INV-2026-105',
      customer_name: 'Navkar Mart & Distributors',
      product_name: 'Chana Besan Fine 25kg',
      quantity: 28,
      unit_price: 2150,
      discount_amount: 300,
      unit_cost: 1730,
      status: 'posted'
    },
    {
      id: 'sal-6',
      date: formatDateOffset(15, referenceDate),
      invoice_id: 'INV-2026-106',
      customer_name: 'Mahalaxmi Kirana Mart',
      product_name: 'Jaggery Powder Organic 20kg',
      quantity: 22,
      unit_price: 1490,
      discount_amount: 200,
      unit_cost: 1150,
      status: 'posted'
    },
    {
      id: 'sal-7',
      date: formatDateOffset(19, referenceDate),
      invoice_id: 'INV-2026-107',
      customer_name: 'Vikas Hypermarket',
      product_name: 'Mustard Oil Kachi Ghani 15L',
      quantity: 34,
      unit_price: 2410,
      discount_amount: 440,
      unit_cost: 1970,
      status: 'posted'
    },
    {
      id: 'sal-8',
      date: formatDateOffset(23, referenceDate),
      invoice_id: 'INV-2026-108',
      customer_name: 'Annapurna Superstore',
      product_name: 'Kashmiri Chilli Whole 10kg',
      quantity: 16,
      unit_price: 4250,
      discount_amount: 500,
      unit_cost: 3420,
      status: 'posted'
    },
    {
      id: 'sal-9',
      date: formatDateOffset(26, referenceDate),
      invoice_id: 'INV-2026-109',
      customer_name: 'Gokul Wholesale Traders',
      product_name: 'Sharbati Wheat Flour 50kg',
      quantity: 24,
      unit_price: 1980,
      discount_amount: 0,
      unit_cost: 1590,
      status: 'posted'
    },
    {
      id: 'sal-10',
      date: formatDateOffset(34, referenceDate),
      invoice_id: 'INV-2026-091',
      customer_name: 'Shree Ganesh Provisions',
      product_name: 'Refined Sunflower Oil 15L Tin',
      quantity: 28,
      unit_price: 2240,
      discount_amount: 400,
      unit_cost: 1860,
      status: 'posted'
    },
    {
      id: 'sal-11',
      date: formatDateOffset(39, referenceDate),
      invoice_id: 'INV-2026-092',
      customer_name: 'Vikas Hypermarket',
      product_name: 'Basmati Rice Royal 25kg',
      quantity: 35,
      unit_price: 2450,
      discount_amount: 560,
      unit_cost: 1960,
      status: 'posted'
    },
    {
      id: 'sal-12',
      date: formatDateOffset(44, referenceDate),
      invoice_id: 'INV-2026-093',
      customer_name: 'Navkar Mart & Distributors',
      product_name: 'Toor Dal Unpolished 30kg',
      quantity: 22,
      unit_price: 3620,
      discount_amount: 0,
      unit_cost: 3010,
      status: 'posted'
    },
    {
      id: 'sal-13',
      date: formatDateOffset(51, referenceDate),
      invoice_id: 'INV-2026-088',
      customer_name: 'Mahalaxmi Kirana Mart',
      product_name: 'Cardamom Green Bold 5kg',
      quantity: 4,
      unit_price: 9200,
      discount_amount: 300,
      unit_cost: 7800,
      status: 'posted'
    },
    {
      id: 'sal-14',
      date: formatDateOffset(65, referenceDate),
      invoice_id: 'INV-2026-081',
      customer_name: 'Gokul Wholesale Traders',
      product_name: 'Rock Salt Pink Granules 50kg',
      quantity: 8,
      unit_price: 1150,
      discount_amount: 0,
      unit_cost: 820,
      status: 'posted'
    },
    {
      id: 'sal-15',
      date: formatDateOffset(12, referenceDate),
      invoice_id: 'INV-2026-110',
      customer_name: 'Annapurna Superstore',
      product_name: 'Chana Besan Fine 25kg',
      quantity: 5,
      unit_price: 2150,
      discount_amount: 0,
      unit_cost: 1730,
      status: 'cancelled'
    }
  ];

  const expenses: ExpenseRecord[] = [
    {
      id: 'exp-1',
      date: formatDateOffset(3, referenceDate),
      category: 'Fuel & Transport',
      description: 'Tempo freight delivery to city market',
      amount: 12500
    },
    {
      id: 'exp-2',
      date: formatDateOffset(8, referenceDate),
      category: 'Godown Rent',
      description: 'Monthly warehouse lease Zone B',
      amount: 26000
    },
    {
      id: 'exp-3',
      date: formatDateOffset(12, referenceDate),
      category: 'Wages & Hamali',
      description: 'Loading and unloading staff payout',
      amount: 16500
    },
    {
      id: 'exp-4',
      date: formatDateOffset(17, referenceDate),
      category: 'Packaging & Strapping',
      description: 'HDPE sacks and stitching twine',
      amount: 5300
    },
    {
      id: 'exp-5',
      date: formatDateOffset(22, referenceDate),
      category: 'Utilities & Cold Room',
      description: 'Three-phase electricity bill',
      amount: 8200
    },
    {
      id: 'exp-6',
      date: formatDateOffset(36, referenceDate),
      category: 'Godown Rent',
      description: 'Previous month warehouse lease Zone B',
      amount: 26000
    },
    {
      id: 'exp-7',
      date: formatDateOffset(41, referenceDate),
      category: 'Fuel & Transport',
      description: 'Outstation district dispatch diesel',
      amount: 13800
    },
    {
      id: 'exp-8',
      date: formatDateOffset(47, referenceDate),
      category: 'Wages & Hamali',
      description: 'Warehouse helper wages',
      amount: 16000
    }
  ];

  const invoices: InvoiceRecord[] = [
    {
      id: 'rec-1',
      invoice_id: 'INV-2026-085',
      customer_name: 'Shree Ganesh Provisions',
      invoice_date: formatDateOffset(48, referenceDate),
      due_date: formatDateOffset(18, referenceDate),
      invoice_amount: 64800,
      amount_paid: 20000,
      status: 'open'
    },
    {
      id: 'rec-2',
      invoice_id: 'INV-2026-089',
      customer_name: 'Gokul Wholesale Traders',
      invoice_date: formatDateOffset(39, referenceDate),
      due_date: formatDateOffset(9, referenceDate),
      invoice_amount: 54000,
      amount_paid: 0,
      status: 'open'
    },
    {
      id: 'rec-3',
      invoice_id: 'INV-2026-101',
      customer_name: 'Mahalaxmi Kirana Mart',
      invoice_date: formatDateOffset(2, referenceDate),
      due_date: formatDateOffset(-12, referenceDate),
      invoice_amount: 68800,
      amount_paid: 45300,
      status: 'open'
    },
    {
      id: 'rec-4',
      invoice_id: 'INV-2026-102',
      customer_name: 'Annapurna Superstore',
      invoice_date: formatDateOffset(4, referenceDate),
      due_date: formatDateOffset(-10, referenceDate),
      invoice_amount: 72560,
      amount_paid: 72560,
      status: 'paid'
    },
    {
      id: 'rec-5',
      invoice_id: 'INV-2026-104',
      customer_name: 'Vikas Hypermarket',
      invoice_date: formatDateOffset(7, referenceDate),
      due_date: formatDateOffset(-7, referenceDate),
      invoice_amount: 81500,
      amount_paid: 81500,
      status: 'paid'
    },
    {
      id: 'rec-6',
      invoice_id: 'INV-2026-099',
      customer_name: 'Navkar Mart & Distributors',
      invoice_date: formatDateOffset(25, referenceDate),
      due_date: formatDateOffset(5, referenceDate),
      invoice_amount: 29000,
      amount_paid: 31500,
      status: 'open'
    }
  ];

  return {
    sales,
    expenses,
    inventory,
    invoices,
    isDemo: true
  };
}