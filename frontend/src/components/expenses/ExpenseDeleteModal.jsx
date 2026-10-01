import React from 'react';
import { Trash2 } from 'lucide-react';

export default function ExpenseDeleteModal({
  deleteConfirm,
  onCancel,
  onConfirm,
}) {
  if (!deleteConfirm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl space-y-3 text-center animate-in zoom-in-95">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900">Delete Expense?</h3>
        <p className="text-xs text-slate-500">
          Are you sure you want to remove this expense of{' '}
          <strong className="text-slate-800">
            ₹{parseFloat(deleteConfirm.amount || 0).toLocaleString('en-IN')}
          </strong>{' '}
          ({deleteConfirm.expenseType} - {deleteConfirm.paidTo || deleteConfirm.workerName})?
        </p>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(deleteConfirm.id)}
            className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-200 transition-all cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
