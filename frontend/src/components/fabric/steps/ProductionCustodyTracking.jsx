import React, { useState } from 'react';
import {
  Layers,
  Scissors,
  Shirt,
  PackageCheck,
  ChevronDown,
} from 'lucide-react';

function CircularDonutProgress({
  percent = 0,
  segments = null,
  size = 38,
  strokeWidth = 3,
  strokeColor = '#9333ea',
  trackColor = '#f3e8ff',
  textColor = 'text-purple-900',
  title = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Single-segment fallback
  if (!segments || segments.length === 0) {
    const clampedPct = Math.max(0, Math.min(100, Math.round(percent || 0)));
    const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

    return (
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
        title={title || `${clampedPct}%`}
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
          {/* Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Center Percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none leading-none">
          <span className={`font-black tracking-tight text-[10px] ${textColor}`}>
            {clampedPct}%
          </span>
        </div>
      </div>
    );
  }

  // Multi-segment mode
  const activeSegments = segments.filter((s) => (s.percent || 0) > 0);
  const hasMultiple = activeSegments.length > 1;

  const computedSegments = segments.reduce((acc, seg) => {
    const segPct = Math.max(0, Math.min(100, seg.percent || 0));
    const offset = acc.totalOffset;
    return {
      totalOffset: acc.totalOffset + segPct,
      items: acc.items.concat({ ...seg, segPct, offset }),
    };
  }, { totalOffset: 0, items: [] }).items;

  const tooltipText =
    title ||
    segments
      .map(
        (s) =>
          `${s.label ? `${s.label}: ` : ''}${s.value !== undefined ? s.value.toLocaleString('en-IN') : ''} (${s.percent || 0}%)`.trim()
      )
      .join(' • ');

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      title={tooltipText}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor || '#f1f5f9'}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Dynamic Multi-colored Segments */}
        {computedSegments.map((seg, idx) => {
          if (seg.segPct <= 0) return null;

          const gap = hasMultiple ? 1.5 : 0;
          const arcLength = Math.max(0, (seg.segPct / 100) * circumference - gap);
          const dashOffset = -((seg.offset / 100) * circumference);

          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-500 ease-out"
            />
          );
        })}
      </svg>

      {/* Center Percentage Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none leading-none">
        {activeSegments.length > 0 ? (
          <span className={`font-black text-[10px] tracking-tight ${activeSegments[0]?.textColor || textColor}`}>
            {activeSegments[0]?.percent}%
          </span>
        ) : (
          <span className="font-black text-[10px] tracking-tight text-slate-400">
            0%
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProductionCustodyTracking({
  fabric: f = {},
  struct: _struct,
  totalCutPieces = 0,
  totalTargetCutPieces = 0,
  cutPercent = 0,
  totalCutSets = 0,
  cutGroups = [],
  totalStitchedPieces = 0,
  stitchingPercent: _stitchingPercent = 0,
  totalTailorAssignedPieces = 0,
  totalPendingTailorPieces = 0,
  totalTargetGarmentPieces = 0,
  stitchedSubPartsBreakdown = {},
  assignedTailorSubPartsBreakdown = {},
  allPieceNames = [],
  targetPiecesMap = {},
  targetSets = 0,
  targetPiecesForStep3: _targetPiecesForStep3 = 0,
  totalReceivedFromMaster = 0,
  receivedSubPartsMap = {},
}) {
  const [isCutBoxOpen, setIsCutBoxOpen] = useState(false);
  const [isStitchBoxOpen, setIsStitchBoxOpen] = useState(false);
  const [isCustodyBoxOpen, setIsCustodyBoxOpen] = useState(false);

  return (
    <div className="p-2 sm:p-3 bg-white/95 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">
            Cutting, Stitching & Custody Tracking
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/80">
          Master: <strong className="text-slate-800">{f.assignedMasterName || 'Assigned Master'}</strong>
        </span>
      </div>

      {/* Responsive 3 Boxes: 1 row on PC (lg:grid-cols-3), stacked on Mobile (grid-cols-1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Box 1: Cut PCs Cutted (Collapsible - default collapsed) */}
        <div className="p-2 sm:p-2.5 bg-purple-50/30 hover:bg-purple-50/50 rounded-xl border border-purple-200/90 shadow-2xs flex flex-col justify-between gap-2 transition-colors">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsCutBoxOpen(!isCutBoxOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsCutBoxOpen(!isCutBoxOpen);
              }
            }}
            className="flex items-center justify-between gap-1.5 cursor-pointer select-none group"
            title={isCutBoxOpen ? 'Click to collapse details' : 'Click to expand details'}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-purple-200 transition-colors">
                <Scissors className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">
                  Cut PCs Cutted
                </div>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-purple-950">
                    {totalCutPieces.toLocaleString('en-IN')}
                    {totalTargetCutPieces > 0 && (
                      <span className="text-purple-700/60 font-semibold text-[10px] sm:text-xs">
                        {' '}/ {totalTargetCutPieces.toLocaleString('en-IN')}
                      </span>
                    )}{' '}
                    Cut PCs
                  </span>
                  {totalCutSets > 0 && (
                    <span className="text-[10px] text-slate-500 font-semibold">
                      ({totalCutSets}{targetSets > 0 ? ` / ${targetSets}` : ''} Sets)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CircularDonutProgress
                percent={totalCutPieces > 0 ? cutPercent : 0}
                size={38}
                strokeWidth={3}
                strokeColor="#9333ea"
                trackColor="#f3e8ff"
                textColor="text-purple-900"
              />
              <div className="p-0.5 text-slate-400 group-hover:text-purple-700 rounded transition-colors">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCutBoxOpen ? 'rotate-180 text-purple-700' : ''}`} />
              </div>
            </div>
          </div>

          {/* Subpart sections with horizontal progress bars */}
          {isCutBoxOpen && (
            <div className="space-y-1.5 pt-1.5 border-t border-purple-100 animate-in fade-in duration-150">
              {cutGroups.length > 0 ? (
                cutGroups.map((grp) => {
                  const grpTarget = targetPiecesMap[grp.name] || targetSets || 1;
                  const isSingle = !grp.components || grp.components.length <= 1;

                  if (isSingle) {
                    const singleComp = grp.components?.[0] || { count: grp.totalCut || 0 };
                    const compRatio = parseInt(singleComp.qty || singleComp.ratio || 1, 10) || 1;
                    const compTarget = targetPiecesMap[singleComp.name] || targetPiecesMap[singleComp.id] || (targetSets > 0 ? targetSets * compRatio : grpTarget * compRatio);
                    const compPct = compTarget > 0 ? Math.min(100, Math.round((singleComp.count / compTarget) * 100)) : 0;

                    return (
                      <div key={grp.id || grp.name} className="space-y-1 bg-white/90 px-2.5 py-1.5 rounded-lg border border-purple-100/90 shadow-2xs">
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-purple-950 font-black text-[11px]">{grp.name}</span>
                            <span className="text-[10px] font-semibold text-slate-500 truncate">
                              (<strong className="text-purple-950 font-black">{singleComp.count.toLocaleString('en-IN')}</strong> / {compTarget.toLocaleString('en-IN')} PCs)
                            </span>
                          </div>
                          <span className="text-purple-700 text-[9px] font-black bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60 shrink-0">
                            {compPct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all duration-300"
                            style={{ width: `${compPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  }

                  const grpTargetPieces = grp.components && grp.components.length > 0
                    ? grp.components.reduce((sum, c) => {
                        const cRatio = parseInt(c.qty || c.ratio || 1, 10) || 1;
                        return sum + (targetSets > 0 ? targetSets * cRatio : (targetPiecesMap[c.name] || grpTarget * cRatio));
                      }, 0)
                    : (targetPiecesMap[grp.name] || (targetSets > 0 ? targetSets : grpTarget));

                  const grpPct = grpTargetPieces > 0
                    ? Math.min(100, Math.round(((grp.totalCut || 0) / grpTargetPieces) * 100))
                    : 0;

                  return (
                    <div key={grp.id} className="space-y-1 bg-white/90 px-2.5 py-1.5 rounded-lg border border-purple-100/90 shadow-2xs">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-purple-950 font-black text-[11px]">{grp.name}</span>
                        <span className="text-purple-700 text-[9px] font-extrabold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60">
                          {grp.totalCut.toLocaleString('en-IN')} / {grpTargetPieces.toLocaleString('en-IN')} PCs ({grpPct}%)
                        </span>
                      </div>

                      <div className="space-y-1 pt-0.5">
                        {grp.components.map((comp) => {
                          const compRatio = parseInt(comp.qty || comp.ratio || 1, 10) || 1;
                          const compTarget = targetPiecesMap[comp.name] || targetPiecesMap[comp.id] || (targetSets > 0 ? targetSets * compRatio : grpTarget * compRatio);
                          const compPct = compTarget > 0 ? Math.min(100, Math.round((comp.count / compTarget) * 100)) : 0;
                          return (
                            <div key={comp.id || comp.name} className="space-y-0.5">
                              <div className="flex items-center justify-between text-[9px] font-semibold text-slate-600">
                                <span className="text-slate-700 font-bold">
                                  {comp.name} {compRatio > 1 ? `(x${compRatio}/Set)` : ''}
                                </span>
                                <span>
                                  <strong className="text-purple-950 font-black">{comp.count.toLocaleString('en-IN')}</strong> / {compTarget.toLocaleString('en-IN')} ({compPct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-purple-600 rounded-full transition-all duration-300"
                                  style={{ width: `${compPct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-[11px] text-slate-400 font-medium py-1">Pending cutting</div>
              )}
            </div>
          )}
        </div>

        {/* Box 2: Stitched by Tailors (Collapsible - default collapsed) */}
        <div className="p-2 sm:p-2.5 bg-blue-50/30 hover:bg-blue-50/50 rounded-xl border border-blue-200/90 shadow-2xs flex flex-col justify-between gap-2 transition-colors">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsStitchBoxOpen(!isStitchBoxOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsStitchBoxOpen(!isStitchBoxOpen);
              }
            }}
            className="flex items-center justify-between gap-1.5 cursor-pointer select-none group"
            title={isStitchBoxOpen ? 'Click to collapse details' : 'Click to expand details'}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-200 transition-colors">
                <Shirt className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">
                  Stitched by Tailors
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs sm:text-sm font-black text-blue-950">
                    {totalStitchedPieces.toLocaleString('en-IN')} Stitched
                  </span>
                  <span className="text-slate-300 font-bold">•</span>
                  <span className="text-xs sm:text-sm font-black text-amber-800">
                    {(totalTailorAssignedPieces > 0
                      ? totalPendingTailorPieces
                      : Math.max(0, totalTargetGarmentPieces - totalStitchedPieces)
                    ).toLocaleString('en-IN')} Rem
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {(() => {
                const remPieces = totalTailorAssignedPieces > 0
                  ? totalPendingTailorPieces
                  : Math.max(0, totalTargetGarmentPieces - totalStitchedPieces);
                const totalStitchScope = totalStitchedPieces + remPieces;
                const stitchedPct = totalStitchScope > 0 ? Math.round((totalStitchedPieces / totalStitchScope) * 100) : 0;

                return (
                  <CircularDonutProgress
                    percent={stitchedPct}
                    size={38}
                    strokeWidth={3}
                    strokeColor="#2563eb"
                    trackColor="#eff6ff"
                    textColor="text-blue-900"
                    title={`${totalStitchedPieces.toLocaleString('en-IN')} Stitched (${stitchedPct}%)`}
                  />
                );
              })()}
              <div className="p-0.5 text-slate-400 group-hover:text-blue-700 rounded transition-colors">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isStitchBoxOpen ? 'rotate-180 text-blue-700' : ''}`} />
              </div>
            </div>
          </div>

          {/* Subparts sections (Top and Bottom) each with multicolor progress bar (Stitched vs Remaining = 100%) */}
          {isStitchBoxOpen && (
            <div className="space-y-1.5 pt-1.5 border-t border-blue-100 animate-in fade-in duration-150">
              {allPieceNames.map((pName) => {
                const stitchedCount = stitchedSubPartsBreakdown[pName] || 0;
                const assignedCount = assignedTailorSubPartsBreakdown[pName] || 0;
                const tailorRemaining = Math.max(0, assignedCount - stitchedCount);
                const lotTarget = targetPiecesMap[pName] || targetSets || 1;
                const lotRemaining = Math.max(0, lotTarget - stitchedCount);
                const remainingCount = totalTailorAssignedPieces > 0 ? tailorRemaining : lotRemaining;
                const stitchingTotal = stitchedCount + remainingCount;
                const stitchedPct = stitchingTotal > 0 ? Math.round((stitchedCount / stitchingTotal) * 100) : 0;
                const remainingPct = stitchingTotal > 0 ? 100 - stitchedPct : 0;

                return (
                  <div key={pName} className="space-y-1 bg-white/90 px-2.5 py-1.5 rounded-lg border border-blue-100/90 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-slate-900 font-black text-[11px]">{pName}</span>
                        <span className="text-[10px] font-semibold text-slate-500 truncate">
                          (<strong className="text-blue-700">{stitchedCount.toLocaleString('en-IN')}</strong> Stitched • <strong className="text-amber-700">{remainingCount.toLocaleString('en-IN')}</strong> Rem)
                        </span>
                      </div>
                      <span className="text-blue-700 text-[9px] font-black bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 shrink-0">
                        {stitchedPct}%
                      </span>
                    </div>

                    {/* Multicolor Progress Bar: Stitched (Blue) + Remaining (Amber) = 100% */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                      {stitchedCount > 0 && (
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${stitchedPct}%` }}
                          title={`${stitchedCount} Stitched`}
                        />
                      )}
                      {remainingCount > 0 && (
                        <div
                          className="h-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${remainingPct}%` }}
                          title={`${remainingCount} Remaining`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Box 3: Handover & Custody (Collapsible - default collapsed) */}
        {(() => {
          const totalMasterCustody = Math.max(0, totalStitchedPieces - totalReceivedFromMaster);
          const hasCustodyPieces = (totalReceivedFromMaster + totalMasterCustody) > 0;
          const adminOverallPct = hasCustodyPieces
            ? Math.min(100, Math.round((totalReceivedFromMaster / (totalReceivedFromMaster + totalMasterCustody)) * 100))
            : 0;

          return (
            <div className="p-2 sm:p-2.5 bg-emerald-50/30 hover:bg-emerald-50/50 rounded-xl border border-emerald-200/90 shadow-2xs flex flex-col justify-between gap-2 transition-colors">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsCustodyBoxOpen(!isCustodyBoxOpen)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsCustodyBoxOpen(!isCustodyBoxOpen);
                  }
                }}
                className="flex items-center justify-between gap-1.5 cursor-pointer select-none group"
                title={isCustodyBoxOpen ? 'Click to collapse details' : 'Click to expand details'}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-emerald-200 transition-colors">
                    <PackageCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">
                      Handover & Custody
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs sm:text-sm font-black text-emerald-950">
                        {totalReceivedFromMaster.toLocaleString('en-IN')} Admin • {totalMasterCustody.toLocaleString('en-IN')} Master
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <CircularDonutProgress
                    percent={adminOverallPct}
                    size={38}
                    strokeWidth={3}
                    strokeColor="#059669"
                    trackColor="#ecfdf5"
                    textColor="text-emerald-950"
                    title={`${totalReceivedFromMaster.toLocaleString('en-IN')} Admin (${adminOverallPct}%)`}
                  />
                  <div className="p-0.5 text-slate-400 group-hover:text-emerald-700 rounded transition-colors">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCustodyBoxOpen ? 'rotate-180 text-emerald-700' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Subpart breakdown (Top & Bottom) with multicolor progress bars (Admin vs Master) */}
              {isCustodyBoxOpen && (
                <div className="space-y-1.5 pt-1.5 border-t border-emerald-100 animate-in fade-in duration-150">
                  {allPieceNames.map((pName) => {
                    const adminCount = receivedSubPartsMap[pName] || 0;
                    const stitchedCount = stitchedSubPartsBreakdown[pName] || 0;
                    const masterCount = Math.max(0, stitchedCount - adminCount);
                    const custodyTotal = adminCount + masterCount;
                    const partAdminPct = custodyTotal > 0 ? Math.round((adminCount / custodyTotal) * 100) : (adminCount > 0 ? 100 : 0);
                    const partMasterPct = custodyTotal > 0 ? 100 - partAdminPct : 0;

                    return (
                      <div key={pName} className="space-y-1 bg-white/90 px-2.5 py-1.5 rounded-lg border border-emerald-100/90 shadow-2xs">
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-slate-900 font-black text-[11px]">{pName}</span>
                            <span className="text-[10px] font-semibold text-slate-500 truncate">
                              (<strong className="text-emerald-700">{adminCount.toLocaleString('en-IN')}</strong> Admin • <strong className="text-blue-700">{masterCount.toLocaleString('en-IN')}</strong> Master)
                            </span>
                          </div>
                          <span className="text-emerald-700 text-[9px] font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 shrink-0">
                            {partAdminPct}%
                          </span>
                        </div>

                        {/* Multicolor Progress Bar: Admin (Green) + Master (Blue) = 100% */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                          {adminCount > 0 && (
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${partAdminPct}%` }}
                              title={`${adminCount} Admin`}
                            />
                          )}
                          {masterCount > 0 && (
                            <div
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${partMasterPct}%` }}
                              title={`${masterCount} Master`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
