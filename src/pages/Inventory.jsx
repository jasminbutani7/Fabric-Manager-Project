import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  Layers,
  Plus,
  Search,
  Ruler,
  Hash,
  IndianRupee,
  Scissors,
  UserCheck,
  Sparkles,
  ChevronDown,
  Archive,
  Package,
  CheckCheck,
} from 'lucide-react';
import { useFabric, useProduction, useFinance } from '../context/useManagement';
import FabricLotCard from '../components/fabric/FabricLotCard';
const AddFabricModal = lazy(() => import('../components/modals/AddFabricModal'));
const AddSupplierModal = lazy(() => import('../components/modals/AddSupplierModal'));
const SetProductStructureModal = lazy(() => import('../components/modals/SetProductStructureModal'));
const AssignFabricMasterModal = lazy(() => import('../components/modals/AssignFabricMasterModal'));
import FabricModalsContainer from '../components/fabric/FabricModalsContainer';
import PaginationControls from '../components/common/PaginationControls';
import { useFabricModals } from '../hooks/useFabricModals';
import {
  calculateReadyProductSets,
  isLotFullyDelivered as checkLotFullyDelivered,
  isEntityArchived,
} from '../utils/productUtils';

export default function Inventory() {
  const { modalActions, modalState } = useFabricModals();
  const {
    fabrics = [],
    cuttings = [],
    fetchArchivedFabricsPaginated,
  } = useFabric();
  const {
    threadCuttingAssignments = [],
    masterHandovers = [],
    tailorAssignments = [],
    deliveryLogs = [],
  } = useProduction();
  const { invoices = [] } = useFinance();
  const navigate = useNavigate();

  const [showAddFabric, setShowAddFabric] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [editingFabric, setEditingFabric] = useState(null);

  // Product Structure Modal State (for newlyAddedFabricPrompt)
  const [showProductStructureModal, setShowProductStructureModal] = useState(false);
  const [selectedFabricForProductStructure, setSelectedFabricForProductStructure] = useState(null);

  // Assign Master Modal State (for newlyAddedFabricPrompt)
  const [showAssignMasterModal, setShowAssignMasterModal] = useState(false);
  const [selectedFabricForMasterAssign, setSelectedFabricForMasterAssign] = useState(null);

  const [newlyAddedFabricPrompt, setNewlyAddedFabricPrompt] = useState(null);

  const { tab: pathTab } = useParams();
  const [searchParams] = useSearchParams();
  const targetLotId = searchParams.get('lotId') || searchParams.get('lot');

  // Card expand/collapse state: Set of fabric IDs that are expanded (collapsed by default, or pre-expanded if navigated to)
  const [expandedCardIds, setExpandedCardIds] = useState(
    () => (targetLotId ? new Set([targetLotId]) : new Set())
  );

  const toggleCardExpand = (fabricId) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(fabricId)) {
        next.delete(fabricId);
      } else {
        next.add(fabricId);
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

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || searchParams.get('q') || ''
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [prevFilterKey, setPrevFilterKey] = useState('');
  const currentFilterKey = `${pathTab || ''}_${searchQuery || ''}`;

  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
  }

  // Smoothly scroll to target lot if requested (e.g. from Home Running Lot)
  useEffect(() => {
    if (targetLotId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`fabric-card-${targetLotId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [targetLotId, currentPage]);

  const normalizeFabricTab = (t) => {
    if (!t) return 'all';
    const lower = t.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
    if (lower === 'archived' || lower === 'archive') return 'archived';
    if (lower === 'stock' || lower === 'in_stock') return 'stock';
    if (lower === 'cutting' || lower === 'in_cutting') return 'cutting';
    if (lower === 'ready' || lower === 'ready_delivery') return 'ready';
    if (lower === 'delivered' || lower === 'done' || lower === 'completed') return 'delivered';
    return 'all';
  };

  const rawTab = pathTab || searchParams.get('status') || searchParams.get('tab');
  const activeTab = normalizeFabricTab(rawTab);

  const setActiveTab = (tab) => {
    navigate(`/fabrics/${tab}`);
  };

  // Separate Active and Archived Fabrics (using unified isEntityArchived)
  const activeFabrics = fabrics.filter((f) => !isEntityArchived(f, fabrics));
  const archivedFabrics = fabrics.filter((f) => isEntityArchived(f, fabrics));

  // Summary Metrics calculations (computed across active fabrics)
  const totalPlainMeters = activeFabrics.reduce(
    (acc, f) => acc + (parseFloat(f.plainMeters) || 0),
    0
  );
  const totalPrintPieces = activeFabrics.reduce(
    (acc, f) => acc + (parseInt(f.printPieces, 10) || 0),
    0
  );
  const totalValuation = activeFabrics.reduce(
    (acc, f) => acc + (parseFloat(f.totalAmount) || 0),
    0
  );

  // Helper to accurately determine if all finished goods of a fabric lot are delivered
  const isLotFullyDelivered = (f) => {
    if (!f) return false;
    if (f.status === 'Delivered' || f.isDelivered) return true;
    return checkLotFullyDelivered(f, {
      cuttings,
      tailorAssignments,
      masterHandovers,
      threadCuttingAssignments,
      invoices,
      deliveryLogs,
    });
  };

  // Pre-calculate sub-tab counts
  const stockCount = activeFabrics.filter((f) => f.status === 'In Stock' && !isLotFullyDelivered(f)).length;
  const cuttingCount = activeFabrics.filter((f) => f.status === 'In Cutting' && !isLotFullyDelivered(f)).length;
  const deliveredCount = activeFabrics.filter((f) => isLotFullyDelivered(f)).length;

  const readyLots = activeFabrics.filter((f) => {
    if (isLotFullyDelivered(f)) return false;
    const { isCompleteProductReady, totalVerifiedPieces } = calculateReadyProductSets(f, {
      cuttings,
      masterHandovers,
      threadCuttingAssignments,
      invoices,
      deliveryLogs,
    });
    return isCompleteProductReady || totalVerifiedPieces > 0;
  });
  const readyCount = readyLots.length;
  const readyLotIdSet = new Set(readyLots.map((l) => l.id));

  // Database-side pagination state for archived tab
  const isArchivedTab = activeTab === 'archived';
  const [dbArchivedData, setDbArchivedData] = useState({
    data: [],
    count: 0,
    totalPages: 1,
    loading: false,
  });

  useEffect(() => {
    let isCancelled = false;
    if (!isArchivedTab || typeof fetchArchivedFabricsPaginated !== 'function') return;

    const loadArchivedData = async () => {
      try {
        setDbArchivedData((prev) => (prev.loading ? prev : { ...prev, loading: true }));
        const res = await fetchArchivedFabricsPaginated({
          page: currentPage,
          pageSize,
          searchQuery,
        });
        if (!isCancelled && res) {
          setDbArchivedData({
            data: res.data || [],
            count: res.count ?? 0,
            totalPages: Math.max(1, res.totalPages || Math.ceil((res.count || 0) / pageSize)),
            loading: false,
          });
        }
      } catch {
        if (!isCancelled) setDbArchivedData((prev) => ({ ...prev, loading: false }));
      }
    };

    loadArchivedData();
    return () => {
      isCancelled = true;
    };
  }, [isArchivedTab, currentPage, pageSize, searchQuery, fetchArchivedFabricsPaginated, fabrics]);

  const archivedCount = isArchivedTab && dbArchivedData.count !== undefined ? dbArchivedData.count : archivedFabrics.length;

  // Filtered list
  const filteredFabrics = fabrics.filter((f) => {
    // If on archived tab, strictly show archived lots
    if (activeTab === 'archived') {
      if (!isEntityArchived(f, fabrics)) return false;
    } else {
      // On all active tabs, strictly hide archived lots
      if (isEntityArchived(f, fabrics)) return false;

      const isDeliveredLot = isLotFullyDelivered(f);
      if (activeTab === 'stock' && (f.status !== 'In Stock' || isDeliveredLot)) return false;
      if (activeTab === 'cutting' && (f.status !== 'In Cutting' || isDeliveredLot)) return false;
      if (activeTab === 'delivered' && !isDeliveredLot) return false;
      if (activeTab === 'ready' && !readyLotIdSet.has(f.id)) return false;
    }

    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      (f.fabricType && f.fabricType.toLowerCase().includes(query)) ||
      (f.productName && f.productName.toLowerCase().includes(query)) ||
      (f.color && f.color.toLowerCase().includes(query)) ||
      (f.supplierName && f.supplierName.toLowerCase().includes(query)) ||
      (f.assignedMasterName && f.assignedMasterName.toLowerCase().includes(query)) ||
      (f.notes && f.notes.toLowerCase().includes(query))
    );
  });

  const uniqueFilteredFabrics = useMemo(() => {
    return Array.from(new Map(filteredFabrics.map((f) => [f.id, f])).values());
  }, [filteredFabrics]);

  const totalPages = Math.max(1, Math.ceil(uniqueFilteredFabrics.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  // Derive target page if requested in searchParams (e.g. from Home Running Lot)
  const [targetLotHandled, setTargetLotHandled] = useState(null);
  if (targetLotId && targetLotHandled !== targetLotId && uniqueFilteredFabrics.length > 0) {
    const targetIndex = uniqueFilteredFabrics.findIndex((f) => f.id === targetLotId);
    if (targetIndex !== -1) {
      const targetPage = Math.floor(targetIndex / pageSize) + 1;
      setTargetLotHandled(targetLotId);
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
  }

  const paginatedFabrics = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return uniqueFilteredFabrics.slice(startIndex, startIndex + pageSize);
  }, [uniqueFilteredFabrics, safePage, pageSize]);

  const displayedFabrics = isArchivedTab ? dbArchivedData.data : paginatedFabrics;
  const displayedTotalItems = isArchivedTab ? dbArchivedData.count : uniqueFilteredFabrics.length;
  const displayedTotalPages = isArchivedTab ? dbArchivedData.totalPages : totalPages;
  const displayedSafePage = isArchivedTab ? Math.min(currentPage, displayedTotalPages) : safePage;
  const displayedLoading = isArchivedTab && dbArchivedData.loading;

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Newly Added Fabric Banner Prompt */}
      {newlyAddedFabricPrompt && (() => {
        const current = fabrics.find((f) => f.id === newlyAddedFabricPrompt.id) || newlyAddedFabricPrompt;
        const isCurrentConfigured = Boolean(
          current?.productStructure?.subParts?.length > 0 &&
          (current?.productName || current?.productStructure?.productName)
        );

        return (
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-indigo-950">
                    New Fabric Batch Received!
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                    {current.date}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  <strong>{current.fabricType || 'Fabric Lot'}</strong>{current.color ? ` (${current.color})` : ''} • {current.plainMeters ? `${current.plainMeters}m Plain ` : ''}{current.printPieces ? `${current.printPieces} Sets` : ''}.
                  {!isCurrentConfigured
                    ? ' Step 1: Set up garment product design & stitching rates before assigning to Master.'
                    : ' Step 2: Product design configured. Ready to assign to a Cutting Master.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {!isCurrentConfigured ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFabricForProductStructure(current);
                    setShowProductStructureModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Setup Product Design</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFabricForMasterAssign(current);
                    setShowAssignMasterModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Assign to Master</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setNewlyAddedFabricPrompt(null)}
                className="text-slate-500 hover:text-slate-800 font-bold p-1 text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })()}

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Fabric Lots</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track rolls, products, masters & status
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setEditingFabric(null);
              setShowAddFabric(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Fabric</span>
          </button>
        </div>
      </div>

      {/* 6 Sub-Tabs Bar including Archive - Mobile-Friendly 6-Column Grid matching Second Image */}
      <div className="grid grid-cols-6 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
        {[
          { id: 'all', label: 'All', icon: Layers, count: activeFabrics.length },
          { id: 'stock', label: 'Stock', icon: Package, count: stockCount },
          { id: 'cutting', label: 'Cutting', icon: Scissors, count: cuttingCount },
          { id: 'ready', label: 'Ready', icon: Sparkles, count: readyCount, highlight: readyCount > 0 },
          { id: 'delivered', label: 'Done', icon: CheckCheck, count: deliveredCount },
          { id: 'archived', label: 'Archive', icon: Archive, count: archivedCount, isArchiveTab: true },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-0.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 relative cursor-pointer ${
                isActive
                  ? 'bg-white text-purple-700 shadow-xs ring-1 ring-black/5 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <div className="relative">
                <Icon className="w-3.5 h-3.5 shrink-0" />
              </div>
              <span className="text-[10px] sm:text-xs truncate font-bold">{tab.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold leading-none shrink-0 ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 font-extrabold'
                    : tab.highlight
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Plain Fabric
            </span>
            <Ruler className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <p className="text-sm sm:text-base font-extrabold text-slate-900 leading-none">
            {totalPlainMeters.toLocaleString('en-IN')}
          </p>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5">Meters</p>
        </div>

        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Target Sets
            </span>
            <Hash className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <p className="text-sm sm:text-base font-extrabold text-slate-900 leading-none">
            {totalPrintPieces.toLocaleString('en-IN')}
          </p>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5">Sets</p>
        </div>

        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Estimated Revenue
            </span>
            <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-sm sm:text-base font-extrabold text-slate-900 leading-none truncate">
            ₹{totalValuation.toLocaleString('en-IN')}
          </p>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5">Total Value</p>
        </div>
      </div>

      {/* Search & Expand All Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search supplier, color, lot, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-xs transition-all"
          />
        </div>

        {filteredFabrics.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (expandedCardIds.size === filteredFabrics.length) {
                handleCollapseAll();
              } else {
                handleExpandAll(filteredFabrics.map((f) => f.id));
              }
            }}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl text-[11px] font-bold text-slate-700 hover:text-indigo-600 transition-all flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95 cursor-pointer"
            title={
              expandedCardIds.size === filteredFabrics.length
                ? 'Collapse all cards to compact small card view'
                : 'Expand all cards to show full details'
            }
          >
            <span>
              {expandedCardIds.size === filteredFabrics.length
                ? 'Collapse All'
                : 'Expand All'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedCardIds.size === filteredFabrics.length ? 'rotate-180' : ''
                }`}
            />
          </button>
        )}
      </div>

      {/* Fabric Lots List */}
      <div className="space-y-3">
        {displayedLoading ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Loading archived fabric lots from database...</p>
          </div>
        ) : displayedFabrics.length === 0 ? (
          isArchivedTab ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">No Archived Fabric Lots</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  When you archive a fabric lot, it and all its associated child records will be safely moved here.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">No Fabric Lots Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {searchQuery || activeTab !== 'all'
                    ? 'No fabric lot matches your search or filter.'
                    : 'Record your first fabric lot to track plain meters, print pieces, rates, and due dates.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingFabric(null);
                  setShowAddFabric(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-100 transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Fabric</span>
              </button>
            </div>
          )
        ) : (
          <>
            {displayedFabrics.map((f) => (
              <FabricLotCard
                key={f.id}
                fabric={f}
                isExpanded={expandedCardIds.has(f.id)}
                onToggleExpand={() => toggleCardExpand(f.id)}
                targetLotId={targetLotId}
                modalActions={modalActions}
              />
            ))}
            <PaginationControls
              currentPage={displayedSafePage}
              totalPages={displayedTotalPages}
              totalItems={displayedTotalItems}
              pageSize={pageSize}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 15, 25, 50]}
              theme="indigo"
            />
          </>
        )}
      </div>

      {/* Add / Edit Fabric Modal */}
      {/* Lazy Prompt Modals */}
      <Suspense fallback={null}>
        <AddFabricModal
        key={`${editingFabric?.id || 'new'}-${showAddFabric ? 'open' : 'closed'}`}
        isOpen={showAddFabric}
        onClose={() => {
          setShowAddFabric(false);
          setEditingFabric(null);
        }}
        fabricToEdit={editingFabric}
        onOpenAddSupplier={() => setShowAddSupplier(true)}
        onSuccess={(createdOrUpdated) => {
          setShowAddFabric(false);
          setEditingFabric(null);
          if (!editingFabric && createdOrUpdated) {
            setNewlyAddedFabricPrompt(createdOrUpdated);
            setActiveTab('all');
            setSearchQuery('');
          }
        }}
      />

      {/* Product Structure & Tailor Rates Modal (for prompt) */}
      {showProductStructureModal && selectedFabricForProductStructure && (
        <SetProductStructureModal
          key={`inv-prod-struct-modal-${selectedFabricForProductStructure.id}`}
          isOpen={showProductStructureModal}
          onClose={() => {
            setShowProductStructureModal(false);
            setSelectedFabricForProductStructure(null);
          }}
          onSaved={() => {
            setShowProductStructureModal(false);
            setSelectedFabricForProductStructure(null);
          }}
          fabric={
            fabrics.find((f) => f.id === selectedFabricForProductStructure.id) ||
            selectedFabricForProductStructure
          }
        />
      )}

      {/* Assign Cutting Master Modal (for prompt) */}
      {showAssignMasterModal && selectedFabricForMasterAssign && (
        <AssignFabricMasterModal
          key={`inv-assign-master-modal-${selectedFabricForMasterAssign.id}`}
          isOpen={showAssignMasterModal}
          onClose={() => {
            setShowAssignMasterModal(false);
            setSelectedFabricForMasterAssign(null);
          }}
          fabric={
            fabrics.find((f) => f.id === selectedFabricForMasterAssign.id) ||
            selectedFabricForMasterAssign
          }
        />
      )}

        {/* Add Supplier Modal shortcut */}
        <AddSupplierModal
          isOpen={showAddSupplier}
          onClose={() => setShowAddSupplier(false)}
        />
      </Suspense>

      {/* Hoisted Fabric Modals Container */}
      <FabricModalsContainer modalState={modalState} />
    </div>
  );
}
