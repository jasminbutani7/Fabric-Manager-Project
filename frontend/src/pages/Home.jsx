import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Package,
  ShieldCheck,
  IndianRupee,
  Truck,
  Scissors,
  Layers,
  Trash2,
} from 'lucide-react';
import { useFactorySetup, useFabrics, useProduction, useFinance } from '../context/useManagement';
import { SetupSuppliersTab } from '../components/setup';
import { useFabricModals } from '../hooks/useFabricModals';

const AddSupplierModal = lazy(() => import('../components/modals/AddSupplierModal'));
const AddFabricModal = lazy(() => import('../components/modals/AddFabricModal'));
const RecordCuttingModal = lazy(() => import('../components/modals/RecordCuttingModal'));
const AssignTailorModal = lazy(() => import('../components/modals/AssignTailorModal'));
const AddExpenseModal = lazy(() => import('../components/modals/AddExpenseModal'));
const AddInvoiceModal = lazy(() => import('../components/modals/AddInvoiceModal'));
const DeliverToSupplierModal = lazy(() => import('../components/modals/DeliverToSupplierModal'));
const ThreadTrimmingDecisionModal = lazy(() => import('../components/modals/ThreadTrimmingDecisionModal'));
import FabricModalsContainer from '../components/fabric/FabricModalsContainer';
import { HomeSubTabsNav, HomeFloorPulseTab, HomeActionsTab, HomeFeedTab } from '../components/home';
import {
  getHandoversBreakdownSummary,
  calculateReadyProductSets,
  isLotFullyDelivered as checkLotFullyDelivered,
} from '../utils/productUtils';

