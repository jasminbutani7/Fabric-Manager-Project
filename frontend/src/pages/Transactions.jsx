import React from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeftRight, Receipt, FileText, TrendingUp } from 'lucide-react';
import { useFinance } from '../context/domain';
import Expenses from './Expenses';
import Invoices from './Invoices';
import FinancialDashboard from './FinancialDashboard';

export default function Transactions() {
  const { tab } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { expenses = [], invoices = [] } = useFinance();

  // Determine active section: 'expenses' | 'invoices' | 'dashboard'
  let currentSection = 'expenses';
  if (
    tab === 'dashboard' ||
    tab === 'pnl' ||
    location.pathname.includes('/transactions/dashboard') ||
    location.pathname.includes('/transactions/pnl') ||
    searchParams.get('tab') === 'dashboard'
  ) {
    currentSection = 'dashboard';
  } else if (
    tab === 'invoices' ||
    location.pathname.startsWith('/transactions/invoices') ||
    location.pathname.startsWith('/invoices') ||
    location.pathname.startsWith('/billing') ||
    searchParams.get('type') === 'invoices' ||
    searchParams.get('tab') === 'invoices'
  ) {
    currentSection = 'invoices';
  }

  const handleSectionChange = (section) => {
    navigate(`/transactions/${section}`);
  };

  return (
    <div className="space-y-3.5 max-w-5xl mx-auto pb-16">
      {/* Top Page Header & 3-Tab Segmented Pill Switcher */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <span className="truncate">Financial Transactions</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              Factory expenses, customer billing invoices &amp; company profit and loss dashboard
            </p>
          </div>
        </div>

        {/* 3-Column Sub-Tabs: Expenses, Invoices, Dashboard (Mobile-Friendly Grid - Same as Setup & Home) */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
          {[
            {
              id: 'expenses',
              label: 'Expenses',
              icon: Receipt,
              count: expenses.length,
              color: 'text-indigo-700',
            },
            {
              id: 'invoices',
              label: 'Invoices',
              icon: FileText,
              count: invoices.length,
              color: 'text-indigo-700',
            },
            {
              id: 'dashboard',
              label: 'Dashboard',
              icon: TrendingUp,
              count: 'P&L',
              color: 'text-indigo-700',
            },
          ].map((tab) => {
            const isActive = currentSection === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSectionChange(tab.id)}
                className={`py-1.5 px-0.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer ${isActive
                  ? `bg-white ${tab.color} shadow-xs ring-1 ring-black/5 font-extrabold`
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] sm:text-xs truncate">{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none shrink-0 ${isActive
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
      </div>

      {/* Main Content: Expenses | Invoices | Financial Dashboard */}
      {currentSection === 'expenses' && <Expenses embedded={true} />}
      {currentSection === 'invoices' && <Invoices embedded={true} />}
      {currentSection === 'dashboard' && <FinancialDashboard />}
    </div>
  );
}

