import React from 'react';
import {
  Share2,
  ChevronDown,
  Truck,
  Scissors,
  UserCheck,
  Clock,
  CheckCircle2,
  Building2,
  Calendar,
} from 'lucide-react';
import { FabricLotActionsDropdown } from './FabricLotActionButtons';

function getLotStatusBadgeConfig({
  f,
  isLotFullyCompletedAndDelivered,
  isAllWorkDoneAndDelivered,
  lotDeliveredPieces = 0,
  deliveredPercent = 0,
  readySetData,
  isUnderMasterReview,
}) {
  let label = f.status || 'In Stock';
  let pillCls = 'bg-slate-50 text-slate-700 border-slate-200/80 shadow-2xs';
  let dotCls = 'bg-slate-400';

  if (f.isArchived) {
    label = 'Archived';
    pillCls = 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs font-bold';
    dotCls = 'bg-amber-500';
  } else if (isLotFullyCompletedAndDelivered || isAllWorkDoneAndDelivered) {
    label = 'Delivered';
    pillCls = 'bg-teal-50 text-teal-700 border-teal-200/80 shadow-2xs';
    dotCls = 'bg-teal-500';
  } else if (lotDeliveredPieces > 0) {
    label = `Partial Deliv (${deliveredPercent}%)`;
    pillCls = 'bg-indigo-50 text-indigo-700 border-indigo-200/80 shadow-2xs';
    dotCls = 'bg-indigo-500';
  } else if (readySetData?.isAwaitingTrimmingDecision) {
    label = 'Trimming Decision';
    pillCls = 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs animate-pulse';
    dotCls = 'bg-amber-500 animate-ping';
  } else if (readySetData?.isTrimmingInProgress) {
    label = 'In Trimming';
    pillCls = 'bg-teal-50 text-teal-800 border-teal-200/80 shadow-2xs';
    dotCls = 'bg-teal-500';
  } else if (readySetData?.isTrimmingCompleted) {
    label = 'Trimmed (Ready)';
    pillCls = 'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-2xs';
    dotCls = 'bg-emerald-500';
  } else if (readySetData?.isTrimmingSkipped) {
    label = 'Ready to Deliver';
    pillCls = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs';
    dotCls = 'bg-emerald-500';
  } else if (isUnderMasterReview) {
    label = 'Under Review';
    pillCls = 'bg-amber-50 text-amber-800 border-amber-200/80 shadow-2xs';
    dotCls = 'bg-amber-500 animate-pulse';
  } else if (f.status === 'In Stock') {
    label = 'In Stock';
    pillCls = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs';
    dotCls = 'bg-emerald-500';
  } else if (f.status === 'In Cutting') {
    label = 'In Cutting';
    pillCls = 'bg-purple-50 text-purple-700 border-purple-200/80 shadow-2xs';
    dotCls = 'bg-purple-500';
  }

  return { label, pillCls, dotCls };
}

