import React, { useState } from 'react';
import {
  Layers,
  Scissors,
  Clock,
  UserCheck,
  Archive,
  Send,
  PackageCheck,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { sanitizeFabricName } from '../../context/managementContextInstance';
import {
  resolvePieceLabel,
  getPieceValueFromObject,
  getAssignmentSubPartsList,
  formatPieceName,
  getAssignmentPieceName,
  getCleanDisplayNote,
} from '../../utils/productUtils';
import {
  getFabricArchivalStatus,
  getFabricTailorPscDetails,
  getFabricTrimmingDetails,
  getSubPartCountFromAssignment,
} from '../../utils/masterHelpers';

export default function MasterFabricsTab({
  activeFabrics = [],
  archivedFabrics = [],
  expandableFabrics = [],
  isAllFabricsExpanded,
  toggleAllFabricsExpand,
  expandedFabricIds = new Set(),
  toggleFabricExpand,
  expandedCuttingSectionIds = new Set(),
  toggleCuttingSectionExpand,
  expandedTailorSectionIds = new Set(),
  toggleTailorSectionExpand,
  fabrics = [],
  cuttings = [],
  tailorAssignments = [],
  masterHandovers = [],
  threadCuttingAssignments = [],
  master = null,
  getMasterHandoverStats,
  getProductStructure,
  toggleArchiveFabric,
  onOpenAssignTrimming,
  onOpenCutModal,
  onOpenAssignTailor,
  onOpenSubmitAdmin,
  onAcceptFabric,
  setActiveTab,
  setArchiveSubFilter,
}) {
  const [expandedHandoverLogIds, setExpandedHandoverLogIds] = useState(() => new Set());

  const toggleHandoverLogExpand = (fabricId) => {
    setExpandedHandoverLogIds((prev) => {
      const next = new Set(prev);
      const sId = String(fabricId);
      if (next.has(sId)) next.delete(sId);
      else next.add(sId);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Fabrics Received for Cutting
          </h3>
          <p className="text-xs text-slate-500">
            Track fabric lots, Cut PCs, and stitched PCs received from tailors
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFabrics.reduce((sum, f) => sum + getFabricTailorPscDetails(f.id, { fabrics, cuttings, tailorAssignments, getMasterHandoverStats }).totalPscReceived, 0) > 0 && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {activeFabrics.reduce((sum, f) => sum + getFabricTailorPscDetails(f.id, { fabrics, cuttings, tailorAssignments, getMasterHandoverStats }).totalPscReceived, 0)} PCs Received from Tailors
              </span>
            </span>
          )}
          <span className="text-[11px] text-slate-500 font-medium">
            {activeFabrics.length} Active Lots
          </span>
          {expandableFabrics.length > 0 && (
            <button
              type="button"
              onClick={toggleAllFabricsExpand}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              title={isAllFabricsExpanded ? 'Collapse all fabric cards' : 'Expand all fabric cards'}
            >
              <span>{isAllFabricsExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Pending Acceptance Notification Banner */}
      {activeFabrics.some((f) => f.status === 'In Stock') && (
        <div className="p-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white rounded-2xl shadow-md flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-black">
                {activeFabrics.filter((f) => f.status === 'In Stock').length} New Fabric Lot(s) Assigned
              </h4>
              <p className="text-[11px] text-purple-100 mt-0.5">
                Review and accept allocated lots below to start cutting.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeFabrics.length === 0 ? (
        <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            {archivedFabrics.length > 0 ? 'All Fabric Lots Completed' : 'No Fabrics Assigned Yet'}
          </h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {archivedFabrics.length > 0
              ? `You have completed and archived ${archivedFabrics.length} fabric lots. View or restore them in the Archive tab.`
              : 'When factory admin assigns a fabric lot to you, it will appear here with meterage and target Sets.'}
          </p>
          {archivedFabrics.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('archive');
                setArchiveSubFilter('fabrics');
              }}
              className="mt-2 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>View Completed Fabrics ({archivedFabrics.length})</span>
            </button>
          )}
        </div>
      ) : (
        activeFabrics.map((f) => {
          const archiveStatus = getFabricArchivalStatus(f, { cuttings, tailorAssignments, masterHandovers, getMasterHandoverStats });
          const fabricCuttings = cuttings.filter(
            (c) =>
              String(c.fabricId) === String(f.id) ||
              (f.fabricType &&
                c.fabricName &&
                sanitizeFabricName(c.fabricName) === sanitizeFabricName(f.fabricType))
          );
          const tailorDetails = getFabricTailorPscDetails(f.id, { fabrics, cuttings, tailorAssignments, getMasterHandoverStats });
          const fabricAssignments = tailorAssignments.filter((a) =>
            String(a.fabricId) === String(f.id) ||
            fabricCuttings.some((c) => c.id === a.cuttingId)
          );

          const allFabricHandovers = masterHandovers.filter(
            (h) =>
              String(h.fabricId) === String(f.id) ||
              fabricCuttings.some((c) => c.id === h.cuttingId)
          );
          const fabricHandovers = allFabricHandovers.filter((h) => h.status !== 'Rejected');
          const verifiedHandovers = allFabricHandovers.filter((h) => h.status === 'Verified');
          const rejectedHandovers = allFabricHandovers.filter((h) => h.status === 'Rejected');
          const pendingHandovers = allFabricHandovers.filter((h) => h.status === 'Pending Verification' || h.status === 'Pending' || !h.status);

          const totalSubmittedPSC = fabricHandovers.reduce((acc, h) => {
            if (h.subParts && typeof h.subParts === 'object' && Object.keys(h.subParts).length > 0) {
              return acc + Object.values(h.subParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
            }
            return acc + (parseInt(h.piecesCount || h.pieces, 10) || 0);
          }, 0);
          const totalVerifiedPSC = verifiedHandovers.reduce((acc, h) => {
            if (h.subParts && typeof h.subParts === 'object' && Object.keys(h.subParts).length > 0) {
              return acc + Object.values(h.subParts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
            }
            return acc + (parseInt(h.piecesCount || h.pieces, 10) || 0);
          }, 0);

          const sortedFabricHandovers = [...allFabricHandovers].sort((a, b) => {
            const timeA = new Date(a.createdAt || a.handoverDate || 0).getTime();
            const timeB = new Date(b.createdAt || b.handoverDate || 0).getTime();
            return timeB - timeA;
          });

          const isHandoverExpanded = expandedHandoverLogIds.has(String(f.id));

          // Floor Trimming lifecycle details: stitched pieces must be trimmed or skipped before ready for Admin
          const trimmingDetails = getFabricTrimmingDetails(f.id, {
            cuttings: fabricCuttings,
            threadCuttingAssignments,
            tailorDetails,
            totalSubmittedPSC,
            masterId: master?.id || f.assignedMasterId || f.assigned_master_id || null,
          });

          const totalTrimmedPSC = trimmingDetails.trimmedPSC;
          const totalSkippedTrimmingPSC = trimmingDetails.skippedPSC;
          const totalPendingTrimmingPSC = trimmingDetails.pendingTrimmingPSC;
          const totalAvailableToSubmitPSC = trimmingDetails.readyForAdminPSC;

          // Product structure & pieces calculation for this fabric lot
          let struct =
            f.productStructure ||
            f.product_structure ||
            fabricCuttings[0]?.productStructure ||
            (typeof getProductStructure === 'function' ? getProductStructure(f) : null);
          if (typeof struct === 'string') {
            try { struct = JSON.parse(struct); } catch { }
          }
          const subParts = struct?.subParts || struct?.parts || [];
          const lotTargetSets = parseInt(f.printPieces ?? f.targetSets ?? f.productQuantity ?? f.target_sets, 10) || 0;

          // Aggregate cut pieces per component / subpart key across all cuttings for this fabric
          const aggregatedCutPieces = {};
          fabricCuttings.forEach((c) => {
            if (c.cutPieces && typeof c.cutPieces === 'object') {
              Object.entries(c.cutPieces).forEach(([k, v]) => {
                const count = parseInt(v, 10) || 0;
                const normKey = k.toLowerCase().trim();
                aggregatedCutPieces[normKey] = (aggregatedCutPieces[normKey] || 0) + count;
              });
            }
          });

          // Aggregate stitched pieces received from tailors per subpart
          const aggregatedStitchedPieces = {};
          if (tailorDetails?.receivedSubParts && Array.isArray(tailorDetails.receivedSubParts)) {
            tailorDetails.receivedSubParts.forEach((sp) => {
              if (sp.id) aggregatedStitchedPieces[sp.id.toLowerCase()] = sp.count || 0;
              if (sp.name) aggregatedStitchedPieces[sp.name.toLowerCase()] = sp.count || 0;
            });
          }

          // Detailed assignment tracking by status (In Review vs Pending Tailor vs Done)
          const aggregatedAssignedPieces = {};
          const aggregatedInReviewPieces = {};
          const aggregatedPendingTailorPieces = {};
          const aggregatedDonePieces = {};

          const accumulatePiece = (map, k, count) => {
            if (!k || count <= 0) return;
            const norm = k.toLowerCase().trim();
            map[norm] = (map[norm] || 0) + count;
          };

          fabricAssignments.forEach((a) => {
            if (a.status === 'Declined') return;

            const hasSubs = Array.isArray(a.dailySubmissions) && a.dailySubmissions.length > 0;
            const isReview = (!a.tailorAccepted || a.status === 'Pending Acceptance') && !hasSubs && (parseInt(a.completedQuantity, 10) || 0) === 0;
            const isDone = a.status === 'Completed';

            // Build piece counts for this assignment
            const aPieceCounts = {};
            if (a.assignedPieces && typeof a.assignedPieces === 'object') {
              Object.entries(a.assignedPieces).forEach(([k, v]) => {
                const count = parseInt(v, 10) || 0;
                if (count > 0) {
                  const normKey = k.toLowerCase().trim();
                  aPieceCounts[normKey] = count;
                }
              });
            }
            if (a.assignedSubParts && typeof a.assignedSubParts === 'object') {
              Object.entries(a.assignedSubParts).forEach(([k, v]) => {
                const count = parseInt(v, 10) || 0;
                if (count > 0) {
                  const normKey = k.toLowerCase().trim();
                  if (!aPieceCounts[normKey]) {
                    aPieceCounts[normKey] = count;
                  }
                }
              });
            }

            const aTotal = parseInt(a.totalAssignedPieces, 10) || Object.values(aPieceCounts).reduce((sum, v) => sum + v, 0);
            const aDone = parseInt(a.completedQuantity, 10) || 0;
            const aRatio = aTotal > 0 ? Math.min(1, Math.max(0, aDone / aTotal)) : 0;

            Object.entries(aPieceCounts).forEach(([k, count]) => {
              accumulatePiece(aggregatedAssignedPieces, k, count);

              if (isReview) {
                accumulatePiece(aggregatedInReviewPieces, k, count);
              } else if (isDone || aRatio >= 1) {
                accumulatePiece(aggregatedDonePieces, k, count);
              } else {
                const pieceDone = Math.round(count * aRatio);
                const piecePending = Math.max(0, count - pieceDone);
                if (pieceDone > 0) accumulatePiece(aggregatedDonePieces, k, pieceDone);
                if (piecePending > 0) accumulatePiece(aggregatedPendingTailorPieces, k, piecePending);
              }
            });
          });

          // Ensure aggregatedDonePieces accounts for stitched pieces verified in tailorDetails
          Object.entries(aggregatedStitchedPieces).forEach(([k, count]) => {
            const norm = k.toLowerCase().trim();
            if ((aggregatedDonePieces[norm] || 0) < count) {
              aggregatedDonePieces[norm] = count;
              aggregatedDonePieces[k] = count;
            }
          });

          // Build grouped subpart data structure
          const groupedSubPartsList = [];

          if (Array.isArray(subParts) && subParts.length > 0) {
            subParts.forEach((sp, spIdx) => {
              const spId = sp.id || sp.name?.toLowerCase() || `part_${spIdx}`;
              const spName = sp.name || resolvePieceLabel(spId, struct);

              const items = [];
              if (Array.isArray(sp.components) && sp.components.length > 0) {
                sp.components.forEach((comp) => {
                  const compId = comp.id || comp.name?.toLowerCase();
                  const compName = comp.name || resolvePieceLabel(compId, struct);
                  const ratio = parseInt(comp.qty, 10) || 1;
                  const targetPsc = lotTargetSets * ratio;

                  const cutPsc = getPieceValueFromObject(aggregatedCutPieces, compName, compId);
                  const assignedPsc = getPieceValueFromObject(aggregatedAssignedPieces, compName, compId);
                  const inReviewPsc = getPieceValueFromObject(aggregatedInReviewPieces, compName, compId);
                  const pendingTailorPsc = getPieceValueFromObject(aggregatedPendingTailorPieces, compName, compId);
                  const stitchedPsc = Math.max(
                    getPieceValueFromObject(aggregatedDonePieces, compName, compId),
                    getPieceValueFromObject(aggregatedStitchedPieces, compName, compId)
                  );
                  const uncutPsc = targetPsc > 0 ? Math.max(0, targetPsc - cutPsc) : 0;
                  const unassignedCutPsc = Math.max(0, cutPsc - (inReviewPsc + pendingTailorPsc + stitchedPsc));

                  items.push({
                    id: `${spId}_${compId}`,
                    name: compName,
                    ratio,
                    targetPsc,
                    cutPsc,
                    assignedPsc,
                    inReviewPsc,
                    pendingTailorPsc,
                    stitchedPsc,
                    unassignedCutPsc,
                    uncutPsc,
                  });
                });
              } else {
                const targetPsc = lotTargetSets;
                const cutPsc = getPieceValueFromObject(aggregatedCutPieces, spName, spId);
                const assignedPsc = getPieceValueFromObject(aggregatedAssignedPieces, spName, spId);
                const inReviewPsc = getPieceValueFromObject(aggregatedInReviewPieces, spName, spId);
                const pendingTailorPsc = getPieceValueFromObject(aggregatedPendingTailorPieces, spName, spId);
                const stitchedPsc = Math.max(
                  getPieceValueFromObject(aggregatedDonePieces, spName, spId),
                  getPieceValueFromObject(aggregatedStitchedPieces, spName, spId)
                );
                const uncutPsc = targetPsc > 0 ? Math.max(0, targetPsc - cutPsc) : 0;
                const unassignedCutPsc = Math.max(0, cutPsc - (inReviewPsc + pendingTailorPsc + stitchedPsc));

                items.push({
                  id: spId,
                  name: spName,
                  ratio: 1,
                  targetPsc,
                  cutPsc,
                  assignedPsc,
                  inReviewPsc,
                  pendingTailorPsc,
                  stitchedPsc,
                  unassignedCutPsc,
                  uncutPsc,
                });
              }

              const totalGroupTarget = items.reduce((sum, i) => sum + i.targetPsc, 0);
              const totalGroupCut = items.reduce((sum, i) => sum + i.cutPsc, 0);
              const totalGroupAssigned = items.reduce((sum, i) => sum + i.assignedPsc, 0);
              const totalGroupInReview = items.reduce((sum, i) => sum + i.inReviewPsc, 0);
              const totalGroupPendingTailor = items.reduce((sum, i) => sum + i.pendingTailorPsc, 0);
              const totalGroupStitched = items.reduce((sum, i) => sum + i.stitchedPsc, 0);
              const totalGroupReadyOnFloor = items.reduce((sum, i) => sum + i.unassignedCutPsc, 0);
              const totalGroupUncut = items.reduce((sum, i) => sum + i.uncutPsc, 0);

              groupedSubPartsList.push({
                spId,
                spName,
                spIndex: spIdx + 1,
                items,
                totalGroupTarget,
                totalGroupCut,
                totalGroupAssigned,
                totalGroupInReview,
                totalGroupPendingTailor,
                totalGroupStitched,
                totalGroupReadyOnFloor,
                totalGroupUncut,
              });
            });
          }

          // Fallback if struct subParts empty
          if (groupedSubPartsList.length === 0) {
            const prodName = f?.productName || 'Garment Piece';
            const stdItems = [
              { id: 'piece', name: prodName, ratio: 1 },
            ].map((p) => {
              const targetPsc = lotTargetSets * p.ratio;
              const cutPsc = getPieceValueFromObject(aggregatedCutPieces, p.name, p.id);
              const assignedPsc = getPieceValueFromObject(aggregatedAssignedPieces, p.name, p.id);
              const inReviewPsc = getPieceValueFromObject(aggregatedInReviewPieces, p.name, p.id);
              const pendingTailorPsc = getPieceValueFromObject(aggregatedPendingTailorPieces, p.name, p.id);
              const stitchedPsc = Math.max(
                getPieceValueFromObject(aggregatedDonePieces, p.name, p.id),
                getPieceValueFromObject(aggregatedStitchedPieces, p.name, p.id)
              );
              const uncutPsc = targetPsc > 0 ? Math.max(0, targetPsc - cutPsc) : 0;
              const unassignedCutPsc = Math.max(0, cutPsc - (inReviewPsc + pendingTailorPsc + stitchedPsc));
              return {
                id: p.id,
                name: p.name,
                ratio: p.ratio,
                targetPsc,
                cutPsc,
                assignedPsc,
                inReviewPsc,
                pendingTailorPsc,
                stitchedPsc,
                unassignedCutPsc,
                uncutPsc,
              };
            });

            groupedSubPartsList.push({
              spId: 'garment',
              spName: 'Garment Subparts',
              spIndex: 1,
              items: stdItems,
              totalGroupTarget: stdItems.reduce((sum, i) => sum + i.targetPsc, 0),
              totalGroupCut: stdItems.reduce((sum, i) => sum + i.cutPsc, 0),
              totalGroupAssigned: stdItems.reduce((sum, i) => sum + i.assignedPsc, 0),
              totalGroupInReview: stdItems.reduce((sum, i) => sum + i.inReviewPsc, 0),
              totalGroupPendingTailor: stdItems.reduce((sum, i) => sum + i.pendingTailorPsc, 0),
              totalGroupStitched: stdItems.reduce((sum, i) => sum + i.stitchedPsc, 0),
              totalGroupReadyOnFloor: stdItems.reduce((sum, i) => sum + i.unassignedCutPsc, 0),
              totalGroupUncut: stdItems.reduce((sum, i) => sum + i.uncutPsc, 0),
            });
          }

          const grandTotalUncutPsc = groupedSubPartsList.reduce((sum, g) => sum + g.totalGroupUncut, 0);
          const grandTotalTargetCutPCs = groupedSubPartsList.reduce((sum, g) => sum + g.totalGroupTarget, 0);
          const grandTotalCutPCs = groupedSubPartsList.reduce((sum, g) => sum + g.totalGroupCut, 0);
          const grandTotalReadyOnFloorPCs = groupedSubPartsList.reduce((sum, g) => sum + g.totalGroupReadyOnFloor, 0);

          const overallCutPercent = grandTotalTargetCutPCs > 0
            ? Math.min(100, Math.round((grandTotalCutPCs / grandTotalTargetCutPCs) * 100))
            : grandTotalCutPCs > 0 ? 100 : 0;

          // Build Tailor Garment PCs List (each subpart represents a complete Garment PC stitched by tailors)
          const tailorPCList = groupedSubPartsList.map((group) => {
            const targetPCs = lotTargetSets;

            // Tailor stitched complete PCs from verified tailorDetails or item minimums
            const foundReceived = tailorDetails?.receivedSubParts?.find(
              (sp) =>
                sp.id === group.spId ||
                sp.name?.toLowerCase() === group.spName?.toLowerCase() ||
                (group.spId === 'garment' && sp.id === 'top')
            );

            let assignedPCs = 0;
            let pendingAcceptPCs = 0;
            let stitchedDonePCs = 0;

            fabricAssignments.forEach((a) => {
              const aCount = getSubPartCountFromAssignment(a, group);
              if (aCount <= 0) return;

              assignedPCs += aCount;
              const hasSubsForPart = Array.isArray(a.dailySubmissions) && a.dailySubmissions.length > 0;
              const isPendingAccept = (!a.tailorAccepted || a.status === 'Pending Acceptance') && !hasSubsForPart && (parseInt(a.completedQuantity, 10) || 0) === 0;
              if (isPendingAccept) {
                pendingAcceptPCs += aCount;
              } else {
                let doneForThis = 0;
                (a.dailySubmissions || []).forEach((sub) => {
                  if (sub.approvalStatus === 'Approved') {
                    if (sub.subParts && typeof sub.subParts === 'object') {
                      doneForThis +=
                        parseInt(sub.subParts[group.spId] || sub.subParts[group.spName] || sub.subParts[group.spName?.toLowerCase()], 10) || 0;
                    } else if (sub.parts && typeof sub.parts === 'object') {
                      doneForThis += getPieceValueFromObject(sub.parts, group.spName, group.spId) || 0;
                    } else if (sub.quantity > 0) {
                      const aTotal = aCount;
                      const aDone = parseInt(a.completedQuantity || a.completed_quantity, 10) || 0;
                      doneForThis += Math.round(aCount * (aDone / Math.max(1, aTotal)));
                    }
                  }
                });
                stitchedDonePCs += Math.min(aCount, doneForThis);
              }
            });

            if (foundReceived?.count !== undefined && foundReceived.count > stitchedDonePCs) {
              stitchedDonePCs = foundReceived.count;
            }

            const inStitchingPCs = Math.max(0, assignedPCs - pendingAcceptPCs - stitchedDonePCs);
            const leftToStitchAssigned = Math.max(0, assignedPCs - stitchedDonePCs);
            const leftToTarget = Math.max(0, targetPCs - stitchedDonePCs);
            const ratioFormula = group.items
              .map((i) => `${i.ratio > 1 ? `${i.ratio} ` : ''}${i.name}`)
              .join(' + ');

            const readyPCs = group.items.length > 0
              ? Math.min(...group.items.map((i) => Math.floor((i.unassignedCutPsc || 0) / (i.ratio || 1))))
              : 0;

            return {
              pcId: group.spId,
              pcName: group.spName,
              pcIndex: group.spIndex,
              ratioFormula,
              targetPCs,
              assignedPCs,
              pendingAcceptPCs,
              inStitchingPCs,
              stitchedDonePCs,
              leftToStitchAssigned,
              leftToTarget,
              readyPCs,
              isDone: targetPCs > 0 && stitchedDonePCs >= targetPCs,
            };
          });

          const totalTailorTargetPCs = tailorPCList.reduce((sum, p) => sum + p.targetPCs, 0);
          const totalTailorAssignedPCs = tailorPCList.reduce((sum, p) => sum + p.assignedPCs, 0);
          const totalTailorPendingAcceptPCs = tailorPCList.reduce((sum, p) => sum + p.pendingAcceptPCs, 0);
          const totalTailorInStitchingPCs = tailorPCList.reduce((sum, p) => sum + p.inStitchingPCs, 0);
          const totalTailorStitchedPCs = tailorPCList.reduce((sum, p) => sum + p.stitchedDonePCs, 0);
          const totalTailorLeftAssigned = tailorPCList.reduce((sum, p) => sum + p.leftToStitchAssigned, 0);
          const totalTailorLeftTarget = tailorPCList.reduce((sum, p) => sum + p.leftToTarget, 0);
          const totalFullPCsReadyToAssign = tailorPCList.length > 0
            ? Math.min(...tailorPCList.map((p) => p.readyPCs))
            : 0;

          // Helper to resolve accurate, dynamic piece label based on actual subpart activity
          const getTailorMetricLabel = (itemsFilterFn, totalCount = 0) => {
            const matching = tailorPCList.filter((p) => itemsFilterFn(p) > 0);
            if (matching.length === 0) {
              const activeAssigned = tailorPCList.filter((p) => p.assignedPCs > 0);
              if (activeAssigned.length === 1) {
                return formatPieceName(activeAssigned[0].pcName, totalCount);
              }
              const activeCut = tailorPCList.filter((p) => (p.readyPCs > 0 || p.stitchedDonePCs > 0));
              if (activeCut.length === 1) {
                return formatPieceName(activeCut[0].pcName, totalCount);
              }
              return 'PCs';
            }
            if (matching.length === 1) {
              const p = matching[0];
              const cnt = itemsFilterFn(p);
              return formatPieceName(p.pcName, cnt);
            }
            if (matching.length === 2) {
              return `${formatPieceName(matching[0].pcName, 2)} & ${formatPieceName(matching[1].pcName, 2)}`;
            }
            return 'PCs';
          };

          const assignedLabel = getTailorMetricLabel((p) => p.assignedPCs, totalTailorAssignedPCs);
          const pendingAcceptLabel = getTailorMetricLabel((p) => p.pendingAcceptPCs, totalTailorPendingAcceptPCs);
          const inStitchingLabel = getTailorMetricLabel((p) => p.inStitchingPCs, totalTailorInStitchingPCs);
          const stitchedDoneLabel = getTailorMetricLabel((p) => p.stitchedDonePCs, totalTailorStitchedPCs);
          const leftAssignedLabel = getTailorMetricLabel((p) => p.leftToStitchAssigned, totalTailorLeftAssigned);

          const pendingAcceptItems = tailorPCList.filter((p) => p.pendingAcceptPCs > 0);
          const pendingAcceptSummary = pendingAcceptItems.length > 0
            ? pendingAcceptItems.map((p) => `${p.pendingAcceptPCs} ${formatPieceName(p.pcName, p.pendingAcceptPCs)}`).join(' + ')
            : `${totalTailorPendingAcceptPCs} ${pendingAcceptLabel}`;

          const pendingHandoverCount = tailorDetails?.pendingCount || 0;
          const pendingHandoverPsc = tailorDetails?.pendingPsc || 0;

          const stitchingBaseTotal = totalTailorAssignedPCs > 0 ? totalTailorAssignedPCs : totalTailorTargetPCs;
          const stitchingAssignedPercent = stitchingBaseTotal > 0 ? Math.min(100, Math.round((totalTailorStitchedPCs / stitchingBaseTotal) * 100)) : 0;
          const targetCutBatchPieces = grandTotalCutPCs > 0 ? grandTotalCutPCs : grandTotalTargetCutPCs;
          const targetHandoverPieces = totalTailorTargetPCs > 0
            ? totalTailorTargetPCs
            : (lotTargetSets > 0 ? lotTargetSets * (subParts?.length || 1) : (stitchingBaseTotal > 0 ? stitchingBaseTotal : targetCutBatchPieces));

          const isUnderReview = f.status === 'In Stock';
          const isExpanded =
            !isUnderReview &&
            (expandedFabricIds.has(f.id) || expandedFabricIds.has(String(f.id)));
          const isCuttingSectionExpanded =
            expandedCuttingSectionIds.has(f.id) ||
            expandedCuttingSectionIds.has(String(f.id));
          const isTailorSectionExpanded =
            expandedTailorSectionIds.has(f.id) ||
            expandedTailorSectionIds.has(String(f.id));

          return (
            <div
              key={f.id}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs text-left ${isExpanded ? 'border-purple-200 ring-2 ring-purple-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
            >
              {/* Collapsible Header Summary Row */}
              <div
                onClick={() => {
                  if (!isUnderReview) {
                    toggleFabricExpand(f.id);
                  }
                }}
                className={`p-3.5 flex items-center justify-between gap-2 select-none ${isUnderReview ? '' : 'cursor-pointer hover:bg-slate-50/70 transition-colors'
                  }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${f.status === 'In Stock'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : f.status === 'In Cutting'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                    >
                      {f.status === 'In Stock' ? 'Pending Accept' : f.status}
                    </span>
                    {totalAvailableToSubmitPSC > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{totalAvailableToSubmitPSC} PCs Ready for Admin</span>
                      </span>
                    ) : totalPendingTrimmingPSC > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                        <Scissors className="w-3 h-3 text-teal-600" />
                        <span>{totalPendingTrimmingPSC} PCs Pending Trimming</span>
                      </span>
                    ) : totalSubmittedPSC > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{totalSubmittedPSC} PCs Handed Over</span>
                      </span>
                    ) : null}
                    {archiveStatus.eligible && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Admin Approved</span>
                      </span>
                    )}
                    {f.dueDate && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Due: {f.dueDate}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {f.fabricType || f.fabric_type || f.productName || 'Fabric Lot'}
                    </h4>
                    {(f.lotNo ?? f.lotNumber ?? f.lot_no) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-purple-100 text-purple-800 border border-purple-200">
                        Lot #{f.lotNo ?? f.lotNumber ?? f.lot_no}
                      </span>
                    )}
                    {f.patternName && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-50 text-purple-700 border border-purple-200">
                        {f.patternName}
                      </span>
                    )}
                    {f.type && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
                        {f.type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                    <span className="font-semibold text-slate-700">{f.plainMeters || 0}m Plain</span>
                    <span className="hidden xs:inline text-slate-300">•</span>
                    <span className="font-semibold text-slate-700">{f.color || 'Standard Color'}</span>
                    <span className="hidden xs:inline text-slate-300">•</span>
                    <span className="font-semibold text-purple-700">Target: {lotTargetSets} Sets ({grandTotalTargetCutPCs} Cut PCs)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isUnderReview && (
                    <div className="hidden sm:flex items-center gap-1.5 text-right">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${grandTotalUncutPsc === 0 && grandTotalTargetCutPCs > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                        {overallCutPercent}% Cut
                      </span>
                      {totalTailorStitchedPCs > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {totalTailorStitchedPCs} Done
                        </span>
                      )}
                    </div>
                  )}
                  {isUnderReview ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onAcceptFabric) onAcceptFabric(f);
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-200 active:scale-95 transition-all cursor-pointer"
                      title="Review and accept fabric"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Review & Accept</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFabricExpand(f.id);
                      }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 cursor-pointer ${isExpanded ? 'rotate-180 bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      title={isExpanded ? 'Collapse section' : 'Expand section'}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Details Section */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Action buttons (when accepted and archive or handover is eligible) */}
                  {f.status !== 'In Stock' && (archiveStatus.eligible || ((totalAvailableToSubmitPSC > 0 || totalPendingTrimmingPSC > 0) && !archiveStatus.eligible)) && (
                    <div className="space-y-2 pt-0.5">
                      {/* Archive: only when all work complete & verified by Admin */}
                      {archiveStatus.eligible && (
                        <button
                          type="button"
                          onClick={() => toggleArchiveFabric(f.id, true)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer w-full sm:w-auto"
                          title="Click to archive completed fabric lot"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archive Completed Lot</span>
                        </button>
                      )}

                      {/* Handover to Admin: only when stitched goods are trimmed or skipped */}
                      {!archiveStatus.eligible && totalAvailableToSubmitPSC > 0 && (
                        <div className="w-full flex items-center justify-between gap-2 p-2.5 bg-indigo-50/80 border border-indigo-200/90 rounded-xl text-xs shadow-2xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                              <Send className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-indigo-950 text-xs truncate block">
                                {totalAvailableToSubmitPSC} PCs Ready for Admin
                                <span className="text-[10px] font-normal text-indigo-700 ml-1.5">
                                  ({totalTrimmedPSC} Trimmed{totalSkippedTrimmingPSC > 0 ? `, ${totalSkippedTrimmingPSC} Skipped` : ''})
                                </span>
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const readyCutting =
                                fabricCuttings.find(
                                  (c) =>
                                    (getMasterHandoverStats ? getMasterHandoverStats(c.id)?.availableToSubmitPSC || 0 : 0) > 0
                                ) || fabricCuttings[0] || null;
                              if (onOpenSubmitAdmin) {
                                onOpenSubmitAdmin(readyCutting, f);
                              }
                            }}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                            title={`Submit ${totalAvailableToSubmitPSC} stitched ${formatPieceName(tailorDetails.pieceName, totalAvailableToSubmitPSC)} to factory admin`}
                          >
                            <span>Handover</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Pending Floor Trimming: when tailor work is accepted but not yet trimmed or skipped */}
                      {!archiveStatus.eligible && totalPendingTrimmingPSC > 0 && (
                        <div className="w-full flex items-center justify-between gap-2 p-2.5 bg-teal-50/90 border border-teal-200 rounded-xl text-xs shadow-2xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                              <Scissors className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-teal-950 text-xs truncate block">
                                {totalPendingTrimmingPSC} PCs Accepted from Tailor — Pending Trimming
                              </span>
                              <p className="text-[10px] text-teal-800/80 truncate">
                                Trim threads with helper or skip trimming before submitting to Admin
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenAssignTrimming) {
                                  onOpenAssignTrimming('assign', f.id, fabricCuttings[0]?.id);
                                } else if (setActiveTab) {
                                  setActiveTab('trimming');
                                }
                              }}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                              title="Assign floor helper to trim pieces"
                            >
                              <Scissors className="w-3 h-3" />
                              <span>Trim</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenAssignTrimming) {
                                  onOpenAssignTrimming('skip', f.id, fabricCuttings[0]?.id);
                                } else if (setActiveTab) {
                                  setActiveTab('trimming');
                                }
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                              title="Skip floor trimming for direct admin delivery"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Skip</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pending Tailor Work Logs Alert */}
                  {tailorDetails.pendingCount > 0 && (
                    <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>{tailorDetails.pendingCount} Tailor {tailorDetails.pendingCount === 1 ? 'Log' : 'Logs'} ({tailorDetails.pendingPsc} {formatPieceName(tailorDetails.pieceName, tailorDetails.pendingPsc)})</strong> awaiting review
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('assignments')}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shadow-xs active:scale-95 transition-all flex items-center gap-1 shrink-0"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* ==================== SECTION 1: MASTER CUTTING DETAILS ==================== */}
                  <div className="bg-white rounded-2xl border border-purple-200/80 p-3.5 sm:p-4 space-y-3 shadow-2xs text-left transition-all duration-200">
                    {/* Section 1 Header */}
                    <div
                      onClick={() => toggleCuttingSectionExpand(f.id)}
                      className="cursor-pointer select-none space-y-2.5"
                    >
                      <div className="flex items-start sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                            <Scissors className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-black text-purple-950 uppercase tracking-wide">
                                1. Master Cutting Details
                              </h4>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${grandTotalUncutPsc === 0 && grandTotalTargetCutPCs > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}>
                                {grandTotalUncutPsc === 0 && grandTotalTargetCutPCs > 0 ? '✓ Cutting Complete' : `${overallCutPercent}% Cut`}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                              {grandTotalCutPCs} of {grandTotalTargetCutPCs} Cut PCs Cut • {grandTotalUncutPsc > 0 ? `${grandTotalUncutPsc} Left to Cut` : '0 Left'} • {totalFullPCsReadyToAssign} Complete PCs Ready
                            </p>
                          </div>
                        </div>

                        {/* Desktop Actions + Desktop Chevron */}
                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                          {!(grandTotalUncutPsc === 0 && grandTotalTargetCutPCs > 0) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenCutModal) onOpenCutModal(f.id);
                              }}
                              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                              title="Record manual Cut PC cutting for this fabric"
                            >
                              <Scissors className="w-3.5 h-3.5" />
                              <span>Cut Fabric</span>
                            </button>
                          )}

                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 ${isCuttingSectionExpanded ? 'rotate-180 bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            title={isCuttingSectionExpanded ? 'Collapse section' : 'Expand section'}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Mobile Chevron */}
                        <div
                          className={`sm:hidden w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${isCuttingSectionExpanded ? 'rotate-180 bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          title={isCuttingSectionExpanded ? 'Collapse section' : 'Expand section'}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Mobile Action Button */}
                      {!(grandTotalUncutPsc === 0 && grandTotalTargetCutPCs > 0) && (
                        <div className="sm:hidden pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenCutModal) onOpenCutModal(f.id);
                            }}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-all cursor-pointer"
                            title="Record manual Cut PC cutting for this fabric"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                            <span>Cut Fabric</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expandable Section 1 Body */}
                    {isCuttingSectionExpanded && (
                      <div className="pt-3 border-t border-purple-100 space-y-3 animate-in fade-in duration-150">
                        {/* Quick Cutting Metrics Strip: 5 clear columns focusing strictly on Cut Pieces */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-left">
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Target Cut PCs</span>
                            <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                              {grandTotalTargetCutPCs} <span className="text-[10px] font-semibold text-slate-400">Cut PCs</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">{lotTargetSets} Sets Target</span>
                          </div>

                          <div className="bg-purple-50/60 rounded-xl p-2.5 border border-purple-200/80">
                            <span className="text-[10px] uppercase font-bold text-purple-700 block">Total Cut PCs</span>
                            <div className="text-base sm:text-lg font-black text-purple-900 mt-0.5">
                              {grandTotalCutPCs} <span className="text-[10px] font-semibold text-purple-600">Cut PCs</span>
                            </div>
                            <span className="text-[10px] text-purple-700 font-bold">{overallCutPercent}% Finished</span>
                          </div>

                          <div className="bg-amber-50/60 rounded-xl p-2.5 border border-amber-200/80">
                            <span className="text-[10px] uppercase font-bold text-amber-700 block">Left to Cut</span>
                            <div className="text-base sm:text-lg font-black text-amber-900 mt-0.5">
                              {grandTotalUncutPsc > 0 ? `${grandTotalUncutPsc} Cut PCs` : '✓ 0 Cut PCs'}
                            </div>
                            <span className="text-[10px] text-amber-700 font-medium">
                              {grandTotalUncutPsc > 0 ? 'Work remaining' : 'Cutting complete'}
                            </span>
                          </div>

                          <div className="bg-indigo-50/60 rounded-xl p-2.5 border border-indigo-200/80">
                            <span className="text-[10px] uppercase font-bold text-indigo-700 block">Table Stock</span>
                            <div className="text-base sm:text-lg font-black text-indigo-900 mt-0.5">
                              {grandTotalReadyOnFloorPCs} <span className="text-[10px] font-semibold text-indigo-600">Cut PCs</span>
                            </div>
                            <span className="text-[10px] text-indigo-700 font-bold">
                              {totalFullPCsReadyToAssign} Complete PCs Ready
                            </span>
                          </div>
                        </div>

                        {/* Cutting Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold text-slate-600">
                            <span>Master Cutting Progress ({grandTotalCutPCs} / {grandTotalTargetCutPCs} Cut PCs)</span>
                            <span className="text-purple-700">{overallCutPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-300"
                              style={{ width: `${overallCutPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Ready Full PCs Banner if available */}
                        {(totalFullPCsReadyToAssign > 0 || grandTotalReadyOnFloorPCs > 0) && (
                          <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between gap-2 text-xs flex-wrap">
                            <div className="flex items-center gap-2 text-purple-900">
                              <PackageCheck className="w-4 h-4 text-purple-600 shrink-0" />
                              <span>
                                <strong>
                                  {totalFullPCsReadyToAssign > 0
                                    ? `${totalFullPCsReadyToAssign} Complete PCs`
                                    : `${grandTotalReadyOnFloorPCs} Cut PCs`}
                                </strong>{' '}
                                are cut & ready on table to assign to Tailor!
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetCutting = fabricCuttings[0] || null;
                                if (onOpenAssignTailor) {
                                  onOpenAssignTailor(targetCutting ? targetCutting.id : null, f.id);
                                }
                              }}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Assign Tailor Now</span>
                            </button>
                          </div>
                        )}

                        {/* Piece-by-Piece Cutting Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-full">
                              <thead>
                                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                  <th className="py-2.5 px-3">Cut PC Component</th>
                                  <th className="py-2.5 px-3 text-right">Cut Progress (Done / Target)</th>
                                  <th className="py-2.5 px-2.5 text-right text-indigo-700 font-black">Table Stock (Cut PCs)</th>
                                  <th className="py-2.5 px-3 text-center">Cutting Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {groupedSubPartsList.map((group) => (
                                  <React.Fragment key={group.spId}>
                                    {(groupedSubPartsList.length > 1 || (group.spName && group.spName !== 'Garment' && group.spName !== 'Garment Subparts')) && (
                                      <tr className="bg-purple-50/40 border-y border-purple-100">
                                        <td colSpan={4} className="py-1 px-3 text-[10px] font-black uppercase tracking-wider text-purple-900">
                                          Subpart: {group.spName} • <span className="font-semibold text-slate-500">{group.totalGroupCut} / {group.totalGroupTarget} Cut PCs</span>
                                        </td>
                                      </tr>
                                    )}
                                    {group.items.map((item) => {
                                      const isCutDone = item.targetPsc > 0 && item.cutPsc >= item.targetPsc;
                                      return (
                                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                          <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-black text-slate-900">{item.name}</span>
                                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                                ×{item.ratio} / Set
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            <span className="font-black text-purple-700">{item.cutPsc}</span>
                                            <span className="text-slate-400 font-medium text-[11px]"> / {item.targetPsc} Cut PCs</span>
                                          </td>
                                          <td className="py-2.5 px-2.5 text-right">
                                            {item.unassignedCutPsc > 0 ? (
                                              <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[10px]">
                                                📦 {item.unassignedCutPsc} ready
                                              </span>
                                            ) : (
                                              <span className="text-slate-300">—</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            {isCutDone ? (
                                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                ✓ Complete
                                              </span>
                                            ) : (
                                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                                In Cutting
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                                ))}
                              </tbody>
                              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-xs">
                                <tr>
                                  <td className="py-2.5 px-3 font-black text-slate-900">Total Cut PCs</td>
                                  <td className="py-2.5 px-3 text-right font-black text-purple-700">
                                    {grandTotalCutPCs} <span className="text-slate-500 font-semibold text-[11px]">/ {grandTotalTargetCutPCs}</span>
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right">
                                    {grandTotalReadyOnFloorPCs > 0 ? (
                                      <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[10px]">
                                        📦 {grandTotalReadyOnFloorPCs} ready
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${grandTotalUncutPsc === 0 && grandTotalTargetCutPCs > 0
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : 'bg-purple-50 text-purple-800 border-purple-200'
                                      }`}>
                                      {grandTotalUncutPsc === 0 && grandTotalTargetCutPCs > 0 ? '✓ Complete' : `${overallCutPercent}% Cut`}
                                    </span>
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ==================== SECTION 2: TAILOR STITCHING & ASSIGNMENT ==================== */}
                  <div className="bg-white rounded-2xl border border-indigo-200/80 p-3.5 sm:p-4 space-y-3 shadow-2xs text-left transition-all duration-200">
                    {/* Section 2 Header */}
                    <div
                      onClick={() => toggleTailorSectionExpand(f.id)}
                      className="cursor-pointer select-none space-y-2.5"
                    >
                      <div className="flex items-start sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-wide">
                                2. Tailor Stitching & PC Assignment
                              </h4>
                              {totalTailorStitchedPCs >= totalTailorTargetPCs && totalTailorTargetPCs > 0 ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                  ✓ 100% Stitched
                                </span>
                              ) : pendingHandoverCount > 0 ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                  ⏳ {pendingHandoverPsc} PCs Awaiting Count
                                </span>
                              ) : totalTailorInStitchingPCs > 0 ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap">
                                  🪡 {totalTailorInStitchingPCs} PCs Sewing
                                </span>
                              ) : totalTailorPendingAcceptPCs > 0 ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                  ⏳ {totalTailorPendingAcceptPCs} PCs Awaiting Accept
                                </span>
                              ) : totalTailorAssignedPCs > 0 ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 whitespace-nowrap">
                                  {totalTailorAssignedPCs} PCs Assigned
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                                  Not Assigned
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                              {totalTailorAssignedPCs} {assignedLabel} Assigned{totalTailorPendingAcceptPCs > 0 ? ` (${totalTailorPendingAcceptPCs} Awaiting Accept)` : ''}{pendingHandoverCount > 0 ? ` • ${pendingHandoverPsc} Awaiting Verification` : ''}{totalTailorInStitchingPCs > 0 ? ` • ${totalTailorInStitchingPCs} ${inStitchingLabel} in Stitching` : ''}{totalTailorStitchedPCs > 0 ? ` • ${totalTailorStitchedPCs} ${stitchedDoneLabel} Stitched` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Desktop Actions + Desktop Chevron */}
                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                          {(grandTotalReadyOnFloorPCs > 0 || tailorPCList.some((p) => p.readyPCs > 0) || totalFullPCsReadyToAssign > 0) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetCutting = fabricCuttings[0] || null;
                                if (onOpenAssignTailor) {
                                  onOpenAssignTailor(targetCutting ? targetCutting.id : null, f.id);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                              title="Assign PCs to tailor"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Assign PCs to Tailor</span>
                            </button>
                          )}

                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 ${isTailorSectionExpanded ? 'rotate-180 bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            title={isTailorSectionExpanded ? 'Collapse section' : 'Expand section'}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Mobile Chevron */}
                        <div
                          className={`sm:hidden w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${isTailorSectionExpanded ? 'rotate-180 bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          title={isTailorSectionExpanded ? 'Collapse section' : 'Expand section'}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Mobile Action Button */}
                      {(grandTotalReadyOnFloorPCs > 0 || tailorPCList.some((p) => p.readyPCs > 0) || totalFullPCsReadyToAssign > 0) && (
                        <div className="sm:hidden pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetCutting = fabricCuttings[0] || null;
                              if (onOpenAssignTailor) {
                                onOpenAssignTailor(targetCutting ? targetCutting.id : null, f.id);
                              }
                            }}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-all cursor-pointer"
                            title="Assign PCs to tailor"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Assign PCs to Tailor</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expandable Section 2 Body */}
                    {isTailorSectionExpanded && (
                      <div className="pt-3 border-t border-indigo-100 space-y-3 animate-in fade-in duration-150">


                        {/* Awaiting Tailor Floor Acceptance Banner */}
                        {totalTailorPendingAcceptPCs > 0 && pendingHandoverCount === 0 && (
                          <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between gap-2.5 flex-wrap text-xs text-left">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              <div className="min-w-0">
                                <span className="font-black text-slate-800 block sm:inline">
                                  {pendingAcceptSummary} Assigned to Tailor
                                </span>
                                <span className="text-slate-500 text-[11px] block truncate mt-0.5 sm:mt-0 sm:inline sm:ml-1.5">
                                  • Awaiting tailor acceptance on the factory floor.
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                              ⏳ Awaiting Tailor Accept
                            </span>
                          </div>
                        )}

                        {/* Quick Tailor Metrics Strip: 5 clear columns focusing strictly on Garment Pieces */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-left">
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Assigned</span>
                            <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                              {totalTailorAssignedPCs} <span className="text-[10px] font-semibold text-slate-400">{assignedLabel}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">To tailors</span>
                          </div>

                          <div className="bg-amber-50/60 rounded-xl p-2.5 border border-amber-200/80">
                            <span className="text-[10px] uppercase font-bold text-amber-700 block">⏳ Awaiting Accept</span>
                            <div className="text-base sm:text-lg font-black text-amber-900 mt-0.5">
                              {totalTailorPendingAcceptPCs} <span className="text-[10px] font-semibold text-amber-600">{pendingAcceptLabel}</span>
                            </div>
                            <span className="text-[10px] text-amber-700 font-medium">Pending tailor</span>
                          </div>

                          <div className="bg-blue-50/60 rounded-xl p-2.5 border border-blue-200/80">
                            <span className="text-[10px] uppercase font-bold text-blue-700 block">🪡 In Stitching</span>
                            <div className="text-base sm:text-lg font-black text-blue-900 mt-0.5">
                              {totalTailorInStitchingPCs} <span className="text-[10px] font-semibold text-blue-600">{inStitchingLabel}</span>
                            </div>
                            <span className="text-[10px] text-blue-700 font-medium">Active sewing</span>
                          </div>

                          <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-200/80">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">✓ Stitched Done</span>
                            <div className="text-base sm:text-lg font-black text-emerald-900 mt-0.5">
                              {totalTailorStitchedPCs} <span className="text-[10px] font-semibold text-emerald-600">{stitchedDoneLabel}</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-bold">Ready goods</span>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 col-span-2 sm:col-span-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Left to Stitch</span>
                            <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                              {totalTailorLeftAssigned} <span className="text-[10px] font-semibold text-slate-400">{leftAssignedLabel}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {totalTailorLeftTarget > 0 ? `${totalTailorLeftTarget} to target` : 'Target reached'}
                            </span>
                          </div>
                        </div>

                        {/* Multi-Segment Tailor Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] font-bold text-slate-600">
                            <span>Tailor Stitching Lifecycle ({totalTailorStitchedPCs} / {stitchingBaseTotal} {assignedLabel} Assigned • {totalTailorTargetPCs} Lot Target)</span>
                            <span className="text-emerald-700">
                              {stitchingAssignedPercent}% Stitched
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                            {stitchingBaseTotal > 0 && totalTailorStitchedPCs > 0 && (
                              <div
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${Math.min(100, (totalTailorStitchedPCs / stitchingBaseTotal) * 100)}%` }}
                                title={`${totalTailorStitchedPCs} ${stitchedDoneLabel} Stitched Done`}
                              />
                            )}
                            {stitchingBaseTotal > 0 && totalTailorInStitchingPCs > 0 && (
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${Math.min(100, (totalTailorInStitchingPCs / stitchingBaseTotal) * 100)}%` }}
                                title={`${totalTailorInStitchingPCs} ${inStitchingLabel} in Stitching`}
                              />
                            )}
                            {stitchingBaseTotal > 0 && totalTailorPendingAcceptPCs > 0 && (
                              <div
                                className="h-full bg-amber-400 transition-all duration-300"
                                style={{ width: `${Math.min(100, (totalTailorPendingAcceptPCs / stitchingBaseTotal) * 100)}%` }}
                                title={`${totalTailorPendingAcceptPCs} ${pendingAcceptLabel} Awaiting Tailor Accept`}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                              <strong className="text-slate-800">{totalTailorStitchedPCs}</strong> {stitchedDoneLabel} Stitched Done
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                              <strong className="text-slate-800">{totalTailorInStitchingPCs}</strong> {inStitchingLabel} In Stitching
                            </span>
                            {totalTailorPendingAcceptPCs > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                                <strong className="text-slate-800">{totalTailorPendingAcceptPCs}</strong> {pendingAcceptLabel} Awaiting Accept
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-slate-400">
                              <span>•</span>
                              <span>{totalTailorLeftAssigned} {leftAssignedLabel} Left of Assigned ({totalTailorLeftTarget} to Target)</span>
                            </span>
                          </div>
                        </div>

                        {/* Garment PC Stitching Table (Rows are the Garment PCs / Subparts) */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[560px] sm:min-w-full">
                              <thead>
                                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                  <th className="py-2.5 px-3">Subpart / Component (PC)</th>
                                  <th className="py-2.5 px-3 text-right">Target / Assigned PCs</th>
                                  <th className="py-2.5 px-2.5 text-right text-amber-700 font-black">⏳ Awaiting Accept</th>
                                  <th className="py-2.5 px-3 text-right text-emerald-700 font-black">🪡 In Stitching / ✓ Done</th>
                                  <th className="py-2.5 px-2.5 text-right text-slate-600 font-bold">Left to Stitch</th>
                                  <th className="py-2.5 px-3 text-center">Tailor Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {tailorPCList.map((pc) => (
                                  <tr key={pc.pcId} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-2.5 px-3">
                                      <div className="font-black text-slate-900">
                                        {tailorPCList.length > 1 ? `PC ${pc.pcIndex}: ${pc.pcName}` : pc.pcName}
                                      </div>
                                      <div className="text-[11px] text-slate-500 font-medium">
                                        {pc.ratioFormula || '1 Set'}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <div>
                                        <span className="font-black text-indigo-700">{pc.assignedPCs > 0 ? `${pc.assignedPCs}` : '0'}</span>
                                        <span className="text-slate-400 font-medium text-[11px]"> / {pc.targetPCs} Target</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right">
                                      {pc.pendingAcceptPCs > 0 ? (
                                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                          ⏳ {pc.pendingAcceptPCs} PCs
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <div>
                                        {pc.stitchedDonePCs > 0 ? (
                                          <span className="font-black text-emerald-700">✓ {pc.stitchedDonePCs} Done</span>
                                        ) : (
                                          <span className="text-slate-400 font-medium text-xs">0 Done</span>
                                        )}
                                      </div>
                                      {pc.inStitchingPCs > 0 && (
                                        <div className="text-[10px] font-bold text-blue-700">
                                          🪡 {pc.inStitchingPCs} Sewing
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right">
                                      {pc.assignedPCs === 0 ? (
                                        <div>
                                          <span className="text-slate-400 font-medium text-[11px]">—</span>
                                          <span className="text-[10px] text-slate-400 block">{pc.leftToTarget} to target</span>
                                        </div>
                                      ) : pc.leftToStitchAssigned === 0 ? (
                                        <div>
                                          <span className="text-emerald-600 font-bold text-xs">✓ 0 left</span>
                                          <span className="text-[10px] text-slate-400 block">{pc.leftToTarget} to target</span>
                                        </div>
                                      ) : (
                                        <div>
                                          <span className="font-bold text-slate-900 text-xs">
                                            {pc.leftToStitchAssigned} PCs left
                                          </span>
                                          <span className="text-[10px] text-slate-400 block">
                                            {pc.leftToTarget} to target
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      {pc.isDone ? (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          ✓ Stitched
                                        </span>
                                      ) : pc.pendingAcceptPCs > 0 ? (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                          Awaiting Accept
                                        </span>
                                      ) : pc.inStitchingPCs > 0 ? (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                          Stitching
                                        </span>
                                      ) : pc.assignedPCs > 0 ? (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                          Assigned
                                        </span>
                                      ) : (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
                                          Unassigned
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-xs">
                                <tr>
                                  <td className="py-2.5 px-3 font-black text-slate-900">Total {assignedLabel}</td>
                                  <td className="py-2.5 px-3 text-right font-black text-indigo-700">
                                    {totalTailorAssignedPCs} <span className="text-slate-500 font-semibold text-[11px]">/ {totalTailorTargetPCs}</span>
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right">
                                    {totalTailorPendingAcceptPCs > 0 ? (
                                      <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                        ⏳ {totalTailorPendingAcceptPCs}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="font-black text-emerald-700">
                                      {totalTailorStitchedPCs > 0 ? `✓ ${totalTailorStitchedPCs} Done` : '0 Done'}
                                    </div>
                                    {totalTailorInStitchingPCs > 0 && (
                                      <div className="text-[10px] font-bold text-blue-700">
                                        🪡 {totalTailorInStitchingPCs} Sewing
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right">
                                    {totalTailorLeftAssigned === 0 && totalTailorAssignedPCs > 0 ? (
                                      <div>
                                        <span className="text-emerald-600 font-bold">✓ 0 left</span>
                                        <span className="text-[10px] text-slate-400 block">{totalTailorLeftTarget} to target</span>
                                      </div>
                                    ) : (
                                      <div>
                                        <span className="font-bold text-slate-900">
                                          {totalTailorLeftAssigned} left
                                        </span>
                                        <span className="text-[10px] text-slate-400 block">
                                          {totalTailorLeftTarget} to target
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${totalTailorStitchedPCs >= totalTailorTargetPCs && totalTailorTargetPCs > 0
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                      }`}>
                                      {totalTailorStitchedPCs >= totalTailorTargetPCs && totalTailorTargetPCs > 0
                                        ? '✓ 100% Stitched'
                                        : `${totalTailorStitchedPCs}/${stitchingBaseTotal} Stitched`}
                                    </span>
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {/* Active Tailor Workers Roster */}
                        {fabricAssignments.length > 0 && (
                          <div className="pt-2 border-t border-indigo-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                Tailors Assigned to this Lot ({fabricAssignments.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveTab('assignments')}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                              >
                                <span>View All Assignments</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {fabricAssignments.map((a) => {
                                const cutting = cuttings.find((c) => c.id === a.cuttingId);
                                const spList = getAssignmentSubPartsList(a, cutting, f);
                                let aTargetPCs = 0;
                                if (spList.length > 0) {
                                  aTargetPCs = spList.reduce((acc, sp) => acc + (parseInt(sp.count, 10) || 0), 0);
                                } else if (a.assignedSubParts && typeof a.assignedSubParts === 'object' && Object.keys(a.assignedSubParts).length > 0) {
                                  aTargetPCs = Object.values(a.assignedSubParts).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
                                } else {
                                  aTargetPCs = parseInt(a.totalAssignedPieces, 10) || 0;
                                }
                                const aPieceName = getAssignmentPieceName(a, aTargetPCs, f);
                                const aDone = parseInt(a.completedQuantity, 10) || 0;
                                const aPct = aTargetPCs > 0 ? Math.min(100, Math.round((aDone / aTargetPCs) * 100)) : 0;
                                const isAwaitingAccept = !a.tailorAccepted || a.status === 'Pending Acceptance';

                                return (
                                  <div
                                    key={a.id}
                                    className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between gap-1.5 ${isAwaitingAccept
                                      ? 'bg-amber-50/50 border-amber-200'
                                      : a.status === 'Completed'
                                        ? 'bg-emerald-50/50 border-emerald-200'
                                        : 'bg-slate-50 border-slate-200'
                                      }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <span className="font-black text-slate-900 truncate block">
                                          {a.tailorName || 'Tailor'}
                                        </span>
                                        <span className="text-[10px] text-slate-500 block">
                                          {a.machineNumber ? `Machine #${a.machineNumber}` : 'Manual'} • {aTargetPCs} {formatPieceName(aPieceName, aTargetPCs)}
                                        </span>
                                      </div>
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${isAwaitingAccept
                                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                                          : a.status === 'Completed'
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                            : 'bg-blue-50 text-blue-800 border-blue-200'
                                          }`}
                                      >
                                        {isAwaitingAccept ? '⏳ Pending Accept' : a.status || 'In Progress'}
                                      </span>
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                                        <span>{aDone} of {aTargetPCs} {formatPieceName(aPieceName, aTargetPCs)} Stitched</span>
                                        <span>{aPct}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-300 ${isAwaitingAccept
                                            ? 'bg-amber-400'
                                            : a.status === 'Completed'
                                              ? 'bg-emerald-500'
                                              : 'bg-indigo-600'
                                            }`}
                                          style={{ width: `${aPct}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ==================== FACTORY HANDOVER STRIP & LOGS ==================== */}
                  {(totalAvailableToSubmitPSC > 0 || totalSubmittedPSC > 0 || allFabricHandovers.length > 0 || totalPendingTrimmingPSC > 0) && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 space-y-2.5 text-xs text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start sm:items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
                            <Send className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-emerald-950 text-xs leading-tight block">
                              Factory Admin Handover
                            </span>
                            <p className="text-[11px] text-emerald-800 font-medium leading-snug mt-0.5">
                              {totalSubmittedPSC} of {targetHandoverPieces} {assignedLabel} in Admin Custody{' '}
                              <span className="text-emerald-700 font-bold">({totalVerifiedPSC} Verified)</span>
                              {totalPendingTrimmingPSC > 0 && (
                                <span className="text-teal-700 font-bold ml-1.5">• {totalPendingTrimmingPSC} in Trimming queue</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {totalAvailableToSubmitPSC > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const readyCutting =
                                fabricCuttings.find(
                                  (c) =>
                                    (getMasterHandoverStats ? getMasterHandoverStats(c.id)?.availableToSubmitPSC || 0 : 0) > 0
                                ) || fabricCuttings[0] || null;
                              if (onOpenSubmitAdmin) {
                                onOpenSubmitAdmin(readyCutting, f);
                              }
                            }}
                            className="w-full sm:w-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <Send className="w-3 h-3" />
                            <span>Handover {totalAvailableToSubmitPSC} Ready</span>
                          </button>
                        ) : totalPendingTrimmingPSC > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenAssignTrimming) {
                                onOpenAssignTrimming('assign', f.id, fabricCuttings[0]?.id);
                              } else if (setActiveTab) {
                                setActiveTab('trimming');
                              }
                            }}
                            className="w-full sm:w-auto px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            title="Go to Trimming tab to process tailor stitched goods"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                            <span>Process Trimming ({totalPendingTrimmingPSC} Pending)</span>
                          </button>
                        ) : null}
                      </div>

                      {/* Expandable Handover Log Batches */}
                      {sortedFabricHandovers.length > 0 && (
                        <div className="pt-1.5 border-t border-emerald-200/80 space-y-2">
                          <button
                            type="button"
                            onClick={() => toggleHandoverLogExpand(f.id)}
                            className="w-full p-2 sm:p-2.5 rounded-xl bg-white/80 hover:bg-white border border-emerald-200/90 hover:border-emerald-300 transition-all cursor-pointer select-none text-left shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-xs text-slate-800 truncate">
                                  Handover Batches Sent to Admin:
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium shrink-0">
                                  ({sortedFabricHandovers.length})
                                </span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200/90 px-2 py-0.5 rounded-md shrink-0 transition-colors">
                                <span>{isHandoverExpanded ? 'Hide' : 'Show'}</span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isHandoverExpanded ? 'rotate-180' : ''
                                    }`}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {verifiedHandovers.length > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300/80 flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>{verifiedHandovers.length} Verified</span>
                                </span>
                              )}
                              {rejectedHandovers.length > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300/80 flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                  <span>{rejectedHandovers.length} Rejected</span>
                                </span>
                              )}
                              {pendingHandovers.length > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                                  <span>{pendingHandovers.length} Pending</span>
                                </span>
                              )}
                            </div>
                          </button>

                          {isHandoverExpanded && (
                            <div className="space-y-1.5 animate-in fade-in duration-200">
                              {sortedFabricHandovers.map((h) => {
                                const isPending = h.status === 'Pending Verification' || h.status === 'Pending' || !h.status;
                                const isVerified = h.status === 'Verified';
                                const isRejected = h.status === 'Rejected';

                                // Parse subparts breakdown
                                const rawSubParts = h.subParts && typeof h.subParts === 'object' ? h.subParts : {};
                                const cleanSubParts = {};
                                Object.entries(rawSubParts).forEach(([k, v]) => {
                                  const num = parseInt(v, 10);
                                  if (!isNaN(num) && num > 0) cleanSubParts[k] = num;
                                });
                                if (Object.keys(cleanSubParts).length === 0 && h.parts && typeof h.parts === 'object') {
                                  Object.entries(h.parts).forEach(([k, v]) => {
                                    const num = parseInt(v, 10);
                                    if (!isNaN(num) && num > 0) cleanSubParts[k] = num;
                                  });
                                }

                                const displayPieces = parseInt(h.pieces ?? h.piecesCount ?? h.pieces_count ?? h.receivedQuantity, 10) || 0;
                                const subVals = Object.values(cleanSubParts).filter((v) => v > 0);
                                const calculatedPieces = subVals.length > 0 ? Math.min(...subVals) : 0;
                                const finalPieces = displayPieces || calculatedPieces || 0;

                                let hPieceBreakdown = null;
                                if (Object.keys(cleanSubParts).length > 0) {
                                  const entries = Object.entries(cleanSubParts)
                                    .map(([k, v]) => {
                                      const pLabel = resolvePieceLabel ? resolvePieceLabel(k, struct) : k;
                                      return `${pLabel.toUpperCase()}: ${v} PCs`;
                                    })
                                    .filter(Boolean);
                                  if (entries.length > 0) hPieceBreakdown = entries.join(', ');
                                } else if (h.combinationFormula && typeof h.combinationFormula === 'string' && h.combinationFormula.trim()) {
                                  hPieceBreakdown = h.combinationFormula;
                                } else if (h.subPart || h.sub_part || h.partName) {
                                  const pName = (resolvePieceLabel ? resolvePieceLabel(h.subPart || h.sub_part || h.partName, struct) : (h.subPart || h.sub_part || h.partName)).toUpperCase();
                                  hPieceBreakdown = finalPieces > 0 ? `${pName}: ${finalPieces} PCs` : pName;
                                }

                                const cleanNote = getCleanDisplayNote(h.notes);

                                return (
                                  <div
                                    key={h.id}
                                    className={`p-2.5 rounded-xl border transition-all text-xs ${isRejected
                                      ? 'bg-rose-50/80 border-rose-200'
                                      : isVerified
                                        ? 'bg-white border-emerald-200 shadow-2xs'
                                        : 'bg-amber-50/60 border-amber-200'
                                      }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <span
                                          className={`w-2 h-2 rounded-full shrink-0 ${isVerified
                                            ? 'bg-emerald-500'
                                            : isPending
                                              ? 'bg-amber-500 animate-pulse'
                                              : 'bg-rose-500'
                                            }`}
                                        />
                                        <span className={`font-black ${isRejected ? 'text-rose-900' : 'text-slate-900'}`}>
                                          +{finalPieces} PCs
                                        </span>
                                        {hPieceBreakdown && (
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${isRejected
                                            ? 'text-rose-900 bg-rose-100 border-rose-200'
                                            : 'text-amber-900 bg-amber-100/90 border-amber-200'
                                            }`}>
                                            ({hPieceBreakdown})
                                          </span>
                                        )}
                                        <span className="text-[11px] text-slate-500">
                                          • {h.handoverDate || (h.createdAt ? h.createdAt.split('T')[0] : 'Recent')}
                                        </span>
                                        {cleanNote && (
                                          <span className="text-[10px] text-slate-500 italic max-w-xs truncate" title={cleanNote}>
                                            "{cleanNote}"
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                        {/* Floor Trimming Status Badge */}
                                        {h.trimmingStatus === 'mixed' || (h.trimmedPieces > 0 && h.skippedTrimmingPieces > 0) ? (
                                          <>
                                            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                                              <Scissors className="w-2.5 h-2.5 text-teal-600" />
                                              <span>{h.trimmedPieces} Trimmed</span>
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300 flex items-center gap-1">
                                              <Lock className="w-2.5 h-2.5 text-slate-500" />
                                              <span>{h.skippedTrimmingPieces} Skipped</span>
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            {(h.trimmingStatus === 'trimmed' || h.trimmedByMaster) && (
                                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                                                <Scissors className="w-2.5 h-2.5 text-teal-600" />
                                                <span>Trimmed</span>
                                              </span>
                                            )}
                                            {(h.trimmingStatus === 'skipped' || h.skippedByMaster) && (
                                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300 flex items-center gap-1">
                                                <Lock className="w-2.5 h-2.5 text-slate-500" />
                                                <span>Trimming Skipped</span>
                                              </span>
                                            )}
                                          </>
                                        )}

                                        {isVerified && (
                                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            <span>Verified</span>
                                          </span>
                                        )}
                                        {isPending && (
                                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                            <span>Pending Verification</span>
                                          </span>
                                        )}
                                        {isRejected && (
                                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                                            <span>Rejected</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Prominent Rejection Reason alert for the Master */}
                                    {isRejected && h.rejectionReason && (
                                      <div className="mt-1.5 p-2 bg-rose-100/90 border border-rose-300 rounded-lg text-rose-900 text-[11px] flex items-start gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                        <div>
                                          <strong className="font-bold">Admin Rejection Reason: </strong>
                                          <span>{h.rejectionReason}</span>
                                          <span className="block text-[10px] text-rose-700 mt-0.5">
                                            (These pieces are returned to ready count so you can adjust or re-handover to admin)
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {(() => {
                    const cleanNote = getCleanDisplayNote(f.notes);
                    if (!cleanNote) return null;
                    return (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                        "{cleanNote}"
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
