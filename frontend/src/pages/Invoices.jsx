import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  FileText,
  Plus,
  Search,
  AlertTriangle,
  Calendar,
  Clock,
  Layers,
  CreditCard,
  Trash2,
  Edit3,
  Eye,
  Share2,
  Sparkles,
  Truck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useFinance, useFabric, useProduction } from '../context/useManagement';
import { useAuth } from '../context/useAuth';
import AddInvoiceModal from '../components/modals/AddInvoiceModal';
import InvoiceDetailsModal from '../components/modals/InvoiceDetailsModal';
import RecordInvoicePaymentModal from '../components/modals/RecordInvoicePaymentModal';
import AlertModal from '../components/modals/AlertModal';
import CustomSelect from '../components/common/CustomSelect';
import PaginationControls from '../components/common/PaginationControls';

export default function Invoices({ embedded = false }) {
  const {
    invoices = [],
    expenses = [],
    deleteInvoice,
    getFinancialDecisionData,
    fetchHistoricalInvoicesPaginated,
  } = useFinance();
  const { fabrics = [] } = useFabric();
  const { tailorAssignments = [] } = useProduction();
  const { currentUser } = useAuth();

  // Expanded cards state for compact / detailed card views
  const [expandedCardIds, setExpandedCardIds] = useState(() => new Set());
  const toggleCardExpand = (id) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const handleExpandAll = (ids) => setExpandedCardIds(new Set(ids));
  const handleCollapseAll = () => setExpandedCardIds(new Set());

  // Selected Month filter: 'all' or 'YYYY-MM'
  const today = new Date();
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentYM);

  // Search & Filter for Invoices tab
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Paid' | 'Partial' | 'Unpaid' | 'Overdue'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [prevFilterKey, setPrevFilterKey] = useState('');
  const currentFilterKey = `${selectedMonth}_${statusFilter}_${searchQuery}`;

  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
  }

  // Modals state
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [selectedFabricForInvoice, setSelectedFabricForInvoice] = useState(null);
  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);


  // Alert/Confirm modal state
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    confirmText: 'OK',
    onConfirm: null,
  });

  // Fabric lots ready for billing that do not have an invoice yet
  const completedFabricLots = useMemo(() => {
    return fabrics.filter((f) => {
      const hasInvoice = invoices.some(
        (inv) =>
          inv.fabricId === f.id ||
          (inv.items || []).some((it) => it.fabricId === f.id)
      );
      if (hasInvoice) return false;
      return (f.status === 'Completed' || f.status === 'Delivered');
    });
  }, [fabrics, invoices]);

  // Extract distinct available months from data
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    monthsSet.add(currentYM);

    invoices.forEach((inv) => {
      if (inv.date) monthsSet.add(inv.date.slice(0, 7));
    });
    expenses.forEach((exp) => {
      if (exp.date) monthsSet.add(exp.date.slice(0, 7));
    });
    fabrics.forEach((f) => {
      if (f.date) monthsSet.add(f.date.slice(0, 7));
    });
    tailorAssignments.forEach((a) => {
      (a.dailySubmissions || []).forEach((s) => {
        if (s.date) monthsSet.add(s.date.slice(0, 7));
      });
    });

    return Array.from(monthsSet).sort().reverse();
  }, [invoices, expenses, fabrics, tailorAssignments, currentYM]);

  // Compute live financial decision data for selected month
  const decisionData = useMemo(() => {
    return getFinancialDecisionData(selectedMonth);
  }, [getFinancialDecisionData, selectedMonth]);

  const {
    revenue = { invoiced: 0, collected: 0, pending: 0, overdue: 0, overdueCount: 0 },
  } = decisionData;

  // Calculate Expected Profit across fabric lots: Price Per Set * Sets
  const { totalExpectedSets, expectedFabricProfit } = useMemo(() => {
    let totalSets = 0;
    let totalExpected = 0;

    fabrics.forEach((f) => {
      let sets = parseInt(f.target_sets || f.targetSets || f.totalSets || f.total_sets, 10) || 0;
      const fCuttings = f.cutting_records || f.cuttingRecords || [];
      let pieces = 0;
      fCuttings.forEach((c) => {
        pieces += parseInt(c.totalPieces || c.total_pieces || c.quantity, 10) || 0;
        if (c.setsCount || c.sets_count) {
          sets = Math.max(sets, parseInt(c.setsCount || c.sets_count, 10) || 0);
        }
      });
      const calculatedSets =
        sets > 0
          ? sets
          : pieces > 0
            ? Math.max(1, Math.round(pieces / 4))
            : f.cutPieces
              ? Math.floor(parseFloat(f.cutPieces) / 2)
              : 0;

      const pricePerSet =
        parseFloat(f.price_per_set || f.pricePerSet || f.sellingPrice || f.pricePerPiece || f.price) ||
        (f.suitRate ? parseFloat(f.suitRate) : 0) ||
        150;

      totalSets += calculatedSets;
      totalExpected += calculatedSets * pricePerSet;
    });

    return { totalExpectedSets: totalSets, expectedFabricProfit: totalExpected };
  }, [fabrics]);

  // Filter invoices for Invoices Tab
  const todayStr = today.toISOString().split('T')[0];

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Month check
      if (selectedMonth !== 'all') {
        if (!inv.date || !inv.date.startsWith(selectedMonth)) return false;
      }

      // Status check
      const isOverdue = inv.dueDate && inv.dueDate < todayStr && (parseFloat(inv.pendingAmount) || 0) > 0;
      if (statusFilter === 'Overdue' && !isOverdue) return false;
      if (statusFilter === 'Paid' && inv.status !== 'Paid') return false;
      if (statusFilter === 'Partial' && inv.status !== 'Partial') return false;
      if (statusFilter === 'Unpaid' && inv.status !== 'Unpaid') return false;

      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
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
  }, [invoices, selectedMonth, statusFilter, searchQuery, todayStr]);

  // Overdue Invoices across selected period
  const overdueInvoicesList = useMemo(() => {
    return invoices.filter((inv) => {
      if (selectedMonth !== 'all' && inv.date && !inv.date.startsWith(selectedMonth)) {
        return false;
      }
      return inv.dueDate && inv.dueDate < todayStr && (parseFloat(inv.pendingAmount) || 0) > 0;
    });
  }, [invoices, selectedMonth, todayStr]);

  // Database-side pagination for historical invoices
  const isHistoricalQuery = selectedMonth !== currentYM || statusFilter === 'Paid' || selectedMonth === 'all';
  const [dbInvoiceData, setDbInvoiceData] = useState({
    data: [],
    count: 0,
    totalPages: 1,
    loading: false,
  });

  useEffect(() => {
    let isCancelled = false;
    if (!isHistoricalQuery || typeof fetchHistoricalInvoicesPaginated !== 'function') return;

    const loadInvoices = async () => {
      try {
        setDbInvoiceData((prev) => (prev.loading ? prev : { ...prev, loading: true }));
        const res = await fetchHistoricalInvoicesPaginated({
          page: currentPage,
          pageSize,
          searchQuery,
          statusFilter,
          selectedMonth,
        });
        if (!isCancelled && res) {
          setDbInvoiceData({
            data: res.data || [],
            count: res.count ?? 0,
            totalPages: Math.max(1, res.totalPages || Math.ceil((res.count || 0) / pageSize)),
            loading: false,
          });
        }
      } catch {
        if (!isCancelled) setDbInvoiceData((prev) => ({ ...prev, loading: false }));
      }
    };

    loadInvoices();
    return () => {
      isCancelled = true;
    };
  }, [isHistoricalQuery, currentPage, pageSize, searchQuery, statusFilter, selectedMonth, fetchHistoricalInvoicesPaginated]);

  const totalPages = isHistoricalQuery && dbInvoiceData.count > 0
    ? dbInvoiceData.totalPages
    : Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedInvoices = isHistoricalQuery && dbInvoiceData.data.length > 0
    ? dbInvoiceData.data
    : filteredInvoices.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalInvoiceItems = isHistoricalQuery && dbInvoiceData.count > 0
    ? dbInvoiceData.count
    : filteredInvoices.length;
  const isInvoiceLoading = isHistoricalQuery && dbInvoiceData.loading;

  // Handle Invoice Deletion
  const handleDeleteInvoice = (inv) => {
    const sName = inv.supplierName || inv.clientName || 'Supplier';
    setAlertConfig({
      isOpen: true,
      title: 'Delete Invoice?',
      message: `Are you sure you want to permanently delete Invoice #${inv.invoiceNumber} for ${sName}? This action cannot be reversed.`,
      type: 'warning',
      showCancel: true,
      confirmText: 'Delete',
      onConfirm: () => {
        deleteInvoice(inv.id);
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // WhatsApp Reminder Handler
  const handleSendWhatsAppReminder = (inv) => {
    const sName = inv.supplierName || inv.clientName || 'Supplier';
    const sPhone = inv.supplierPhone || inv.clientPhone || '';
    const text = `Hello ${sName},\n\nThis is a polite reminder from ${currentUser?.companyName || 'Fabric Manager'
      } regarding Fabric Invoice *#${inv.invoiceNumber}* for ${inv.fabricType ? `*${inv.fabricType}* ` : ''
      }(₹${Number(inv.totalAmount).toLocaleString(
        'en-IN'
      )}).\n\nPending Balance Due: *₹${Number(inv.pendingAmount).toLocaleString(
        'en-IN'
      )}*\nDue Date: *${inv.dueDate || 'Immediate'}*\n\nPlease arrange payment at your earliest convenience. Thank you!`;
    const cleanPhone = sPhone.replace(/[^0-9]/g, '');
    const phoneParam = cleanPhone.length >= 10 ? `phone=${cleanPhone}&` : '';
    window.open(
      `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  // Helper format month string
  const formatMonthName = (ym) => {
    if (ym === 'all') return 'All Time (Total)';
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-4 pb-12'}>
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {!embedded ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span className="truncate">Invoices</span>
                </h1>
                <p className="text-[11px] text-slate-500 truncate">
                  Customer billing & revenue invoices
                </p>
              </div>

              {/* Mobile Add Invoice Button */}
              <button
                type="button"
                onClick={() => {
                  setInvoiceToEdit(null);
                  setShowAddInvoiceModal(true);
                }}
                className="sm:hidden inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add Invoice</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
                  Customer Invoices
                </span>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline ml-2">
                  Billing & Collections
                </span>
              </div>

              {/* Mobile Add Invoice Button */}
              <button
                type="button"
                onClick={() => {
                  setInvoiceToEdit(null);
                  setShowAddInvoiceModal(true);
                }}
                className="sm:hidden inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add Invoice</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Month Filter Selector */}
            <div className="flex-1 min-w-0 sm:w-52">
              <CustomSelect
                value={selectedMonth}
                onChange={(val) => setSelectedMonth(val)}
                options={[
                  { value: 'all', label: 'All Time' },
                  ...availableMonths.map((ym) => ({
                    value: ym,
                    badge: ym === currentYM ? 'CURRENT' : null,
                    label: ym === currentYM ? `This Month (${formatMonthName(ym)})` : formatMonthName(ym),
                  })),
                ]}
                placeholder="Filter Month"
                theme="indigo"
              />
            </div>

            {/* Desktop Add Invoice Button */}
            <button
              type="button"
              onClick={() => {
                setInvoiceToEdit(null);
                setShowAddInvoiceModal(true);
              }}
              className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Executive Financial Metric Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Box 1: NET PROFIT (Collected Amount) */}
        <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
              Net Profit
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-950 mt-0.5 truncate">
            ₹{revenue.collected.toLocaleString('en-IN')}
          </p>
          <div className="flex items-center justify-between text-[10px] text-emerald-700 font-semibold mt-0.5">
            <span>Collected Amount</span>
            <span className="bg-emerald-200/60 text-emerald-900 px-1.5 py-0.2 rounded-md font-extrabold text-[9px]">
              Cash In
            </span>
          </div>
        </div>

        {/* Box 2: COLLECTIONS (Pending Amount) */}
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
              Collections
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-amber-950 mt-0.5 truncate">
            ₹{revenue.pending.toLocaleString('en-IN')}
          </p>
          <div className="flex items-center justify-between text-[10px] text-amber-700 font-semibold mt-0.5">
            <span>Pending Amount</span>
            <span
              className={`px-1.5 py-0.2 rounded-md font-extrabold text-[9px] ${revenue.overdueCount > 0
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-200/60 text-amber-900'
                }`}
            >
              {revenue.overdueCount > 0 ? `⚠️ ${revenue.overdueCount} Overdue` : '0 Overdue'}
            </span>
          </div>
        </div>

        {/* Box 3: EXPECTED PROFIT (Price per set * sets) */}
        <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800">
              Expected Profit
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-indigo-950 mt-0.5 truncate">
            ₹{expectedFabricProfit.toLocaleString('en-IN')}
          </p>
          <div className="flex items-center justify-between text-[10px] text-indigo-700 font-semibold mt-0.5">
            <span>Price Per Set × Sets</span>
            <span className="bg-indigo-200/60 text-indigo-900 px-1.5 py-0.2 rounded-md font-extrabold text-[9px] truncate">
              {totalExpectedSets} Total Sets
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Completed Fabric Lot Revenue Prompt Banner */}
        {completedFabricLots.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200/90 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>{completedFabricLots.length} Completed Fabric Lot{completedFabricLots.length > 1 ? 's' : ''} Ready for Billing</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">Ready</span>
                </h4>
                <p className="text-[11px] text-slate-600 font-medium">
                  Production finished. Click below to enter selling price &amp; create revenue invoices.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
              {completedFabricLots.slice(0, 3).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedFabricForInvoice(f.id);
                    setShowAddInvoiceModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  <span>Lot #{f.lot_no || 'N/A'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Urgent Alert Banner */}
        {overdueInvoicesList.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-rose-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <h4 className="text-xs font-bold text-rose-900">
                  {overdueInvoicesList.length} Overdue Invoices Requiring Urgent Collection
                </h4>
              </div>
              <span className="text-xs font-bold text-rose-700">
                Total: ₹{revenue.overdue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="mt-2 space-y-2">
              {overdueInvoicesList.slice(0, 3).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-rose-100 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">
                      {inv.clientName} ({inv.clientCompany || 'Client'})
                    </p>
                    <p className="text-[11px] text-rose-600">
                      Inv #{inv.invoiceNumber} • Due: {inv.dueDate} • Due Amt: ₹{inv.pendingAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendWhatsAppReminder(inv)}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                      title="Send WhatsApp Reminder"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => setSelectedInvoiceForPayment(inv)}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>Collect</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Status Filters */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice #, client name, phone or company..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Global Expand All / Collapse All Toggle */}
            {(() => {
              const currentItemIds = filteredInvoices.map((inv) => inv.id);
              const isAllExpanded =
                currentItemIds.length > 0 &&
                currentItemIds.every((id) => expandedCardIds.has(id));

              return currentItemIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isAllExpanded) {
                      handleCollapseAll();
                    } else {
                      handleExpandAll(currentItemIds);
                    }
                  }}
                  className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:text-indigo-600 transition-all flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95 cursor-pointer"
                  title="Toggle expand / collapse for all invoices"
                >
                  <span className="hidden xs:inline">
                    {isAllExpanded ? 'Collapse All' : 'Expand All'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${isAllExpanded ? 'rotate-180 text-indigo-600' : 'text-slate-400'
                      }`}
                  />
                </button>
              ) : null;
            })()}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {['all', 'Unpaid', 'Partial', 'Paid', 'Overdue'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${statusFilter === status
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {status === 'all' ? 'All Invoices' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice Cards List */}
        {isInvoiceLoading ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Loading invoices from database...</p>
          </div>
        ) : pagedInvoices.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Invoices Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'No invoices match your current search or filter criteria.'
                : 'Start billing clients and recording garment sales to track profit and pending collections.'}
            </p>
            <button
              onClick={() => {
                setInvoiceToEdit(null);
                setShowAddInvoiceModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Invoice</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pagedInvoices.map((inv) => {
              const isExpanded = expandedCardIds.has(inv.id);
              const isOverdue =
                inv.dueDate && inv.dueDate < todayStr && (parseFloat(inv.pendingAmount) || 0) > 0;
              const paidAmt = parseFloat(inv.paidAmount) || 0;
              const totalAmt = parseFloat(inv.totalAmount) || 0;
              const pendingAmt = parseFloat(inv.pendingAmount) || 0;
              const percentPaid = totalAmt > 0 ? Math.min(100, Math.round((paidAmt / totalAmt) * 100)) : 0;

              return (
                <div
                  key={inv.id}
                  onClick={() => toggleCardExpand(inv.id)}
                  className={`bg-white rounded-2xl border transition-all text-left cursor-pointer ${isExpanded
                    ? 'p-4 border-indigo-300 shadow-md ring-2 ring-indigo-500/10'
                    : 'p-2.5 sm:p-3 border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-xs'
                    }`}
                >
                  {!isExpanded ? (
                    /* --- ULTRA-COMPACT COLLAPSED CARD (~52px) --- */
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold shrink-0 ${isOverdue
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : inv.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : inv.status === 'Partial'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : inv.status === 'Pending'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-300 font-extrabold'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                        >
                          {isOverdue ? 'Overdue' : inv.status}
                        </span>

                        <span className="text-xs font-black text-slate-900 shrink-0">
                          #{inv.invoiceNumber}
                        </span>

                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {inv.supplierName || inv.clientName}
                        </h4>
                      </div>

                      {/* Right: Total Amount, Due/Status, Quick Collect & Chevron */}
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-black text-slate-900 block leading-tight">
                            ₹{totalAmt.toLocaleString('en-IN')}
                          </span>
                          <span
                            className={`text-[9px] sm:text-[10px] block ${pendingAmt > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-medium'
                              }`}
                          >
                            {pendingAmt > 0 ? `Due: ₹${pendingAmt.toLocaleString('en-IN')}` : 'Paid'}
                          </span>
                        </div>

                        {pendingAmt > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                            className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                            title="Record Payment / Collect"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForDetails(inv)}
                          className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="View & Print Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleCardExpand(inv.id)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs"
                          title="Expand full invoice details"
                        >
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* --- EXPANDED FULL INVOICE CARD (Detailed View) --- */
                    <div className="space-y-3 animate-in fade-in duration-150" onClick={(e) => e.stopPropagation()}>
                      {/* Invoice Top Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">
                              #{inv.invoiceNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isOverdue
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : inv.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : inv.status === 'Partial'
                                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                    : inv.status === 'Pending'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-300 font-extrabold'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                            >
                              {isOverdue ? 'Overdue' : inv.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <h4 className="text-sm font-bold text-slate-900">
                              {inv.supplierName || inv.clientName}
                            </h4>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 flex items-center gap-0.5">
                              <Truck className="w-2.5 h-2.5" />
                              <span>Supplier</span>
                            </span>
                          </div>
                          {inv.fabricType && (
                            <p className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1 mt-0.5">
                              <Layers className="w-3 h-3 text-indigo-500" />
                              <span>Fabric: {inv.fabricType} ({inv.fabricColor || 'Standard'})</span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900">
                              ₹{totalAmt.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {inv.items?.length || 1} Item(s)
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleCardExpand(inv.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer ml-1"
                            title="Collapse"
                          >
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar of Payment */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-emerald-700 font-semibold">
                            Paid: ₹{paidAmt.toLocaleString('en-IN')} ({percentPaid}%)
                          </span>
                          <span className={`font-semibold ${pendingAmt > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                            Pending: ₹{pendingAmt.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${inv.status === 'Paid' ? 'bg-emerald-500' : 'bg-indigo-500'
                              }`}
                            style={{ width: `${percentPaid}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Dates on Left & Edit/Delete Icons on Right (Same Row) */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {inv.date}
                          </span>
                          {inv.dueDate && (
                            <span
                              className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-bold' : ''
                                }`}
                            >
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Due: {inv.dueDate}
                            </span>
                          )}
                          {inv.clientPhone && (
                            <span className="text-slate-600 font-medium">
                              📞 {inv.clientPhone}
                            </span>
                          )}
                        </div>

                        {/* Right side: WhatsApp, Edit & Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          {pendingAmt > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendWhatsAppReminder(inv);
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Send WhatsApp Reminder"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInvoiceToEdit(inv);
                              setShowAddInvoiceModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Invoice"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteInvoice(inv);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Actions: Collect & View/Print */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        {pendingAmt > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoiceForPayment(inv);
                            }}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Collect</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoiceForDetails(inv);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View & Print</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <PaginationControls
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={totalInvoiceItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              theme="indigo"
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS INTEGRATION                                                        */}
      {/* ========================================================================= */}

      {/* Add / Edit Invoice Modal */}
      {showAddInvoiceModal && (
        <AddInvoiceModal
          isOpen={showAddInvoiceModal}
          onClose={() => {
            setShowAddInvoiceModal(false);
            setInvoiceToEdit(null);
            setSelectedFabricForInvoice(null);
          }}
          invoiceToEdit={invoiceToEdit}
          initialFabricId={selectedFabricForInvoice}
        />
      )}

      {/* View & Print Invoice Details Modal */}
      {selectedInvoiceForDetails && (
        <InvoiceDetailsModal
          isOpen={Boolean(selectedInvoiceForDetails)}
          onClose={() => setSelectedInvoiceForDetails(null)}
          invoice={selectedInvoiceForDetails}
          onRecordPaymentSuccess={(updated) => {
            setSelectedInvoiceForDetails(updated);
          }}
          onDelete={() => {
            const inv = selectedInvoiceForDetails;
            setSelectedInvoiceForDetails(null);
            handleDeleteInvoice(inv);
          }}
        />
      )}

      {/* Record Payment / Collection Modal */}
      {selectedInvoiceForPayment && (
        <RecordInvoicePaymentModal
          isOpen={Boolean(selectedInvoiceForPayment)}
          onClose={() => setSelectedInvoiceForPayment(null)}
          invoice={selectedInvoiceForPayment}
        />
      )}

      {/* Alert / Confirm Dialog Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText}
        onConfirm={alertConfig.onConfirm}
      />
    </div>
  );
}
