import * as XLSX from 'xlsx';
import {
  SaleRecord,
  ExpenseRecord,
  InventoryRecord,
  InvoiceRecord,
  ImportParseResult,
  ValidationRowError,
  SaleStatus,
  InvoiceStatus
} from '../types';

export type ImportCategory = 'sales' | 'expenses' | 'inventory' | 'invoices';

export const CSV_TEMPLATES: Record<ImportCategory, { filename: string; content: string }> = {
  sales: {
    filename: 'sales_template.csv',
    content: [
      'date,invoice_id,customer_name,product_name,quantity,unit_price,discount_amount,unit_cost,status',
      '2026-10-10,INV-2026-201,Mahalaxmi Kirana Mart,Sharbati Wheat Flour 50kg,20,1950,500,1620,posted',
      '2026-10-12,INV-2026-202,Annapurna Superstore,Refined Sunflower Oil 15L Tin,15,2250,0,1910,posted'
    ].join('\n')
  },
  expenses: {
    filename: 'expenses_template.csv',
    content: [
      'date,category,description,amount',
      '2026-10-05,Fuel & Transport,Local tempo dispatch freight,8500',
      '2026-10-08,Godown Rent,Warehouse monthly rent,32000'
    ].join('\n')
  },
  inventory: {
    filename: 'inventory_template.csv',
    content: [
      'product_name,current_stock,reorder_level',
      'Sharbati Wheat Flour 50kg,18,25',
      'Refined Sunflower Oil 15L Tin,42,20'
    ].join('\n')
  },
  invoices: {
    filename: 'invoices_template.csv',
    content: [
      'invoice_id,customer_name,invoice_date,due_date,invoice_amount,amount_paid,status',
      'INV-2026-201,Mahalaxmi Kirana Mart,2026-09-15,2026-10-01,38500,15000,open',
      'INV-2026-202,Annapurna Superstore,2026-10-02,2026-10-25,33750,33750,paid'
    ].join('\n')
  }
};

export function downloadTemplate(category: ImportCategory): void {
  const tpl = CSV_TEMPLATES[category];
  const blob = new Blob([tpl.content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', tpl.filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeHeader(h: string): string {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function isValidISODate(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const d = new Date(val);
  return !Number.isNaN(d.getTime());
}

function normalizeDateCell(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number') {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const str = String(raw).trim();
  if (isValidISODate(str)) return str;
  const dmyMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmyMatch) {
    const candidate = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    if (isValidISODate(candidate)) return candidate;
  }
  return str;
}

export async function parseFileToRawRows(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded file contains no readable sheets.');
  }
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: ''
  });
  return rows;
}

function mapNormalizedRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[normalizeHeader(k)] = v;
  }
  return out;
}

