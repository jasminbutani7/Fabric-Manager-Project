import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  Receipt,
  Plus,
  Building2,
  Users,
  Scissors,
  MoreHorizontal,
} from 'lucide-react';
import { useFinance, useFabric, useProduction } from '../context/useManagement';
import { useAuth } from '../context/useAuth';
import AddExpenseModal from '../components/modals/AddExpenseModal';
import ExpenseKpiCards from '../components/expenses/ExpenseKpiCards';
import TailorLedgerSection from '../components/expenses/TailorLedgerSection';
import StaffSalariesSection from '../components/expenses/StaffSalariesSection';
import ExpenseCardsList from '../components/expenses/ExpenseCardsList';
import ExpenseDeleteModal from '../components/expenses/ExpenseDeleteModal';

export default function Expenses({ embedded = false }) {
  const {
    expenses = [],
    deleteExpense,
    getFinancialDecisionData,
    invoices = [],
  } = useFinance();
  const { fabrics = [] } = useFabric();
  const { tailorAssignments = [] } = useProduction();
  const { currentUser } = useAuth();

  // Current month string
  const nowDate = new Date();
  const currentYearMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);

  // Modals state
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [initialExpenseType, setInitialExpenseType] = useState('Rent');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Expanded cards state for compact / detailed view
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

  // Sub-tabs routing: 'all' | 'factory' | 'salaries' | 'tailors' | 'other'
  const { tab: pathTab, subtab: pathSubTab } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const normalizeExpenseTab = (t) => {
    if (!t) return 'all';
    const lower = t.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
    if (lower === 'factory' || lower === 'overheads' || lower === 'rent') return 'factory';
    if (lower === 'salaries' || lower === 'salary' || lower === 'staff') return 'salaries';
    if (lower === 'tailors' || lower === 'tailor' || lower === 'tailor_ledger') return 'tailors';
    if (lower === 'other' || lower === 'misc' || lower === 'daily') return 'other';
    return 'all';
  };

  const rawTab =
    pathSubTab ||
    (pathTab && pathTab !== 'expenses' && pathTab !== 'invoices' ? pathTab : null) ||
    searchParams.get('category') ||
    searchParams.get('tab');
  const activeTab = normalizeExpenseTab(rawTab);

  const setActiveTab = (tab) => {
    if (location.pathname.startsWith('/transactions') || location.pathname.startsWith('/transaction') || embedded) {
      navigate(`/transactions/expenses/${tab}`);
    } else {
      navigate(`/expenses/${tab}`);
    }
  };

  // Available months
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    monthsSet.add(currentYearMonth);
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
  }, [currentYearMonth, invoices, expenses, fabrics, tailorAssignments]);

  const formatMonthName = (ym) => {
    if (ym === 'all') return 'All Time (Total)';
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Live decision data for tailor piece-rate ledger & staff obligations
  const decisionData = useMemo(() => {
    if (typeof getFinancialDecisionData === 'function') {
      return getFinancialDecisionData(selectedMonth);
    }
    return {
      staffSalaries: { masters: [], helpers: [] },
      tailorPayroll: [],
      costs: { tailorLabor: 0, masterSalary: 0, helperSalary: 0 },
    };
  }, [getFinancialDecisionData, selectedMonth]);

  const {
    staffSalaries = { masters: [], helpers: [] },
    tailorPayroll = [],
  } = decisionData;

  const isFactoryExpense = (e) => {
    const t = (e.expenseType || e.category || '').toLowerCase();
    return t === 'rent' || t === 'maintainance' || t === 'maintenance' || t === 'light bill' || t === 'light_bill';
  };
  const isSalaryExpense = (e) => {
    const t = (e.expenseType || e.category || '').toLowerCase();
    return t === 'salary' || t === 'salaries';
  };
  const isOtherExpense = (e) => {
    const t = (e.expenseType || e.category || '').toLowerCase();
    return t === 'other' || t === 'misc' || t === 'miscellaneous';
  };

  const factoryCount = expenses.filter(isFactoryExpense).length;
  const otherCount = expenses.filter(isOtherExpense).length;

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  // Calculate high-level financial KPIs
  let totalAll = 0;
  let totalRent = 0;
  let totalMaint = 0;
  let totalLight = 0;
  let totalSalary = 0;
  let totalMasterSalary = 0;
  let totalHelperSalary = 0;
  let totalOther = 0;
  let thisMonthTotal = 0;

  expenses.forEach((e) => {
    const amt = parseFloat(e.amount) || 0;
    totalAll += amt;

    if (e.date && e.date.startsWith(currentYearMonth)) {
      thisMonthTotal += amt;
    }

    const t = e.expenseType || e.category || '';
    if (t === 'Rent') totalRent += amt;
    else if (t === 'Maintainance' || t === 'Maintenance') totalMaint += amt;
    else if (t === 'Light Bill') totalLight += amt;
    else if (t === 'Other') totalOther += amt;
    else if (t === 'Salary') {
      totalSalary += amt;
      if (e.salarySubType === 'Master') totalMasterSalary += amt;
      else if (e.salarySubType === 'Helper') totalHelperSalary += amt;
    }
  });

  const kpis = {
    totalAll,
    thisMonthTotal,
    totalRent,
    totalMaint,
    totalLight,
    totalSalary,
    totalMasterSalary,
    totalHelperSalary,
    totalOther,
  };

  // Filtered expense list
  const filteredExpenses = expenses.filter((e) => {
    // 1. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPaidTo = e.paidTo?.toLowerCase().includes(q);
      const matchWorker = e.workerName?.toLowerCase().includes(q);
      const matchNotes = e.notes?.toLowerCase().includes(q);
      const matchRef = e.referenceNo?.toLowerCase().includes(q);
      const matchType = e.expenseType?.toLowerCase().includes(q);
      const matchSub = e.salarySubType?.toLowerCase().includes(q);
      const matchMachine = e.machineCode?.toLowerCase().includes(q);
      if (
        !matchPaidTo &&
        !matchWorker &&
        !matchNotes &&
        !matchRef &&
        !matchType &&
        !matchSub &&
        !matchMachine
      ) {
        return false;
      }
    }

    // 2. Sub-tab filter
    if (activeTab === 'factory' && !isFactoryExpense(e)) return false;
    if (activeTab === 'salaries' && !isSalaryExpense(e)) return false;
    if (activeTab === 'other' && !isOtherExpense(e)) return false;

    // 3. Category filter
    if (categoryFilter !== 'all') {
      const t = e.expenseType || e.category || '';
      if (categoryFilter === 'Rent' && t !== 'Rent') return false;
      if (categoryFilter === 'Maintainance' && t !== 'Maintainance' && t !== 'Maintenance') return false;
      if (categoryFilter === 'Light Bill' && t !== 'Light Bill') return false;
      if (categoryFilter === 'Salary' && t !== 'Salary') return false;
      if (
        categoryFilter === 'Salary_Master' &&
        (t !== 'Salary' || e.salarySubType !== 'Master')
      )
        return false;
      if (
        categoryFilter === 'Salary_Helper' &&
        (t !== 'Salary' || e.salarySubType !== 'Helper')
      )
        return false;
      if (categoryFilter === 'Other' && t !== 'Other') return false;
    }

    // 4. Month filter
    if (monthFilter === 'this_month') {
      if (!e.date || !e.date.startsWith(currentYearMonth)) {
        return false;
      }
    }

    return true;
  });

  // Open modal with specific preset (or empty for explicit decision)
  const handleOpenAdd = (type = '') => {
    setInitialExpenseType(type);
    setShowAddExpenseModal(true);
  };

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-4 max-w-4xl mx-auto pb-12'}>
      {/* Top Header */}
      {!embedded ? (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Receipt className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="truncate">Expenses</span>
            </h1>
            <p className="text-[11px] text-slate-500 truncate">
              Rent, utilities & salaries
            </p>
          </div>

          <button
            onClick={() => handleOpenAdd('')}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-md shadow-rose-200 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Expense</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
              Operational Expenses
            </span>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline ml-2">
              Rent, utilities & staff salaries
            </span>
          </div>

          <button
            onClick={() => handleOpenAdd('')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold active:scale-95 shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Expense</span>
          </button>
        </div>
      )}

      {/* 5-Column Sub-Tabs (Mobile-Friendly, URL Synchronized) */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
        {[
          { id: 'all', label: 'All', icon: Receipt, count: expenses.length, color: 'text-rose-700' },
          { id: 'factory', label: 'Factory', icon: Building2, count: factoryCount, color: 'text-rose-700' },
          {
            id: 'salaries',
            label: 'Salaries',
            icon: Users,
            count: staffSalaries.masters.length + staffSalaries.helpers.length,
            color: 'text-rose-700',
          },
          { id: 'tailors', label: 'Tailors', icon: Scissors, count: tailorPayroll.length, color: 'text-rose-700' },
          { id: 'other', label: 'Other', icon: MoreHorizontal, count: otherCount, color: 'text-rose-700' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCategoryFilter('all');
              }}
              className={`py-1.5 px-0.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer ${
                isActive
                  ? `bg-white ${tab.color} shadow-xs ring-1 ring-black/5 font-extrabold`
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none shrink-0 ${
                    isActive
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB: TAILORS STITCHING LEDGER (MONTHLY PAYOUTS) */}
      {activeTab === 'tailors' && (
        <TailorLedgerSection
          tailorPayroll={tailorPayroll}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          availableMonths={availableMonths}
          currentYearMonth={currentYearMonth}
          formatMonthName={formatMonthName}
          expandedCardIds={expandedCardIds}
          toggleCardExpand={toggleCardExpand}
          handleExpandAll={handleExpandAll}
          handleCollapseAll={handleCollapseAll}
          currentUser={currentUser}
        />
      )}

      {/* SUB-TAB: SALARIES (STAFF OBLIGATIONS TRACKER) */}
      {activeTab === 'salaries' && (
        <StaffSalariesSection
          staffSalaries={staffSalaries}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          availableMonths={availableMonths}
          currentYearMonth={currentYearMonth}
          expandedCardIds={expandedCardIds}
          toggleCardExpand={toggleCardExpand}
          handleExpandAll={handleExpandAll}
          handleCollapseAll={handleCollapseAll}
          handleOpenAdd={handleOpenAdd}
        />
      )}

      {/* KPI Financial Overview Cards (for All, Factory, and Other views) */}
      {activeTab !== 'tailors' && activeTab !== 'salaries' && (
        <ExpenseKpiCards
          kpis={kpis}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
        />
      )}

      {/* Filter and Search Bar & Expenses List (For All, Factory, Salaries, Other) */}
      {activeTab !== 'tailors' && (
        <ExpenseCardsList
          activeTab={activeTab}
          filteredExpenses={filteredExpenses}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          monthFilter={monthFilter}
          setMonthFilter={setMonthFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          expandedCardIds={expandedCardIds}
          toggleCardExpand={toggleCardExpand}
          handleExpandAll={handleExpandAll}
          handleCollapseAll={handleCollapseAll}
          setDeleteConfirm={setDeleteConfirm}
        />
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        key={showAddExpenseModal ? `add-exp-open-${initialExpenseType}` : 'add-exp-closed'}
        isOpen={showAddExpenseModal}
        initialType={initialExpenseType}
        onClose={() => setShowAddExpenseModal(false)}
      />

      {/* Delete Confirmation Modal */}
      <ExpenseDeleteModal
        deleteConfirm={deleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={(id) => {
          deleteExpense(id);
          setDeleteConfirm(null);
        }}
      />
    </div>
  );
}
