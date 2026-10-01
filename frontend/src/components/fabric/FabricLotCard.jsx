import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useManagement } from '../../context/useManagement';
import Step1ProductDesign from './steps/Step1ProductDesign';
import Step2AssignMaster from './steps/Step2AssignMaster';
import Step3FabricCutting from './steps/Step3FabricCutting';
import Step4ThreadTrimming from './steps/Step4ThreadTrimming';
import Step5DeliveryInvoice from './steps/Step5DeliveryInvoice';
import FabricLotHeader from './FabricLotHeader';
import FabricLotMetricsBar from './FabricLotMetricsBar';
import { FabricLotDeliverButton, FabricLotActionsDropdown } from './FabricLotActionButtons';
import { openFabricLotWhatsAppShare } from '../../utils/whatsappNotification';
import { useFabricLotMetrics } from '../../hooks/useFabricLotMetrics';
import { getCleanDisplayNote } from '../../utils/productUtils';

export default function FabricLotCard({
  fabric,
  isExpanded: controlledExpanded,
  onToggleExpand,
  initialExpanded = true,
  targetLotId,
  modalActions,
}) {
  const f = fabric;
  const { currentUser } = useAuth();
  const {
    masters = [],
    cuttings = [],
    threadCuttingAssignments = [],
    masterHandovers = [],
    invoices = [],
    tailorAssignments = [],
    deliveryLogs = [],
    verifyMasterHandover,
    updateThreadCuttingProgress,
  } = useManagement();
  const navigate = useNavigate();

  // Expanded / collapsed state
  const [internalExpanded, setInternalExpanded] = useState(initialExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleCardExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  // Step collapsible state
  const [expandedStepKeys, setExpandedStepKeys] = useState(new Set());
  const toggleStep = (stepKey) => {
    setExpandedStepKeys((prev) => {
      const next = new Set(prev);
      if (next.has(stepKey)) {
        next.delete(stepKey);
      } else {
        next.add(stepKey);
      }
      return next;
    });
  };

  const [verifyingHandoverId, setVerifyingHandoverId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [whatsappNotifiedNotice, setWhatsappNotifiedNotice] = useState(null);

  // Memoized lot metrics & production calculations
  const metrics = useFabricLotMetrics(f, {
    cuttings,
    tailorAssignments,
    masterHandovers,
    threadCuttingAssignments,
    invoices,
    deliveryLogs,
  });

  const {
    dueStatus,
    readySetData,
    readyProductsCount,
    missingSubParts,
    totalVerifiedPieces,
    piecesAwaitingTrimming,
    struct,
    isProductConfigured,
    readyPiecesCount,
    isLotFullyCompletedAndDelivered,
    linkedInvoices,
    linkedInvoice,
    isMasterAccepted,
    isUnderMasterReview,
    isDeliveryValid,
    deliveryDisabledReason,
    totalCutPieces,
    cutGroups,
    totalCutSets,
    targetSets,
    totalTargetCutPieces,
    cutPercent,
    totalTailorAssignedPieces,
    totalStitchedPieces,
    stitchedSubPartsBreakdown,
    assignedTailorSubPartsBreakdown,
    totalPendingTailorPieces,
    totalTargetGarmentPieces,
    stitchingPercent,
    completedSets,
    completedPercent,
    lotDeliveryLogs,
    lotDeliveredPieces,
    deliveredSets,
    deliveredPercent,
    isAllWorkDoneAndDelivered,
    isAllWorkDone,
    isCuttingDone,
    hasInvoice,
    isTrimmingActionAvailable,
    lotHandovers,
    totalReceivedFromMaster,
    verifiedFromMaster,
    pendingFromMaster,
    subPartsList,
    roundedFullSet,
    receivedSubPartsMap,
    verifiedSubPartsMap,
    targetPiecesMap,
    allPieceNames,
    remainingPiecesMap,
    targetPiecesForStep3,
    remainingFromMaster,
    receivedPercent,
    step4AdminReceived,
    lotThreadJobsForStep4,
    inProgressThreadCount,
    inProgressSubPartsMap,
    skippedMap,
    threadCuttedSubPartsMap,
    awaitingTrimmingSubPartsMap,
    totalAwaitingCount,
    threadCuttedCount,
    totalSkippedCount,
    totalDeliveredPSC,
    deliveredSubPartsMap,
    totalGoodsPiecesList,
    totalGoodsSubPartsBreakdown,
    totalGoodsCount,
    deliveredPiecesList,
    readyPiecesList,
    activeStepIds,
  } = metrics;

  // Hoisted modal action delegates
  const handleOpenDeliver = () => modalActions?.onOpenDeliver?.(f);
  const handleOpenStructure = () => modalActions?.onOpenStructure?.(f);
  const handleOpenAssignMaster = () => modalActions?.onOpenAssignMaster?.(f);
  const handleOpenCut = () => modalActions?.onOpenCut?.(f);
  const handleOpenInvoice = () => modalActions?.onOpenInvoice?.(f);
  const handleViewInvoice = (inv) => modalActions?.onViewInvoice?.(inv);
  const handleOpenTrimmingDecision = (fabricObj) => {
    modalActions?.onOpenTrimmingDecision?.(fabricObj || f, readySetData?.totalGrossVerifiedPieces || 0);
  };
  const handleOpenAssignThreadCutting = (params = {}) => {
    modalActions?.onOpenAssignThreadCutting?.({ cuttingId: f.id, ...params });
  };
  const handleDeleteConfirm = () => modalActions?.onDeleteFabric?.(f);
  const handleOpenEdit = () => modalActions?.onOpenEdit?.(f);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdownId && !e.target.closest('[data-dropdown-container]')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const handleNotifyAdminWhatsApp = (f) => {
    if (!f) return;
    openFabricLotWhatsAppShare(
      f,
      {
        cuttings,
        tailorAssignments,
        invoices,
        masterHandovers,
        threadCuttingAssignments,
        masters,
        companyName: currentUser?.companyName || 'Fabric Manager',
        currentUserPhone: currentUser?.phone || currentUser?.whatsapp || '',
      },
      (notice) => {
        setWhatsappNotifiedNotice(notice);
        setTimeout(() => setWhatsappNotifiedNotice(null), 4000);
      }
    );
  };

  return (
    <>
      {/* WhatsApp Notified Banner */}
      {whatsappNotifiedNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-emerald-950 truncate">
                WhatsApp Notification Prepared!
              </p>
              <p className="text-emerald-700 text-[11px] truncate">
                {whatsappNotifiedNotice}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWhatsappNotifiedNotice(null)}
            className="text-slate-400 hover:text-slate-700 font-bold px-2 py-1 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Fabric Card */}
      <div
        id={`fabric-card-${f.id}`}
        className={`bg-white rounded-2xl border transition-all border-l-4 ${!isProductConfigured
          ? 'border-l-amber-500 border-slate-200/90'
          : !f.assignedMasterId
            ? 'border-l-purple-500 border-slate-200/90'
            : isUnderMasterReview
              ? 'border-l-amber-500 border-slate-200/90'
              : 'border-l-emerald-500 border-slate-200/90'
          } ${targetLotId === f.id ? 'ring-2 ring-indigo-500/80 border-indigo-400' : ''
          } ${isExpanded
            ? 'p-4 shadow-sm space-y-3'
            : 'p-3 hover:border-slate-300 shadow-2xs hover:shadow-xs cursor-pointer'
          }`}
        onClick={!isExpanded ? () => toggleCardExpand(f.id) : undefined}
      >
        {!isExpanded ? (
          <FabricLotHeader
            fabric={f}
            isExpanded={false}
            toggleCardExpand={toggleCardExpand}
            isProductConfigured={isProductConfigured}
            isUnderMasterReview={isUnderMasterReview}
            isMasterAccepted={isMasterAccepted}
            isLotFullyCompletedAndDelivered={isLotFullyCompletedAndDelivered}
            isAllWorkDoneAndDelivered={isAllWorkDoneAndDelivered}
            lotDeliveredPieces={lotDeliveredPieces}
            deliveredPercent={deliveredPercent}
            readySetData={readySetData}
            readyPiecesCount={readyPiecesCount}
            readyProductsCount={readyProductsCount}
            isDeliveryValid={isDeliveryValid}
            dueStatus={dueStatus}
            masters={masters}
            openDropdownId={openDropdownId}
            setOpenDropdownId={setOpenDropdownId}
            modalActions={modalActions}
            handleNotifyAdminWhatsApp={handleNotifyAdminWhatsApp}
            navigate={navigate}
            isCuttingDone={isCuttingDone}
            hasInvoice={hasInvoice}
            isTrimmingActionAvailable={isTrimmingActionAvailable}
            piecesAwaitingTrimming={piecesAwaitingTrimming}
            handleOpenStructure={handleOpenStructure}
            handleOpenAssignMaster={handleOpenAssignMaster}
            handleOpenCut={handleOpenCut}
            handleOpenInvoice={handleOpenInvoice}
            handleOpenAssignThreadCutting={handleOpenAssignThreadCutting}
            handleOpenEdit={handleOpenEdit}
            handleDeleteConfirm={handleDeleteConfirm}
          />
        ) : (
          /* --- EXPANDED FULL CARD (Clean, Formatted & Non-Repetitive View) --- */
          <div className="space-y-3 animate-in fade-in duration-150">
            <FabricLotHeader
              fabric={f}
              isExpanded={true}
              toggleCardExpand={toggleCardExpand}
              isProductConfigured={isProductConfigured}
              isUnderMasterReview={isUnderMasterReview}
              isMasterAccepted={isMasterAccepted}
              isLotFullyCompletedAndDelivered={isLotFullyCompletedAndDelivered}
              isAllWorkDoneAndDelivered={isAllWorkDoneAndDelivered}
              lotDeliveredPieces={lotDeliveredPieces}
              deliveredPercent={deliveredPercent}
              readySetData={readySetData}
              readyPiecesCount={readyPiecesCount}
              readyProductsCount={readyProductsCount}
              isDeliveryValid={isDeliveryValid}
              dueStatus={dueStatus}
              masters={masters}
              openDropdownId={openDropdownId}
              setOpenDropdownId={setOpenDropdownId}
              modalActions={modalActions}
              handleNotifyAdminWhatsApp={handleNotifyAdminWhatsApp}
              navigate={navigate}
              isCuttingDone={isCuttingDone}
              hasInvoice={hasInvoice}
              isTrimmingActionAvailable={isTrimmingActionAvailable}
              piecesAwaitingTrimming={piecesAwaitingTrimming}
              handleOpenStructure={handleOpenStructure}
              handleOpenAssignMaster={handleOpenAssignMaster}
              handleOpenCut={handleOpenCut}
              handleOpenInvoice={handleOpenInvoice}
              handleOpenAssignThreadCutting={handleOpenAssignThreadCutting}
              handleOpenEdit={handleOpenEdit}
              handleDeleteConfirm={handleDeleteConfirm}
            />

            {/* 2. Raw Inventory, Production & Finished Sets Glance */}
            <FabricLotMetricsBar
              fabric={f}
              targetSets={targetSets}
              cutPercent={cutPercent}
              stitchingPercent={stitchingPercent}
              completedSets={completedSets}
              completedPercent={completedPercent}
              deliveredSets={deliveredSets}
              deliveredPercent={deliveredPercent}
            />

            <div className="space-y-2.5">
              {activeStepIds.map((stepId) => {
                if (stepId === 5) {
                  const step5Key = `${f.id}-step5`;
                  const isStep5Open = expandedStepKeys.has(step5Key);
                  const isLotFullyDelivered = Boolean(
                    isLotFullyCompletedAndDelivered ||
                    isAllWorkDoneAndDelivered
                  );

                      return (
                        <Step5DeliveryInvoice
                          key="step5"
                          fabric={f}
                          struct={struct}
                          isStep5Open={isStep5Open}
                          toggleStep5={() => toggleStep(step5Key)}
                          isDelivered={isLotFullyDelivered}
                          totalDeliveredPSC={totalDeliveredPSC}
                          readyPiecesCount={readyPiecesCount}
                          totalGoodsCount={totalGoodsCount}
                          totalGoodsPiecesList={totalGoodsPiecesList}
                          totalGoodsSubPartsBreakdown={totalGoodsSubPartsBreakdown}
                          isAllWorkDone={isAllWorkDone}
                          completedPercent={completedPercent}
                          linkedInvoice={linkedInvoice}
                          linkedInvoices={linkedInvoices}
                          deliveredPiecesList={deliveredPiecesList}
                          deliveredSubPartsMap={deliveredSubPartsMap}
                          readyPiecesList={readyPiecesList}
                          lotDeliveryLogs={lotDeliveryLogs}
                          onOpenDeliverModal={handleOpenDeliver}
                          onOpenInvoiceModal={handleOpenInvoice}
                          onOpenInvoiceDetailsModal={(inv) => handleViewInvoice(inv)}
                          navigate={navigate}
                        />
                      );
                    }
                if (stepId === 4) {
                  const step4Key = `${f.id}-step4`;
                  const isStep4Open = expandedStepKeys.has(step4Key);

                  return (
                    <Step4ThreadTrimming
                      key="step4"
                      fabric={f}
                      struct={struct}
                      isStep4Open={isStep4Open}
                      toggleStep4={() => toggleStep(step4Key)}
                      totalVerifiedPieces={step4AdminReceived}
                      threadCuttedCount={threadCuttedCount}
                      totalSkippedCount={totalSkippedCount}
                      piecesAwaitingTrimming={totalAwaitingCount}
                      inProgressThreadCount={inProgressThreadCount}
                      allPieceNames={allPieceNames}
                      verifiedSubPartsMap={verifiedSubPartsMap}
                      threadCuttedSubPartsMap={threadCuttedSubPartsMap}
                      skippedMap={skippedMap}
                      inProgressSubPartsMap={inProgressSubPartsMap}
                      awaitingTrimmingSubPartsMap={awaitingTrimmingSubPartsMap}
                      onOpenTrimmingDecisionModal={(fabricObj) => handleOpenTrimmingDecision(fabricObj)}
                      navigate={navigate}
                      totalReceivedFromMaster={totalReceivedFromMaster}
                      targetPiecesForStep3={targetPiecesForStep3}
                      receivedPercent={receivedPercent}
                      pendingFromMaster={pendingFromMaster}
                      remainingFromMaster={remainingFromMaster}
                      verifiedFromMaster={verifiedFromMaster}
                      targetSets={targetSets}
                      subPartsList={subPartsList}
                      targetPiecesMap={targetPiecesMap}
                      receivedSubPartsMap={receivedSubPartsMap}
                      remainingPiecesMap={remainingPiecesMap}
                      totalCutPieces={totalCutPieces}
                      cutPercent={cutPercent}
                      totalCutSets={totalCutSets}
                      cutGroups={cutGroups}
                      totalStitchedPieces={totalStitchedPieces}
                      stitchingPercent={stitchingPercent}
                      totalTailorAssignedPieces={totalTailorAssignedPieces}
                      totalPendingTailorPieces={totalPendingTailorPieces}
                      totalTargetGarmentPieces={totalTargetGarmentPieces}
                      stitchedSubPartsBreakdown={stitchedSubPartsBreakdown}
                      assignedTailorSubPartsBreakdown={assignedTailorSubPartsBreakdown}
                      lotThreadJobs={lotThreadJobsForStep4}
                      updateThreadCuttingProgress={updateThreadCuttingProgress}
                    />
                  );
                }
                if (stepId === 3) {
                  const step3Key = `${f.id}-step3`;
                  const isStep3Open = expandedStepKeys.has(step3Key);

                  return (
                    <Step3FabricCutting
                      key="step3"
                      fabric={f}
                      struct={struct}
                      isStep3Open={isStep3Open}
                      toggleStep3={() => toggleStep(step3Key)}
                      totalReceivedFromMaster={totalReceivedFromMaster}
                      targetPiecesForStep3={targetPiecesForStep3}
                      receivedPercent={receivedPercent}
                      pendingFromMaster={pendingFromMaster}
                      remainingFromMaster={remainingFromMaster}
                      verifiedFromMaster={verifiedFromMaster}
                      targetSets={targetSets}
                      subPartsList={subPartsList}
                      allPieceNames={allPieceNames}
                      targetPiecesMap={targetPiecesMap}
                      receivedSubPartsMap={receivedSubPartsMap}
                      verifiedSubPartsMap={verifiedSubPartsMap}
                      remainingPiecesMap={remainingPiecesMap}
                      totalCutPieces={totalCutPieces}
                      totalTargetCutPieces={totalTargetCutPieces}
                      cutPercent={cutPercent}
                      totalCutSets={totalCutSets}
                      cutGroups={cutGroups}
                      totalStitchedPieces={totalStitchedPieces}
                      stitchingPercent={stitchingPercent}
                      totalTailorAssignedPieces={totalTailorAssignedPieces}
                      totalPendingTailorPieces={totalPendingTailorPieces}
                      totalTargetGarmentPieces={totalTargetGarmentPieces}
                      stitchedSubPartsBreakdown={stitchedSubPartsBreakdown}
                      assignedTailorSubPartsBreakdown={assignedTailorSubPartsBreakdown}
                      lotHandovers={lotHandovers}
                      verifyingHandoverId={verifyingHandoverId}
                      setVerifyingHandoverId={setVerifyingHandoverId}
                      verifyMasterHandover={verifyMasterHandover}
                      navigate={navigate}
                    />
                  );
                }
                if (stepId === 2) {
                  const step2Key = `${f.id}-step2`;
                  const isStep2Open = expandedStepKeys.has(step2Key);

                  return (
                    <Step2AssignMaster
                      key="step2"
                      fabric={f}
                      isProductConfigured={isProductConfigured}
                      isUnderMasterReview={isUnderMasterReview}
                      isMasterAccepted={isMasterAccepted}
                      isStep2Open={isStep2Open}
                      toggleStep2={() => toggleStep(step2Key)}
                      targetSets={targetSets}
                      dueStatus={dueStatus}
                      masters={masters}
                      onOpenAssignMasterModal={handleOpenAssignMaster}
                      navigate={navigate}
                    />
                  );
                }
                if (stepId === 1) {
                  const step1Key = `${f.id}-step1`;
                  const isStep1Open = expandedStepKeys.has(step1Key);

                  return (
                    <Step1ProductDesign
                      key="step1"
                      fabric={f}
                      isProductConfigured={isProductConfigured}
                      isStep1Open={isStep1Open}
                      toggleStep1={() => toggleStep(step1Key)}
                      struct={struct}
                      subPartsList={subPartsList}
                      roundedFullSet={roundedFullSet}
                      onOpenProductStructureModal={handleOpenStructure}
                      onOpenAssignMasterModal={handleOpenAssignMaster}
                    />
                  );
                }
                return null;
              })}
            </div>

            {/* Notes if present */}
            {(() => {
              const displayNotes = getCleanDisplayNote(f.notes);
              if (!displayNotes) return null;
              return (
                <p className="text-[11px] text-slate-500 italic bg-slate-50/70 px-2.5 py-1 rounded-lg border border-slate-100">
                  "{displayNotes}"
                </p>
              );
            })()}

            {/* 6. Footer Actions Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                <FabricLotDeliverButton
                  fabric={f}
                  isCompact={false}
                  isLotFullyCompletedAndDelivered={isLotFullyCompletedAndDelivered}
                  isAllWorkDoneAndDelivered={isAllWorkDoneAndDelivered}
                  isAllWorkDone={isAllWorkDone}
                  readySetData={readySetData}
                  readyPiecesCount={readyPiecesCount}
                  totalVerifiedPieces={totalVerifiedPieces}
                  lotDeliveredPieces={lotDeliveredPieces}
                  deliveredPercent={deliveredPercent}
                  linkedInvoice={linkedInvoice}
                  deliveryDisabledReason={deliveryDisabledReason}
                  missingSubParts={missingSubParts}
                  completedPercent={completedPercent}
                  onOpenDeliver={handleOpenDeliver}
                  onOpenInvoice={handleOpenInvoice}
                  onViewInvoice={handleViewInvoice}
                  navigate={navigate}
                />
              </div>
              <FabricLotActionsDropdown
                fabric={f}
                isUpward={true}
                isCompact={false}
                openDropdownId={openDropdownId}
                setOpenDropdownId={setOpenDropdownId}
                isProductConfigured={isProductConfigured}
                isMasterAccepted={isMasterAccepted}
                isCuttingDone={isCuttingDone}
                hasInvoice={hasInvoice}
                isTrimmingActionAvailable={isTrimmingActionAvailable}
                piecesAwaitingTrimming={piecesAwaitingTrimming}
                isLotFullyCompletedAndDelivered={isLotFullyCompletedAndDelivered}
                isAllWorkDoneAndDelivered={isAllWorkDoneAndDelivered}
                onOpenStructure={handleOpenStructure}
                onOpenAssignMaster={handleOpenAssignMaster}
                onOpenCut={handleOpenCut}
                onOpenInvoice={handleOpenInvoice}
                onOpenAssignThreadCutting={handleOpenAssignThreadCutting}
                onNotifyAdminWhatsApp={() => handleNotifyAdminWhatsApp(f)}
                onOpenEdit={handleOpenEdit}
                onOpenArchiveLot={modalActions?.onOpenArchiveLot}
                onDeleteFabric={handleDeleteConfirm}
              />
            </div>
          </div>
        )}
      </div>

    </>
  );
}