export function validateSalesRows(rawRows: Record<string, unknown>[]): ImportParseResult<SaleRecord> {
  const required = ['date', 'invoice_id', 'customer_name', 'product_name', 'quantity', 'unit_price'];
  if (rawRows.length === 0) {
    return { validRows: [], errors: [], missingHeaders: required, warnings: ['File has no data rows.'] };
  }

  const firstNormalized = mapNormalizedRow(rawRows[0]);
  const presentHeaders = Object.keys(firstNormalized);
  const missingHeaders = required.filter((h) => !presentHeaders.includes(h));

  if (missingHeaders.length > 0) {
    return { validRows: [], errors: [], missingHeaders, warnings: [] };
  }

  const validRows: SaleRecord[] = [];
  const errors: ValidationRowError[] = [];
  const warnings: string[] = [];
  let missingCostCount = 0;

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2;
    const r = mapNormalizedRow(raw);
    let rowHasError = false;

    const date = normalizeDateCell(r.date);
    if (!isValidISODate(date)) {
      errors.push({ rowNumber, field: 'date', message: 'Invalid date; use YYYY-MM-DD.' });
      rowHasError = true;
    }

    const invoice_id = String(r.invoice_id ?? '').trim();
    if (!invoice_id) {
      errors.push({ rowNumber, field: 'invoice_id', message: 'Invoice ID is required.' });
      rowHasError = true;
    }

    const customer_name = String(r.customer_name ?? '').trim();
    if (!customer_name) {
      errors.push({ rowNumber, field: 'customer_name', message: 'Customer name is required.' });
      rowHasError = true;
    }

    const product_name = String(r.product_name ?? '').trim();
    if (!product_name) {
      errors.push({ rowNumber, field: 'product_name', message: 'Product name is required.' });
      rowHasError = true;
    }

    const quantity = Number(r.quantity);
    if (r.quantity === '' || Number.isNaN(quantity) || quantity < 0) {
      errors.push({ rowNumber, field: 'quantity', message: 'Quantity must be a non-negative number.' });
      rowHasError = true;
    }

    const unit_price = Number(r.unit_price);
    if (r.unit_price === '' || Number.isNaN(unit_price) || unit_price < 0) {
      errors.push({ rowNumber, field: 'unit_price', message: 'Unit price must be a non-negative number.' });
      rowHasError = true;
    }

    const discountRaw = r.discount_amount;
    const discount_amount =
      discountRaw === undefined || String(discountRaw).trim() === ''
        ? 0
        : Number(discountRaw);

    if (Number.isNaN(discount_amount) || discount_amount < 0) {
      errors.push({ rowNumber, field: 'discount_amount', message: 'Discount must be a non-negative number.' });
      rowHasError = true;
    } else if (!Number.isNaN(quantity) && !Number.isNaN(unit_price) && discount_amount > quantity * unit_price) {
      errors.push({
        rowNumber,
        field: 'discount_amount',
        message: 'Discount amount exceeds gross line amount (quantity × unit_price).'
      });
      rowHasError = true;
    }

    let unit_cost: number | null = null;
    const costRaw = r.unit_cost;
    if (costRaw === undefined || String(costRaw).trim() === '') {
      unit_cost = null;
      missingCostCount += 1;
    } else {
      const parsedCost = Number(costRaw);
      if (Number.isNaN(parsedCost) || parsedCost < 0) {
        errors.push({ rowNumber, field: 'unit_cost', message: 'Unit cost must be non-negative when supplied.' });
        rowHasError = true;
      } else {
        unit_cost = parsedCost;
      }
    }

    const statusRaw = String(r.status ?? '').trim().toLowerCase();
    const allowedStatus: SaleStatus[] = ['posted', 'cancelled', 'void', 'returned'];
    const status: SaleStatus = statusRaw === '' ? 'posted' : (statusRaw as SaleStatus);
    if (!allowedStatus.includes(status)) {
      errors.push({
        rowNumber,
        field: 'status',
        message: 'Status must be posted, cancelled, void, or returned.'
      });
      rowHasError = true;
    }

    if (!rowHasError) {
      validRows.push({
        id: `sal-imp-${Date.now()}-${idx}`,
        date,
        invoice_id,
        customer_name,
        product_name,
        quantity,
        unit_price,
        discount_amount,
        unit_cost,
        status
      });
    }
  });

  if (missingCostCount > 0) {
    warnings.push(
      `${missingCostCount} row(s) have blank unit_cost. Gross Profit, Gross Margin, and Estimated Operating Profit will be marked Unavailable for affected periods/products rather than treating missing cost as zero.`
    );
  }

  return { validRows, errors, missingHeaders: [], warnings };
}

export function validateExpenseRows(rawRows: Record<string, unknown>[]): ImportParseResult<ExpenseRecord> {
  const required = ['date', 'category', 'amount'];
  if (rawRows.length === 0) {
    return { validRows: [], errors: [], missingHeaders: required, warnings: ['File has no data rows.'] };
  }

  const firstNormalized = mapNormalizedRow(rawRows[0]);
  const presentHeaders = Object.keys(firstNormalized);
  const missingHeaders = required.filter((h) => !presentHeaders.includes(h));

  if (missingHeaders.length > 0) {
    return { validRows: [], errors: [], missingHeaders, warnings: [] };
  }

  const validRows: ExpenseRecord[] = [];
  const errors: ValidationRowError[] = [];

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2;
    const r = mapNormalizedRow(raw);
    let rowHasError = false;

    const date = normalizeDateCell(r.date);
    if (!isValidISODate(date)) {
      errors.push({ rowNumber, field: 'date', message: 'Invalid date; use YYYY-MM-DD.' });
      rowHasError = true;
    }

    const category = String(r.category ?? '').trim();
    if (!category) {
      errors.push({ rowNumber, field: 'category', message: 'Expense category is required.' });
      rowHasError = true;
    }

    const description = String(r.description ?? '').trim();
    const amount = Number(r.amount);
    if (r.amount === '' || Number.isNaN(amount) || amount < 0) {
      errors.push({ rowNumber, field: 'amount', message: 'Amount must be a non-negative number.' });
      rowHasError = true;
    }

    if (!rowHasError) {
      validRows.push({
        id: `exp-imp-${Date.now()}-${idx}`,
        date,
        category,
        description,
        amount
      });
    }
  });

  return { validRows, errors, missingHeaders: [], warnings: [] };
}

