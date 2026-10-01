import React from 'react';

export default function OrdersKpiBanner({
  totalPiecesCut,
  cuttings = [],
  activeInStitching,
  completedAssignments,
  todayCompletedPieces,
  setActiveTab,
  setStatusFilter,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <div
        onClick={() => {
          setActiveTab('cuttings');
          setStatusFilter('all');
        }}
        className="p-2.5 sm:p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs text-left cursor-pointer hover:border-purple-300 transition-all group"
        title="Click to view Fabric Cuts"
      >
        <span className="text-[10px] text-slate-400 font-bold uppercase block">Cut</span>
        <p className="text-base sm:text-lg font-extrabold text-purple-700 mt-0.5">
          {totalPiecesCut.toLocaleString('en-IN')}{' '}
          <span className="text-xs font-normal text-slate-400">Cut PCs</span>
        </p>
        <span className="text-[10px] text-slate-500 mt-0.5 block truncate group-hover:text-purple-600 transition-colors">
          {cuttings.length} Fabric Cuts
        </span>
      </div>

      <div
        onClick={() => {
          setActiveTab('assignments');
          setStatusFilter('In Stitching');
        }}
        className="p-2.5 sm:p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs text-left cursor-pointer hover:border-amber-300 transition-all group"
        title="Click to view Active Stitching Lines"
      >
        <span className="text-[10px] text-slate-400 font-bold uppercase block">Stitching</span>
        <p className="text-base sm:text-lg font-extrabold text-amber-600 mt-0.5">
          {activeInStitching} <span className="text-xs font-normal text-slate-400">active</span>
        </p>
        <span className="text-[10px] text-slate-500 mt-0.5 block truncate group-hover:text-amber-600 transition-colors">
          On Sewing Lines
        </span>
      </div>

      <div
        onClick={() => {
          setActiveTab('assignments');
          setStatusFilter('Completed');
        }}
        className="p-2.5 sm:p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs text-left cursor-pointer hover:border-emerald-300 transition-all group"
        title="Click to view Completed Stitching Jobs"
      >
        <span className="text-[10px] text-slate-400 font-bold uppercase block">Done</span>
        <p className="text-base sm:text-lg font-extrabold text-emerald-700 mt-0.5">
          {completedAssignments} <span className="text-xs font-normal text-slate-400">jobs</span>
        </p>
        <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block truncate">
          Today: +{todayCompletedPieces} PCs
        </span>
      </div>
    </div>
  );
}
