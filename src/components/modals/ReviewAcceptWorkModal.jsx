import React, { useMemo } from 'react';
import {
  X,
  Scissors,
  IndianRupee,
  Calendar,
  UserCheck,
  CheckCircle2,
  Layers,
  Info,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useFabric } from '../../context/useManagement';
import { useAuth } from '../../context/useAuth';
import { resolveWorkDetails, formatPieceName } from '../../utils/productUtils';


export default function ReviewAcceptWorkModal({
  isOpen,
  onClose,
  assignment,
  onAccept,
  machineName = null,
  isMaster = false,
  isMasterReview = false,
}) {
  const { currentUser } = useAuth();
  const isMasterUser = Boolean(isMaster || isMasterReview || currentUser?.role === 'Master');
  const { cuttings = [], fabrics = [] } = useFabric();

  const fabric = useMemo(() => {
    if (!assignment) return null;
    const cutting = cuttings.find((c) => c.id === assignment.cuttingId);
    return fabrics.find((f) => f.id === (cutting?.fabricId || assignment.fabricId)) || null;
  }, [assignment, cuttings, fabrics]);

  const details = useMemo(() => resolveWorkDetails(assignment, fabric), [assignment, fabric]);

  if (!isOpen || !assignment || !details) return null;

  const handleConfirmAccept = () => {
    if (onAccept) onAccept(assignment.id);
    onClose();
  };

  const masterDisplayName = assignment.masterName
    ? (assignment.masterName.startsWith('Master') ? assignment.masterName : `Master ${assignment.masterName}`)
    : 'Cutting Master';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 text-left">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black tracking-tight leading-tight">
                  Review Work Allocation
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-100 border border-amber-300/30 shrink-0">
                  Pending Acceptance
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-medium truncate mt-0.5">
                {assignment.fabricName || 'Fabric Lot'} • Batch #{assignment.id ? assignment.id.slice(-6) : 'BATCH'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1 text-left">
          {/* Instructions Notice */}
          <div className="p-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-center gap-2 text-xs text-amber-950">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="leading-snug text-[11px] sm:text-xs">
              <span className="font-bold">Verify physical bundles:</span> Please check that Cut PCs delivered by{' '}
              <strong className="text-amber-950 font-black">{masterDisplayName}</strong> match counts below before accepting.
            </div>
          </div>

          <div className="space-y-2.5">
            {/* 1. Stitched Work & Cut PCs */}
            <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-purple-100 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Scissors className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide truncate">
                      1. Stitched Work &amp; Cut PCs
                    </h3>
                    <span className="text-[10px] text-slate-500 block truncate">From {masterDisplayName}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Garment & Pieces Breakdown */}
              {(() => {
                if (details.subPartsList?.length > 0) {
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                      {details.subPartsList.map((sp, idx) => {
                        const hasComponents = Array.isArray(sp.components) && sp.components.length > 1;
                        return (
                          <div
                            key={sp.id || idx}
                            className="p-2.5 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1.5 text-left"
                          >
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-4 h-4 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-black text-slate-900 uppercase tracking-wide truncate">
                                  {sp.name}
                                </span>
                                {sp.formula && (
                                  <span className="text-[9px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100/80 truncate">
                                    {sp.formula}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-black text-purple-900 bg-purple-100/80 px-2 py-0.5 rounded-lg border border-purple-200/60 shrink-0">
                                {sp.count} PCs to Stitch
                              </span>
                            </div>

                            {/* Component Breakdown */}
                            {hasComponents ? (
                              <div className={`grid gap-1.5 ${sp.components.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                {sp.components.map((comp) => (
                                  <div
                                    key={comp.id || comp.name}
                                    className="p-1.5 bg-purple-50/50 rounded-lg border border-purple-100/80 text-center"
                                  >
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                                      {comp.name}
                                    </span>
                                    <span className="text-xs font-black text-purple-950">
                                      {comp.count.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60 flex items-center justify-between">
                                <span className="font-semibold text-slate-500">Cut Pieces:</span>
                                <span className="font-black text-purple-900">{sp.count} Cut PCs (1:1)</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-[11px] px-0.5">
                      <span className="font-semibold text-slate-500">Target Production:</span>
                      <span className="font-black text-purple-950 bg-white px-2 py-0.5 rounded-lg border border-purple-200 shadow-2xs">
                        {details.totalTargetPSC.toLocaleString('en-IN')} Finished PCs
                      </span>
                    </div>
                    <div className={`grid gap-2 ${details.piecesList.length <= 2 ? 'grid-cols-2'
                      : details.piecesList.length === 3 ? 'grid-cols-3'
                        : details.piecesList.length === 4 ? 'grid-cols-4'
                          : 'grid-cols-3 sm:grid-cols-5'
                      }`}>
                      {details.piecesList.map((item) => (
                        <div
                          key={item.id}
                          className="p-2 bg-white rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-between"
                        >
                          <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider truncate">
                            {item.name}
                          </span>
                          <span className="text-xs sm:text-sm font-black text-purple-950 mt-0.5">
                            {item.count.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            Cut PCs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 2. Guaranteed Earnings (Hidden for Master users) */}
            {!isMasterUser && (
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <IndianRupee className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide truncate">
                        2. Money You Will Get
                      </h3>
                      <span className="text-[10px] text-slate-500 block truncate">Credited upon completion</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                      ₹{details.totalPayout.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                  {details.rateBreakdown.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white rounded-xl border border-emerald-100 shadow-2xs flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-700 text-[11px]">
                        {r.count} {r.item} @ ₹{r.rate}/{formatPieceName(r.item, 1)}
                      </span>
                      <span className="font-extrabold text-emerald-700 text-xs sm:text-sm">
                        ₹{r.total.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Allocation Metadata Footer */}
          <div className="p-2.5 sm:p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5 shadow-2xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Master: <strong className="text-slate-800">{assignment.masterName || 'Unassigned'}</strong></span>
              </div>
              {machineName && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Machine: <strong className="text-slate-800">{machineName}</strong></span>
                </div>
              )}
              {assignment.assignDate && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Assigned: <strong className="text-slate-800">{assignment.assignDate}</strong></span>
                </div>
              )}
              {assignment.dueDate && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Due: <strong className="text-slate-800">{assignment.dueDate}</strong></span>
                </div>
              )}
            </div>

            {assignment.notes && (
              <p className="pt-1.5 border-t border-slate-200/60 italic text-slate-500 text-[10px] sm:text-[11px]">
                "{assignment.notes}"
              </p>
            )}
          </div>
        </div>

        {/* Sticky Modal Actions */}
        <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-white/95 backdrop-blur-xs flex items-center justify-between gap-2 shrink-0 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="w-24 sm:w-28 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0"
          >
            Review Later
          </button>
          <button
            type="button"
            onClick={handleConfirmAccept}
            className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black shadow-md shadow-emerald-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Confirm &amp; Accept Work</span>
          </button>
        </div>
      </div>
    </div>
  );
}