export function validateInventoryRows(rawRows: Record<string, unknown>[]): ImportParseResult<InventoryRecord> {
  const required = ['product_name', 'current_stock', 'reorder_level'];
  if (rawRows.length === 0) {
    return { validRows: [], errors: [], missingHeaders: required, warnings: ['File has no data rows.'] };
  }

  const firstNormalized = mapNormalizedRow(rawRows[0]);
  const presentHeaders = Object.keys(firstNormalized);
  const missingHeaders = required.filter((h) => !presentHeaders.includes(h));

  if (missingHeaders.length > 0) {
    return { validRows: [], errors: [], missingHeaders, warnings: [] };
  }

  const validRows: InventoryRecord[] = [];
  const errors: ValidationRowError[] = [];

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2;
    const r = mapNormalizedRow(raw);
    let rowHasError = false;

    const product_name = String(r.product_name ?? '').trim();
    if (!product_name) {
      errors.push({ rowNumber, field: 'product_name', message: 'Product name is required.' });
      rowHasError = true;
    }

    const current_stock = Number(r.current_stock);
    if (r.current_stock === '' || Number.isNaN(current_stock) || current_stock < 0) {
      errors.push({ rowNumber, field: 'current_stock', message: 'Current stock must be non-negative.' });
      rowHasError = true;
    }

    const reorder_level = Number(r.reorder_level);
    if (r.reorder_level === '' || Number.isNaN(reorder_level) || reorder_level < 0) {
      errors.push({ rowNumber, field: 'reorder_level', message: 'Reorder level must be non-negative.' });
      rowHasError = true;
    }

    if (!rowHasError) {
      validRows.push({
        id: `inv-imp-${Date.now()}-${idx}`,
        product_name,
        current_stock,
        reorder_level
      });
    }
  });

  return { validRows, errors, missingHeaders: [], warnings: [] };
}

export function validateInvoiceRows(rawRows: Record<string, unknown>[]): ImportParseResult<InvoiceRecord> {
  const required = ['invoice_id', 'customer_name', 'invoice_date', 'due_date', 'invoice_amount', 'amount_paid'];
  if (rawRows.length === 0) {
    return { validRows: [], errors: [], missingHeaders: required, warnings: ['File has no data rows.'] };
  }

  const firstNormalized = mapNormalizedRow(rawRows[0]);
  const presentHeaders = Object.keys(firstNormalized);
  const missingHeaders = required.filter((h) => !presentHeaders.includes(h));

  if (missingHeaders.length > 0) {
    return { validRows: [], errors: [], missingHeaders, warnings: [] };
  }

  const validRows: InvoiceRecord[] = [];
  const errors: ValidationRowError[] = [];
  const warnings: string[] = [];

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2;
    const r = mapNormalizedRow(raw);
    let rowHasError = false;

    const invoice_id = String(r.invoice_id ?? '').trim();
    if (!invoice_id) {
      errors.push({ rowNumber, field: 'invoice_id', message: 'Invoice ID is required.' });
      rowHasError = true;
    }

    const customer_name = String(r.customer_name ?? '').trim();
    if (!customer_name) {
      errors.push({ rowNumber, field: 'customer_name', message: 'Customer name is required.' });
      rowHasError = true;
    }

    const invoice_date = normalizeDateCell(r.invoice_date);
    if (!isValidISODate(invoice_date)) {
      errors.push({ rowNumber, field: 'invoice_date', message: 'Invalid invoice_date; use YYYY-MM-DD.' });
      rowHasError = true;
    }

    const due_date = normalizeDateCell(r.due_date);
    if (!isValidISODate(due_date)) {
      errors.push({ rowNumber, field: 'due_date', message: 'Invalid due_date; use YYYY-MM-DD.' });
      rowHasError = true;
    }

    const invoice_amount = Number(r.invoice_amount);
    if (r.invoice_amount === '' || Number.isNaN(invoice_amount) || invoice_amount < 0) {
      errors.push({ rowNumber, field: 'invoice_amount', message: 'Invoice amount must be non-negative.' });
      rowHasError = true;
    }

    const amount_paid = Number(r.amount_paid);
    if (r.amount_paid === '' || Number.isNaN(amount_paid) || amount_paid < 0) {
      errors.push({ rowNumber, field: 'amount_paid', message: 'Amount paid must be non-negative.' });
      rowHasError = true;
    }

    const statusRaw = String(r.status ?? '').trim().toLowerCase();
    let status: InvoiceStatus = 'open';
    if (statusRaw === '') {
      status = amount_paid >= invoice_amount ? 'paid' : 'open';
    } else if (statusRaw === 'open' || statusRaw === 'paid' || statusRaw === 'void') {
      status = statusRaw;
    } else {
      errors.push({ rowNumber, field: 'status', message: 'Status must be open, paid, or void.' });
      rowHasError = true;
    }

    if (!rowHasError) {
      if (amount_paid > invoice_amount) {
        warnings.push(
          `Row ${rowNumber} (${invoice_id}): amount_paid exceeds invoice_amount. It will be imported and highlighted in Receivables for review.`
        );
      } else if (status === 'paid' && amount_paid < invoice_amount) {
        warnings.push(
          `Row ${rowNumber} (${invoice_id}): status is marked "paid" while balance remains. It will be flagged for review.`
        );
      }

      validRows.push({
        id: `rec-imp-${Date.now()}-${idx}`,
        invoice_id,
        customer_name,
        invoice_date,
        due_date,
        invoice_amount,
        amount_paid,
        status
      });
    }
  });

  return { validRows, errors, missingHeaders: [], warnings };
}