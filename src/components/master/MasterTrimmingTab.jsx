import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Lock,
  Check,
  Trash2,
  X,
  Layers,
} from 'lucide-react';
import { groupItemsByLot } from '../../utils/lotGrouping';
import LotGroupHeader from '../orders/LotGroupHeader';

export default function MasterTrimmingTab({
  master,
  fabrics = [],
  cuttings: _cuttings = [],
  helpers: _helpers = [],
  tailorAssignments = [],
  masterHandovers: _masterHandovers = [],
  threadCuttingAssignments = [],
  onOpenAssignTrimming,
  onOpenSubmitAdmin: _onOpenSubmitAdmin,
  updateThreadCuttingProgress,
  deleteThreadCuttingAssignment,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'In Progress' | 'Completed' | 'Skipped'
  const [progressJob, setProgressJob] = useState(null);
  const [progressPSC, setProgressPSC] = useState('');

  // 1. Gather all master-relevant fabrics & cuttings
  const masterFabricIds = new Set(fabrics.map((f) => String(f.id)));

  // 2. Filter thread cutting jobs created ONLY by this Master (exclude Admin jobs)
  const masterThreadJobs = (threadCuttingAssignments || []).filter((tc) => {
    // Strictly exclude any job created by admin
    if (tc.createdByRole && tc.createdByRole !== 'master') return false;

    const isThisMaster = tc.masterId && master?.id && String(tc.masterId) === String(master.id);
    const isMasterFabric = tc.fabricId && masterFabricIds.has(String(tc.fabricId));

    if (tc.createdByRole === 'master') {
      if (tc.masterId) return isThisMaster;
      return isMasterFabric;
    }

    // Fallback for legacy records without createdByRole
    return isThisMaster;
  });

  // Calculate floor trimming metrics
  let totalInTrimmingPSC = 0;
  let totalTrimmedDonePSC = 0;
  let totalSkippedPSC = 0;

  masterThreadJobs.forEach((tc) => {
    const isSkip = tc.status === 'Skipped' || tc.actionType === 'skip';
    const assigned = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
    const completed = parseInt(tc.completedPieces ?? tc.completedPSC, 10) || 0;

    if (isSkip) {
      totalSkippedPSC += assigned;
    } else if (tc.status === 'Completed' || completed >= assigned) {
      totalTrimmedDonePSC += Math.max(assigned, completed);
    } else {
      totalTrimmedDonePSC += completed;
      totalInTrimmingPSC += Math.max(0, assigned - completed);
    }
  });

  // Total stitched pieces accepted from tailors across master fabrics
  let totalStitchedFromTailors = 0;
  tailorAssignments.forEach((a) => {
    (a.dailySubmissions || []).forEach((sub) => {
      if (sub.approvalStatus === 'Approved') {
        let psc = parseInt(sub.pscQuantity, 10) || 0;
        if (psc === 0 && sub.subParts && typeof sub.subParts === 'object') {
          psc = Object.values(sub.subParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
        }
        if (psc === 0) psc = parseInt(sub.quantity, 10) || 0;
        totalStitchedFromTailors += psc;
      }
    });
  });

  const totalAssignedToTrimming = totalInTrimmingPSC + totalTrimmedDonePSC + totalSkippedPSC;
  const readyToTrimPSC = Math.max(0, totalStitchedFromTailors - totalAssignedToTrimming);

  // Filtered jobs list
  const filteredJobs = masterThreadJobs.filter((tc) => {
    const isSkip = tc.status === 'Skipped' || tc.actionType === 'skip';
    if (filter === 'all') return true;
    if (filter === 'Skipped') return isSkip;
    if (filter === 'Completed') return !isSkip && tc.status === 'Completed';
    if (filter === 'In Progress') return !isSkip && tc.status !== 'Completed';
    return true;
  });

  // Group trimming jobs by Fabric Lot (matching Admin Portal design)
  const groupedJobs = useMemo(
    () => groupItemsByLot(filteredJobs, fabrics, _cuttings),
    [filteredJobs, fabrics, _cuttings]
  );

  const [collapsedLots, setCollapsedLots] = useState(() => new Set());

  const toggleLotCollapse = (lotKey) => {
    setCollapsedLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotKey)) next.delete(lotKey);
      else next.add(lotKey);
      return next;
    });
  };

  const isAllLotsCollapsed =
    groupedJobs.length > 0 && groupedJobs.every((g) => collapsedLots.has(g.lotKey));

  const toggleAllLots = () => {
    if (isAllLotsCollapsed) {
      setCollapsedLots(new Set());
    } else {
      setCollapsedLots(new Set(groupedJobs.map((g) => g.lotKey)));
    }
  };

  const renderJobCard = (tc) => {
    const isSkip = tc.status === 'Skipped' || tc.actionType === 'skip';
    const isDone = tc.status === 'Completed';
    const isExternal = tc.helperType === 'external';
    const assigned = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
    const completed = parseInt(tc.completedPieces ?? tc.completedPSC, 10) || 0;
    const pct = assigned > 0 ? Math.min(100, Math.round((completed / assigned) * 100)) : 0;
    const compLabel = tc.subPartName || tc.subPart || 'PCs';

    return (
      <div
        key={tc.id}
        className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 text-xs"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isSkip ? 'bg-slate-400' : isDone ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="font-extrabold text-slate-900">+{assigned} PCs</span>
            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
              {compLabel.toUpperCase()}
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {tc.fabricName || 'Fabric Lot'}
            </span>
            {isSkip ? (
              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-slate-500" />
                <span>Trimming Skipped (Ready for Admin)</span>
              </span>
            ) : (
              <>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    isExternal ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {isExternal ? `Ext (₹${tc.ratePerPSC}/PC)` : 'Staff'}
                </span>
                <span className="text-[11px] text-slate-500">
                  Helper: <strong className="text-slate-800">{tc.helperName}</strong>
                </span>
              </>
            )}
            <span className="text-[10px] text-slate-400">• {tc.assignedDate || 'Recent'}</span>
          </div>

          {/* Actions on right */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isSkip && !isDone && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setProgressJob(tc);
                    setProgressPSC(String(completed || ''));
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Progress
                </button>
                <button
                  type="button"
                  onClick={() => updateThreadCuttingProgress?.(tc.id, assigned, true)}
                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark Done</span>
                </button>
              </>
            )}
            {isDone && !isSkip && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 select-none">
                <Check className="w-2.5 h-2.5 text-emerald-600" />
                <span>Trimmed Done</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => deleteThreadCuttingAssignment?.(tc.id)}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
              title="Delete assignment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar if in progress */}
        {!isSkip && !isDone && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-semibold text-slate-500">
              <span>{completed} of {assigned} Trimmed</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-teal-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3.5 text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Floor Trimming &amp; Helper Work
          </h3>
          <p className="text-xs text-slate-500">
            Assign helpers for thread cutting or skip trimming before handing over to Admin
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenAssignTrimming?.('assign')}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Assign Helper</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAssignTrimming?.('skip')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Skip Trimming</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase block truncate">From Tailors</span>
          <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
            {totalStitchedFromTailors} <span className="text-xs font-normal text-slate-400">PCs</span>
          </p>
          <span className="text-[10px] text-slate-400 block truncate">Stitched Goods</span>
        </div>

        <div className="p-2.5 sm:p-3 bg-white border border-teal-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] text-teal-700 font-bold uppercase block truncate">Ready to Trim</span>
          <p className="text-base sm:text-lg font-black text-teal-800 mt-0.5">
            {readyToTrimPSC} <span className="text-xs font-normal text-slate-400">PCs</span>
          </p>
          <span className="text-[10px] text-teal-600 font-bold block truncate">Available for Helpers</span>
        </div>

        <div className="p-2.5 sm:p-3 bg-white border border-amber-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] text-amber-700 font-bold uppercase block truncate">In Trimming</span>
          <p className="text-base sm:text-lg font-black text-amber-800 mt-0.5">
            {totalInTrimmingPSC} <span className="text-xs font-normal text-slate-400">PCs</span>
          </p>
          <span className="text-[10px] text-amber-600 block truncate">Active with Helpers</span>
        </div>

        <div className="p-2.5 sm:p-3 bg-white border border-emerald-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] text-emerald-700 font-bold uppercase block truncate">Trimmed Done</span>
          <p className="text-base sm:text-lg font-black text-emerald-800 mt-0.5">
            {totalTrimmedDonePSC} <span className="text-xs font-normal text-slate-400">PCs</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-bold block truncate">Ready for Admin</span>
        </div>

        <div className="p-2.5 sm:p-3 bg-white border border-slate-300 rounded-2xl shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-600 font-bold uppercase block truncate flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 text-slate-500" />
            <span>Skipped</span>
          </span>
          <p className="text-base sm:text-lg font-black text-slate-800 mt-0.5">
            {totalSkippedPSC} <span className="text-xs font-normal text-slate-400">PCs</span>
          </p>
          <span className="text-[10px] text-slate-500 block truncate">Direct Admin Handover</span>
        </div>
      </div>

      {/* Filter Tabs & Collapse All Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl flex-wrap">
          {[
            { id: 'all', label: 'All Jobs', count: masterThreadJobs.length },
            { id: 'In Progress', label: 'In Trimming', count: masterThreadJobs.filter((j) => j.status !== 'Completed' && j.status !== 'Skipped').length },
            { id: 'Completed', label: 'Trimmed Done', count: masterThreadJobs.filter((j) => j.status === 'Completed').length },
            { id: 'Skipped', label: 'Skipped', count: masterThreadJobs.filter((j) => j.status === 'Skipped' || j.actionType === 'skip').length },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === t.id
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>{t.label}</span>
              <span className="ml-1 text-[10px] opacity-70">({t.count})</span>
            </button>
          ))}
        </div>

        {groupedJobs.length > 0 && (
          <button
            type="button"
            onClick={toggleAllLots}
            className="text-[11px] font-bold text-teal-700 hover:text-teal-900 px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Layers className="w-3 h-3 text-teal-600" />
            <span>
              {isAllLotsCollapsed ? 'Expand All Lots' : `Collapse All Lots (${groupedJobs.length})`}
            </span>
          </button>
        )}
      </div>

      {/* Trimming Jobs List Grouped by Fabric Lot */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <Scissors className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">No Trimming Jobs Found</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              {readyToTrimPSC > 0
                ? `You have ${readyToTrimPSC} stitched pieces waiting. Click "Assign Helper" to assign floor helpers or "Skip Trimming" if already clean.`
                : 'When garments are received from tailors, you can assign helpers or skip trimming before handing over to Admin.'}
            </p>
            {readyToTrimPSC > 0 && (
              <button
                type="button"
                onClick={() => onOpenAssignTrimming?.('assign')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Assign {readyToTrimPSC} Pieces Now</span>
              </button>
            )}
          </div>
        ) : (
          groupedJobs.map((group) => {
            const isCollapsed = collapsedLots.has(group.lotKey);
            const lotAssignedPieces = group.items.reduce(
              (sum, tc) => sum + (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0),
              0
            );
            const lotCompletedPieces = group.items.reduce(
              (sum, tc) => sum + (parseInt(tc.completedPieces ?? tc.completedPSC, 10) || 0),
              0
            );
            const lotSkippedPieces = group.items.reduce(
              (sum, tc) => {
                const isSkip = tc.status === 'Skipped' || tc.actionType === 'skip';
                return isSkip ? sum + (parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0) : sum;
              },
              0
            );

            return (
              <div key={group.lotKey} className="space-y-2">
                <LotGroupHeader
                  group={group}
                  activeTab="thread_cutting"
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleLotCollapse(group.lotKey)}
                  summaryBadge={
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                      {lotCompletedPieces} / {lotAssignedPieces} Trimmed {lotSkippedPieces > 0 ? `(${lotSkippedPieces} Skipped)` : ''} ({group.items.length} {group.items.length === 1 ? 'job' : 'jobs'})
                    </span>
                  }
                />
                {!isCollapsed && (
                  <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-teal-200 ml-2 sm:ml-3">
                    {group.items.map((tc) => renderJobCard(tc))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Progress Modal */}
      {progressJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xs rounded-2xl p-4 space-y-3 shadow-xl border border-slate-200 text-xs text-left">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900">Update Trimming Progress</h4>
              <button
                type="button"
                onClick={() => setProgressJob(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 text-[11px] block">
                Trimmed Pieces (Max {parseInt(progressJob.assignedPieces ?? progressJob.assignedPSC, 10) || 0})
              </label>
              <input
                type="number"
                value={progressPSC}
                onChange={(e) => setProgressPSC(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setProgressJob(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const num = parseInt(progressPSC, 10) || 0;
                  const total = parseInt(progressJob.assignedPieces ?? progressJob.assignedPSC, 10) || 0;
                  updateThreadCuttingProgress?.(progressJob.id, Math.min(total, num), num >= total);
                  setProgressJob(null);
                }}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
