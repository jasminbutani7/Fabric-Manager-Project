import React from 'react';
import {
  Truck,
  FileText,
  Eye,
  Plus,
  Scissors,
  MoreVertical,
  ChevronDown,
  UserCheck,
  Share2,
  Edit2,
  RotateCcw,
  Archive,
  Trash2,
} from 'lucide-react';

/**
 * Deliver button representing state transitions:
 * - All Delivered (full completion)
 * - Deliver To Supplier (when all goods/sets are ready)
 * - Trimming Decision / In Trimming
 * - Partial Delivered
 * - Pending disabled button
 */
export function FabricLotDeliverButton({
  fabric: f,
  isCompact = false,
  isLotFullyCompletedAndDelivered,
  isAllWorkDoneAndDelivered,
  isAllWorkDone,
  readySetData,
  readyPiecesCount,
  totalVerifiedPieces,
  lotDeliveredPieces,
  deliveredPercent,
  linkedInvoice,
  deliveryDisabledReason,
  missingSubParts = [],
  completedPercent,
  onOpenDeliver,
  onOpenInvoice,
  onViewInvoice,
  navigate,
}) {
  // 1. Fully completed and all sets delivered
  if (isLotFullyCompletedAndDelivered || isAllWorkDoneAndDelivered) {
    return (
      <div className="flex items-center gap-2 w-full flex-wrap sm:flex-nowrap">
        {/* Deliver / Delivered Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDeliver?.();
          }}
          className={`${isCompact
            ? 'px-2.5 py-1.5 text-xs font-bold'
            : 'flex-1 py-2.5 px-3.5 text-xs font-bold'
            } bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-2xs shrink-0 cursor-pointer`}
          title="All goods completed & delivered to supplier."
        >
          <Truck className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-600 shrink-0`} />
          <span className="truncate font-black">All Delivered</span>
          <span className="text-[10px] bg-emerald-200/70 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full shrink-0">
            {lotDeliveredPieces > 0 ? `${lotDeliveredPieces} PCs` : '100%'}
          </span>
        </button>

        {/* Separate Invoice Button: Add Invoice if not created, View Invoice if already created */}
        {linkedInvoice ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewInvoice?.(linkedInvoice);
            }}
            className={`${isCompact
              ? 'px-2.5 py-1.5 text-xs font-bold'
              : 'flex-1 py-2.5 px-3.5 text-xs font-bold'
              } bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl border border-teal-200 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-2xs shrink-0 cursor-pointer`}
            title="Invoice created. Click to view invoice details."
          >
            <Eye className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-teal-600 shrink-0`} />
            <span className="truncate font-black">
              View Invoice (#{linkedInvoice.invoiceNumber || 'INV'})
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenInvoice?.();
            }}
            className={`${isCompact
              ? 'px-2.5 py-1.5 text-xs font-bold'
              : 'flex-1 py-2.5 px-3.5 text-xs font-black'
              } bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-[0.98]`}
            title="All steps completed & all sets delivered. Click to add invoice."
          >
            <FileText className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`} />
            <span className="truncate font-black">Add Invoice</span>
            <span className="text-[10px] bg-white/25 text-white font-black px-1.5 py-0.2 rounded-full shrink-0 flex items-center gap-0.5">
              <Plus className="w-2.5 h-2.5 inline" /> Create
            </span>
          </button>
        )}
      </div>
    );
  }

  // Only enable Deliver To Supplier when ALL sets or all work is 100% completed
  if (isAllWorkDone) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDeliver?.();
        }}
        className={`${isCompact
          ? 'px-3 py-1.5 text-xs font-bold'
          : 'w-full py-2.5 px-3.5 text-xs font-black'
          } bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-[0.98] text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer`}
        title={`Click to deliver ${readyPiecesCount} PCs to ${f.supplierName}`}
      >
        <Truck className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`} />
        <span className="truncate font-black">Deliver To Supplier</span>
        <span className="text-[10px] bg-white/25 text-white font-black px-1.5 py-0.2 rounded-full shrink-0">
          {readyPiecesCount} PCs Ready
        </span>
      </button>
    );
  }

  if (readySetData?.isAwaitingTrimmingDecision) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigate?.('/orders/thread_cutting');
        }}
        className={`${isCompact
          ? 'px-2.5 py-1.5 text-xs font-bold'
          : 'w-full py-2.5 px-3.5 text-xs font-black'
          } bg-gradient-to-r from-teal-700 to-indigo-700 hover:from-teal-800 hover:to-indigo-800 active:scale-[0.98] text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer`}
        title="View handovers to assign thread cutting or skip to delivery"
      >
        <Scissors className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`} />
        <span className="truncate font-black">Trimming Decision</span>
        <span className="text-[10px] bg-white/25 text-white font-black px-1.5 py-0.2 rounded-full shrink-0">
          {totalVerifiedPieces} PCs Ready
        </span>
      </button>
    );
  }

  if (readySetData?.isTrimmingInProgress) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigate?.('/orders/thread_cutting');
        }}
        className={`${isCompact
          ? 'px-2.5 py-1.5 text-xs font-bold'
          : 'w-full py-2.5 px-3.5 text-xs font-black'
          } bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 active:scale-[0.98] rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer`}
        title="Thread trimming is in progress. Click to view trimming jobs in Orders."
      >
        <Scissors className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-teal-600 shrink-0`} />
        <span className="truncate font-black">In Trimming</span>
        <span className="text-[10px] bg-teal-200/80 text-teal-900 font-extrabold px-1.5 py-0.2 rounded-full shrink-0">
          Progress
        </span>
      </button>
    );
  }

  if (lotDeliveredPieces > 0 && readyPiecesCount <= 0) {
    return (
      <div className="flex items-center gap-2 w-full flex-wrap sm:flex-nowrap">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDeliver?.();
          }}
          className={`${isCompact
            ? 'px-2.5 py-1.5 text-xs font-bold'
            : 'flex-1 py-2.5 px-3.5 text-xs font-bold'
            } bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl border border-indigo-200 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-2xs shrink-0 cursor-pointer`}
          title="Partial batch delivered. Production in progress for remaining pieces."
        >
          <Truck className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-indigo-600 shrink-0`} />
          <span className="truncate font-black">Delivered</span>
          <span className="text-[10px] bg-indigo-200/70 text-indigo-900 font-extrabold px-1.5 py-0.2 rounded-full shrink-0">
            {lotDeliveredPieces} PCs ({deliveredPercent}%)
          </span>
        </button>

        {linkedInvoice ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewInvoice?.(linkedInvoice);
            }}
            className={`${isCompact
              ? 'px-2.5 py-1.5 text-xs font-bold'
              : 'flex-1 py-2.5 px-3.5 text-xs font-bold'
              } bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl border border-teal-200 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-2xs shrink-0 cursor-pointer`}
            title="Invoice created. Click to view invoice details."
          >
            <Eye className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-teal-600 shrink-0`} />
            <span className="truncate font-black">
              View Invoice (#{linkedInvoice.invoiceNumber || 'INV'})
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenInvoice?.();
            }}
            className={`${isCompact
              ? 'px-2.5 py-1.5 text-xs font-bold'
              : 'flex-1 py-2.5 px-3.5 text-xs font-black'
              } bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-[0.98]`}
            title="Add invoice for delivered goods."
          >
            <FileText className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`} />
            <span className="truncate font-black">Add Invoice</span>
            <span className="text-[10px] bg-white/25 text-white font-black px-1.5 py-0.2 rounded-full shrink-0 flex items-center gap-0.5">
              <Plus className="w-2.5 h-2.5 inline" /> Create
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled
      onClick={(e) => e.stopPropagation()}
      title={deliveryDisabledReason || "Deliver to Supplier will be enabled once all sets & work are 100% completed."}
      className={`${isCompact
        ? 'px-2.5 py-1.5 text-xs font-bold'
        : 'w-full py-2.5 px-3.5 text-xs font-bold'
        } bg-slate-100 text-slate-400 border border-slate-200/80 rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5 select-none shrink-0`}
    >
      <Truck className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-slate-300 shrink-0`} />
      <span className="truncate">Deliver<span className="hidden sm:inline"> To Supplier</span></span>
      <span className="text-[10px] bg-slate-200 text-slate-500 font-semibold px-1.5 py-0.2 rounded-full shrink-0">
        {missingSubParts.length > 0
          ? `Needs ${missingSubParts[0]}`
          : completedPercent < 100
            ? `${completedPercent}% Done`
            : readyPiecesCount > 0
              ? `${readyPiecesCount} Ready`
              : 'Work Pending'}
      </span>
    </button>
  );
}

/**
 * Dropdown Menu for Lot-level actions:
 * - Setup / Edit Product Design
 * - Assign Master
 * - Fabric Cutting
 * - Create Invoice
 * - Assign Thread Cutting
 * - Notify on WhatsApp
 * - Edit Fabric Details
 * - Archive / Restore
 * - Delete
 */
export function FabricLotActionsDropdown({
  fabric: f,
  isUpward = false,
  isCompact = false,
  openDropdownId,
  setOpenDropdownId,
  isProductConfigured,
  isMasterAccepted,
  isCuttingDone,
  hasInvoice,
  isTrimmingActionAvailable,
  piecesAwaitingTrimming = 0,
  isLotFullyCompletedAndDelivered = false,
  isAllWorkDoneAndDelivered = false,
  onOpenStructure,
  onOpenAssignMaster,
  onOpenCut,
  onOpenInvoice,
  onOpenAssignThreadCutting,
  onNotifyAdminWhatsApp,
  onOpenEdit,
  onOpenArchiveLot,
  onDeleteFabric,
}) {
  const isOpen = openDropdownId === f.id;
  const isLotFullyDone = Boolean(
    f.isArchived ||
    isLotFullyCompletedAndDelivered ||
    isAllWorkDoneAndDelivered ||
    f.status === 'Completed' ||
    f.status === 'Delivered' ||
    f.status === 'all_delivered' ||
    f.deliveredStatus === 'Delivered' ||
    f.isDelivered
  );

  return (
    <div className="relative shrink-0" data-dropdown-container onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpenDropdownId(isOpen ? null : f.id)}
        className={`${isCompact ? 'p-1.5 rounded-lg' : 'py-2.5 px-3 rounded-xl text-xs'
          } border font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${isOpen
            ? 'border-slate-900 shadow-sm'
            : ' hover:bg-slate-200 text-slate-700 border-slate-200/90 shadow-2xs'
          }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Actions for this Fabric Lot"
      >
        {isCompact ? (
          <MoreVertical className="w-3.5 h-3.5 text-slate-600" />
        ) : (
          <>
            <span>Actions</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 ${isUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            } w-60 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-30 animate-in fade-in zoom-in-95`}
        >
          {/* 1. Setup / Edit Product Design (Hide edit when master is assigned in Step 2) */}
          {(!isProductConfigured || (!f.assignedMasterId && !f.assigned_master_id)) && (
            <button
              type="button"
              onClick={() => {
                setOpenDropdownId(null);
                onOpenStructure?.();
              }}
              className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${!isProductConfigured
                ? 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <Scissors
                  className={`w-3.5 h-3.5 ${!isProductConfigured ? 'text-amber-600' : 'text-indigo-600'}`}
                />
                <span>{isProductConfigured ? 'Edit Product Design' : 'Setup Product Design'}</span>
              </div>
              {!isProductConfigured && (
                <span className="text-[9px] font-black text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded">
                  Required
                </span>
              )}
            </button>
          )}

          {/* 2. Assign / Change Cutting Master (Only show when product design is configured) */}
          {isProductConfigured && (!f.assignedMasterId || !isMasterAccepted) && (
            <button
              type="button"
              onClick={() => {
                setOpenDropdownId(null);
                onOpenAssignMaster?.();
              }}
              className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${!f.assignedMasterId
                ? 'bg-purple-50 text-purple-900 hover:bg-purple-100'
                : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>{f.assignedMasterName ? 'Change Master' : 'Assign Master'}</span>
              </div>
              {!f.assignedMasterId && (
                <span className="text-[9px] font-black text-purple-800 bg-purple-200 px-1.5 py-0.5 rounded">
                  Next Step
                </span>
              )}
            </button>
          )}

          {/* Divider between setup/assign and production actions */}
          {((!isProductConfigured || (!f.assignedMasterId && !f.assigned_master_id)) || (isProductConfigured && (!f.assignedMasterId || !isMasterAccepted))) && (!isCuttingDone || !hasInvoice || isTrimmingActionAvailable) && (
            <div className="my-1 border-t border-slate-100" />
          )}

          {/* 3. Record Cutting (Hide when cutting is 100% complete) */}
          {!isCuttingDone && (
            !isProductConfigured ? (
              <div
                className="px-3 py-2 text-xs font-semibold text-slate-400 flex items-center justify-between cursor-not-allowed bg-slate-50/50"
                title="Setup product design first"
              >
                <div className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-slate-300" />
                  <span>Fabric Cutting</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  Need Design
                </span>
              </div>
            ) : !f.assignedMasterId ? (
              <div
                className="px-3 py-2 text-xs font-semibold text-slate-400 flex items-center justify-between cursor-not-allowed bg-slate-50/50"
                title="Assign a cutting master first"
              >
                <div className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-slate-300" />
                  <span>Fabric Cutting</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  Need Master
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpenDropdownId(null);
                  onOpenCut?.();
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-purple-600" />
                <span>Fabric Cutting</span>
              </button>
            )
          )}

          {/* 4. Create Invoice (Hide when invoice is already created) */}
          {!hasInvoice && (
            <button
              type="button"
              onClick={() => {
                setOpenDropdownId(null);
                onOpenInvoice?.();
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Create Invoice</span>
            </button>
          )}

          {/* 5. Assign Thread Cutting (Hide when step 4 is 100% done or has 0 pcs awaiting trimming) */}
          {isTrimmingActionAvailable && (
            <button
              type="button"
              onClick={() => {
                setOpenDropdownId(null);
                onOpenAssignThreadCutting?.();
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5 text-teal-600" />
                <span>Assign Thread Cutting</span>
              </div>
              {piecesAwaitingTrimming > 0 && (
                <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                  {piecesAwaitingTrimming} Ready
                </span>
              )}
            </button>
          )}

          {/* 6. Notify on Admin WhatsApp */}
          <button
            type="button"
            onClick={() => {
              setOpenDropdownId(null);
              onNotifyAdminWhatsApp?.();
            }}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-between transition-colors cursor-pointer"
            title="Share complete lot activity details on WhatsApp"
          >
            <div className="flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Notify on Admin WhatsApp</span>
            </div>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              WhatsApp
            </span>
          </button>

          <div className="my-1 border-t border-slate-100" />

          {/* 7. Edit Fabric Details */}
          <button
            type="button"
            onClick={() => {
              setOpenDropdownId(null);
              onOpenEdit?.();
            }}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Fabric Details</span>
          </button>

          {/* 8. Archive / Restore Fabric Lot (Only available when all work is done/delivered or archived) */}
          {isLotFullyDone && (
            <button
              type="button"
              onClick={() => {
                setOpenDropdownId(null);
                onOpenArchiveLot?.(f, !f.isArchived);
              }}
              className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${f.isArchived
                ? 'text-emerald-700 hover:bg-emerald-50'
                : 'text-amber-700 hover:bg-amber-50'
                }`}
            >
              {f.isArchived ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Restore Lot</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5 text-amber-600" />
                  <span>Archive Lot</span>
                </>
              )}
            </button>
          )}

          {/* 9. Delete Fabric Lot */}
          <button
            type="button"
            onClick={() => {
              setOpenDropdownId(null);
              onDeleteFabric?.();
            }}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Delete Fabric Lot</span>
          </button>
        </div>
      )}
    </div>
  );
}
