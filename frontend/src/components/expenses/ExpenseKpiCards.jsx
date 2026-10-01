import React from 'react';
import { TrendingUp, Building2, Wrench, Users } from 'lucide-react';

export default function ExpenseKpiCards({
  kpis,
  categoryFilter,
  setCategoryFilter,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {/* Total */}
      <div className="p-2.5 sm:p-3 bg-gradient-to-br from-rose-600 to-pink-600 rounded-2xl text-white shadow-xs space-y-0.5">
        <div className="flex items-center justify-between opacity-90">
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Total</span>
          <TrendingUp className="w-3.5 h-3.5" />
        </div>
        <p className="text-sm sm:text-base font-black truncate">
          ₹{kpis.totalAll.toLocaleString('en-IN')}
        </p>
        <p className="text-[10px] text-rose-100 truncate">
          Mo: ₹{kpis.thisMonthTotal.toLocaleString('en-IN')}
        </p>
      </div>

      {/* Rent */}
      <button
        type="button"
        onClick={() => setCategoryFilter(categoryFilter === 'Rent' ? 'all' : 'Rent')}
        className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all space-y-0.5 cursor-pointer ${
          categoryFilter === 'Rent'
            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
            : 'bg-white text-slate-800 border-slate-200/80 hover:border-purple-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-extrabold uppercase tracking-wider ${
              categoryFilter === 'Rent' ? 'text-purple-100' : 'text-slate-400'
            }`}
          >
            Rent
          </span>
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <p className="text-sm sm:text-base font-extrabold truncate">
          ₹{kpis.totalRent.toLocaleString('en-IN')}
        </p>
        <p
          className={`text-[10px] truncate ${
            categoryFilter === 'Rent' ? 'text-purple-100' : 'text-slate-400'
          }`}
        >
          Shop/Factory
        </p>
      </button>

      {/* Factory (Maint & Light) */}
      <button
        type="button"
        onClick={() =>
          setCategoryFilter(
            categoryFilter === 'Maintainance' || categoryFilter === 'Light Bill'
              ? 'all'
              : 'Maintainance'
          )
        }
        className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all space-y-0.5 cursor-pointer ${
          categoryFilter === 'Maintainance' || categoryFilter === 'Light Bill'
            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
            : 'bg-white text-slate-800 border-slate-200/80 hover:border-amber-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-extrabold uppercase tracking-wider ${
              categoryFilter === 'Maintainance' || categoryFilter === 'Light Bill'
                ? 'text-amber-100'
                : 'text-slate-400'
            }`}
          >
            Factory
          </span>
          <Wrench className="w-3.5 h-3.5" />
        </div>
        <p className="text-sm sm:text-base font-extrabold truncate">
          ₹{(kpis.totalMaint + kpis.totalLight).toLocaleString('en-IN')}
        </p>
        <p
          className={`text-[10px] truncate ${
            categoryFilter === 'Maintainance' || categoryFilter === 'Light Bill'
              ? 'text-amber-100'
              : 'text-slate-400'
          }`}
        >
          Maint + Light
        </p>
      </button>

      {/* Salaries */}
      <button
        type="button"
        onClick={() =>
          setCategoryFilter(
            categoryFilter.startsWith('Salary') ? 'all' : 'Salary'
          )
        }
        className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all space-y-0.5 cursor-pointer ${
          categoryFilter.startsWith('Salary')
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
            : 'bg-white text-slate-800 border-slate-200/80 hover:border-emerald-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-extrabold uppercase tracking-wider ${
              categoryFilter.startsWith('Salary') ? 'text-emerald-100' : 'text-slate-400'
            }`}
          >
            Salaries
          </span>
          <Users className="w-3.5 h-3.5" />
        </div>
        <p className="text-sm sm:text-base font-extrabold truncate">
          ₹{kpis.totalSalary.toLocaleString('en-IN')}
        </p>
        <p
          className={`text-[10px] truncate ${
            categoryFilter.startsWith('Salary') ? 'text-emerald-100' : 'text-slate-400'
          }`}
        >
          M: ₹{kpis.totalMasterSalary.toLocaleString('en-IN')} • H: ₹{kpis.totalHelperSalary.toLocaleString('en-IN')}
        </p>
      </button>
    </div>
  );
}