export default function Home() {
  const { modalActions, modalState } = useFabricModals();
  const { machines, tailors, masters, suppliers = [], deleteSupplier } = useFactorySetup();
  const { fabrics = [], cuttings = [] } = useFabrics();
  const {
    tailorAssignments = [],
    threadCuttingAssignments = [],
    masterHandovers = [],
    deliveryLogs = [],
    setFabricThreadCuttingDecision,
  } = useProduction();
  const { expenses = [], invoices = [] } = useFinance();
  const navigate = useNavigate();

  // Thread Trimming Decision state
  const [trimmingDecisionFabric, setTrimmingDecisionFabric] = useState(null);

  // Sub-tabs routing: 'pulse' | 'actions' | 'suppliers' | 'feed'
  const { tab: pathTab } = useParams();
  const [searchParams] = useSearchParams();
  const VALID_HOME_TABS = ['pulse', 'actions', 'suppliers', 'feed'];
  const rawTab = pathTab || searchParams.get('tab');
  let activeTab = 'pulse';
  if (rawTab) {
    const lower = rawTab.toLowerCase();
    if (lower === 'feed' || lower === 'activity' || lower === 'metrics') {
      activeTab = 'feed';
    } else if (lower === 'supplier' || lower === 'suppliers') {
      activeTab = 'suppliers';
    } else if (VALID_HOME_TABS.includes(lower)) {
      activeTab = lower;
    }
  }

  const setActiveTab = (tab) => {
    navigate(`/home/${tab}`);
  };

  // Modals state for 1-tap quick actions
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteSupplierConfirm, setDeleteSupplierConfirm] = useState(null);
  const [showAddFabric, setShowAddFabric] = useState(false);
  const [showRecordCutModal, setShowRecordCutModal] = useState(false);
  const [showAssignTailorModal, setShowAssignTailorModal] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [deliverFabricId, setDeliverFabricId] = useState(null);
  // Card expand/collapse state for Running Lots (expanded by default)
  const [expandedLotIds, setExpandedLotIds] = useState(
    () => new Set((fabrics || []).map((f) => f.id))
  );

  const toggleLotExpand = (lotId) => {
    setExpandedLotIds((prev) => {
      const next = new Set(prev);
      if (next.has(lotId)) {
        next.delete(lotId);
      } else {
        next.add(lotId);
      }
      return next;
    });
  };

  // Helper to accurately determine if all finished goods of a fabric lot are delivered
  const isLotFullyDelivered = React.useCallback(
    (f) => {
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
    },
    [cuttings, tailorAssignments, masterHandovers, threadCuttingAssignments, invoices, deliveryLogs]
  );

  // Running Lot calculations for Admin Floor Overview - strictly active & deduplicated by lot ID
  const rawRunningLots = useMemo(() => {
    return (fabrics || []).filter((f) => !f.isArchived && !isLotFullyDelivered(f));
  }, [fabrics, isLotFullyDelivered]);

  const runningLots = useMemo(() => {
    return Array.from(new Map(rawRunningLots.map((lot) => [lot.id, lot])).values());
  }, [rawRunningLots]);

  const [runningLotsPage, setRunningLotsPage] = useState(1);
  const [runningLotsPageSize, setRunningLotsPageSize] = useState(10);
  const runningLotsTotalPages = Math.max(1, Math.ceil(runningLots.length / runningLotsPageSize));
  const safeRunningLotsPage = Math.min(runningLotsPage, runningLotsTotalPages);

  const paginatedRunningLots = useMemo(() => {
    const start = (safeRunningLotsPage - 1) * runningLotsPageSize;
    return runningLots.slice(start, start + runningLotsPageSize);
  }, [runningLots, safeRunningLotsPage, runningLotsPageSize]);

  const handleExpandAllLots = () => {
    setExpandedLotIds(new Set(runningLots.map((l) => l.id)));
  };

  const handleCollapseAllLots = () => {
    setExpandedLotIds(new Set());
  };

  const isAllLotsExpanded =
    runningLots.length > 0 && runningLots.every((l) => expandedLotIds.has(l.id));

  const getLotFloorStats = (lot) => {
    const lotCuttings = (cuttings || []).filter((c) => c.fabricId === lot.id);
    const lotCuttingIds = lotCuttings.map((c) => c.id);
    const lotCutPieces = lotCuttings.reduce((sum, c) => sum + (parseInt(c.totalPieces, 10) || 0), 0);
    const lotCutSets = lotCuttings.reduce((sum, c) => sum + (parseInt(c.setsCount || c.totalSets, 10) || 0), 0);

    const lotAssignments = (tailorAssignments || []).filter(
      (a) => a.fabricId === lot.id || lotCuttingIds.includes(a.cuttingId)
    );
    const lotAssignedPieces = lotAssignments.reduce((sum, a) => sum + (parseInt(a.totalPieces, 10) || 0), 0);
    const lotStitchedPieces = lotAssignments.reduce((sum, a) => {
      const fromSubs = (a.dailySubmissions || [])
        .filter((s) => s.approvalStatus === 'Approved')
        .reduce((sSum, s) => sSum + (parseInt(s.quantity, 10) || 0), 0);
      return sum + (parseInt(a.completedQuantity || a.completedPieces, 10) || fromSubs || 0);
    }, 0);

    const lotThreadJobs = (threadCuttingAssignments || []).filter(
      (tc) => tc.fabricId === lot.id || lotCuttingIds.includes(tc.cuttingId)
    );
    const lotTrimmedPieces = lotThreadJobs.reduce((sum, tc) => sum + (parseInt(tc.completedPieces || tc.completedPSC, 10) || 0), 0);
    const lotTrimmedPSC = lotTrimmedPieces;

    const lotHandovers = (masterHandovers || []).filter(
      (mh) => mh.fabricId === lot.id || lotCuttingIds.includes(mh.cuttingId)
    );
    const verifiedHandovers = lotHandovers.filter((mh) => mh.status === 'Verified');
    const lotVerifiedPieces = verifiedHandovers.reduce(
      (sum, mh) => sum + (parseInt(mh.pieces || mh.piecesCount, 10) || 0),
      0
    );
    const lotVerifiedSummary = getHandoversBreakdownSummary(verifiedHandovers);

    const lotPendingHandovers = lotHandovers.filter((mh) => mh.status === 'Pending Verification');
    const lotPendingVerifyPieces = lotPendingHandovers.reduce(
      (sum, mh) => sum + (parseInt(mh.pieces || mh.piecesCount, 10) || 0),
      0
    );
    const lotPendingVerifySummary = getHandoversBreakdownSummary(lotPendingHandovers);

    // Complete finished product set calculation
    const readySetData = calculateReadyProductSets(lot, {
      cuttings,
      masterHandovers,
      threadCuttingAssignments,
      invoices,
      deliveryLogs,
    });
    const {
      readyProductsCount,
      missingSubParts,
      isCompleteProductReady,
    } = readySetData;

    const lotTargetProducts =
      parseInt(lot.printPieces || lot.productQuantity, 10) || lotCutSets || 0;

    let struct = lot.productStructure || lot.product_structure;
    if (typeof struct === 'string') {
      try {
        struct = JSON.parse(struct);
      } catch {
        struct = null;
      }
    }
    const subPartsList = Array.isArray(struct?.subParts) && struct.subParts.length > 0
      ? struct.subParts
      : Array.isArray(struct?.parts) && struct.parts.length > 0
        ? struct.parts
        : [];
    const subPartsCount = Math.max(1, subPartsList.length);
    const lotTotalPieces = lotTargetProducts > 0
      ? lotTargetProducts * subPartsCount
      : (lotCutSets > 0 ? lotCutSets * subPartsCount : (lotCutPieces || lotAssignedPieces || 0));

    // Calculate total cut pieces needed per 1 product unit/set
    let cutPiecesPerSet = 0;
    if (subPartsList.length > 0) {
      subPartsList.forEach((sp) => {
        const comps = Array.isArray(sp.components) && sp.components.length > 0 ? sp.components : [];
        if (comps.length > 0) {
          comps.forEach((c) => {
            cutPiecesPerSet += Math.max(1, parseInt(c.qty, 10) || 1);
          });
        } else {
          cutPiecesPerSet += 1;
        }
      });
    } else {
      cutPiecesPerSet = 1;
    }

    const lotPiecesPerSet = subPartsList.length > 0
      ? subPartsList.reduce((acc, sp) => acc + (parseInt(sp.qty || sp.piecesPerSet || sp.ratio, 10) || 1), 0)
      : 1;

    const lotTargetCutPieces = lotTargetProducts > 0
      ? lotTargetProducts * cutPiecesPerSet
      : (lotCutSets > 0 ? lotCutSets * cutPiecesPerSet : lotCutPieces);

    const cutPercent =
      lotTargetCutPieces > 0
        ? Math.min(100, Math.round((lotCutPieces / lotTargetCutPieces) * 100))
        : lotTargetProducts > 0 && lotCutSets > 0
          ? Math.min(100, Math.round((lotCutSets / lotTargetProducts) * 100))
          : lotCutPieces > 0
            ? 100
            : 0;

    const stitchingPercent =
      lotTotalPieces > 0 ? Math.min(100, Math.round((lotStitchedPieces / lotTotalPieces) * 100)) : 0;
    const finishingPercent =
      lotTotalPieces > 0 ? Math.min(100, Math.round((lotTrimmedPSC / lotTotalPieces) * 100)) : 0;
    const verifiedPiecesPercent =
      lotTotalPieces > 0 ? Math.min(100, Math.round((lotVerifiedPieces / lotTotalPieces) * 100)) : 0;

    const lotIsDelivered = isLotFullyDelivered(lot);

    const lotReadyDeliveryPieces = lotIsDelivered
      ? 0
      : (readySetData.totalReadyPieces !== undefined
        ? Math.max(0, parseInt(readySetData.totalReadyPieces, 10) || 0)
        : (readyProductsCount > 0 ? readyProductsCount * lotPiecesPerSet : 0));

    // Ready percent is strictly based on complete products ready
    const readyPercent =
      lotIsDelivered
        ? 100
        : readyProductsCount > 0
          ? lotTargetProducts > 0
            ? Math.min(100, Math.round((readyProductsCount / lotTargetProducts) * 100))
            : lotCutSets > 0
              ? Math.min(100, Math.round((readyProductsCount / lotCutSets) * 100))
              : 100
          : 0;

    let lotProgress = 0;
    if (lotIsDelivered) {
      lotProgress = 100;
    } else if (readyProductsCount > 0) {
      lotProgress = Math.min(100, Math.round(75 + (readyPercent * 0.25)));
    } else if (lotVerifiedPieces > 0) {
      lotProgress = Math.min(70, Math.round(45 + (verifiedPiecesPercent * 0.25)));
    } else if (lotStitchedPieces > 0) {
      lotProgress = Math.min(50, Math.round(25 + (stitchingPercent * 0.25)));
    } else if (lotCutPieces > 0) {
      lotProgress = 25;
    } else {
      lotProgress = 10;
    }

    return {
      isDelivered: lotIsDelivered,
      lotCutPieces,
      lotTargetCutPieces,
      lotCutSets,
      lotAssignedPieces,
      lotStitchedPieces,
      lotTotalPieces,
      lotTrimmedPieces,
      lotTrimmedPSC: lotTrimmedPieces,
      lotVerifiedPieces,
      lotVerifiedSummary,
      lotPendingVerifyPieces,
      lotPendingVerifySummary,
      readyProductsCount,
      lotPiecesPerSet,
      lotReadyDeliveryPieces,
      missingSubParts,
      isCompleteProductReady,
      readySetData,
      isAwaitingTrimmingDecision: readySetData.isAwaitingTrimmingDecision,
      isTrimmingInProgress: readySetData.isTrimmingInProgress,
      isTrimmingCompleted: readySetData.isTrimmingCompleted,
      isTrimmingSkipped: readySetData.isTrimmingSkipped,
      lotTargetProducts,
      cutPercent,
      stitchingPercent,
      finishingPercent,
      verifiedPiecesPercent,
      readyPercent,
      lotProgress,
    };
  };

  const pendingMasterHandovers = masterHandovers.filter(
    (h) => h.status === 'Pending Verification'
  );
  const pendingMasterBreakdown = getHandoversBreakdownSummary(pendingMasterHandovers);

  // Pre-calculate floor stats for running lots for indicators & alert banners
  const runningLotStatsMap = new Map();
  runningLots.forEach((lot) => {
    runningLotStatsMap.set(lot.id, getLotFloorStats(lot));
  });


  const lotsAwaitingTrimming = runningLots.filter((lot) => {
    const stats = runningLotStatsMap.get(lot.id);
    return stats && !stats.isDelivered && stats.isAwaitingTrimmingDecision && (stats.readySetData?.totalPendingPieces > 0 || stats.lotVerifiedPieces > 0);
  });
  const totalPendingTrimmingPieces = lotsAwaitingTrimming.reduce((sum, lot) => {
    const stats = runningLotStatsMap.get(lot.id);
    return sum + (stats.readySetData?.totalPendingPieces || stats.lotVerifiedPieces || 0);
  }, 0);

  const lotsReadyForDelivery = runningLots.filter((lot) => {
    const stats = runningLotStatsMap.get(lot.id);
    return stats && !stats.isDelivered && (stats.lotReadyDeliveryPieces > 0 || stats.readyProductsCount > 0);
  });
  const totalReadyDeliveryPieces = lotsReadyForDelivery.reduce((sum, lot) => {
    const stats = runningLotStatsMap.get(lot.id);
    return sum + (stats?.lotReadyDeliveryPieces || 0);
  }, 0);

  const totalUrgentActionCount =
    pendingMasterHandovers.length +
    lotsAwaitingTrimming.length +
    lotsReadyForDelivery.length;


  const assignedTailors = tailors.filter((t) => t.assignedMachineId).length;

  // Admin Setup Checklist progress
  const setupTasks = [
    { id: 1, title: 'Admin Account', done: true, tag: 'Done', route: '/setup/profile' },
    { id: 2, title: 'Business Profile', done: true, tag: 'Done', route: '/setup/profile' },
    {
      id: 3,
      title: `Machines (${machines.length} Added)`,
      done: machines.length > 0,
      tag: machines.length > 0 ? 'Done' : 'Pending',
      route: '/setup/machines',
    },
    {
      id: 4,
      title: `Masters (${masters.length} Active)`,
      done: masters.length > 0,
      tag: masters.length > 0 ? 'Done' : 'Pending',
      route: '/setup/masters',
    },
    {
      id: 5,
      title: `Tailors Assigned (${assignedTailors}/${tailors.length})`,
      done: assignedTailors > 0,
      tag: assignedTailors > 0 ? 'Done' : 'Pending',
      route: '/setup/tailors',
    },
    {
      id: 6,
      title: `Suppliers (${suppliers.length} Added)`,
      done: suppliers.length > 0,
      tag: suppliers.length > 0 ? 'Done' : 'Pending',
      route: '/setup/suppliers',
    },
    {
      id: 7,
      title: `Fabric Lots (${fabrics.length} Lots)`,
      done: fabrics.length > 0,
      tag: fabrics.length > 0 ? 'Done' : 'Pending',
      route: '/fabrics',
    },
  ];

  const completedCount = setupTasks.filter((t) => t.done).length;
  const progressPercent = Math.round((completedCount / setupTasks.length) * 100);

  // Feed subtab local state
  const [feedCategory, setFeedCategory] = useState('all');
  const [feedSearchQuery, setFeedSearchQuery] = useState('');
  const [isSetupExpanded, setIsSetupExpanded] = useState(() => progressPercent < 100);

  // Parse dates safely for descending chronological sort
  const parseEventTime = (d) => {
    if (!d) return 0;
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
  };

  const formatFeedTime = (d) => {
    if (!d) return 'Recent';
    try {
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return String(d);
      const now = new Date();
      const isToday =
        dateObj.getDate() === now.getDate() &&
        dateObj.getMonth() === now.getMonth() &&
        dateObj.getFullYear() === now.getFullYear();
      if (isToday) {
        return dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) || 'Today';
      }
      return dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return String(d);
    }
  };

  // Compile real-time chronological factory feed across all operational domains
  const allFeedActivities = useMemo(() => {
    const list = [];

    // 1. Cutting batches
    (cuttings || []).forEach((c) => {
      const masterObj = masters.find((m) => m.id === c.masterId);
      const fabricObj = fabrics.find((f) => f.id === c.fabricId);
      list.push({
        id: `feed_cut_${c.id}`,
        category: 'cutting',
        timestamp: parseEventTime(c.date || c.createdAt),
        displayDate: formatFeedTime(c.date || c.createdAt),
        title: `Cutting: ${c.cuttingLotName || (fabricObj?.lotNo ? `Lot #${fabricObj.lotNo}` : fabricObj?.lotNumber ? `Lot #${fabricObj.lotNumber}` : 'Batch')}`,
        subtitle: `${masterObj?.name || c.masterName || 'Cutting Master'} • ${c.tableNumber ? `Table ${c.tableNumber}` : 'Cutting Floor'}`,
        metric: `${c.totalPieces || c.cutPieces || 0} Pcs`,
        metricSub: c.totalSets ? `${c.totalSets} Sets` : null,
        route: '/orders/cuttings',
        icon: Scissors,
        iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        badge: 'Cut Batch',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
      });
    });

    // 2. Stitching / Tailor daily submissions
    (tailorAssignments || []).forEach((a) => {
      const tailorObj = tailors.find((t) => t.id === a.tailorId);
      const machineObj = machines.find((m) => m.id === tailorObj?.assignedMachineId);
      (a.dailySubmissions || []).forEach((s) => {
        const isApproved = s.approvalStatus === 'Approved';
        list.push({
          id: `feed_tailor_sub_${s.id || Math.random()}`,
          category: 'stitching',
          timestamp: parseEventTime(s.date || s.createdAt),
          displayDate: formatFeedTime(s.date || s.createdAt),
          title: `Stitched: ${tailorObj?.name || 'Tailor'}`,
          subtitle: `${a.subPartName || 'Part'} • ${machineObj ? machineObj.code : 'Floor'}`,
          metric: `${s.quantity} Pcs`,
          metricSub: s.approvalStatus || 'Work Done',
          route: '/orders/stitching',
          icon: Layers,
          iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
          badge: isApproved ? 'Approved' : 'Work Log',
          badgeColor: isApproved
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
            : 'bg-amber-50 text-amber-700 border-amber-200/60',
        });
      });
    });

    // 3. Master Handovers / Quality Verification
    (masterHandovers || []).forEach((h) => {
      const masterObj = masters.find((m) => m.id === h.masterId);
      const isVerified = h.status === 'Verified';
      list.push({
        id: `feed_handover_${h.id}`,
        category: 'quality',
        timestamp: parseEventTime(h.date || h.createdAt),
        displayDate: formatFeedTime(h.date || h.createdAt),
        title: `Quality: ${isVerified ? 'Inspection Passed' : 'Pending Check'}`,
        subtitle: `${h.fabricLotNumber ? `Lot ${h.fabricLotNumber}` : 'Floor Batch'} • Master ${masterObj?.name || h.masterName || 'Floor Lead'}`,
        metric: `${h.pieces || h.piecesCount || 0} Pcs`,
        metricSub: isVerified ? 'Verified' : 'Pending QC',
        route: '/orders/handovers',
        icon: ShieldCheck,
        iconBg: isVerified ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100',
        badge: isVerified ? 'Passed QC' : 'QC Check',
        badgeColor: isVerified
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
          : 'bg-amber-50 text-amber-700 border-amber-200/60',
      });
    });

    // 4. Invoices / Dispatched Deliveries
    (invoices || []).forEach((inv) => {
      list.push({
        id: `feed_inv_${inv.id}`,
        category: 'delivery',
        timestamp: parseEventTime(inv.date || inv.createdAt),
        displayDate: formatFeedTime(inv.date || inv.createdAt),
        title: `Dispatched: ${inv.buyerName || inv.clientName || 'Buyer Delivery'}`,
        subtitle: `Invoice #${inv.invoiceNumber || inv.challanNumber || inv.id?.slice(0, 6)} • ${inv.paymentStatus || 'Delivered'}`,
        metric: `${inv.totalQuantity || inv.deliveredSets || 0} Sets`,
        metricSub: inv.totalAmount ? `₹${(parseFloat(inv.totalAmount) || 0).toLocaleString('en-IN')}` : null,
        route: '/orders/deliveries',
        icon: Truck,
        iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
        badge: 'Dispatched',
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200/60',
      });
    });

    // 5. Fabric Lots Inward
    (fabrics || []).forEach((f) => {
      list.push({
        id: `feed_fab_${f.id}`,
        category: 'cutting',
        timestamp: parseEventTime(f.createdAt || f.receivedDate || f.dueDate),
        displayDate: formatFeedTime(f.createdAt || f.receivedDate || f.dueDate),
        title: `Fabric Inward: ${f.fabricType || 'Lot'} ${f.lotNo ? `#${f.lotNo}` : f.lotNumber ? `#${f.lotNumber}` : f.lot_no ? `#${f.lot_no}` : ''}`,
        subtitle: `${f.supplierName || 'Vendor'} • ${f.color ? `${f.color} • ` : ''}${f.plainMeters ? `${f.plainMeters}m ` : ''}${f.printPieces ? `${f.printPieces} Sets` : ''}`.trim(),
        metric: f.plainMeters ? `${f.plainMeters}m` : (f.printPieces ? `${f.printPieces} Pcs` : 'In Stock'),
        metricSub: f.status || 'Active',
        route: '/fabrics',
        icon: Package,
        iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
        badge: 'Fabric Lot',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200/60',
      });
    });

    // 6. Expenses Logged
    (expenses || []).forEach((e) => {
      const amt = parseFloat(e.amount) || 0;
      list.push({
        id: `feed_exp_${e.id}`,
        category: 'expense',
        timestamp: parseEventTime(e.date),
        displayDate: formatFeedTime(e.date),
        title: `Expense: ₹${amt.toLocaleString('en-IN')}`,
        subtitle: `${e.expenseType || 'Operational'} • ${e.paidTo || e.workerName || e.paymentMethod || 'Paid'}`,
        metric: `₹${amt.toLocaleString('en-IN')}`,
        metricSub: e.paymentMethod || 'Cash',
        route: '/expenses',
        icon: IndianRupee,
        iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
        badge: e.expenseType || 'Expense',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200/60',
      });
    });

    // Sort descending by timestamp (newest events first) and strictly keep only 10 most recent activities
    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [cuttings, tailorAssignments, masterHandovers, invoices, fabrics, expenses, masters, tailors, machines]);

  // Category counts for quick filter pills (for the 10 recent activities)
  const feedCategoryCounts = useMemo(() => {
    const counts = {
      all: allFeedActivities.length,
      cutting: 0,
      stitching: 0,
      quality: 0,
      delivery: 0,
      expense: 0,
    };
    allFeedActivities.forEach((item) => {
      if (counts[item.category] !== undefined) {
        counts[item.category] += 1;
      }
    });
    return counts;
  }, [allFeedActivities]);

  // Filtered feed activities based on selected category & search input
  const filteredFeedActivities = useMemo(() => {
    let res = allFeedActivities;
    if (feedCategory !== 'all') {
      res = res.filter((item) => item.category === feedCategory);
    }
    if (feedSearchQuery.trim()) {
      const q = feedSearchQuery.toLowerCase();
      res = res.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.badge.toLowerCase().includes(q) ||
          (item.metric && item.metric.toLowerCase().includes(q))
      );
    }
    return res;
  }, [allFeedActivities, feedCategory, feedSearchQuery]);

  return (
    <div className="space-y-3 pb-6">
      {/* Sub-Tabs Pill Navigation Bar */}
      <HomeSubTabsNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        runningLotsCount={runningLots.length}
        urgentActionsCount={totalUrgentActionCount}
        suppliersCount={suppliers.length}
        feedActivitiesCount={allFeedActivities.length}
      />

      {/* SUB-TAB 1: FLOOR PULSE */}
      {activeTab === 'pulse' && (
        <HomeFloorPulseTab
          pendingMasterHandovers={pendingMasterHandovers}
          pendingMasterBreakdown={pendingMasterBreakdown}
          lotsAwaitingTrimming={lotsAwaitingTrimming}
          totalPendingTrimmingPieces={totalPendingTrimmingPieces}
          lotsReadyForDelivery={lotsReadyForDelivery}
          totalReadyDeliveryPieces={totalReadyDeliveryPieces}
          setDeliverFabricId={setDeliverFabricId}
          setShowDeliverModal={setShowDeliverModal}
          runningLots={runningLots}
          paginatedRunningLots={paginatedRunningLots}
          expandedLotIds={expandedLotIds}
          toggleLotExpand={toggleLotExpand}
          isAllLotsExpanded={isAllLotsExpanded}
          handleCollapseAllLots={handleCollapseAllLots}
          handleExpandAllLots={handleExpandAllLots}
          safeRunningLotsPage={safeRunningLotsPage}
          runningLotsTotalPages={runningLotsTotalPages}
          runningLotsPageSize={runningLotsPageSize}
          setRunningLotsPage={setRunningLotsPage}
          setRunningLotsPageSize={setRunningLotsPageSize}
          modalActions={modalActions}
          setShowAddFabric={setShowAddFabric}
          navigate={navigate}
        />
      )}

      {/* SUB-TAB 2: QUICK ACTIONS */}
      {activeTab === 'actions' && (
        <HomeActionsTab
          setShowAddFabric={setShowAddFabric}
          setShowAddExpense={setShowAddExpense}
          setShowAddInvoice={setShowAddInvoice}
          setShowRecordCutModal={setShowRecordCutModal}
          setShowAssignTailorModal={setShowAssignTailorModal}
          navigate={navigate}
        />
      )}

      {/* SUB-TAB 3: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <SetupSuppliersTab
          onAddSupplier={() => {
            setEditingSupplier(null);
            setShowAddSupplier(true);
          }}
          onEditSupplier={(s) => {
            setEditingSupplier(s);
            setShowAddSupplier(true);
          }}
          onDeleteSupplier={(s) => setDeleteSupplierConfirm(s)}
        />
      )}

      {/* SUB-TAB 4: FEED */}
      {activeTab === 'feed' && (
        <HomeFeedTab
          progressPercent={progressPercent}
          isSetupExpanded={isSetupExpanded}
          setIsSetupExpanded={setIsSetupExpanded}
          setupTasks={setupTasks}
          machines={machines}
          masters={masters}
          tailors={tailors}
          fabrics={fabrics}
          filteredFeedActivities={filteredFeedActivities}
          feedSearchQuery={feedSearchQuery}
          setFeedSearchQuery={setFeedSearchQuery}
          feedCategory={feedCategory}
          setFeedCategory={setFeedCategory}
          feedCategoryCounts={feedCategoryCounts}
          navigate={navigate}
        />
      )}

      {/* Modals for 1-Tap quick actions */}
      <AddSupplierModal
        key={editingSupplier?.id || (showAddSupplier ? 'open-new' : 'closed')}
        isOpen={showAddSupplier}
        onClose={() => {
          setShowAddSupplier(false);
          setEditingSupplier(null);
        }}
        supplierToEdit={editingSupplier}
      />
      {/* Lazy Quick-Action Modals */}
      <Suspense fallback={null}>
        <AddFabricModal
        isOpen={showAddFabric}
        onClose={() => setShowAddFabric(false)}
        onOpenAddSupplier={() => setShowAddSupplier(true)}
      />
      <RecordCuttingModal
        key={showRecordCutModal ? 'home-cut-open' : 'home-cut-closed'}
        isOpen={showRecordCutModal}
        onClose={() => setShowRecordCutModal(false)}
      />
      <AssignTailorModal
        key={showAssignTailorModal ? 'home-asgn-open' : 'home-asgn-closed'}
        isOpen={showAssignTailorModal}
        onClose={() => setShowAssignTailorModal(false)}
      />
      <AddExpenseModal
        key={showAddExpense ? 'home-exp-open' : 'home-exp-closed'}
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
      />
      <AddInvoiceModal
        key={showAddInvoice ? 'home-inv-open' : 'home-inv-closed'}
        isOpen={showAddInvoice}
        onClose={() => setShowAddInvoice(false)}
      />

      {/* Thread Trimming Decision Modal */}
      {trimmingDecisionFabric && (
        <ThreadTrimmingDecisionModal
          key={`home-trimming-decision-${trimmingDecisionFabric.id}`}
          isOpen={Boolean(trimmingDecisionFabric)}
          fabric={trimmingDecisionFabric}
          verifiedPiecesCount={
            calculateReadyProductSets(trimmingDecisionFabric, {
              cuttings,
              masterHandovers,
              threadCuttingAssignments,
              invoices,
              deliveryLogs,
            }).totalVerifiedPieces || 0
          }
          onClose={() => setTrimmingDecisionFabric(null)}
          onChooseAssignTrimming={(subPartKey, subPartName, pcsCount, subPartMap) => {
            const linkedC = cuttings.find((c) => c.fabricId === trimmingDecisionFabric.id);
            setTrimmingDecisionFabric(null);
            const params = new URLSearchParams();
            if (linkedC) params.set('cuttingId', linkedC.id);
            params.set('fabricId', trimmingDecisionFabric.id);
            if (subPartKey) params.set('subPart', subPartKey);
            if (pcsCount) params.set('quantity', pcsCount);
            if (subPartMap) params.set('subPartQuantities', JSON.stringify(subPartMap));
            navigate(`/orders/thread_cutting?${params.toString()}`);
          }}
          onChooseSkipTrimming={(subPartKey, pcsCount) => {
            if (subPartKey) {
              setFabricThreadCuttingDecision(trimmingDecisionFabric.id, 'skipped', subPartKey, pcsCount);
            } else {
              setFabricThreadCuttingDecision(trimmingDecisionFabric.id, 'skipped');
            }
            setTrimmingDecisionFabric(null);
          }}
        />
      )}

      {/* Deliver To Supplier Modal */}
        {showDeliverModal && (
          <DeliverToSupplierModal
            key={deliverFabricId || 'home-deliver-modal'}
            isOpen={showDeliverModal}
            initialFabricId={deliverFabricId}
            onClose={() => {
              setShowDeliverModal(false);
              setDeliverFabricId(null);
            }}
            onSuccess={() => {
              setShowDeliverModal(false);
              setDeliverFabricId(null);
            }}
          />
        )}
      </Suspense>
      {/* Delete Supplier Confirmation Modal */}
      {deleteSupplierConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl space-y-3 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Delete Supplier?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to remove <span className="font-bold text-slate-800">{deleteSupplierConfirm.name}</span> from your supplier contacts?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteSupplierConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteSupplier(deleteSupplierConfirm.id);
                  setDeleteSupplierConfirm(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-200 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hoisted Fabric Modals Container */}
      <FabricModalsContainer modalState={modalState} />
    </div>
  );
}