export default function FabricLotHeader({
  fabric: f,
  isExpanded,
  toggleCardExpand,
  isProductConfigured,
  isUnderMasterReview,
  isMasterAccepted,
  isLotFullyCompletedAndDelivered,
  isAllWorkDoneAndDelivered,
  lotDeliveredPieces = 0,
  deliveredPercent = 0,
  readySetData,
  readyPiecesCount = 0,
  readyProductsCount = 0,
  isDeliveryValid,
  dueStatus,
  masters = [],
  openDropdownId,
  setOpenDropdownId,
  modalActions,
  handleNotifyAdminWhatsApp,
  navigate,
  // Dropdown flags
  isCuttingDone,
  hasInvoice,
  isTrimmingActionAvailable,
  piecesAwaitingTrimming,
  handleOpenStructure,
  handleOpenAssignMaster,
  handleOpenCut,
  handleOpenInvoice,
  handleOpenAssignThreadCutting,
  handleOpenEdit,
  handleDeleteConfirm,
}) {
  const statusBadge = getLotStatusBadgeConfig({
    f,
    isLotFullyCompletedAndDelivered,
    isAllWorkDoneAndDelivered,
    lotDeliveredPieces,
    deliveredPercent,
    readySetData,
    isUnderMasterReview,
  });

  const hasReadyToDeliver = readyPiecesCount > 0 || readyProductsCount > 0 || isDeliveryValid;

  return !isExpanded ? (
    /* --- SMART COMPACT CARD (Collapsed View) --- */
    <div className="space-y-1.5">
      {/* Top Row: State Dot, Lot Title, Color, Lot #, Status Badge, Deliver Button (desktop), Dropdown & Chevron */}
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        {/* Left side: Lot Title & Identity (Guaranteed visibility on mobile) */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Intelligent State Pulse Dot */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${!isProductConfigured
              ? 'bg-amber-500 ring-2 ring-amber-200 animate-pulse'
              : !f.assignedMasterId
                ? 'bg-purple-500 ring-2 ring-purple-200'
                : isUnderMasterReview
                  ? 'bg-amber-500 ring-2 ring-amber-200 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            title={
              !isProductConfigured
                ? 'Step 1: Setup Product Required'
                : !f.assignedMasterId
                  ? 'Step 2: Assign Master Required'
                  : isUnderMasterReview
                    ? `Assigned: Under Review by ${f.assignedMasterName}`
                    : `With Master: ${f.assignedMasterName || 'Assigned'}`
            }
          />

          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate shrink-0 max-w-[130px] xs:max-w-[160px] sm:max-w-none">
            {f.fabricType || 'Fabric Lot'}
          </h3>

          {f.color && (
            <span className="text-slate-500 font-medium text-[11px] truncate shrink-0 hidden xs:inline">
              ({f.color})
            </span>
          )}

          {f.lotNo && (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/80 shrink-0">
              #{f.lotNo}
            </span>
          )}

          {isProductConfigured && (
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100 truncate hidden md:inline">
              {f.productName || f.productStructure?.productName}
            </span>
          )}
        </div>

        {/* Right side of Top Row: Status Badge, Deliver Button (desktop), Actions Dropdown, Chevron */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Clean Status Badge - Always matches expanded view */}
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${statusBadge.pillCls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotCls}`} />
            <span className="truncate max-w-[100px] xs:max-w-none">{statusBadge.label}</span>
          </span>

          {/* Desktop-only quick Deliver button */}
          {hasReadyToDeliver && (
            <button
              type="button"
              onClick={() => modalActions?.onOpenDeliver?.(f)}
              className="hidden sm:inline-flex px-2 py-0.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg text-[11px] font-bold items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
              title={`Deliver ${readyPiecesCount} PCs to ${f.supplierName}`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Deliver</span>
              <span className="bg-white/20 px-1 rounded text-[9px] font-black">
                {readyPiecesCount} PCs
              </span>
            </button>
          )}

          {readySetData?.isAwaitingTrimmingDecision && !hasReadyToDeliver && (
            <button
              type="button"
              onClick={() => navigate('/orders/thread_cutting')}
              className="hidden sm:inline-flex px-2 py-0.5 bg-gradient-to-r from-teal-700 to-indigo-700 text-white rounded-lg text-[11px] font-bold items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
              title="Decide whether to trim or deliver directly in Handovers"
            >
              <Scissors className="w-3 h-3" />
              <span>Trimming</span>
            </button>
          )}

          <FabricLotActionsDropdown
            fabric={f}
            isCompact={true}
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

          <button
            type="button"
            onClick={() => toggleCardExpand(f.id)}
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            title="Expand fabric details"
          >
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Bottom Summary Row: Quantities on Left, Smart Action on Right */}
      <div className="flex items-center justify-between gap-1.5 text-xs text-slate-600 pt-0.5">
        <div className="flex items-center gap-1.5 min-w-0 text-[11px] truncate flex-1">
          <span className="font-extrabold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/80 shrink-0">
            {f.plainMeters ? `${f.plainMeters}m` : ''}
            {f.plainMeters && f.printPieces ? ' • ' : ''}
            {f.printPieces ? `${f.printPieces} Sets` : ''}
            {!f.plainMeters && !f.printPieces ? '0m' : ''}
          </span>

          {f.supplierName && (
            <span className="text-slate-500 truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[200px]">
              • {f.supplierName}
            </span>
          )}
        </div>

        {/* Smart Action / Master Custody Badge / Mobile Deliver button */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Mobile-only Deliver button placed neatly on row 2 so row 1 lot name is never crushed! */}
          {hasReadyToDeliver ? (
            <button
              type="button"
              onClick={() => modalActions?.onOpenDeliver?.(f)}
              className="sm:hidden px-2 py-0.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
              title={`Deliver ${readyPiecesCount} PCs to ${f.supplierName}`}
            >
              <Truck className="w-3 h-3" />
              <span>Deliver {readyPiecesCount} PCs</span>
            </button>
          ) : null}

          {/* Master / Setup / Due badges (visible on desktop or when not in ready-to-deliver state on mobile) */}
          <div className={hasReadyToDeliver ? 'hidden sm:flex items-center gap-1' : 'flex items-center gap-1'}>
            {!isProductConfigured ? (
              <button
                type="button"
                onClick={() => {
                  modalActions?.onOpenStructure?.(f);
                }}
                className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                title="Step 1: Set up garment product structure & stitching rates"
              >
                <Scissors className="w-2.5 h-2.5" />
                <span>Setup Product</span>
              </button>
            ) : !f.assignedMasterId ? (
              <button
                type="button"
                onClick={() => {
                  modalActions?.onOpenAssignMaster?.(f);
                }}
                className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                title="Step 2: Assign fabric lot to a Cutting Master"
              >
                <UserCheck className="w-2.5 h-2.5" />
                <span>Assign Master</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isUnderMasterReview && !isMasterAccepted) {
                      modalActions?.onOpenAssignMaster?.(f);
                    }
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors ${isUnderMasterReview && !isMasterAccepted
                    ? 'cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                    : 'cursor-default bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  title={
                    isUnderMasterReview && !isMasterAccepted
                      ? `Awaiting acceptance from Master ${f.assignedMasterName}. Click to change.`
                      : `Fabric is with Master ${f.assignedMasterName} (Accepted).`
                  }
                >
                  {isUnderMasterReview ? (
                    <Clock className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  )}
                  <span className="truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[120px]">{f.assignedMasterName}</span>
                  {isUnderMasterReview && (
                    <span className="text-[9px] font-black text-amber-700 bg-amber-100/90 px-1 rounded">
                      Review
                    </span>
                  )}
                </button>

                {dueStatus?.isWarning && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${dueStatus.className}`}
                    title={`Cutting due date: ${f.dueDate}`}
                  >
                    {dueStatus.label}
                  </span>
                )}

                {(() => {
                  const masterObj = masters.find((m) => m.id === f.assignedMasterId);
                  const phoneDigits = (masterObj?.phone || '').replace(/\D/g, '');
                  if (!phoneDigits) return null;
                  const lotTitle = `${f.fabricType || 'Fabric'}${f.color ? ` (${f.color})` : ''}`;
                  const waUrl = `https://wa.me/91${phoneDigits}?text=${encodeURIComponent(
                    `Namaste ${f.assignedMasterName}, fabric lot "${lotTitle}" is assigned to you.`
                  )}`;
                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-2xs"
                      title="Ping Master on WhatsApp"
                    >
                      <Share2 className="w-2.5 h-2.5" />
                    </a>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : (
    /* --- EXPANDED FULL CARD HEADER --- */
    <div className="flex items-start justify-between gap-2 sm:gap-3 border-b border-slate-100 pb-2.5 sm:pb-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <h3 className="text-sm sm:text-lg font-black text-slate-900 leading-tight truncate">
            {f.fabricType || 'Fabric Lot'}
            {f.color && (
              <span className="font-semibold text-slate-500 text-xs sm:text-base ml-1.5">
                ({f.color})
              </span>
            )}
          </h3>

          {f.lotNo && (
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md border border-slate-200">
              #{f.lotNo}
            </span>
          )}
        </div>

        {/* Supplier & Received Date - Mobile Friendly with nowrap on date */}
        <div className="flex items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 flex-wrap">
          <span className="inline-flex items-center gap-1 font-medium truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Supplier: <strong className="font-semibold text-slate-700 truncate">{f.supplierName || 'Unknown'}</strong></span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Received: <strong className="font-semibold text-slate-700 whitespace-nowrap">{f.date || 'Today'}</strong></span>
          </span>
        </div>
      </div>

      {/* Top Right: Status Pill, WhatsApp Share & Collapse Chevron */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <span
          className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border flex items-center gap-1 sm:gap-1.5 shadow-2xs ${statusBadge.pillCls}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotCls}`} />
          <span>{statusBadge.label}</span>
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNotifyAdminWhatsApp(f);
          }}
          className="p-1 sm:p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg sm:rounded-xl transition-colors cursor-pointer shrink-0"
          title="Share Full Activity Report on WhatsApp"
        >
          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <button
          type="button"
          onClick={() => toggleCardExpand(f.id)}
          className="p-1 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg sm:rounded-xl transition-colors cursor-pointer shrink-0"
          title="Collapse fabric card"
        >
          <ChevronDown className="w-4 h-4 rotate-180" />
        </button>
      </div>
    </div>
  );
}
