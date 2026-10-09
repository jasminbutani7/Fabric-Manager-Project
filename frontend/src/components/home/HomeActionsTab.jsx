import React from 'react';
import {
  ShieldCheck,
  Scissors,
  Layers,
  Receipt,
  FileText,
  PackageCheck,
  UserCheck,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

export default function HomeActionsTab({
  setShowAddFabric,
  setShowAddExpense,
  setShowAddInvoice,
  setShowRecordCutModal,
  setShowAssignTailorModal,
  navigate,
}) {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* 1. Admin Actions */}
      <div className="space-y-2 bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between px-0.5 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Admin Actions
            </h3>
          </div>
          <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded-full">
            5 Actions
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 pt-1">
          <button
            onClick={() => setShowAddFabric(true)}
            className="p-2.5 bg-slate-50/70 hover:bg-indigo-50/50 active:scale-[0.98] border border-slate-200/80 hover:border-indigo-200 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Add Fabric</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Fabric Rolls</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/orders/thread_cutting')}
            className="p-2.5 bg-slate-50/70 hover:bg-amber-50/50 active:scale-[0.98] border border-slate-200/80 hover:border-amber-200 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Thread Cut</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Trimming Work</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/orders/handovers')}
            className="p-2.5 bg-slate-50/70 hover:bg-purple-50/50 active:scale-[0.98] border border-slate-200/80 hover:border-purple-200 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Handovers</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Verify Goods</p>
            </div>
          </button>

          <button
            onClick={() => setShowAddExpense(true)}
            className="p-2.5 bg-slate-50/70 hover:bg-rose-50/50 active:scale-[0.98] border border-slate-200/80 hover:border-rose-200 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Add Expense</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Bills & Rent</p>
            </div>
          </button>

          <button
            onClick={() => setShowAddInvoice(true)}
            className="p-2.5 bg-slate-50/70 hover:bg-emerald-50/50 active:scale-[0.98] border border-slate-200/80 hover:border-emerald-200 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Add Invoice</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Bill Client</p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Master Actions */}
      <div className="space-y-2 bg-white rounded-2xl p-3 border border-purple-100/90 shadow-xs">
        <div className="flex items-center justify-between px-0.5 pb-1 border-b border-purple-50">
          <div className="flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-purple-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-950">
              Master Actions
            </h3>
          </div>
          <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded-full">
            5 Actions
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 pt-1">
          <button
            onClick={() => setShowRecordCutModal(true)}
            className="p-2.5 bg-purple-50/50 hover:bg-purple-100/60 active:scale-[0.98] border border-purple-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Record Cut</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Lays & Fabric Cuts</p>
            </div>
          </button>

          <button
            onClick={() => setShowAssignTailorModal(true)}
            className="p-2.5 bg-purple-50/50 hover:bg-purple-100/60 active:scale-[0.98] border border-purple-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Assign Tailor</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Work Bundles</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/orders/assignments')}
            className="p-2.5 bg-purple-50/50 hover:bg-purple-100/60 active:scale-[0.98] border border-purple-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-200/70 text-purple-800 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Tailor Jobs</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Active Work</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/orders/cuttings')}
            className="p-2.5 bg-purple-50/50 hover:bg-purple-100/60 active:scale-[0.98] border border-purple-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-200/70 text-purple-800 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Fabric Cuts</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Sets Balance</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/orders/handovers')}
            className="p-2.5 bg-purple-50/50 hover:bg-purple-100/60 active:scale-[0.98] border border-purple-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-200/70 text-purple-800 flex items-center justify-center shrink-0">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Handover</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Send to Admin</p>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Tailor Actions */}
      <div className="space-y-2 bg-white rounded-2xl p-3 border border-emerald-100/90 shadow-xs">
        <div className="flex items-center justify-between px-0.5 pb-1 border-b border-emerald-50">
          <div className="flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
              Tailor Actions
            </h3>
          </div>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-full">
            4 Actions
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 pt-1">
          <button
            onClick={() => navigate('/orders/assignments')}
            className="p-2.5 bg-emerald-50/50 hover:bg-emerald-100/60 active:scale-[0.98] border border-emerald-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Orders</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Work Queue</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/orders/assignments')}
            className="p-2.5 bg-emerald-50/50 hover:bg-emerald-100/60 active:scale-[0.98] border border-emerald-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Daily Log</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Submit Work</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/orders/assignments')}
            className="p-2.5 bg-emerald-50/50 hover:bg-emerald-100/60 active:scale-[0.98] border border-emerald-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-200/70 text-emerald-800 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Rates</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Wage Ledgers</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/setup/tailors')}
            className="p-2.5 bg-emerald-50/50 hover:bg-emerald-100/60 active:scale-[0.98] border border-emerald-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-200/70 text-emerald-800 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">Portal</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Floor Login</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
