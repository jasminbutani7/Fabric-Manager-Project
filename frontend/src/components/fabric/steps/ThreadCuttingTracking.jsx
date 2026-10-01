import React, { useState } from 'react';
import {
  Scissors,
  PackageCheck,
  CheckCircle2,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { resolvePieceLabel } from '../../../utils/productUtils';

function CircularDonutProgress({
  percent = 0,
  segments = null,
  total = null,
  size = 40,
  strokeWidth = 3.5,
  strokeColor = '#0d9488',
  trackColor = '#ccfbf1',
  textColor = 'text-teal-900',
  centerContent = null,
  title = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Resolve segments: if segments array is provided, use it; otherwise fallback to single segment
  const isMultiSegment = Array.isArray(segments) && segments.length > 0;
  const rawSegments = isMultiSegment
    ? segments
    : [{ value: Math.max(0, Math.min(100, Number(percent) || 0)), color: strokeColor, label: '' }];

  const effectiveTotal = total > 0
    ? total
    : (isMultiSegment
      ? Math.max(1, rawSegments.reduce((sum, s) => sum + (Number(s.value) || 0), 0))
      : 100);

  const rawNonZero = rawSegments
    .map((s) => {
      const val = Math.max(0, Number(s.value) || 0);
      const pct = effectiveTotal > 0 ? (val / effectiveTotal) * 100 : 0;
      return { ...s, val, pct };
    })
    .filter((s) => s.pct > 0.05);

  const nonZeroSegments = rawNonZero.reduce((acc, s) => {
    const clampedPct = Math.min(s.pct, Math.max(0, 100 - acc.cumulativePct));
    const startAngle = (acc.cumulativePct / 100) * 360;
    return {
      cumulativePct: acc.cumulativePct + clampedPct,
      items: acc.items.concat({ ...s, clampedPct, startAngle }),
    };
  }, { cumulativePct: 0, items: [] }).items;

  const activeCount = nonZeroSegments.length;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      title={title || `${Math.round(percent || 0)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Track Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Multi-segment Progress Rings */}
        {nonZeroSegments.map((s, idx) => {
          const segLength = (s.clampedPct / 100) * circumference;

          return (
            <circle
              key={s.label || idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segLength} ${circumference}`}
              strokeDashoffset={0}
              transform={`rotate(${s.startAngle} ${size / 2} ${size / 2})`}
              strokeLinecap={activeCount === 1 ? 'round' : 'butt'}
              fill="none"
              className="transition-all duration-500 ease-out"
            />
          );
        })}
      </svg>

      {/* Center percentage or custom elements */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none leading-none">
        {centerContent !== null && centerContent !== undefined ? (
          centerContent
        ) : (
          <span className={`font-black tracking-tight text-[10px] ${textColor}`}>
            {Math.max(0, Math.min(100, Math.round(percent || 0)))}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function ThreadCuttingTracking({
  fabric: f = {},
  struct: _struct,
  totalVerifiedPieces = 0,
  threadCuttedCount = 0,
  totalSkippedCount = 0,
  piecesAwaitingTrimming = 0,
  inProgressThreadCount = 0,
  allPieceNames = [],
  verifiedSubPartsMap = {},
  threadCuttedSubPartsMap = {},
  skippedMap = {},
  inProgressSubPartsMap = {},
  awaitingTrimmingSubPartsMap = {},
  cutGroups: _cutGroups = [],
  targetPiecesMap = {},
  targetSets = 0,
  targetPiecesForStep3 = 0,
  onOpenTrimmingDecisionModal,
}) {
  const [isAdminBoxOpen, setIsAdminBoxOpen] = useState(false);
  const [isInProgressBoxOpen, setIsInProgressBoxOpen] = useState(false);
  const [isCompletedBoxOpen, setIsCompletedBoxOpen] = useState(false);

  let struct = _struct || f.productStructure || f.product_structure;
  if (typeof struct === 'string') {
    try { struct = JSON.parse(struct); } catch { struct = null; }
  }

  const getCountForPart = (map, pName) => {
    if (!map || typeof map !== 'object') return 0;
    if (map[pName] !== undefined) return parseInt(map[pName], 10) || 0;
    const norm = pName.toLowerCase().trim();
    if (map[norm] !== undefined) return parseInt(map[norm], 10) || 0;
    const found = Object.entries(map).find(([k]) => {
      const cleanK = k.toLowerCase().trim();
      if (cleanK === norm) return true;
      try {
        const resolved = resolvePieceLabel(k, struct)?.toLowerCase().trim();
        return resolved === norm;
      } catch {
        return false;
      }
    });
    return found ? (parseInt(found[1], 10) || 0) : 0;
  };

  // Box 1: Admin Received Percentage
  const adminReceivedPct = targetPiecesForStep3 > 0
    ? Math.min(100, Math.round((totalVerifiedPieces / targetPiecesForStep3) * 100))
    : (totalVerifiedPieces > 0 ? 100 : 0);

  // Box 2: In Progress Percentage
  const box2Total = totalVerifiedPieces > 0
    ? totalVerifiedPieces
    : Math.max(1, inProgressThreadCount + piecesAwaitingTrimming);
  const box2InProgPct = box2Total > 0 ? Math.round((inProgressThreadCount / box2Total) * 100) : 0;

  // Box 3: Thread Cutted Percentage & Completion
  const box3Total = totalVerifiedPieces > 0
    ? totalVerifiedPieces
    : Math.max(1, threadCuttedCount + totalSkippedCount);
  const box3CuttedPct = box3Total > 0 ? Math.round((threadCuttedCount / box3Total) * 100) : 0;
  const completedPct = box3Total > 0
    ? Math.min(100, Math.round(((threadCuttedCount + totalSkippedCount) / box3Total) * 100))
    : 0;

  return (
    <div className="p-2 sm:p-3 bg-white/95 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
      {/* Tracking Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-teal-700" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">
            Thread Cutting & Trimming Tracking
          </span>
        </div>
        {piecesAwaitingTrimming > 0 && onOpenTrimmingDecisionModal ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTrimmingDecisionModal(f);
            }}
            className="text-[11px] font-black px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Setup Trimming: Assign helper or skip trimming for awaiting pieces"
          >
            <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Setup Trimming ({piecesAwaitingTrimming})</span>
          </button>
        ) : (
          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
            Status: <strong className="text-teal-950">{completedPct >= 100 ? 'Trimmed (Ready)' : inProgressThreadCount > 0 ? 'In Progress' : 'Awaiting Trimming'}</strong>
          </span>
        )}
      </div>

      {/* Responsive 3 Boxes: 1 row on PC (lg:grid-cols-3), stacked on Mobile (grid-cols-1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Box 1: Admin Received (Workload Intake) */}
        <div className="p-2 sm:p-2.5 bg-teal-50/30 hover:bg-teal-50/50 rounded-xl border border-teal-200/90 shadow-2xs flex flex-col justify-between gap-2 transition-colors">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsAdminBoxOpen(!isAdminBoxOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsAdminBoxOpen(!isAdminBoxOpen);
              }
            }}
            className="flex items-center justify-between gap-1.5 cursor-pointer select-none group"
            title={isAdminBoxOpen ? 'Click to collapse details' : 'Click to expand details'}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-teal-200 transition-colors">
                <PackageCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">
                  Admin Received
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs sm:text-sm font-black text-teal-950">
                    {totalVerifiedPieces.toLocaleString('en-IN')} Received PCs
                  </span>
                  {targetSets > 0 && (
                    <span className="text-[10px] text-slate-500 font-semibold">
                      ({targetSets} Sets)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CircularDonutProgress
                percent={adminReceivedPct}
                size={40}
                strokeWidth={3.5}
                strokeColor="#0d9488"
                trackColor="#ccfbf1"
                textColor="text-teal-900"
              />
              <div className="p-0.5 text-slate-400 group-hover:text-teal-700 rounded transition-colors">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isAdminBoxOpen ? 'rotate-180 text-teal-700' : ''}`} />
              </div>
            </div>
          </div>

          {/* Subparts breakdown with horizontal progress bars */}
          {isAdminBoxOpen && (
            <div className="space-y-1.5 pt-1.5 border-t border-teal-100 animate-in fade-in duration-150">
              {allPieceNames.map((pName) => {
                const count = getCountForPart(verifiedSubPartsMap, pName);
                const pTarget = getCountForPart(targetPiecesMap, pName) || targetSets || count || 1;
                const pPct = pTarget > 0 ? Math.min(100, Math.round((count / pTarget) * 100)) : (count > 0 ? 100 : 0);
                return (
                  <div key={pName} className="space-y-1 bg-white/90 px-2.5 py-1.5 rounded-lg border border-teal-100/90 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-900 font-black text-[11px]">{pName}</span>
                        <span className="text-[10px] font-semibold text-slate-500 truncate">
                          (<strong className="text-teal-950 font-black">{count.toLocaleString('en-IN')}</strong> / {pTarget} Received)
                        </span>
                      </div>
                      <span className="text-teal-800 text-[9px] font-black bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60 shrink-0">
                        {pPct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner flex">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all duration-300"
                        style={{ width: `${pPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Box 2: In Progress & Awaiting (Helper Trimming Workload) */}
        <div className="p-2 sm:p-2.5 bg-sky-50/30 hover:bg-sky-50/50 rounded-xl border border-sky-200/90 shadow-2xs flex flex-col justify-between gap-2 transition-colors">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsInProgressBoxOpen(!isInProgressBoxOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsInProgressBoxOpen(!isInProgressBoxOpen);
              }
            }}
            className="flex items-center justify-between gap-1.5 cursor-pointer select-none group"
            title={isInProgressBoxOpen ? 'Click to collapse details' : 'Click to expand details'}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-sky-200 transition-colors">
                <Scissors className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">
                  In Progress & Awaiting
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs sm:text-sm font-black text-sky-950">
                    {inProgressThreadCount.toLocaleString('en-IN')} In Prog
                  </span>
                  <span className="text-slate-300 font-bold">•</span>
                  <span className="text-xs sm:text-sm font-black text-amber-800">
                    {piecesAwaitingTrimming.toLocaleString('en-IN')} Awaiting
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CircularDonutProgress
                percent={box2InProgPct}
                size={40}
                strokeWidth={3.5}
                strokeColor="#0284c7"
                trackColor="#e0f2fe"
                textColor="text-sky-900"
                title={`${inProgressThreadCount.toLocaleString('en-IN')} In Progress (${box2InProgPct}%)`}
              />
              <div className="p-0.5 text-slate-400 group-hover:text-sky-700 rounded transition-colors">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isInProgressBoxOpen ? 'rotate-180 text-sky-700' : ''}`} />
              </div>
            </div>
          </div>

          {/* Subparts sections each with multicolor progress bar (In Progress vs Awaiting) */}
          {isInProgressBoxOpen && (
            <div className="space-y-1.5 pt-1.5 border-t border-sky-100 animate-in fade-in duration-150">
              {allPieceNames.map((pName) => {
                const inProg = getCountForPart(inProgressSubPartsMap, pName);
                const awaiting = getCountForPart(awaitingTrimmingSubPartsMap, pName);
                const partVerified = getCountForPart(verifiedSubPartsMap, pName);
                const partTotal = (inProg + awaiting) > 0 ? (inProg + awaiting) : (partVerified || 1);
                const inProgPct = Math.round((inProg / partTotal) * 100);
                const awaitingPct = partTotal > 0 ? Math.min(100 - inProgPct, Math.round((awaiting / partTotal) * 100)) : 0;

                return (
                  <div key={pName} className="space-y-1 bg-white/90 px-2.5 py-1.5 rounded-lg border border-sky-100/90 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-900 font-black text-[11px]">{pName}</span>
                        <span className="text-[10px] font-semibold text-slate-500 truncate">
                          (<strong className="text-sky-700">{inProg.toLocaleString('en-IN')}</strong> In Prog • <strong className="text-amber-700">{awaiting.toLocaleString('en-IN')}</strong> Awaiting)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {inProg > 0 && (
                          <span className="text-sky-700 text-[9px] font-black bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/60">
                            {inProgPct}% Prog
                          </span>
                        )}
                        {awaiting > 0 && (
                          <span className="text-amber-800 text-[9px] font-black bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                            {awaitingPct}% Await
                          </span>
                        )}
                        {inProg === 0 && awaiting === 0 && (
                          <span className="text-slate-400 text-[9px] font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                            0%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Multicolor Progress Bar: In Progress (Sky) + Awaiting (Amber) */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex shadow-inner">
                      {inProg > 0 && (
                        <div
                          className="h-full bg-sky-500 transition-all duration-300"
                          style={{ width: `${inProgPct}%` }}
                          title={`${inProg} In Progress (${inProgPct}%)`}
                        />
                      )}
                      {awaiting > 0 && (
                        <div
                          className="h-full bg-amber-400 transition-all duration-300"
                          style={{ width: `${awaitingPct}%` }}
                          title={`${awaiting} Awaiting (${awaitingPct}%)`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Box 3: Thread Cutted & Skipped (Ready for Step 5) */}
        <div className="p-2 sm:p-2.5 bg-emerald-50/30 hover:bg-emerald-50/50 rounded-xl border border-emerald-200/90 shadow-2xs flex flex-col justify-between gap-2 transition-colors">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsCompletedBoxOpen(!isCompletedBoxOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsCompletedBoxOpen(!isCompletedBoxOpen);
              }
            }}
            className="flex items-center justify-between gap-1.5 cursor-pointer select-none group"
            title={isCompletedBoxOpen ? 'Click to collapse details' : 'Click to expand details'}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-emerald-200 transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">
                  Thread Cutted & Skipped
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs sm:text-sm font-black text-emerald-950">
                    {threadCuttedCount.toLocaleString('en-IN')} Cutted
                  </span>
                  <span className="text-slate-300 font-bold">•</span>
                  <span className="text-xs sm:text-sm font-black text-slate-700">
                    {totalSkippedCount.toLocaleString('en-IN')} Skipped
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CircularDonutProgress
                percent={box3CuttedPct}
                size={40}
                strokeWidth={3.5}
                strokeColor="#059669"
                trackColor="#d1fae5"
                textColor="text-emerald-950"
                title={`${threadCuttedCount.toLocaleString('en-IN')} Cutted (${box3CuttedPct}%)`}
              />
              <div className="p-0.5 text-slate-400 group-hover:text-emerald-700 rounded transition-colors">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCompletedBoxOpen ? 'rotate-180 text-emerald-700' : ''}`} />
              </div>
            </div>
          </div>

          {/* Subpart breakdown with multicolor progress bars (Cutted vs Skipped vs Pending) */}
          {isCompletedBoxOpen && (
            <div className="space-y-1.5 pt-1.5 border-t border-emerald-100 animate-in fade-in duration-150">
              {allPieceNames.map((pName) => {
                const cutted = getCountForPart(threadCuttedSubPartsMap, pName);
                const skipped = getCountForPart(skippedMap, pName);
                const verified = getCountForPart(verifiedSubPartsMap, pName) || (cutted + skipped) || 1;
                const cuttedPct = verified > 0 ? Math.min(100, Math.round((cutted / verified) * 100)) : 0;
                const skippedPct = verified > 0 ? Math.min(100 - cuttedPct, Math.round((skipped / verified) * 100)) : 0;

                return (
                  <div key={pName} className="space-y-1 bg-white/90 px-2.5 py-1.5 rounded-lg border border-emerald-100/90 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-900 font-black text-[11px]">{pName}</span>
                        <span className="text-[10px] font-semibold text-slate-500 truncate">
                          (<strong className="text-emerald-700">{cutted.toLocaleString('en-IN')}</strong> Cutted • <strong className="text-slate-600">{skipped.toLocaleString('en-IN')}</strong> Skipped)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {cutted > 0 && (
                          <span className="text-emerald-700 text-[9px] font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                            {cuttedPct}% Cut
                          </span>
                        )}
                        {skipped > 0 && (
                          <span className="text-slate-600 text-[9px] font-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                            {skippedPct}% Skip
                          </span>
                        )}
                        {cutted === 0 && skipped === 0 && (
                          <span className="text-slate-400 text-[9px] font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                            0%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Multicolor Progress Bar: Cutted (Green) + Skipped (Slate) */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex shadow-inner">
                      {cutted > 0 && (
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${cuttedPct}%` }}
                          title={`${cutted} Cutted (${cuttedPct}%)`}
                        />
                      )}
                      {skipped > 0 && (
                        <div
                          className="h-full bg-slate-400 transition-all duration-300"
                          style={{ width: `${skippedPct}%` }}
                          title={`${skipped} Skipped (${skippedPct}%)`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
