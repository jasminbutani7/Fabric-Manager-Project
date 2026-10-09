import React, { useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import {
  Scissors,
  Plus,
  Search,
  Layers,
  UserCheck,
  ChevronDown,
  X,
  Truck,
  Archive,
  PackageCheck,
  ArrowRight,
} from 'lucide-react';
import { useFabrics, useProduction, useFinance } from '../context/useManagement';
import { useOrdersMetricsAndGrouping } from '../hooks/useOrdersMetricsAndGrouping';
import FabricCutsTab from '../components/orders/FabricCutsTab';
import StitchingTab from '../components/orders/StitchingTab';
import HandoversTab from '../components/orders/HandoversTab';
import TrimmingTab from '../components/orders/TrimmingTab';
import DeliveryTab from '../components/orders/DeliveryTab';
import RecordCuttingModal from '../components/modals/RecordCuttingModal';
import OrdersModalsContainer from '../components/orders/OrdersModalsContainer';
import OrdersKpiBanner from '../components/orders/OrdersKpiBanner';

const VALID_ORDER_TABS = ['cuttings', 'assignments', 'handovers', 'thread_cutting', 'delivery'];

export default function Orders() {
  const { tab: pathTab } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawTab = pathTab || searchParams.get('tab');
  const normalizedTab =
    rawTab === 'tailors'
      ? 'assignments'
      : rawTab === 'thread-cutting'
        ? 'thread_cutting'
        : rawTab === 'batches'
          ? 'cuttings'
          : (rawTab === 'deliveries' || rawTab === 'delivery')
            ? 'delivery'
            : rawTab;

  const {
    fabrics = [],
    cuttings = [],
    getProductStructure,
    getCuttingBalance,
    getFabricBalance,
    deleteCutting,
  } = useFabrics();

  const {
    tailorAssignments = [],
    masterHandovers = [],
    threadCuttingAssignments = [],
    deliveryLogs = [],
    updateAssignmentStatus,
    acceptTailorAssignment,
    deleteAssignment,
    deleteDailyTailorSubmission,
    verifyMasterHandover,
    rejectMasterHandover,
    deleteMasterHandover,
    setFabricThreadCuttingDecision,
    updateThreadCuttingProgress,
    deleteThreadCuttingAssignment,
    linkThreadCuttingExpense,
    getThreadCuttingStats,
    fetchCompletedCuttingsPaginated,
  } = useProduction();

  const {
    invoices = [],
    addExpense,
  } = useFinance();

  // Active view tab: 'cuttings' | 'assignments' | 'handovers' | 'thread_cutting' | 'delivery'
  const [internalTab, setInternalTab] = useState('cuttings');
  const activeTab = normalizedTab && VALID_ORDER_TABS.includes(normalizedTab)
    ? normalizedTab
    : internalTab;

  // Thread Trimming Decision state
  const [trimmingDecisionFabric, setTrimmingDecisionFabric] = useState(null);
  const [trimmingDecisionVerifiedCount, _setTrimmingDecisionVerifiedCount] = useState(0);
  const [trimmingDecisionCuttingId, _setTrimmingDecisionCuttingId] = useState(null);
  const [trimmingDecisionHandoverId, _setTrimmingDecisionHandoverId] = useState(null);

  const setActiveTab = (tab) => {
    setInternalTab(tab);
    navigate(`/orders/${tab}`);
  };

  // Modals state
  const [showRecordCutModal, setShowRecordCutModal] = useState(false);
  const [editingCutting, setEditingCutting] = useState(null);
  const [showAssignTailorModal, setShowAssignTailorModal] = useState(false);
  const [selectedCuttingForAssign, setSelectedCuttingForAssign] = useState(null);
  const [selectedAssignmentForDailyLog, setSelectedAssignmentForDailyLog] = useState(null);
  const [assignmentToAccept, setAssignmentToAccept] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // Thread Cutting modals & states
  const [showAssignThreadCuttingModal, setShowAssignThreadCuttingModal] = useState(() =>
    Boolean(searchParams.get('cuttingId') || searchParams.get('fabricId'))
  );
  const [selectedCuttingForThreadCutting, setSelectedCuttingForThreadCutting] = useState(
    () => searchParams.get('cuttingId') || searchParams.get('fabricId') || null
  );
  const [selectedHandoverForThreadCutting, setSelectedHandoverForThreadCutting] = useState(null);
  const [selectedSubPartForThreadCutting, setSelectedSubPartForThreadCutting] = useState(
    () => searchParams.get('subPart') || null
  );
  const [selectedQuantityForThreadCutting, setSelectedQuantityForThreadCutting] = useState(() => {
    const qty = searchParams.get('quantity');
    return qty ? parseInt(qty, 10) || null : null;
  });
  const [selectedSubPartQuantitiesForThreadCutting, setSelectedSubPartQuantitiesForThreadCutting] = useState(() => {
    const spq = searchParams.get('subPartQuantities');
    if (spq) {
      try {
        return JSON.parse(spq);
      } catch {}
    }
    return null;
  });
  const [threadCuttingFilter, setThreadCuttingFilter] = useState('all'); // 'all' | 'In Progress' | 'Completed' | 'external' | 'internal'
  const [deleteThreadJobConfirm, setDeleteThreadJobConfirm] = useState(null);
  const [progressModalJob, setProgressModalJob] = useState(null);
  const [progressModalPSC, setProgressModalPSC] = useState('');
  const [recordedExpenseSuccess, setRecordedExpenseSuccess] = useState(null);

  // Card expand/collapse state: Set of card IDs that are expanded (collapsed by default)
  // Declared before search effect to avoid TDZ / immutability lint warnings
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [handoverStatusFilter, setHandoverStatusFilter] = useState('all'); // 'all' | 'Pending Verification' | 'Verified' | 'Rejected'
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('all'); // 'all' | 'Pending' | 'Paid'

  React.useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      const q = searchParam.toLowerCase();
      const matchingIds = masterHandovers
        .filter((h) => {
          const linkedFabric = fabrics.find((f) => f.id === h.fabricId);
          return (
            (h.fabricName && h.fabricName.toLowerCase().includes(q)) ||
            (h.productName && h.productName.toLowerCase().includes(q)) ||
            (h.masterName && h.masterName.toLowerCase().includes(q)) ||
            (h.notes && h.notes.toLowerCase().includes(q)) ||
            (h.fabricId && h.fabricId.toLowerCase().includes(q)) ||
            (linkedFabric?.lotNo && String(linkedFabric.lotNo).includes(q)) ||
            (linkedFabric?.lotNumber && String(linkedFabric.lotNumber).includes(q)) ||
            (linkedFabric?.fabricType && linkedFabric.fabricType.toLowerCase().includes(q)) ||
            (linkedFabric?.productName && linkedFabric.productName.toLowerCase().includes(q))
          );
        })
        .map((h) => h.id);
      if (matchingIds.length > 0) {
        const timer = setTimeout(() => {
          setExpandedCardIds(new Set(matchingIds));
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams, masterHandovers, fabrics]);

  // Delete & Reject confirmations
  const [deleteCuttingConfirm, setDeleteCuttingConfirm] = useState(null);
  const [deleteAssignConfirm, setDeleteAssignConfirm] = useState(null);
  const [rejectHandoverModal, setRejectHandoverModal] = useState(null);
  const [rejectHandoverReason, setRejectHandoverReason] = useState('');
  const [verifyingHandoverId, setVerifyingHandoverId] = useState(null);
  const [deleteHandoverConfirm, setDeleteHandoverConfirm] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // View Grouping Mode: 'lot' (default, lot-wise grouped) | 'all' (flat list)
  const [groupingMode, setGroupingMode] = useState('lot');
  const [collapsedLots, setCollapsedLots] = useState(new Set());

  const toggleLotCollapse = (lotKey) => {
    setCollapsedLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotKey)) {
        next.delete(lotKey);
      } else {
        next.add(lotKey);
      }
      return next;
    });
  };

  const toggleCardExpand = (cardId) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleExpandAll = (ids) => {
    setExpandedCardIds(new Set(ids));
  };

  const handleCollapseAll = () => {
    setExpandedCardIds(new Set());
  };

  const {
    activeCuttings,
    archivedCuttings,
    activeAssignments,
    archivedAssignments,
    activeMasterHandovers,
    archivedMasterHandovers,
    activeThreadAssignments,
    archivedThreadAssignments,
    todayCompletedPieces,
    totalPiecesCut,
    activeInStitching,
    completedAssignments,
    filteredCuttings,
    groupedCuttings,
    filteredAssignments,
    groupedAssignments,
    pendingHandovers,
    verifiedHandovers,
    verifiedHandoverPieces,
    pendingBreakdownSummary,
    verifiedBreakdownSummary,
    filteredHandovers,
    groupedHandovers,
    globalThreadStats,
    totalSkippedPSC,
    totalAdminReceivedPSC,
    filteredSkippedBatches,
    filteredVerifiedHandovers,
    groupedVerifiedHandovers,
    filteredThreadJobs,
    groupedThreadJobs,
    deliveryLotsStats,
    deliverySuppliersList,
    filteredDeliveryLogs,
    groupedDeliveryLogs,
    allDeliveryLogs,
    activeDeliveryLogs,
    archivedDeliveryLogs,
    allSkippedRecords,
    verifiedHandoversList,
    archivedCountForActiveTab,
    currentTabLotKeys,
    isAllLotsCollapsed,
  } = useOrdersMetricsAndGrouping({
    fabrics,
    cuttings,
    tailorAssignments,
    masterHandovers,
    threadCuttingAssignments,
    deliveryLogs,
    invoices,
    getProductStructure,
    getThreadCuttingStats,
    groupingMode,
    statusFilter,
    handoverStatusFilter,
    deliveryStatusFilter,
    threadCuttingFilter,
    searchQuery,
    today,
    activeTab,
    collapsedLots,
  });



  return (
    <div className="space-y-4 pb-8">
      {/* Top Banner & Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Production</span>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
              Live Floor
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Master piece cutting, stitching lines, trimming & dispatches
          </p>
        </div>

        {/* Action button based on active tab */}
        {activeTab === 'cuttings' ? (
          <button
            onClick={() => {
              setEditingCutting(null);
              setShowRecordCutModal(true);
            }}
            className="px-3.5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 active:scale-95 shadow-md shadow-purple-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Record Cut</span>
            <span className="sm:hidden">Cut</span>
          </button>
        ) : activeTab === 'assignments' ? (
          <button
            onClick={() => {
              setSelectedCuttingForAssign(null);
              setShowAssignTailorModal(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Assign Tailor</span>
            <span className="sm:hidden">Assign</span>
          </button>
        ) : activeTab === 'thread_cutting' ? (
          <button
            onClick={() => {
              setSelectedCuttingForThreadCutting(null);
              setSelectedHandoverForThreadCutting(null);
              setShowAssignThreadCuttingModal(true);
            }}
            className="px-3.5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 active:scale-95 shadow-md shadow-teal-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Assign Trimming</span>
            <span className="sm:hidden">Trimming</span>
          </button>
        ) : activeTab === 'delivery' ? (
          <button
            onClick={() => navigate('/fabrics')}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:from-emerald-700 hover:to-teal-700 active:scale-95 shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Deliver finished goods from Fabrics floor"
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Deliver from Fabrics</span>
            <span className="sm:hidden">Deliver</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
              title={`Verified Components: ${verifiedBreakdownSummary}`}
            >
              <PackageCheck className="w-4 h-4 text-indigo-600" />
              <span>{verifiedHandoverPieces.toLocaleString('en-IN')} PCs Verified</span>
            </span>
          </div>
        )}
      </div>

      {/* Pending Master Handovers Top Banner */}
      {pendingHandovers.length > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/15 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-left shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                <span>Finished Goods Review</span>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-bold">
                  {pendingHandovers.length} Pending ({pendingBreakdownSummary})
                </span>
              </h3>
              <p className="text-[11px] text-amber-900/80 mt-0.5 truncate">
                Verify physical counts to complete master fabric cuts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('handovers');
              setHandoverStatusFilter('Pending Verification');
            }}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
          >
            <span>Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Production Floor KPIs */}
      <OrdersKpiBanner
        totalPiecesCut={totalPiecesCut}
        cuttings={activeCuttings}
        activeInStitching={activeInStitching}
        completedAssignments={completedAssignments}
        todayCompletedPieces={todayCompletedPieces}
        verifiedHandoverPieces={verifiedHandoverPieces}
        verifiedBreakdownSummary={verifiedBreakdownSummary}
        pendingHandovers={pendingHandovers}
        pendingBreakdownSummary={pendingBreakdownSummary}
        setActiveTab={setActiveTab}
        setStatusFilter={setStatusFilter}
        setHandoverStatusFilter={setHandoverStatusFilter}
      />

      {/* 5-Column Sub-Tabs (Mobile-Friendly Grid - Same styling as Setup) */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 text-center">
        {[
          {
            id: 'cuttings',
            label: 'Fabric Cuts',
            mobileLabel: 'Cuts',
            icon: Scissors,
            count: groupingMode === 'archive' ? archivedCuttings.length : activeCuttings.length,
            color: 'text-purple-700',
            onClick: () => {
              setActiveTab('cuttings');
              setStatusFilter('all');
            },
          },
          {
            id: 'assignments',
            label: 'Tailors',
            icon: UserCheck,
            count: groupingMode === 'archive' ? archivedAssignments.length : activeAssignments.length,
            color: 'text-emerald-700',
            onClick: () => {
              setActiveTab('assignments');
              setStatusFilter('all');
            },
          },
          {
            id: 'handovers',
            label: 'Handovers',
            icon: PackageCheck,
            count: groupingMode === 'archive' ? archivedMasterHandovers.length : (pendingHandovers.length > 0 ? pendingHandovers.length : activeMasterHandovers.length),
            isAlert: groupingMode !== 'archive' && pendingHandovers.length > 0,
            color: 'text-indigo-700',
            onClick: () => {
              setActiveTab('handovers');
              setHandoverStatusFilter('all');
            },
          },
          {
            id: 'thread_cutting',
            label: 'Trimming',
            icon: Scissors,
            count: groupingMode === 'archive' ? archivedThreadAssignments.length : activeThreadAssignments.length,
            color: 'text-teal-700',
            onClick: () => {
              setActiveTab('thread_cutting');
              setThreadCuttingFilter('all');
            },
          },
          {
            id: 'delivery',
            label: 'Delivery',
            icon: Truck,
            count: groupingMode === 'archive' ? archivedDeliveryLogs.length : activeDeliveryLogs.length,
            color: 'text-emerald-700',
            onClick: () => {
              setActiveTab('delivery');
              setDeliveryStatusFilter('all');
            },
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={tab.onClick}
              className={`py-1.5 px-0.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer ${isActive
                ? `bg-white ${tab.color} shadow-xs ring-1 ring-black/5 font-extrabold`
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate">
                {tab.mobileLabel ? (
                  <>
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.mobileLabel}</span>
                  </>
                ) : (
                  tab.label
                )}
              </span>
              {tab.count !== undefined && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full font-bold leading-none shrink-0 ${tab.isAlert
                    ? 'bg-amber-500 text-white animate-pulse'
                    : isActive
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-slate-200/70 text-slate-600'
                    }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Pill Bar */}
      <div className="space-y-2">
        {(() => {
          const currentTabItemIds =
            activeTab === 'cuttings'
              ? filteredCuttings.map((c) => c.id)
              : activeTab === 'assignments'
                ? filteredAssignments.map((a) => a.id)
                : activeTab === 'handovers'
                  ? filteredHandovers.map((h) => h.id)
                  : activeTab === 'delivery'
                    ? filteredDeliveryLogs.map((d) => d.id || d.invoiceNumber)
                    : filteredThreadJobs.map((tc) => tc.id);

          const isAllExpanded =
            currentTabItemIds.length > 0 &&
            currentTabItemIds.every((id) => expandedCardIds.has(id));

          return (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'cuttings'
                      ? 'Search cutting by fabric, master name, remarks...'
                      : activeTab === 'assignments'
                        ? 'Search assignments by tailor, machine, fabric...'
                        : activeTab === 'handovers'
                          ? 'Search handovers by master, fabric, notes...'
                          : activeTab === 'delivery'
                            ? 'Search delivery logs by invoice, supplier, fabric, vehicle, notes...'
                            : 'Search thread cutting jobs by fabric, helper, notes...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.delete('search');
                        return next;
                      });
                    }}
                    className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {currentTabItemIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (isAllExpanded) {
                      handleCollapseAll();
                    } else {
                      handleExpandAll(currentTabItemIds);
                    }
                  }}
                  className="p-2.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 rounded-2xl transition-all shadow-2xs cursor-pointer flex items-center justify-center shrink-0"
                  title={isAllExpanded ? 'Collapse All Cards' : 'Expand All Cards'}
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isAllExpanded ? 'rotate-180 text-purple-600' : 'text-slate-500'
                      }`}
                  />
                </button>
              )}
            </div>
          );
        })()}

        {/* View Mode & Lot Grouping Controls (Fabric-wise Active vs Archive) */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
          <div className="inline-flex items-center p-0.5 bg-slate-200/80 rounded-xl border border-slate-200/90 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setGroupingMode('lot')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${groupingMode === 'lot'
                ? 'bg-white text-purple-700 shadow-xs ring-1 ring-black/5 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Fabric-wise</span>
              {groupingMode === 'lot' && (
                <span className="text-[9px] bg-purple-100 text-purple-800 font-black px-1.5 py-0.2 rounded-full hidden xs:inline">
                  Active
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setGroupingMode('archive')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${groupingMode === 'archive'
                ? 'bg-white text-amber-700 shadow-xs ring-1 ring-black/5 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Archive className="w-3.5 h-3.5 text-amber-600" />
              <span>Archive</span>
              {archivedCountForActiveTab > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                  groupingMode === 'archive' ? 'bg-amber-100 text-amber-800' : 'bg-slate-300 text-slate-700'
                }`}>
                  {archivedCountForActiveTab}
                </span>
              )}
            </button>
          </div>

          {/* Quick Lot Groups Expand / Collapse action (when has groups) */}
          {currentTabLotKeys.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (isAllLotsCollapsed) {
                  setCollapsedLots(new Set());
                } else {
                  setCollapsedLots(new Set(currentTabLotKeys));
                }
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1"
              title={isAllLotsCollapsed ? 'Expand all fabric lots' : 'Collapse all fabric lots'}
            >
              <Layers className="w-3 h-3 text-slate-400" />
              <span>{isAllLotsCollapsed ? 'Expand All Lots' : 'Collapse All Lots'}</span>
              <span className="text-[10px] text-slate-400 font-normal">({currentTabLotKeys.length})</span>
            </button>
          )}
        </div>

        {/* Filter Pills for Tailor Assignments */}
        {activeTab === 'assignments' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {['all', 'Assigned', 'In Stitching', 'Completed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${statusFilter === st
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {st === 'all' ? 'All Assignments' : st}
              </button>
            ))}
          </div>
        )}

        {/* Filter Pills for Master Handovers */}
        {activeTab === 'handovers' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'all', label: `All Handovers (${activeMasterHandovers.length})` },
              { id: 'Pending Verification', label: `Pending (${pendingHandovers.length})` },
              { id: 'Verified', label: `Verified (${verifiedHandovers.length})` },
              {
                id: 'Rejected',
                label: `Rejected (${activeMasterHandovers.filter((h) => h.status === 'Rejected').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setHandoverStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${handoverStatusFilter === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Filter Pills for Thread Cutting */}
        {activeTab === 'thread_cutting' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {(() => {
              const currentThreadAssignments = groupingMode === 'archive' ? archivedThreadAssignments : activeThreadAssignments;
              const allActivityList = [...currentThreadAssignments, ...allSkippedRecords];
              return [
                { id: 'all', label: `All Activity (${allActivityList.length})` },
                {
                  id: 'master',
                  label: `By Master (${allActivityList.filter((r) => r.createdByRole === 'master' || Boolean(r.masterId)).length})`,
                },
                {
                  id: 'admin',
                  label: `By Admin (${allActivityList.filter((r) => r.createdByRole !== 'master' && !r.masterId).length})`,
                },
                {
                  id: 'In Progress',
                  label: `In Progress (${currentThreadAssignments.filter((tc) => tc.status !== 'Completed' && tc.status !== 'Skipped' && tc.actionType !== 'skip').length})`,
                },
                {
                  id: 'Completed',
                  label: `Completed (${currentThreadAssignments.filter((tc) => tc.status === 'Completed').length})`,
                },
                {
                  id: 'skipped',
                  label: `Skipped & Locked (${allSkippedRecords.length})`,
                },
                {
                  id: 'received',
                  label: `Admin Received (${verifiedHandoversList.length})`,
                },
                {
                  id: 'external',
                  label: `External Helpers (${currentThreadAssignments.filter((tc) => tc.helperType === 'external').length})`,
                },
                {
                  id: 'internal',
                  label: `Other Helpers (${currentThreadAssignments.filter((tc) => tc.helperType === 'internal').length})`,
                },
              ];
            })().map((tab) => (
              <button
                key={tab.id}
                onClick={() => setThreadCuttingFilter(tab.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${threadCuttingFilter === tab.id
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Filter Pills for Delivery Logs (Without Payment Dependency) */}
        {activeTab === 'delivery' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setDeliveryStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${deliveryStatusFilter === 'all'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              All Dispatches ({allDeliveryLogs.length})
            </button>
            {deliverySuppliersList.map((sup) => (
              <button
                key={sup}
                onClick={() => setDeliveryStatusFilter(deliveryStatusFilter === sup ? 'all' : sup)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${deliveryStatusFilter === sup
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {sup} ({allDeliveryLogs.filter((d) => d.supplierName === sup).length})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: CUTTING BATCHES VIEW */}
      {activeTab === 'cuttings' && (
        <FabricCutsTab
          filteredCuttings={filteredCuttings}
          groupedCuttings={groupedCuttings}
          groupingMode={groupingMode}
          collapsedLots={collapsedLots}
          toggleLotCollapse={toggleLotCollapse}
          fabrics={fabrics}
          tailorAssignments={tailorAssignments}
          getCuttingBalance={getCuttingBalance}
          getFabricBalance={getFabricBalance}
          searchQuery={searchQuery}
          setSelectedCuttingForAssign={setSelectedCuttingForAssign}
          setShowAssignTailorModal={setShowAssignTailorModal}
          setEditingCutting={setEditingCutting}
          setShowRecordCutModal={setShowRecordCutModal}
          setDeleteCuttingConfirm={setDeleteCuttingConfirm}
          fetchCompletedCuttingsPaginated={fetchCompletedCuttingsPaginated}
        />
      )}

      {/* TAB 2: TAILOR ASSIGNMENTS VIEW */}
      {activeTab === 'assignments' && (
        <StitchingTab
          filteredAssignments={filteredAssignments}
          groupedAssignments={groupedAssignments}
          groupingMode={groupingMode}
          collapsedLots={collapsedLots}
          toggleLotCollapse={toggleLotCollapse}
          cuttings={cuttings}
          fabrics={fabrics}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          expandedCardIds={expandedCardIds}
          toggleCardExpand={toggleCardExpand}
          expandedHistoryId={expandedHistoryId}
          setExpandedHistoryId={setExpandedHistoryId}
          setAssignmentToAccept={setAssignmentToAccept}
          setSelectedAssignmentForDailyLog={setSelectedAssignmentForDailyLog}
          setDeleteAssignConfirm={setDeleteAssignConfirm}
          updateAssignmentStatus={updateAssignmentStatus}
          deleteDailyTailorSubmission={deleteDailyTailorSubmission}
          setShowAssignTailorModal={setShowAssignTailorModal}
          setSelectedCuttingForAssign={setSelectedCuttingForAssign}
          today={today}
        />
      )}

      {/* TAB 3: MASTER FINISHED PIECE HANDOVERS VIEW */}
      {activeTab === 'handovers' && (
        <HandoversTab
          filteredHandovers={filteredHandovers}
          groupedHandovers={groupedHandovers}
          groupingMode={groupingMode}
          collapsedLots={collapsedLots}
          toggleLotCollapse={toggleLotCollapse}
          searchQuery={searchQuery}
          handoverStatusFilter={handoverStatusFilter}
          verifyingHandoverId={verifyingHandoverId}
          setVerifyingHandoverId={setVerifyingHandoverId}
          verifyMasterHandover={verifyMasterHandover}
          setRejectHandoverReason={setRejectHandoverReason}
          setRejectHandoverModal={setRejectHandoverModal}
          setDeleteHandoverConfirm={setDeleteHandoverConfirm}
        />
      )}

      {/* TAB 4: THREAD CUTTING & TRIMMING */}
      {activeTab === 'thread_cutting' && (
        <TrimmingTab
          totalAdminReceivedPSC={totalAdminReceivedPSC}
          totalSkippedPSC={totalSkippedPSC}
          globalThreadStats={globalThreadStats}
          searchQuery={searchQuery}
          recordedExpenseSuccess={recordedExpenseSuccess}
          setRecordedExpenseSuccess={setRecordedExpenseSuccess}
          threadCuttingFilter={threadCuttingFilter}
          filteredSkippedBatches={filteredSkippedBatches}
          filteredVerifiedHandovers={filteredVerifiedHandovers}
          filteredThreadJobs={filteredThreadJobs}
          groupedVerifiedHandovers={groupedVerifiedHandovers}
          groupedThreadJobs={groupedThreadJobs}
          groupingMode={groupingMode}
          collapsedLots={collapsedLots}
          toggleLotCollapse={toggleLotCollapse}
          fabrics={fabrics}
          today={today}
          setSelectedCuttingForThreadCutting={setSelectedCuttingForThreadCutting}
          setSelectedHandoverForThreadCutting={setSelectedHandoverForThreadCutting}
          setShowAssignThreadCuttingModal={setShowAssignThreadCuttingModal}
          setFabricThreadCuttingDecision={setFabricThreadCuttingDecision}
          setProgressModalJob={setProgressModalJob}
          setProgressModalPSC={setProgressModalPSC}
          updateThreadCuttingProgress={updateThreadCuttingProgress}
          addExpense={addExpense}
          linkThreadCuttingExpense={linkThreadCuttingExpense}
          setDeleteThreadJobConfirm={setDeleteThreadJobConfirm}
          navigate={navigate}
        />
      )}

      {/* TAB 5: DELIVERY LOGS */}
      {activeTab === 'delivery' && (
        <DeliveryTab
          deliveryLotsStats={deliveryLotsStats}
          filteredDeliveryLogs={filteredDeliveryLogs}
          groupedDeliveryLogs={groupedDeliveryLogs}
          groupingMode={groupingMode}
          collapsedLots={collapsedLots}
          toggleLotCollapse={toggleLotCollapse}
          searchQuery={searchQuery}
          deliveryStatusFilter={deliveryStatusFilter}
          navigate={navigate}
        />
      )}

      {/* Record Cutting Modal */}
      <RecordCuttingModal
        key={showRecordCutModal ? `order-cut-${editingCutting?.id || 'new'}` : 'order-cut-closed'}
        isOpen={showRecordCutModal}
        cuttingToEdit={editingCutting}
        onClose={() => {
          setShowRecordCutModal(false);
          setEditingCutting(null);
        }}
        onSuccess={() => {
          // Switch to cutting tab to view the batch
          setActiveTab('cuttings');
        }}
      />

      {/* All Orders Modals & Dialogs */}
      <OrdersModalsContainer
        showAssignTailorModal={showAssignTailorModal}
        setShowAssignTailorModal={setShowAssignTailorModal}
        selectedCuttingForAssign={selectedCuttingForAssign}
        setSelectedCuttingForAssign={setSelectedCuttingForAssign}
        setActiveTab={setActiveTab}
        selectedAssignmentForDailyLog={selectedAssignmentForDailyLog}
        setSelectedAssignmentForDailyLog={setSelectedAssignmentForDailyLog}
        tailorAssignments={tailorAssignments}
        deleteCuttingConfirm={deleteCuttingConfirm}
        setDeleteCuttingConfirm={setDeleteCuttingConfirm}
        deleteCutting={deleteCutting}
        deleteAssignConfirm={deleteAssignConfirm}
        setDeleteAssignConfirm={setDeleteAssignConfirm}
        deleteAssignment={deleteAssignment}
        rejectHandoverModal={rejectHandoverModal}
        setRejectHandoverModal={setRejectHandoverModal}
        rejectHandoverReason={rejectHandoverReason}
        setRejectHandoverReason={setRejectHandoverReason}
        rejectMasterHandover={rejectMasterHandover}
        deleteHandoverConfirm={deleteHandoverConfirm}
        setDeleteHandoverConfirm={setDeleteHandoverConfirm}
        deleteMasterHandover={deleteMasterHandover}
        showAssignThreadCuttingModal={showAssignThreadCuttingModal}
        setShowAssignThreadCuttingModal={setShowAssignThreadCuttingModal}
        selectedCuttingForThreadCutting={selectedCuttingForThreadCutting}
        setSelectedCuttingForThreadCutting={setSelectedCuttingForThreadCutting}
        selectedHandoverForThreadCutting={selectedHandoverForThreadCutting}
        setSelectedHandoverForThreadCutting={setSelectedHandoverForThreadCutting}
        selectedSubPartForThreadCutting={selectedSubPartForThreadCutting}
        setSelectedSubPartForThreadCutting={setSelectedSubPartForThreadCutting}
        selectedQuantityForThreadCutting={selectedQuantityForThreadCutting}
        setSelectedQuantityForThreadCutting={setSelectedQuantityForThreadCutting}
        selectedSubPartQuantitiesForThreadCutting={selectedSubPartQuantitiesForThreadCutting}
        setSelectedSubPartQuantitiesForThreadCutting={setSelectedSubPartQuantitiesForThreadCutting}
        progressModalJob={progressModalJob}
        setProgressModalJob={setProgressModalJob}
        progressModalPSC={progressModalPSC}
        setProgressModalPSC={setProgressModalPSC}
        updateThreadCuttingProgress={updateThreadCuttingProgress}
        deleteThreadJobConfirm={deleteThreadJobConfirm}
        setDeleteThreadJobConfirm={setDeleteThreadJobConfirm}
        deleteThreadCuttingAssignment={deleteThreadCuttingAssignment}
        assignmentToAccept={assignmentToAccept}
        setAssignmentToAccept={setAssignmentToAccept}
        acceptTailorAssignment={acceptTailorAssignment}
        trimmingDecisionFabric={trimmingDecisionFabric}
        setTrimmingDecisionFabric={setTrimmingDecisionFabric}
        trimmingDecisionVerifiedCount={trimmingDecisionVerifiedCount}
        trimmingDecisionCuttingId={trimmingDecisionCuttingId}
        trimmingDecisionHandoverId={trimmingDecisionHandoverId}
        setFabricThreadCuttingDecision={setFabricThreadCuttingDecision}
      />
    </div>
  );
}
