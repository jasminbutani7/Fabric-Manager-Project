import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  PieChart,
  Layers,
  Sparkles,
  Search,
  Eye,
} from 'lucide-react';
import { useFinance } from '../context/domain';
import InvoiceDetailsModal from '../components/modals/InvoiceDetailsModal';
import CustomSelect from '../components/common/CustomSelect';

export default function FinancialDashboard() {
  const {
    invoices = [],
    expenses = [],
    invoiceExpenses = [],
    getFinancialDecisionData,
  } = useFinance();

  // Sub-tabs: 'overview' | 'pnl'
  const [dashboardSubTab, setDashboardSubTab] = useState('overview');
  const [selectedInvoiceForDoc, setSelectedInvoiceForDoc] = useState(null);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('all');

  // Current year-month default
  const currentYM = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(currentYM);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Available months list for picker
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    monthsSet.add(currentYM);

    // Pre-populate last 6 calendar months
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    invoices.forEach((inv) => {
      if (inv.date && inv.date.length >= 7) monthsSet.add(inv.date.slice(0, 7));
    });
    expenses.forEach((exp) => {
      if (exp.date && exp.date.length >= 7) monthsSet.add(exp.date.slice(0, 7));
    });

    return Array.from(monthsSet).sort().reverse();
  }, [invoices, expenses, currentYM]);

  // Compute live financial decision data for the selected month
  const decisionData = useMemo(() => {
    return getFinancialDecisionData(selectedMonth);
  }, [getFinancialDecisionData, selectedMonth]);

  const {
    revenue = { invoiced: 0, collected: 0, pending: 0, overdue: 0 },
    costs = {
      fabric: 0,
      tailorLabor: 0,
      overhead: 0,
      rent: 0,
      maintenance: 0,
      lightBill: 0,
      masterSalary: 0,
      helperSalary: 0,
      other: 0,
      total: 0,
    },
    profitability = { grossProfit: 0, netProfit: 0, marginPercent: '0.0', isProfitable: true },
    growthTrends = [],
  } = decisionData;

  // Format currency in Indian standard (₹)
  const formatINR = (amt) => {
    const val = parseFloat(amt) || 0;
    return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  // Month label helper
  const getMonthLabel = (ym) => {
    if (ym === 'all') return 'All Time';
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(d);
  };

  // Junction-linked invoices summary (Direct invoice revenue vs linked expenses)
  const junctionLotSummaries = useMemo(() => {
    return invoices
      .filter((inv) => (selectedMonth === 'all' ? true : inv.date && inv.date.startsWith(selectedMonth)))
      .map((inv) => {
        const links = invoiceExpenses.filter((ie) => ie.invoiceId === inv.id);
        const directCost = links.reduce((s, l) => s + (parseFloat(l.allocatedAmount) || 0), 0);
        const invRev = parseFloat(inv.totalAmount) || 0;
        const lotProfit = invRev - directCost;
        const lotMargin = invRev > 0 ? ((lotProfit / invRev) * 100).toFixed(1) : 0;
        return {
          invoice: inv,
          directCost,
          profit: lotProfit,
          margin: lotMargin,
          linksCount: links.length,
        };
      });
  }, [invoices, invoiceExpenses, selectedMonth]);

  // Filtered invoices for the P&L and documents breakdown tab
  const filteredDocInvoices = useMemo(() => {
    const todayDateStr = new Date().toISOString().split('T')[0];
    return invoices.filter((inv) => {
      if (selectedMonth !== 'all') {
        if (!inv.date || !inv.date.startsWith(selectedMonth)) return false;
      }
      const isOverdue =
        inv.dueDate && inv.dueDate < todayDateStr && (parseFloat(inv.pendingAmount) || 0) > 0;
      if (docStatusFilter === 'Overdue' && !isOverdue) return false;
      if (docStatusFilter === 'Paid' && inv.status !== 'Paid') return false;
      if (docStatusFilter === 'Partial' && inv.status !== 'Partial') return false;
      if (docStatusFilter === 'Unpaid' && inv.status !== 'Unpaid') return false;

      if (docSearchQuery.trim()) {
        const q = docSearchQuery.toLowerCase();
        const numMatch = inv.invoiceNumber?.toLowerCase().includes(q);
        const clientMatch = (inv.supplierName || inv.clientName)?.toLowerCase().includes(q);
        const compMatch = inv.clientCompany?.toLowerCase().includes(q);
        const phoneMatch = (inv.supplierPhone || inv.clientPhone)?.includes(q);
        const fabricMatch =
          inv.fabricType?.toLowerCase().includes(q) ||
          inv.fabricColor?.toLowerCase().includes(q);
        if (!numMatch && !clientMatch && !compMatch && !phoneMatch && !fabricMatch) return false;
      }
      return true;
    });
  }, [invoices, selectedMonth, docStatusFilter, docSearchQuery]);

  // Graph sizing & calculations
  const graphWidth = 640;
  const graphHeight = 220;
  const paddingX = 40;
  const paddingY = 25;

  const validTrends = growthTrends.length > 0 ? growthTrends : [
    { label: 'This Mo', revenue: revenue.invoiced, expenses: costs.total, netProfit: profitability.netProfit, month: currentYM }
  ];

  const maxVal = Math.max(
    ...validTrends.map((t) => Math.max(t.revenue, t.expenses, Math.abs(t.netProfit))),
    1000
  );

  const getX = (idx) => {
    if (validTrends.length <= 1) return graphWidth / 2;
    return paddingX + (idx / (validTrends.length - 1)) * (graphWidth - paddingX * 2);
  };

  const getY = (val) => {
    const clamped = Math.max(0, val);
    return graphHeight - paddingY - (clamped / maxVal) * (graphHeight - paddingY * 2);
  };

  // Build SVG path strings
  const revenuePoints = validTrends.map((t, i) => `${getX(i)},${getY(t.revenue)}`).join(' ');
  const expensePoints = validTrends.map((t, i) => `${getX(i)},${getY(t.expenses)}`).join(' ');
  const profitPoints = validTrends.map((t, i) => `${getX(i)},${getY(Math.max(0, t.netProfit))}`).join(' ');

  const revenueArea = `${getX(0)},${graphHeight - paddingY} ${revenuePoints} ${getX(validTrends.length - 1)},${graphHeight - paddingY}`;
  const expenseArea = `${getX(0)},${graphHeight - paddingY} ${expensePoints} ${getX(validTrends.length - 1)},${graphHeight - paddingY}`;

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar with Month Calendar Filter */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black border border-emerald-100/80 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Company Profit &amp; Loss Dashboard
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Real-time factory financial performance, growth analytics &amp; margins
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector / Calendar Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth(currentYM)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedMonth === currentYM
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              This Month
            </button>
          </div>

          <div className="min-w-[170px]">
            <CustomSelect
              value={selectedMonth}
              onChange={(val) => setSelectedMonth(val)}
              options={[
                { value: 'all', label: 'All Available Records' },
                ...availableMonths.map((m) => ({
                  value: m,
                  label: getMonthLabel(m),
                })),
              ]}
              placeholder="Filter Month"
              theme="emerald"
            />
          </div>
        </div>
      </div>

      {/* 2 Sub-Tabs: Analytics Overview vs P&L (Full Invoices Data & Document) */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 text-center shadow-2xs">
        <button
          type="button"
          onClick={() => setDashboardSubTab('overview')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            dashboardSubTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5 font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp
            className={`w-3.5 h-3.5 ${
              dashboardSubTab === 'overview' ? 'text-emerald-600' : 'text-slate-400'
            }`}
          />
          <span>Analytics &amp; Growth Graph</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardSubTab('pnl')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            dashboardSubTab === 'pnl'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5 font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText
            className={`w-3.5 h-3.5 ${
              dashboardSubTab === 'pnl' ? 'text-indigo-600' : 'text-slate-400'
            }`}
          />
          <span>P&amp;L Statement &amp; Invoices</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none shrink-0 ${
              dashboardSubTab === 'pnl'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-slate-200/70 text-slate-600'
            }`}
          >
            {invoices.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: OVERVIEW & ANALYTICS GRAPH */}
      {dashboardSubTab === 'overview' && (
        <div className="space-y-4">
          {/* 2. Hero Company Profit or Loss Banner */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border transition-all ${
          profitability.isProfitable
            ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border-emerald-200/80 shadow-xs'
            : 'bg-gradient-to-br from-rose-50/90 via-orange-50/40 to-white border-rose-200/80 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  profitability.isProfitable
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                    : 'bg-rose-100 text-rose-800 border border-rose-200/80'
                }`}
              >
                {profitability.isProfitable ? (
                  <>
                    <TrendingUp className="w-3 h-3" /> Net Profit
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3" /> Net Loss
                  </>
                )}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Period: {getMonthLabel(selectedMonth)}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h1
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  profitability.isProfitable ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {profitability.isProfitable ? '+' : ''}
                {formatINR(profitability.netProfit)}
              </h1>
              <span
                className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                  profitability.isProfitable
                    ? 'bg-emerald-200/60 text-emerald-900'
                    : 'bg-rose-200/60 text-rose-900'
                }`}
              >
                {profitability.marginPercent}% Net Margin
              </span>
            </div>

            <p className="text-[11px] text-slate-600 font-medium">
              Gross Profit: <span className="font-bold text-slate-900">{formatINR(profitability.grossProfit)}</span>
              {' '}• Invoiced: <span className="font-bold text-slate-900">{formatINR(revenue.invoiced)}</span>
              {' '}• Total Costs: <span className="font-bold text-slate-900">{formatINR(costs.total)}</span>
            </p>
          </div>

          {/* Quick Financial Ratios Pill */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 shrink-0">
            <div className="bg-white/80 backdrop-blur-xs rounded-xl p-2.5 border border-slate-200/70 min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Collected Cash</span>
              <span className="text-sm font-black text-emerald-600">{formatINR(revenue.collected)}</span>
              <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${revenue.invoiced > 0 ? Math.min(100, Math.round((revenue.collected / revenue.invoiced) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs rounded-xl p-2.5 border border-slate-200/70 min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Pending / Due</span>
              <span className="text-sm font-black text-amber-600">{formatINR(revenue.pending)}</span>
              <span className="text-[10px] text-slate-400 font-medium block mt-1">
                {revenue.overdue > 0 ? `${formatINR(revenue.overdue)} Overdue` : 'No overdue bills'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. High-Level KPI Breakdown Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Invoiced Revenue */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Total Invoiced</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900">{formatINR(revenue.invoiced)}</p>
          <p className="text-[10px] text-slate-500 font-medium">Customer &amp; Supplier bills</p>
        </div>

        {/* Recorded Expenses (From Expenses Tab) */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Recorded Expenses</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900">{formatINR(costs.recordedExpenses || costs.overhead || 0)}</p>
          <p className="text-[10px] text-slate-500 font-medium">Rent, Light, Staff salaries</p>
        </div>

        {/* Direct Lot Costs (From Junction Table) */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Linked Lot Costs</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900">{formatINR(costs.junctionCosts || 0)}</p>
          <p className="text-[10px] text-slate-500 font-medium">Invoice-linked material &amp; labor</p>
        </div>

        {/* Net Business Profit */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Net Result</span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                profitability.isProfitable ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {profitability.isProfitable ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
          <p
            className={`text-base sm:text-lg font-black ${
              profitability.isProfitable ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {profitability.isProfitable ? '+' : ''}{formatINR(profitability.netProfit)}
          </p>
          <p className="text-[10px] font-semibold text-slate-500">{profitability.marginPercent}% Net Margin</p>
        </div>
      </div>

      {/* 4. Interactive Growth Graph (SVG Area / Trend Line) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Company Revenue vs. Expense Growth Trajectory
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Month-over-month trend showing income expansion and cost control
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-indigo-600">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
              Revenue
            </span>
            <span className="flex items-center gap-1 text-rose-500">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Expenses
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              Net Profit
            </span>
          </div>
        </div>

        {/* SVG Chart Container */}
        <div className="w-full overflow-x-auto pb-1">
          <div className="min-w-[500px] relative">
            <svg
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              className="w-full h-48 sm:h-56 overflow-visible"
            >
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingY + ratio * (graphHeight - paddingY * 2);
                return (
                  <g key={i}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={graphWidth - paddingX}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                  </g>
                );
              })}

              {/* Area Fills */}
              <polygon points={revenueArea} fill="url(#revGrad)" />
              <polygon points={expenseArea} fill="url(#expGrad)" />

              {/* Trend Lines */}
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={revenuePoints}
              />
              <polyline
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={expensePoints}
              />
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={profitPoints}
              />

              {/* Data Points */}
              {validTrends.map((t, idx) => {
                const cx = getX(idx);
                const cyRev = getY(t.revenue);
                const cyExp = getY(t.expenses);
                const isHovered = hoveredPoint === idx;

                return (
                  <g key={idx}>
                    {/* Month X-Axis Label */}
                    <text
                      x={cx}
                      y={graphHeight - 6}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-slate-400"
                    >
                      {t.label}
                    </text>

                    {/* Revenue Dot */}
                    <circle
                      cx={cx}
                      cy={cyRev}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />

                    {/* Expense Dot */}
                    <circle
                      cx={cx}
                      cy={cyExp}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="#f43f5e"
                      strokeWidth="2.5"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint !== null && validTrends[hoveredPoint] && (
              <div
                className="absolute top-2 pointer-events-none bg-slate-900 text-white rounded-xl px-3 py-2 text-[11px] shadow-lg space-y-0.5 border border-slate-800 z-10 transition-all"
                style={{
                  left: `${Math.min(
                    graphWidth - 140,
                    Math.max(10, getX(hoveredPoint) - 50)
                  )}px`,
                }}
              >
                <div className="font-bold text-slate-300 border-b border-slate-800 pb-1">
                  {validTrends[hoveredPoint].label} Overview
                </div>
                <div className="text-indigo-300 flex justify-between gap-3">
                  <span>Revenue:</span>
                  <span className="font-extrabold">{formatINR(validTrends[hoveredPoint].revenue)}</span>
                </div>
                <div className="text-rose-300 flex justify-between gap-3">
                  <span>Expenses:</span>
                  <span className="font-extrabold">{formatINR(validTrends[hoveredPoint].expenses)}</span>
                </div>
                <div className="text-emerald-300 flex justify-between gap-3 font-black pt-0.5 border-t border-slate-800">
                  <span>Profit:</span>
                  <span>{formatINR(validTrends[hoveredPoint].netProfit)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Cost Structure Breakdown & Expense Junction Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Cost Distribution Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-indigo-600" />
            Cost Allocation Structure
          </h3>

          {costs.total === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs font-medium space-y-1">
              <p className="font-black text-slate-700">₹0 Expenses Recorded</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                No factory expenses or lot direct costs recorded for this period. Total invoiced revenue of {formatINR(revenue.invoiced)} is 100% net business profit.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Linked Lot Direct Costs */}
              {(costs.junctionCosts || 0) > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      Invoice-Linked Direct Costs
                    </span>
                    <span>{formatINR(costs.junctionCosts)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{
                        width: `${costs.total > 0 ? (costs.junctionCosts / costs.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Staff Salaries */}
              {(costs.masterSalary + costs.helperSalary) > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Master &amp; Helper Salaries
                    </span>
                    <span>{formatINR(costs.masterSalary + costs.helperSalary)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${
                          costs.total > 0
                            ? ((costs.masterSalary + costs.helperSalary) / costs.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Factory Overheads */}
              {(costs.rent + costs.lightBill + costs.maintenance) > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                      Rent, Electricity &amp; Repairs
                    </span>
                    <span>{formatINR(costs.rent + costs.lightBill + costs.maintenance)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{
                        width: `${
                          costs.total > 0
                            ? ((costs.rent + costs.lightBill + costs.maintenance) / costs.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Other Misc */}
              {(costs.other || 0) > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      Daily Misc &amp; Other
                    </span>
                    <span>{formatINR(costs.other)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{
                        width: `${costs.total > 0 ? (costs.other / costs.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Junction Table Links Summary */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Invoice &amp; Expense Junctions
            </h3>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {junctionLotSummaries.length} Invoices
            </span>
          </div>

          {junctionLotSummaries.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs font-medium space-y-1">
              <p>No invoices created yet for this period.</p>
              <p className="text-[10px] text-slate-400">
                Invoices generated from completed fabric lots will link directly to their material and labor expenses here.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {junctionLotSummaries.slice(0, 5).map(({ invoice, directCost: _directCost, profit, margin }) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-extrabold text-slate-900 truncate">
                      {invoice.invoiceNumber || 'INV-Lot'}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {invoice.clientName || 'Direct Vendor'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-slate-900">{formatINR(invoice.totalAmount)}</div>
                    <div
                      className={`text-[10px] font-bold ${
                        profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {profit >= 0 ? '+' : ''}{formatINR(profit)} ({margin}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: P&L (FULL INVOICES DATA AS DETAILS & INVOICE DOCUMENT)             */}
      {/* ========================================================================= */}
      {dashboardSubTab === 'pnl' && (
        <div className="space-y-4">
          {/* Executive P&L Verdict Banner */}
          <div
            className={`rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white ${
              profitability.isProfitable
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 shadow-xs'
                : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-100">
                  Business Performance Verdict • {getMonthLabel(selectedMonth)}
                </h3>
              </div>
              <p className="text-xl sm:text-2xl font-black mt-1">
                {profitability.isProfitable
                  ? `Net Profit: +${formatINR(profitability.netProfit)}`
                  : `Net Loss: -${formatINR(Math.abs(profitability.netProfit))}`}
              </p>
              <p className="text-xs opacity-90 mt-0.5 max-w-xl">
                {profitability.isProfitable
                  ? `Operations achieved a ${profitability.marginPercent}% net profit margin after all fabric outlays, labor & factory overheads.`
                  : `Expenses and fabric production costs exceeded total billed invoice revenue.`}
              </p>
            </div>

            <div className="bg-white/20 backdrop-blur-md px-3.5 py-2 rounded-xl text-center shrink-0 self-end sm:self-auto border border-white/20">
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">
                Net Profit Margin
              </span>
              <span className="text-lg font-black">{profitability.marginPercent}%</span>
            </div>
          </div>

          {/* Full Financial Statement Breakdown */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <span>Executive Income &amp; Expenditure Statement</span>
              <span className="text-slate-400 font-normal lowercase">{getMonthLabel(selectedMonth)}</span>
            </h3>

            {/* 1. Invoiced Revenue */}
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1 font-black text-slate-900 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>1. Gross Invoiced Revenue</span>
                </div>
                <span className="text-emerald-700">+{formatINR(revenue.invoiced)}</span>
              </div>
              <div className="pl-5 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between p-1.5 rounded-lg bg-slate-50">
                  <span>Actual Cash Collected</span>
                  <span className="font-bold text-slate-900">{formatINR(revenue.collected)}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded-lg bg-slate-50 text-amber-800">
                  <span>Accounts Receivable (Pending Due)</span>
                  <span className="font-bold">{formatINR(revenue.pending)}</span>
                </div>
              </div>
            </div>

            {/* 2. Direct Costs (COGS) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1 font-black text-slate-900 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span>2. Direct Production Costs (COGS)</span>
                </div>
                <span className="text-rose-700">-{formatINR(costs.fabric + costs.tailorLabor + (costs.junctionCosts || 0))}</span>
              </div>
              <div className="pl-5 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between p-1.5 rounded-lg bg-slate-50">
                  <span>Fabric Raw Materials</span>
                  <span className="font-bold text-slate-900">{formatINR(costs.fabric)}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded-lg bg-slate-50">
                  <span>Tailor Piece-Rate Stitching Labor</span>
                  <span className="font-bold text-slate-900">{formatINR(costs.tailorLabor)}</span>
                </div>
                {(costs.junctionCosts || 0) > 0 && (
                  <div className="flex justify-between p-1.5 rounded-lg bg-slate-50">
                    <span>Invoice-Linked Direct Expenses</span>
                    <span className="font-bold text-slate-900">{formatINR(costs.junctionCosts)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Gross Profit Margin Subtotal */}
            <div className="flex justify-between items-center py-2 px-3 bg-slate-100/90 rounded-xl text-xs font-black text-slate-800">
              <span>Gross Operating Contribution</span>
              <span className={profitability.grossProfit >= 0 ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'}>
                {profitability.grossProfit >= 0 ? '+' : ''}{formatINR(profitability.grossProfit)}
              </span>
            </div>

            {/* 3. Factory Operating Overheads */}
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1 font-black text-slate-900 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>3. Factory Operating Overheads</span>
                </div>
                <span className="text-rose-700">-{formatINR(costs.overhead || costs.recordedExpenses || 0)}</span>
              </div>
              <div className="pl-5 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between p-1.5 rounded-lg bg-slate-50">
                  <span>Master Salaries</span>
                  <span className="font-bold text-slate-900">{formatINR(costs.masterSalary)}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded-lg bg-slate-50">
                  <span>Helper Salaries</span>
                  <span className="font-bold text-slate-900">{formatINR(costs.helperSalary)}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded-lg bg-slate-50">
                  <span>Factory Rent, Power &amp; Maintenance</span>
                  <span className="font-bold text-slate-900">{formatINR(costs.rent + costs.lightBill + costs.maintenance)}</span>
                </div>
                {costs.other > 0 && (
                  <div className="flex justify-between p-1.5 rounded-lg bg-slate-50">
                    <span>Other Miscellaneous Daily Expenses</span>
                    <span className="font-bold text-slate-900">{formatINR(costs.other)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Net Profit Bottom-Line Callout */}
            <div
              className={`flex justify-between items-center p-3.5 rounded-xl border text-sm sm:text-base font-black ${
                profitability.isProfitable
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50/80 border-rose-300 text-rose-950'
              }`}
            >
              <div>
                <span>Net Business Profit (Bottom Line)</span>
                <p className="text-[10px] font-medium text-slate-500">
                  Invoiced Revenue - (Direct Material &amp; Labor + Factory Overheads)
                </p>
              </div>
              <span className="text-base sm:text-lg">
                {profitability.isProfitable ? '+' : ''}{formatINR(profitability.netProfit)}
              </span>
            </div>
          </div>

          {/* Full Customer Billing Invoices & Official Document Ledger */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Customer Billing Invoices &amp; Official Documents</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {filteredDocInvoices.length} Invoices
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Review complete invoice records, payment collections, linked expenses and open printable invoice documents.
                </p>
              </div>
            </div>

            {/* Search & Status Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search invoice #, client name, phone or company..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {['all', 'Paid', 'Partial', 'Unpaid', 'Overdue'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setDocStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      docStatusFilter === status
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status === 'all' ? 'All Invoices' : status}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoices List / Table */}
            {filteredDocInvoices.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">No Invoices Found</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  No invoice records match the selected month filter or search query.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocInvoices.map((inv) => {
                  const totalAmt = parseFloat(inv.totalAmount) || 0;
                  const paidAmt = parseFloat(inv.paidAmount) || 0;
                  const pendingAmt = parseFloat(inv.pendingAmount) || 0;
                  const todayDateStr = new Date().toISOString().split('T')[0];
                  const isOverdue = inv.dueDate && inv.dueDate < todayDateStr && pendingAmt > 0;

                  return (
                    <div
                      key={inv.id}
                      className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : inv.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : inv.status === 'Partial'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {isOverdue ? 'Overdue' : inv.status}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-900">
                              #{inv.invoiceNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {inv.supplierName || inv.clientName}
                            </span>
                            {inv.clientCompany && (
                              <span className="text-[10px] font-semibold text-slate-500 truncate">
                                ({inv.clientCompany})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                            <span>Date: {inv.date || 'N/A'}</span>
                            {inv.dueDate && (
                              <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                                Due: {inv.dueDate}
                              </span>
                            )}
                            {inv.fabricType && (
                              <span className="text-indigo-600 font-medium truncate">
                                • {inv.fabricType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <div className="text-xs sm:text-sm font-black text-slate-900">
                            {formatINR(totalAmt)}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 sm:justify-end">
                            <span className="text-emerald-600 font-semibold">
                              Paid: {formatINR(paidAmt)}
                            </span>
                            {pendingAmt > 0 && (
                              <span className="text-rose-600 font-semibold">
                                • Due: {formatINR(pendingAmt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* View Document Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForDoc(inv)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200/80 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
                          title="Open official formatted invoice document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Document</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Invoice Document Modal */}
      {selectedInvoiceForDoc && (
        <InvoiceDetailsModal
          isOpen={Boolean(selectedInvoiceForDoc)}
          onClose={() => setSelectedInvoiceForDoc(null)}
          invoice={selectedInvoiceForDoc}
        />
      )}
    </div>
  );
}