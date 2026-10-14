import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bot,
  Boxes,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldAlert,
  Trash2,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  AppDataset,
  AppSettings,
  ChatMessage,
  DateRangePreset,
  ImportParseResult
} from './types';
import {
  DEFAULT_SETTINGS,
  loadStoredDataset,
  loadStoredSettings,
  saveStoredDataset,
  saveStoredSettings,
  clearStoredDataset
} from './data/storage';
import { generateDemoDataset } from './data/demoData';
import {
  analyzeInventory,
  analyzeInvoices,
  calculatePeriodSummary,
  calculateProductPerformance,
  filterValidSalesInPeriod,
  formatINR,
  formatIndianDate,
  generateInsights,
  resolveDateRange
} from './analytics/engine';
import {
  ImportCategory,
  downloadTemplate,
  parseFileToRawRows,
  validateExpenseRows,
  validateInventoryRows,
  validateInvoiceRows,
  validateSalesRows
} from './utils/importer';
import { SUGGESTED_QUESTIONS, answerBusinessQuestion } from './assistant/queryEngine';

type NavTab =
  | 'overview'
  | 'assistant'
  | 'sales'
  | 'inventory'
  | 'receivables'
  | 'import'
  | 'settings';

const TAB_HEADERS: Record<NavTab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Executive Business Overview',
    subtitle: 'Key financial metrics, sales velocity, and evidence-backed operational alerts.'
  },
  assistant: {
    title: 'Smart Business Assistant',
    subtitle: 'Ask plain-language questions answered directly from your verified local ledger.'
  },
  sales: {
    title: 'Sales, COGS & Profit Analysis',
    subtitle: 'Product-level net revenue, unit cost coverage, and gross margin breakdown.'
  },
  inventory: {
    title: 'Inventory & Stock Replenishment',
    subtitle: 'Monitor reorder thresholds, 30-day movement velocity, and inactive stock.'
  },
  receivables: {
    title: 'Customer Receivables & Overdue Ledger',
    subtitle: 'Track unpaid wholesale bills, aging days past due, and payment discrepancies.'
  },
  import: {
    title: 'Data Import & Validation Studio',
    subtitle: 'Upload CSV or Excel sheets with row-by-row schema and arithmetic validation.'
  },
  settings: {
    title: 'Workspace Settings & Local Privacy',
    subtitle: 'Configure business thresholds, lead times, and browser IndexedDB storage.'
  }
};

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [dataset, setDataset] = useState<AppDataset | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('last_30_days');

  const [invSearch, setInvSearch] = useState('');
  const [invSort, setInvSort] = useState<'name' | 'stock_asc' | 'sales_desc'>('stock_asc');

  const [recSearch, setRecSearch] = useState('');
  const [recFilter, setRecFilter] = useState<'all' | 'overdue' | 'open' | 'paid' | 'invalid'>('all');

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: 'Namaste! I am your ArthaPulse AI deterministic assistant. Ask me about your sales, gross profit, stock alerts, overdue invoices, or period comparisons.',
      periodLabel: 'Built-in Local Engine Active',
      formulaNote: 'Every figure is calculated directly from your active dataset without external API calls.',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [importCategory, setImportCategory] = useState<ImportCategory>('sales');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace');
  const [importFileName, setImportFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<ImportParseResult<unknown> | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadStoredDataset(), loadStoredSettings()]).then(([ds, cfg]) => {
      setDataset(ds);
      setSettings(cfg);
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'assistant') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  const currentRange = useMemo(() => {
    if (!dataset) {
      return { startDate: '2026-09-15', endDate: '2026-10-14', label: 'Loading...', daySpan: 30 };
    }
    return resolveDateRange(datePreset, dataset);
  }, [dataset, datePreset]);

  const summary = useMemo(() => {
    if (!dataset) return null;
    return calculatePeriodSummary(
      dataset,
      currentRange.startDate,
      currentRange.endDate,
      currentRange.label
    );
  }, [dataset, currentRange]);

  const productPerf = useMemo(() => {
    if (!dataset) return [];
    return calculateProductPerformance(
      dataset.sales,
      currentRange.startDate,
      currentRange.endDate
    );
  }, [dataset, currentRange]);

  const inventoryItems = useMemo(() => {
    if (!dataset) return [];
    return analyzeInventory(dataset, settings.slowMovingDays, settings.leadTimeDays);
  }, [dataset, settings.slowMovingDays, settings.leadTimeDays]);

  const enrichedInvoices = useMemo(() => {
    if (!dataset) return [];
    return analyzeInvoices(dataset.invoices);
  }, [dataset]);

  const insights = useMemo(() => {
    if (!dataset) return [];
    return generateInsights(
      dataset,
      currentRange.startDate,
      currentRange.endDate,
      currentRange.label,
      settings.slowMovingDays,
      settings.leadTimeDays
    );
  }, [dataset, currentRange, settings.slowMovingDays, settings.leadTimeDays]);

  const salesTrendData = useMemo(() => {
    if (!dataset) return [];
    const valid = filterValidSalesInPeriod(
      dataset.sales,
      currentRange.startDate,
      currentRange.endDate
    );
    const map = new Map<string, { date: string; netSales: number; grossProfit: number }>();
    for (const s of valid) {
      const existing = map.get(s.date) || { date: s.date, netSales: 0, grossProfit: 0 };
      const net = s.quantity * s.unit_price - s.discount_amount;
      const gp = s.unit_cost !== null ? net - s.quantity * s.unit_cost : 0;
      existing.netSales += net;
      existing.grossProfit += gp;
      map.set(s.date, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [dataset, currentRange]);

  if (!dataset || !summary) {
    return (
      <div className="empty-state">
        <h2>Loading ArthaPulse AI Workspace...</h2>
      </div>
    );
  }

  const lowStockCount = inventoryItems.filter((i) => i.isLowStock).length;
  const overdueCount = enrichedInvoices.filter((i) => i.isOverdue).length;
  const urgentInsightCount = insights.filter((i) => i.severity === 'Urgent').length;

  const handleResetDemo = async () => {
    if (!window.confirm('Reset to fresh Demo Data? Any custom imported records will be replaced.')) {
      return;
    }
    const demo = generateDemoDataset();
    await saveStoredDataset(demo);
    setDataset(demo);
  };

  const handleDeleteAllData = async () => {
    if (!window.confirm('Delete all locally stored records from this browser? This will clear your custom imports.')) {
      return;
    }
    await clearStoredDataset();
    const emptyDs: AppDataset = {
      sales: [],
      expenses: [],
      inventory: [],
      invoices: [],
      isDemo: false
    };
    await saveStoredDataset(emptyDs);
    setDataset(emptyDs);
  };

  const handleSendQuestion = (qText: string) => {
    if (!qText.trim()) return;
    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: qText.trim(),
      timestamp: nowStr
    };
    const reply = answerBusinessQuestion(qText, dataset, settings, datePreset);
    const botMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      sender: 'assistant',
      text: reply.text,
      periodLabel: reply.periodLabel,
      formulaNote: reply.formulaNote,
      timestamp: nowStr
    };
    setChatHistory((prev) => [...prev, userMsg, botMsg]);
    setChatInput('');
  };

  const handleFileSelected = async (file: File) => {
    setImportErrorMsg(null);
    setImportSuccessMsg(null);
    setImportFileName(file.name);
    try {
      const rawRows = await parseFileToRawRows(file);
      if (importCategory === 'sales') {
        setParseResult(validateSalesRows(rawRows));
      } else if (importCategory === 'expenses') {
        setParseResult(validateExpenseRows(rawRows));
      } else if (importCategory === 'inventory') {
        setParseResult(validateInventoryRows(rawRows));
      } else {
        setParseResult(validateInvoiceRows(rawRows));
      }
    } catch (err) {
      setParseResult(null);
      setImportErrorMsg(err instanceof Error ? err.message : 'Unable to parse file.');
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;
    const updated: AppDataset = {
      ...dataset,
      isDemo: false
    };

    if (importCategory === 'sales') {
      const rows = parseResult.validRows as AppDataset['sales'];
      updated.sales = importMode === 'replace' ? rows : [...dataset.sales, ...rows];
    } else if (importCategory === 'expenses') {
      const rows = parseResult.validRows as AppDataset['expenses'];
      updated.expenses = importMode === 'replace' ? rows : [...dataset.expenses, ...rows];
    } else if (importCategory === 'inventory') {
      const rows = parseResult.validRows as AppDataset['inventory'];
      updated.inventory = importMode === 'replace' ? rows : [...dataset.inventory, ...rows];
    } else {
      const rows = parseResult.validRows as AppDataset['invoices'];
      updated.invoices = importMode === 'replace' ? rows : [...dataset.invoices, ...rows];
    }

    await saveStoredDataset(updated);
    setDataset(updated);
    setImportSuccessMsg(
      `Successfully imported ${parseResult.validRows.length} ${importCategory} record(s) (${importMode.toUpperCase()} mode).`
    );
    setParseResult(null);
  };

  const filteredInventory = inventoryItems
    .filter((i) => i.product_name.toLowerCase().includes(invSearch.toLowerCase()))
    .sort((a, b) => {
      if (invSort === 'name') return a.product_name.localeCompare(b.product_name);
      if (invSort === 'stock_asc') return a.current_stock - b.current_stock;
      return b.recentSalesQty - a.recentSalesQty;
    });

  const filteredReceivables = enrichedInvoices.filter((inv) => {
    const matchesText =
      inv.customer_name.toLowerCase().includes(recSearch.toLowerCase()) ||
      inv.invoice_id.toLowerCase().includes(recSearch.toLowerCase());
    if (!matchesText) return false;
    if (recFilter === 'overdue') return inv.isOverdue;
    if (recFilter === 'open') return inv.status === 'open' && !inv.isInvalid;
    if (recFilter === 'paid') return inv.status === 'paid' && !inv.isInvalid;
    if (recFilter === 'invalid') return inv.isInvalid;
    return true;
  });

  const activeHeader = TAB_HEADERS[activeTab];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-box">
          <div className="brand-logo">AP</div>
          <div>
            <div className="brand-title">ArthaPulse AI</div>
            <div className="brand-sub">Wholesale Decision Support</div>
          </div>
        </div>

        <div className="nav-section-label">Analytics & Operations</div>
        <nav className="nav-list" aria-label="Main Navigation">
          <button
            className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-btn-left">
              <LayoutDashboard size={18} /> Overview
            </span>
            {urgentInsightCount > 0 && (
              <span className="nav-pill nav-pill-urgent" title={`${urgentInsightCount} urgent alert(s)`}>
                {urgentInsightCount}
              </span>
            )}
          </button>

          <button
            className={`nav-btn ${activeTab === 'assistant' ? 'active' : ''}`}
            onClick={() => setActiveTab('assistant')}
          >
            <span className="nav-btn-left">
              <Bot size={18} /> Smart Assistant
            </span>
          </button>

          <button
            className={`nav-btn ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            <span className="nav-btn-left">
              <BarChart3 size={18} /> Sales & Profit
            </span>
          </button>

          <button
            className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <span className="nav-btn-left">
              <Boxes size={18} /> Inventory
            </span>
            {lowStockCount > 0 && (
              <span className="nav-pill nav-pill-urgent" title={`${lowStockCount} low-stock item(s)`}>
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            className={`nav-btn ${activeTab === 'receivables' ? 'active' : ''}`}
            onClick={() => setActiveTab('receivables')}
          >
            <span className="nav-btn-left">
              <FileText size={18} /> Receivables
            </span>
            {overdueCount > 0 && (
              <span className="nav-pill nav-pill-urgent" title={`${overdueCount} overdue invoice(s)`}>
                {overdueCount}
              </span>
            )}
          </button>

          <button
            className={`nav-btn ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <span className="nav-btn-left">
              <FileSpreadsheet size={18} /> Data Import
            </span>
          </button>

          <button
            className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="nav-btn-left">
              <SettingsIcon size={18} /> Settings
            </span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div>100% Local-First Browser Storage</div>
          <div>No Cloud Sync • INR (₹)</div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <span className="business-title">{settings.businessName}</span>
            {dataset.isDemo ? (
              <span className="badge badge-demo">
                <AlertTriangle size={13} /> Demo Data Active
              </span>
            ) : (
              <span className="badge badge-live">
                <CheckCircle2 size={13} /> Custom Imported Dataset
              </span>
            )}
          </div>

          <div className="topbar-controls">
            <div className="control-group">
              <label htmlFor="period-select" className="control-label">
                Analysis Period:
              </label>
              <select
                id="period-select"
                className="select-input"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DateRangePreset)}
              >
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="this_month">This Month</option>
                <option value="previous_month">Previous Month</option>
                <option value="all_data">All Available Data</option>
              </select>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => setActiveTab('import')}
              title="Import CSV or Excel files"
            >
              <Upload size={15} /> Import Data
            </button>

            <button className="btn btn-secondary" onClick={handleResetDemo} title="Restore default demo dataset">
              <RefreshCw size={15} /> Reset Demo
            </button>
          </div>
        </header>

        <main className="page-content">
          <div className="page-intro">
            <div>
              <h1 className="page-title">{activeHeader.title}</h1>
              <p className="page-subtitle">{activeHeader.subtitle}</p>
            </div>
            {activeTab !== 'assistant' && (
              <button className="btn btn-primary" onClick={() => setActiveTab('assistant')}>
                <Bot size={16} /> Ask Smart Assistant
              </button>
            )}
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">Net Sales</div>
                  <div className="kpi-value">{formatINR(summary.netSales)}</div>
                  <div className="kpi-sub">{currentRange.label}</div>
                </div>
                <div className="kpi-card kpi-indigo">
                  <div className="kpi-label">Gross Profit</div>
                  <div className="kpi-value">{formatINR(summary.grossProfit)}</div>
                  <div className="kpi-sub">
                    {summary.hasMissingCost ? 'Missing unit_cost on some rows' : `COGS: ${formatINR(summary.cogs)}`}
                  </div>
                </div>
                <div className="kpi-card kpi-indigo">
                  <div className="kpi-label">Gross Profit Margin</div>
                  <div className="kpi-value">
                    {summary.grossMargin !== null ? `${summary.grossMargin}%` : 'Unavailable'}
                  </div>
                  <div className="kpi-sub">Gross Profit ÷ Net Sales</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Recorded Expenses</div>
                  <div className="kpi-value">{formatINR(summary.totalExpenses)}</div>
                  <div className="kpi-sub">Imported expense vouchers</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Est. Operating Profit</div>
                  <div className="kpi-value">{formatINR(summary.estimatedOperatingProfit)}</div>
                  <div className="kpi-sub">Gross Profit − Recorded Expenses</div>
                </div>
                <div className="kpi-card kpi-alert">
                  <div className="kpi-label">Outstanding Invoices</div>
                  <div className="kpi-value">{formatINR(summary.outstandingReceivables)}</div>
                  <div className="kpi-sub kpi-sub-urgent">
                    Overdue: {formatINR(summary.overdueReceivables)}
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <div className="panel-title">Sales & Gross Profit Trend</div>
                      <div className="panel-subtitle">Daily posted revenue vs. gross contribution</div>
                    </div>
                  </div>
                  {salesTrendData.length === 0 ? (
                    <div className="empty-state">
                      No posted sales recorded in the selected date range.
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: 275 }}>
                      <ResponsiveContainer>
                        <AreaChart data={salesTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(val: number) => formatINR(val)} />
                          <Area
                            type="monotone"
                            dataKey="netSales"
                            name="Net Sales"
                            stroke="#0f766e"
                            fill="#99f6e4"
                          />
                          <Area
                            type="monotone"
                            dataKey="grossProfit"
                            name="Gross Profit"
                            stroke="#4338ca"
                            fill="#c7d2fe"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <div className="panel-title">Top Products by Net Sales & Gross Profit</div>
                      <div className="panel-subtitle">Highest revenue SKUs in {currentRange.label}</div>
                    </div>
                  </div>
                  {productPerf.length === 0 ? (
                    <div className="empty-state">
                      No product movement in this period.
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: 275 }}>
                      <ResponsiveContainer>
                        <BarChart data={productPerf.slice(0, 5)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="product_name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(val: number) => formatINR(val)} />
                          <Bar dataKey="netSales" name="Net Sales" fill="#0f766e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="grossProfit" name="Gross Profit" fill="#4338ca" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">What Needs Attention — Evidence-Backed Insights</div>
                    <div className="panel-subtitle">
                      Automatically verified rules separating accounting facts from operational hypotheses
                    </div>
                  </div>
                </div>
                {insights.length === 0 ? (
                  <div className="empty-state">
                    No operational alerts triggered for this period.
                  </div>
                ) : (
                  <div className="insight-list">
                    {insights.map((ins) => (
                      <div key={ins.id} className={`insight-card severity-${ins.severity}`}>
                        <div>
                          <div className="insight-top">
                            <span className="insight-title">{ins.title}</span>
                            <span
                              className={`badge ${
                                ins.severity === 'Urgent'
                                  ? 'badge-urgent'
                                  : ins.severity === 'Review'
                                  ? 'badge-review'
                                  : 'badge-info'
                              }`}
                            >
                              {ins.severity}
                            </span>
                          </div>
                          <div className="insight-evidence-box" style={{ marginTop: '0.6rem' }}>
                            <strong>Triggered Evidence:</strong> {ins.evidence}
                          </div>
                          <div className="insight-body" style={{ marginTop: '0.6rem' }}>
                            <div>{ins.explanation}</div>
                            <div>
                              <strong>Fact vs. Hypothesis:</strong> {ins.factVsHypothesis}
                            </div>
                          </div>
                        </div>
                        <div className="insight-action">
                          Next Step: {ins.nextAction}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'assistant' && (
            <div className="chat-box">
              <div className="chat-messages">
                {chatHistory.map((msg) => (
                  <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                    <div>{msg.text}</div>
                    {(msg.periodLabel || msg.formulaNote) && (
                      <div className="chat-meta">
                        {msg.periodLabel && (
                          <div>
                            <strong>Relevant Period:</strong> {msg.periodLabel}
                          </div>
                        )}
                        {msg.formulaNote && (
                          <div>
                            <strong>Calculation Basis:</strong> {msg.formulaNote}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="chip-row" aria-label="Suggested business questions">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button key={q} type="button" className="chip-btn" onClick={() => handleSendQuestion(q)}>
                    {q}
                  </button>
                ))}
              </div>

              <form
                className="chat-input-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuestion(chatInput);
                }}
              >
                <input
                  type="text"
                  className="text-input"
                  style={{ flex: 1 }}
                  aria-label="Ask a business question"
                  placeholder="Ask a supported business question (e.g., Which invoices are overdue?)..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                  Ask Assistant
                </button>
              </form>
            </div>
          )}

          {activeTab === 'sales' && (
            <>
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Metric Definitions & Accounting Caveats</div>
                    <div className="panel-subtitle">Pure deterministic formulas applied to posted sales rows</div>
                  </div>
                </div>
                <div className="formula-grid">
                  <div className="formula-card">
                    <strong>Net Sales</strong>
                    Sum of <code>(quantity × unit_price) − discount_amount</code> for valid <code>posted</code> sales rows. Cancelled, void, and returned rows are excluded.
                  </div>
                  <div className="formula-card">
                    <strong>COGS (Cost of Goods Sold)</strong>
                    Sum of <code>quantity × unit_cost</code> for valid posted rows. Missing unit costs are never assumed to be zero.
                  </div>
                  <div className="formula-card">
                    <strong>Gross Profit & Margin</strong>
                    <code>Net Sales − COGS</code> and <code>(Gross Profit ÷ Net Sales) × 100</code> when net sales are greater than zero.
                  </div>
                  <div className="formula-card">
                    <strong>Estimated Operating Profit</strong>
                    <code>Gross Profit − Recorded Expenses</code> in the selected period. Operational estimate only; not a tax figure.
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Product-Level Sales & Gross Margin</div>
                    <div className="panel-subtitle">{currentRange.label}</div>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th className="num-col">Qty Sold</th>
                        <th className="num-col">Net Sales</th>
                        <th className="num-col">COGS</th>
                        <th className="num-col">Gross Profit</th>
                        <th className="num-col">Gross Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productPerf.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty-state">
                            No posted sales rows in this period.
                          </td>
                        </tr>
                      ) : (
                        productPerf.map((p) => (
                          <tr key={p.product_name}>
                            <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                            <td className="num-col">{p.quantitySold}</td>
                            <td className="num-col">{formatINR(p.netSales)}</td>
                            <td className="num-col">
                              {p.hasMissingCost ? 'Unavailable (Missing Cost)' : formatINR(p.cogs)}
                            </td>
                            <td className="num-col" style={{ fontWeight: 600 }}>
                              {p.hasMissingCost ? 'Unavailable' : formatINR(p.grossProfit)}
                            </td>
                            <td className="num-col">
                              {p.grossMargin !== null ? `${p.grossMargin}%` : 'Unavailable'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'inventory' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">Inventory & Stock Alerts</div>
                  <div className="panel-subtitle">
                    Low stock triggers when current stock ≤ reorder level • Slow moving triggers after {settings.slowMovingDays} days without a posted sale
                  </div>
                </div>
                <div className="filter-toolbar">
                  <input
                    type="text"
                    className="text-input"
                    aria-label="Search inventory product"
                    placeholder="Search product name..."
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                  />
                  <select
                    className="select-input"
                    aria-label="Sort inventory"
                    value={invSort}
                    onChange={(e) => setInvSort(e.target.value as 'name' | 'stock_asc' | 'sales_desc')}
                  >
                    <option value="stock_asc">Sort: Lowest Stock First</option>
                    <option value="sales_desc">Sort: Highest 30d Sales</option>
                    <option value="name">Sort: Product Name (A–Z)</option>
                  </select>
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th className="num-col">Current Stock</th>
                      <th className="num-col">Reorder Level</th>
                      <th className="num-col">30-Day Sales Qty</th>
                      <th>Last Sale Date</th>
                      <th>Status</th>
                      <th>Basic Reorder Estimate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-state">
                          No matching inventory items found.
                        </td>
                      </tr>
                    ) : (
                      filteredInventory.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                          <td className="num-col">{item.current_stock}</td>
                          <td className="num-col">{item.reorder_level}</td>
                          <td className="num-col">{item.recentSalesQty}</td>
                          <td className="tabular-nums">{formatIndianDate(item.lastSaleDate)}</td>
                          <td>
                            <div className="filter-toolbar">
                              {item.isLowStock && <span className="badge badge-urgent">Low Stock</span>}
                              {item.isSlowMoving && <span className="badge badge-review">Slow Moving</span>}
                              {!item.isLowStock && !item.isSlowMoving && (
                                <span className="badge badge-info">Healthy</span>
                              )}
                            </div>
                          </td>
                          <td>
                            {item.suggestedReorderQty !== null ? (
                              <span
                                className="tabular-nums"
                                title="Formula: ceil((30d_sales / 30) * lead_time + reorder_level) - current_stock"
                              >
                                Order ~{item.suggestedReorderQty} units (Basic Estimate)
                              </span>
                            ) : item.isLowStock ? (
                              <span style={{ color: 'var(--text-muted)' }}>Low stock (no 30d velocity)</span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'receivables' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">Customer Receivables & Overdue Invoices</div>
                  <div className="panel-subtitle">
                    Overdue bills have passed their due date with an unpaid balance greater than zero
                  </div>
                </div>
                <div className="filter-toolbar">
                  <input
                    type="text"
                    className="text-input"
                    aria-label="Search invoice or customer"
                    placeholder="Search invoice or customer..."
                    value={recSearch}
                    onChange={(e) => setRecSearch(e.target.value)}
                  />
                  <select
                    className="select-input"
                    aria-label="Filter invoices by status"
                    value={recFilter}
                    onChange={(e) =>
                      setRecFilter(e.target.value as 'all' | 'overdue' | 'open' | 'paid' | 'invalid')
                    }
                  >
                    <option value="all">All Invoices</option>
                    <option value="overdue">Overdue Only</option>
                    <option value="open">Open</option>
                    <option value="paid">Paid</option>
                    <option value="invalid">Flagged / Invalid</option>
                  </select>
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Customer</th>
                      <th>Invoice Date</th>
                      <th>Due Date</th>
                      <th className="num-col">Invoice Amt</th>
                      <th className="num-col">Amount Paid</th>
                      <th className="num-col">Outstanding</th>
                      <th className="num-col">Days Overdue</th>
                      <th>Status / Review Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceivables.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="empty-state">
                          No invoices match the current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredReceivables.map((inv) => (
                        <tr key={inv.id} className={inv.isInvalid ? 'row-invalid' : ''}>
                          <td style={{ fontWeight: 600 }}>{inv.invoice_id}</td>
                          <td>{inv.customer_name}</td>
                          <td className="tabular-nums">{formatIndianDate(inv.invoice_date)}</td>
                          <td className="tabular-nums">{formatIndianDate(inv.due_date)}</td>
                          <td className="num-col">{formatINR(inv.invoice_amount)}</td>
                          <td className="num-col">{formatINR(inv.amount_paid)}</td>
                          <td className="num-col" style={{ fontWeight: 600 }}>
                            {formatINR(inv.outstandingAmount)}
                          </td>
                          <td className="num-col">{inv.isOverdue ? `${inv.daysOverdue}d` : '—'}</td>
                          <td>
                            {inv.isInvalid ? (
                              <span className="badge badge-urgent" title={inv.validationIssue || ''}>
                                Invalid: {inv.validationIssue}
                              </span>
                            ) : inv.isOverdue ? (
                              <span className="badge badge-urgent">Overdue</span>
                            ) : inv.status === 'paid' ? (
                              <span className="badge badge-info">Paid</span>
                            ) : (
                              <span className="badge badge-review">{inv.status.toUpperCase()}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">Import CSV or Excel (.xlsx / .xls) Records</div>
                  <div className="panel-subtitle">
                    Select a dataset category below, download its template, or upload your own spreadsheet
                  </div>
                </div>
              </div>

              <div className="segmented-tabs" role="tablist" aria-label="Import dataset category">
                {(['sales', 'expenses', 'inventory', 'invoices'] as ImportCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={importCategory === cat}
                    className={`seg-btn ${importCategory === cat ? 'active' : ''}`}
                    onClick={() => {
                      setImportCategory(cat);
                      setParseResult(null);
                      setImportErrorMsg(null);
                      setImportSuccessMsg(null);
                    }}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="template-banner">
                <div>
                  <strong>Active Schema: {importCategory.toUpperCase()}</strong> — Header capitalization and extra spaces are matched automatically.
                </div>
                <button className="btn btn-secondary" onClick={() => downloadTemplate(importCategory)}>
                  <Download size={15} /> Download {importCategory.toUpperCase()} CSV Template
                </button>
              </div>

              <div className="radio-row">
                <span className="field-label">Import Mode:</span>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="imp-mode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  Replace existing {importCategory} records
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="imp-mode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                  />
                  Append to existing {importCategory} records
                </label>
              </div>

              <label
                className="dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFileSelected(f);
                }}
              >
                <Upload size={30} style={{ color: 'var(--brand-primary)', marginBottom: '0.55rem' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  Drag & drop your {importCategory} .csv, .xlsx, or .xls file here, or click to browse
                </div>
                <div className="field-hint" style={{ marginTop: '0.25rem' }}>
                  Files are parsed locally in your browser and validated before saving.
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f);
                  }}
                />
              </label>

              {importErrorMsg && (
                <div className="badge badge-urgent" style={{ marginTop: '1rem', padding: '0.75rem' }}>
                  {importErrorMsg}
                </div>
              )}

              {importSuccessMsg && (
                <div className="badge badge-info" style={{ marginTop: '1rem', padding: '0.75rem' }}>
                  {importSuccessMsg}
                </div>
              )}

              {parseResult && (
                <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
                  <h4>Validation Preview for: {importFileName}</h4>

                  {parseResult.missingHeaders.length > 0 && (
                    <div className="badge badge-urgent" style={{ padding: '0.75rem' }}>
                      Missing required column headers: {parseResult.missingHeaders.join(', ')}
                    </div>
                  )}

                  {parseResult.warnings.map((w, idx) => (
                    <div key={idx} className="badge badge-review" style={{ padding: '0.75rem' }}>
                      <Info size={15} /> {w}
                    </div>
                  ))}

                  <div className="filter-toolbar">
                    <span className="badge badge-info">Accepted Rows: {parseResult.validRows.length}</span>
                    <span className="badge badge-urgent">Rejected Rows: {parseResult.errors.length}</span>
                  </div>

                  {parseResult.errors.length > 0 && (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Row #</th>
                            <th>Field</th>
                            <th>Validation Problem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parseResult.errors.slice(0, 15).map((err, i) => (
                            <tr key={i} className="row-invalid">
                              <td className="tabular-nums">Row {err.rowNumber}</td>
                              <td>{err.field}</td>
                              <td>{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {parseResult.validRows.length > 0 && (
                    <div>
                      <button className="btn btn-primary" onClick={handleConfirmImport}>
                        Confirm & {importMode === 'replace' ? 'Replace' : 'Append'} {parseResult.validRows.length} Valid Row(s)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="panel" style={{ maxWidth: 680 }}>
              <div className="panel-header">
                <div>
                  <div className="panel-title">Workspace Settings & Data Privacy</div>
                  <div className="panel-subtitle">Changes are saved automatically to your local browser</div>
                </div>
              </div>

              <div className="settings-grid">
                <div className="field-group">
                  <label htmlFor="biz-name-input" className="field-label">
                    Business Name (Header Display)
                  </label>
                  <input
                    id="biz-name-input"
                    type="text"
                    className="text-input"
                    value={settings.businessName}
                    onChange={(e) => {
                      const next = { ...settings, businessName: e.target.value };
                      setSettings(next);
                      saveStoredSettings(next);
                    }}
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="currency-input" className="field-label">
                    Currency (Fixed for MVP)
                  </label>
                  <input
                    id="currency-input"
                    type="text"
                    className="text-input"
                    value="INR (₹) — Indian Rupee"
                    disabled
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="slow-days-input" className="field-label">
                    Slow-Moving Stock Threshold (Days Without Sale)
                  </label>
                  <input
                    id="slow-days-input"
                    type="number"
                    min={1}
                    max={365}
                    className="text-input"
                    value={settings.slowMovingDays}
                    onChange={(e) => {
                      const days = Math.max(1, Number(e.target.value) || 30);
                      const next = { ...settings, slowMovingDays: days };
                      setSettings(next);
                      saveStoredSettings(next);
                    }}
                  />
                  <span className="field-hint">
                    Products with no posted sales within this window are flagged as Slow Moving.
                  </span>
                </div>

                <div className="field-group">
                  <label htmlFor="lead-days-input" className="field-label">
                    Supplier Lead Time (Days — Used for Basic Reorder Estimate)
                  </label>
                  <input
                    id="lead-days-input"
                    type="number"
                    min={1}
                    max={90}
                    className="text-input"
                    value={settings.leadTimeDays}
                    onChange={(e) => {
                      const days = Math.max(1, Number(e.target.value) || 7);
                      const next = { ...settings, leadTimeDays: days };
                      setSettings(next);
                      saveStoredSettings(next);
                    }}
                  />
                </div>

                <div className="notice-box">
                  <strong>Storage Status:</strong> Stored in this browser on this device (IndexedDB). No imported records are transmitted to any remote server.
                </div>

                <div className="filter-toolbar">
                  <button className="btn btn-secondary" onClick={handleResetDemo}>
                    <RefreshCw size={15} /> Reset Demo Data
                  </button>
                  <button className="btn btn-danger" onClick={handleDeleteAllData}>
                    <Trash2 size={15} /> Delete All Imported Data
                  </button>
                </div>

                <div className="disclaimer-box">
                  <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    <strong>Disclaimer:</strong> ArthaPulse AI is a decision-support prototype and not a statutory accounting, GST-filing, or ERP system. Always verify critical financial and tax decisions with your accountant.
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}