import React, { lazy, Suspense } from 'react';
import { Trash2, AlertTriangle, X, Scissors } from 'lucide-react';
import { sanitizeFabricName } from '../../context/managementContextInstance';
import { formatPieceName } from '../../utils/productUtils';
import { sanitizeInteger, blockInvalidNumberKeys } from '../../utils/formValidation';

const AssignTailorModal = lazy(() => import('../modals/AssignTailorModal'));
const LogDailyWorkModal = lazy(() => import('../modals/LogDailyWorkModal'));
const AssignThreadCuttingModal = lazy(() => import('../modals/AssignThreadCuttingModal'));
const ReviewAcceptWorkModal = lazy(() => import('../modals/ReviewAcceptWorkModal'));
const ThreadTrimmingDecisionModal = lazy(() => import('../modals/ThreadTrimmingDecisionModal'));

export default function OrdersModalsContainer({
  // Assign tailor
  showAssignTailorModal,
  setShowAssignTailorModal,
  selectedCuttingForAssign,
  setSelectedCuttingForAssign,
  setActiveTab,

  // Daily log
  selectedAssignmentForDailyLog,
  setSelectedAssignmentForDailyLog,
  tailorAssignments,

  // Delete cutting
  deleteCuttingConfirm,
  setDeleteCuttingConfirm,
  deleteCutting,

  // Delete assignment
  deleteAssignConfirm,
  setDeleteAssignConfirm,
  deleteAssignment,

  // Reject handover
  rejectHandoverModal,
  setRejectHandoverModal,
  rejectHandoverReason,
  setRejectHandoverReason,
  rejectMasterHandover,

  // Delete handover
  deleteHandoverConfirm,
  setDeleteHandoverConfirm,
  deleteMasterHandover,

  // Thread cutting assignment
  showAssignThreadCuttingModal,
  setShowAssignThreadCuttingModal,
  selectedCuttingForThreadCutting,
  setSelectedCuttingForThreadCutting,
  selectedHandoverForThreadCutting,
  setSelectedHandoverForThreadCutting,
  selectedSubPartForThreadCutting,
  setSelectedSubPartForThreadCutting,
  selectedQuantityForThreadCutting,
  setSelectedQuantityForThreadCutting,
  selectedSubPartQuantitiesForThreadCutting,
  setSelectedSubPartQuantitiesForThreadCutting,

  // Progress update
  progressModalJob,
  setProgressModalJob,
  progressModalPSC,
  setProgressModalPSC,
  updateThreadCuttingProgress,

  // Delete thread job
  deleteThreadJobConfirm,
  setDeleteThreadJobConfirm,
  deleteThreadCuttingAssignment,

  // Accept work
  assignmentToAccept,
  setAssignmentToAccept,
  acceptTailorAssignment,

  // Trimming decision
  trimmingDecisionFabric,
  setTrimmingDecisionFabric,
  trimmingDecisionVerifiedCount,
  trimmingDecisionCuttingId,
  trimmingDecisionHandoverId,
  setFabricThreadCuttingDecision,
}) {
  return (
    <Suspense fallback={null}>
      {/* Assign Tailor Modal */}
      <AssignTailorModal
        key={
          selectedCuttingForAssign ||
          (showAssignTailorModal ? 'order-asgn-open' : 'order-asgn-closed')
        }
        isOpen={showAssignTailorModal}
        initialCuttingId={selectedCuttingForAssign}
        onClose={() => {
          setShowAssignTailorModal(false);
          setSelectedCuttingForAssign(null);
        }}
        onSuccess={() => {
          setActiveTab('assignments');
        }}
      />

      {/* Log Daily Work Modal */}
      {selectedAssignmentForDailyLog && (
        <LogDailyWorkModal
          key={selectedAssignmentForDailyLog.id}
          isOpen={Boolean(selectedAssignmentForDailyLog)}
          assignment={
            tailorAssignments.find((t) => t.id === selectedAssignmentForDailyLog.id) ||
            selectedAssignmentForDailyLog
          }
          onClose={() => setSelectedAssignmentForDailyLog(null)}
        />
      )}

      {/* Delete Cutting Confirmation Modal */}
      {deleteCuttingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl space-y-3 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Delete Cutting Batch?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to remove this cutting batch (
              {sanitizeFabricName(deleteCuttingConfirm.fabricName)})? Any tailor assignments linked
              to this cut will also be removed.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCuttingConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCutting(deleteCuttingConfirm.id);
                  setDeleteCuttingConfirm(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-200 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Assignment Confirmation Modal */}
      {deleteAssignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl space-y-3 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Delete Assignment?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to remove this assignment for tailor{' '}
              <strong className="text-slate-800">{deleteAssignConfirm.tailorName}</strong>? Pieces
              will return to the cutting batch balance.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteAssignConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAssignment(deleteAssignConfirm.id);
                  setDeleteAssignConfirm(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-200 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Master Handover Modal */}
      {rejectHandoverModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reject Master Handover</h3>
                  <p className="text-[11px] text-slate-500">
                    {rejectHandoverModal.masterName} •{' '}
                    {parseInt(rejectHandoverModal.piecesCount || rejectHandoverModal.pieces, 10) ||
                      0}{' '}
                    {(() => {
                      const rPieces =
                        parseInt(
                          rejectHandoverModal.piecesCount || rejectHandoverModal.pieces,
                          10
                        ) || 0;
                      const rSub =
                        typeof rejectHandoverModal.subParts === 'object' &&
                        rejectHandoverModal.subParts !== null
                          ? rejectHandoverModal.subParts
                          : {};
                      const rKeys = Object.keys(rSub).filter(
                        (k) => (parseInt(rSub[k], 10) || 0) > 0
                      );
                      return rKeys.length === 1
                        ? formatPieceName(
                            rKeys[0].charAt(0).toUpperCase() + rKeys[0].slice(1),
                            rPieces
                          )
                        : formatPieceName('Set', rPieces);
                    })()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectHandoverModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please enter the reason for rejecting this finished goods handover:
            </p>

            <textarea
              rows={3}
              value={rejectHandoverReason}
              onChange={(e) => setRejectHandoverReason(e.target.value)}
              placeholder="e.g. Count mismatch (expected 50, found 45), defect in finish, etc."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRejectHandoverModal(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  rejectMasterHandover(
                    rejectHandoverModal.id,
                    rejectHandoverReason.trim() || 'Rejected during floor physical verification'
                  );
                  setRejectHandoverModal(null);
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs shadow-rose-200"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Handover Confirmation Modal */}
      {deleteHandoverConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl space-y-3 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Delete Handover Record?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to delete this handover record of{' '}
              <strong className="text-slate-800">
                {parseInt(
                  deleteHandoverConfirm.piecesCount || deleteHandoverConfirm.pieces,
                  10
                ) || 0}{' '}
                {(() => {
                  const dPieces =
                    parseInt(
                      deleteHandoverConfirm.piecesCount || deleteHandoverConfirm.pieces,
                      10
                    ) || 0;
                  const dSub =
                    typeof deleteHandoverConfirm.subParts === 'object' &&
                    deleteHandoverConfirm.subParts !== null
                      ? deleteHandoverConfirm.subParts
                      : {};
                  const dKeys = Object.keys(dSub).filter(
                    (k) => (parseInt(dSub[k], 10) || 0) > 0
                  );
                  return dKeys.length === 1
                    ? formatPieceName(
                        dKeys[0].charAt(0).toUpperCase() + dKeys[0].slice(1),
                        dPieces
                      )
                    : formatPieceName('Set', dPieces);
                })()}
              </strong>{' '}
              from Master{' '}
              <strong className="text-slate-800">{deleteHandoverConfirm.masterName}</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteHandoverConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteMasterHandover(deleteHandoverConfirm.id);
                  setDeleteHandoverConfirm(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-200 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Thread Cutting Modal */}
      <AssignThreadCuttingModal
        key={`${selectedCuttingForThreadCutting || 'tc'}-${selectedHandoverForThreadCutting || 'h'}-${selectedSubPartForThreadCutting || 'all'}-${selectedQuantityForThreadCutting || 'auto'}-${JSON.stringify(selectedSubPartQuantitiesForThreadCutting || {})}-${showAssignThreadCuttingModal ? 'open' : 'closed'}`}
        isOpen={showAssignThreadCuttingModal}
        initialCuttingId={selectedCuttingForThreadCutting}
        initialHandoverId={selectedHandoverForThreadCutting}
        initialSubPart={selectedSubPartForThreadCutting}
        initialQuantity={selectedQuantityForThreadCutting}
        initialSubPartQuantities={selectedSubPartQuantitiesForThreadCutting}
        onClose={() => {
          setShowAssignThreadCuttingModal(false);
          setSelectedCuttingForThreadCutting(null);
          setSelectedHandoverForThreadCutting(null);
          setSelectedSubPartForThreadCutting(null);
          setSelectedQuantityForThreadCutting(null);
          setSelectedSubPartQuantitiesForThreadCutting(null);
        }}
        onSuccess={() => {
          setSelectedSubPartForThreadCutting(null);
          setSelectedQuantityForThreadCutting(null);
          setSelectedSubPartQuantitiesForThreadCutting(null);
          setActiveTab('thread_cutting');
        }}
      />

      {/* Update Thread Cutting Progress Modal */}
      {progressModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Update Trimming</h3>
                  <p className="text-[11px] text-slate-400">{progressModalJob.helperName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProgressModalJob(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-100 text-xs text-teal-900 space-y-1">
              <div className="flex justify-between">
                <span className="text-teal-700">Batch Fabric:</span>
                <span className="font-bold">{progressModalJob.fabricName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-700">Total Allocated:</span>
                <span className="font-bold">{progressModalJob.assignedPSC} PSC</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Completed Trimming Count (PSC)
              </label>
              <input
                type="number"
                min="0"
                max={progressModalJob.assignedPSC}
                value={progressModalPSC}
                onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                onChange={(e) => {
                  const maxVal = progressModalJob.assignedPSC || 100000;
                  const sanitized = sanitizeInteger(e.target.value, { min: 0, max: maxVal });
                  setProgressModalPSC(sanitized);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 pt-1">
                {[10, 25, 50].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      const cur = parseInt(progressModalPSC, 10) || 0;
                      const nxt = Math.min(progressModalJob.assignedPSC, cur + step);
                      setProgressModalPSC(String(nxt));
                    }}
                    className="flex-1 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded-lg text-[10px] font-bold transition-colors"
                  >
                    +{step}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setProgressModalPSC(String(progressModalJob.assignedPSC))}
                  className="flex-1 py-1 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-lg text-[10px] font-bold transition-colors"
                >
                  Max All
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProgressModalJob(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const qty = parseInt(progressModalPSC, 10) || 0;
                  const isDone = qty >= progressModalJob.assignedPSC;
                  updateThreadCuttingProgress(progressModalJob.id, qty, isDone);
                  setProgressModalJob(null);
                }}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 active:scale-95 shadow-md shadow-teal-200 transition-all"
              >
                Save Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Thread Job Confirmation Modal */}
      {deleteThreadJobConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl space-y-3 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Delete Thread Cutting Job?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to remove the assignment of{' '}
              <strong className="text-slate-800">
                {deleteThreadJobConfirm.assignedPSC} PSC
              </strong>{' '}
              to Helper{' '}
              <strong className="text-slate-800">{deleteThreadJobConfirm.helperName}</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteThreadJobConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteThreadCuttingAssignment(deleteThreadJobConfirm.id);
                  setDeleteThreadJobConfirm(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-200 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Accept Work Allocation Modal */}
      {assignmentToAccept && (
        <ReviewAcceptWorkModal
          key={assignmentToAccept.id}
          isOpen={Boolean(assignmentToAccept)}
          onClose={() => setAssignmentToAccept(null)}
          assignment={
            tailorAssignments.find((a) => a.id === assignmentToAccept.id) || assignmentToAccept
          }
          onAccept={(id) => {
            acceptTailorAssignment(id);
            setAssignmentToAccept(null);
          }}
        />
      )}

      {/* Thread Trimming Decision Modal */}
      {trimmingDecisionFabric && (
        <ThreadTrimmingDecisionModal
          key={`orders-trimming-decision-${trimmingDecisionFabric.id}`}
          isOpen={Boolean(trimmingDecisionFabric)}
          fabric={trimmingDecisionFabric}
          verifiedPiecesCount={trimmingDecisionVerifiedCount}
          onClose={() => setTrimmingDecisionFabric(null)}
          onChooseAssignTrimming={(subPartKey, subPartName, pcsCount, subPartMap) => {
            const cutId = trimmingDecisionCuttingId || trimmingDecisionFabric?.id;
            const hId = trimmingDecisionHandoverId;
            setTrimmingDecisionFabric(null);
            setSelectedCuttingForThreadCutting(cutId);
            setSelectedHandoverForThreadCutting(hId);
            setSelectedSubPartForThreadCutting(subPartKey || null);
            setSelectedQuantityForThreadCutting(pcsCount || null);
            setSelectedSubPartQuantitiesForThreadCutting(subPartMap || null);
            setShowAssignThreadCuttingModal(true);
          }}
          onChooseSkipTrimming={(subPartKey, pcsCount) => {
            if (subPartKey) {
              setFabricThreadCuttingDecision(
                trimmingDecisionFabric.id,
                'skipped',
                subPartKey,
                pcsCount
              );
            } else {
              setFabricThreadCuttingDecision(trimmingDecisionFabric.id, 'skipped');
            }
            setTrimmingDecisionFabric(null);
          }}
        />
      )}
    </Suspense>
  );
}
