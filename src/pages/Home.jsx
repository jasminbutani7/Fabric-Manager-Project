import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Sliders,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  Scissors,
  UserCheck,
  Layers,
  Receipt,
  FileText,
  PackageCheck,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Zap,
  Truck,
  Search,
  Package,
  IndianRupee,
  X,
  Activity,
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
import FabricLotCard from '../components/fabric/FabricLotCard';
import FabricModalsContainer from '../components/fabric/FabricModalsContainer';
import PaginationControls from '../components/common/PaginationControls';
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
      {/* Sub-Tabs Pill Navigation Bar (Mobile-Friendly 4-Column Grid) */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
        {[
          {
            id: 'pulse',
            label: 'Activities',
            icon: TrendingUp,
            count: totalUrgentActionCount > 0 ? totalUrgentActionCount : runningLots.length,
            color: 'text-indigo-700',
          },
          {
            id: 'actions',
            label: 'Actions',
            icon: Zap,
            count: 14,
            color: 'text-indigo-700',
          },
          {
            id: 'suppliers',
            label: 'Suppliers',
            icon: Truck,
            count: suppliers.length,
            color: 'text-blue-700',
          },
          {
            id: 'feed',
            label: 'Feed',
            icon: Clock,
            count: allFeedActivities.length,
            color: 'text-indigo-700',
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer ${isActive
                  ? `bg-white ${tab.color} shadow-xs ring-1 ring-black/5 font-extrabold`
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none shrink-0 ${isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-600'
                    }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: FLOOR PULSE */}
      {activeTab === 'pulse' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Pending Master Handover Alert Banner */}
          {pendingMasterHandovers.length > 0 && (
            <div
              onClick={() => navigate('/orders/handovers')}
              className="p-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/15 border border-amber-300 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer hover:border-amber-400 transition-all shadow-xs text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1 flex-wrap">
                    <span>Finished Handovers</span>
                    <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[9px] font-black">
                      {pendingMasterHandovers.length} New
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 truncate">
                    {pendingMasterBreakdown} ready for verification
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                Review →
              </span>
            </div>
          )}

          {/* Trimming Decisions Needed Alert Banner */}
          {lotsAwaitingTrimming.length > 0 && (
            <div
              onClick={() => {
                const targetLot = lotsAwaitingTrimming[0];
                navigate(`/orders/thread_cutting?search=${encodeURIComponent(targetLot.fabricType || targetLot.productName || '')}`);
              }}
              className="p-3 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 border border-amber-300 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer hover:border-amber-400 transition-all shadow-xs text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Scissors className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1 flex-wrap">
                    <span>Trimming Decisions Needed</span>
                    <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[9px] font-black">
                      {totalPendingTrimmingPieces} PCs Awaiting
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 truncate">
                    {lotsAwaitingTrimming.map((l) => l.fabricType || l.productName).filter(Boolean).slice(0, 2).join(', ')}
                    {lotsAwaitingTrimming.length > 2 ? ` +${lotsAwaitingTrimming.length - 2} more` : ''} • Choose trim vs skip per component
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shrink-0 shadow-2xs">
                Decide Trimming →
              </span>
            </div>
          )}

          {/* Ready for Supplier Delivery Alert Banner */}
          {lotsReadyForDelivery.length > 0 && (
            <div
              onClick={() => {
                const targetLot = lotsReadyForDelivery[0];
                setDeliverFabricId(targetLot.id);
                setShowDeliverModal(true);
              }}
              className="p-3 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-300 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer hover:border-emerald-400 transition-all shadow-xs text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1 flex-wrap">
                    <span>Ready for Supplier Delivery</span>
                    <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-950 rounded-full text-[9px] font-black">
                      {totalReadyDeliveryPieces} PCs Ready
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 truncate">
                    {lotsReadyForDelivery.map((l) => l.fabricType || l.productName).filter(Boolean).slice(0, 2).join(', ')}
                    {lotsReadyForDelivery.length > 2 ? ` +${lotsReadyForDelivery.length - 2} more` : ''} • Finished pieces ready for dispatch
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shrink-0 shadow-2xs">
                Deliver Goods →
              </span>
            </div>
          )}



          {/* Running Lot Information Overview (Admin Floor Pulse) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Running Lots
                </h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {runningLots.length > 0 ? `${runningLots.length} Active` : 'Idle'}
                </span>
              </div>
              {runningLots.length > 0 && (
                <button
                  type="button"
                  onClick={isAllLotsExpanded ? handleCollapseAllLots : handleExpandAllLots}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{isAllLotsExpanded ? 'Collapse All' : 'Expand All'}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${isAllLotsExpanded ? 'rotate-180' : ''
                      }`}
                  />
                </button>
              )}
            </div>

            {/* List of Fabric Lot Cards */}
            {runningLots.length > 0 ? (
              <div className="space-y-3">
                {paginatedRunningLots.map((lot) => (
                  <FabricLotCard
                    key={lot.id}
                    fabric={lot}
                    isExpanded={expandedLotIds.has(lot.id)}
                    onToggleExpand={() => toggleLotExpand(lot.id)}
                    modalActions={modalActions}
                  />
                ))}
                <PaginationControls
                  currentPage={safeRunningLotsPage}
                  totalPages={runningLotsTotalPages}
                  totalItems={runningLots.length}
                  pageSize={runningLotsPageSize}
                  onPageChange={setRunningLotsPage}
                  onPageSizeChange={(newSize) => {
                    setRunningLotsPageSize(newSize);
                    setRunningLotsPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20]}
                  theme="indigo"
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center space-y-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">No Active Lots</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    No lots currently on cutting or stitching floor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddFabric(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Add Fabric</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: QUICK ACTIONS */}
      {activeTab === 'actions' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* 1. Admin Actions */}
          <div className="space-y-2 bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between px-0.5 pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Admin Actions
                </h3>
              </div>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded-full">
                5 Actions
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 pt-1">
              <button
                onClick={() => setShowAddFabric(true)}
                className="p-2.5 bg-slate-50/70 hover:bg-indigo-50/50 active:scale-[0.98] border border-slate-200/80 hover:border-indigo-200 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Add Fabric</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Fabric Rolls</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/orders/thread_cutting')}
                className="p-2.5 bg-slate-50/70 hover:bg-amber-50/50 active:scale-[0.98] border border-slate-200/80 hover:border-amber-200 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Scissors className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Thread Cut</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Trimming Work</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/orders/handovers')}
                className="p-2.5 bg-slate-50/70 hover:bg-purple-50/50 active:scale-[0.98] border border-slate-200/80 hover:border-purple-200 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Handovers</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Verify Goods</p>
                </div>
              </button>

              <button
                onClick={() => setShowAddExpense(true)}
                className="p-2.5 bg-slate-50/70 hover:bg-rose-50/50 active:scale-[0.98] border border-slate-200/80 hover:border-rose-200 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Add Expense</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Bills & Rent</p>
                </div>
              </button>

              <button
                onClick={() => setShowAddInvoice(true)}
                className="p-2.5 bg-slate-50/70 hover:bg-emerald-50/50 active:scale-[0.98] border border-slate-200/80 hover:border-emerald-200 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Add Invoice</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Bill Client</p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Master Actions */}
          <div className="space-y-2 bg-white rounded-2xl p-3 border border-purple-100/90 shadow-xs">
            <div className="flex items-center justify-between px-0.5 pb-1 border-b border-purple-50">
              <div className="flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-950">
                  Master Actions
                </h3>
              </div>
              <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded-full">
                5 Actions
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 pt-1">
              <button
                onClick={() => setShowRecordCutModal(true)}
                className="p-2.5 bg-purple-50/50 hover:bg-purple-100/60 active:scale-[0.98] border border-purple-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Scissors className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Record Cut</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Lays & Fabric Cuts</p>
                </div>
              </button>

              <button
                onClick={() => setShowAssignTailorModal(true)}
                className="p-2.5 bg-purple-50/50 hover:bg-purple-100/60 active:scale-[0.98] border border-purple-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Assign Tailor</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Work Bundles</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/orders/assignments')}
                className="p-2.5 bg-purple-50/50 hover:bg-purple-100/60 active:scale-[0.98] border border-purple-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-200/70 text-purple-800 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Tailor Jobs</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Active Work</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/orders/cuttings')}
                className="p-2.5 bg-purple-50/50 hover:bg-purple-100/60 active:scale-[0.98] border border-purple-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-200/70 text-purple-800 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Fabric Cuts</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Sets Balance</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/orders/handovers')}
                className="p-2.5 bg-purple-50/50 hover:bg-purple-100/60 active:scale-[0.98] border border-purple-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-200/70 text-purple-800 flex items-center justify-center shrink-0">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Handover</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Send to Admin</p>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Tailor Actions */}
          <div className="space-y-2 bg-white rounded-2xl p-3 border border-emerald-100/90 shadow-xs">
            <div className="flex items-center justify-between px-0.5 pb-1 border-b border-emerald-50">
              <div className="flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  Tailor Actions
                </h3>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-full">
                4 Actions
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 pt-1">
              <button
                onClick={() => navigate('/orders/assignments')}
                className="p-2.5 bg-emerald-50/50 hover:bg-emerald-100/60 active:scale-[0.98] border border-emerald-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Scissors className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Orders</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Work Queue</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/orders/assignments')}
                className="p-2.5 bg-emerald-50/50 hover:bg-emerald-100/60 active:scale-[0.98] border border-emerald-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Daily Log</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Submit Work</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/orders/assignments')}
                className="p-2.5 bg-emerald-50/50 hover:bg-emerald-100/60 active:scale-[0.98] border border-emerald-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-200/70 text-emerald-800 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Rates</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Wage Ledgers</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/setup/tailors')}
                className="p-2.5 bg-emerald-50/50 hover:bg-emerald-100/60 active:scale-[0.98] border border-emerald-100/80 rounded-xl flex items-center gap-2 text-left shadow-2xs transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-200/70 text-emerald-800 flex items-center justify-center shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">Portal</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Floor Login</p>
                </div>
              </button>
            </div>
          </div>
        </div>
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
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Admin Setup Progress Widget */}
          {progressPercent === 100 ? (
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/5 rounded-2xl p-3.5 border border-emerald-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                        Factory Configured
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        100% Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      All 7 factory milestones active and running
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsSetupExpanded(!isSetupExpanded)}
                    className="text-[11px] font-bold text-emerald-700 bg-white hover:bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{isSetupExpanded ? 'Hide' : 'Tasks'}</span>
                    {isSetupExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/setup')}
                    className="text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-50 px-2 py-1 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    Manage →
                  </button>
                </div>
              </div>

              {/* Quick Factory Stats Pill Grid */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-emerald-200/40 text-center">
                <div className="bg-white/90 rounded-xl p-1.5 border border-emerald-100/80">
                  <p className="text-xs font-black text-slate-800">{machines.length}</p>
                  <p className="text-[9px] font-semibold text-slate-500 uppercase">Machines</p>
                </div>
                <div className="bg-white/90 rounded-xl p-1.5 border border-emerald-100/80">
                  <p className="text-xs font-black text-slate-800">{masters.length}</p>
                  <p className="text-[9px] font-semibold text-slate-500 uppercase">Masters</p>
                </div>
                <div className="bg-white/90 rounded-xl p-1.5 border border-emerald-100/80">
                  <p className="text-xs font-black text-slate-800">{tailors.length}</p>
                  <p className="text-[9px] font-semibold text-slate-500 uppercase">Tailors</p>
                </div>
                <div className="bg-white/90 rounded-xl p-1.5 border border-emerald-100/80">
                  <p className="text-xs font-black text-slate-800">{fabrics.length}</p>
                  <p className="text-[9px] font-semibold text-slate-500 uppercase">Fabric</p>
                </div>
              </div>

              {/* Toggled Task Checklist */}
              {isSetupExpanded && (
                <div className="space-y-1.5 mt-3 pt-2.5 border-t border-emerald-200/40 animate-in fade-in duration-150">
                  {setupTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate(task.route || '/setup')}
                      className="p-2 rounded-xl border bg-white/90 border-emerald-100/80 flex items-center justify-between cursor-pointer hover:bg-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                        <span className="text-xs font-medium text-slate-700">{task.title}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {task.tag}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Setup Progress
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-indigo-600">
                    {progressPercent}% Complete
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/setup')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Manage →
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2.5">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="space-y-1.5">
                {setupTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(task.route || '/setup')}
                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${task.done
                        ? 'bg-slate-50/70 border-slate-200/70 text-slate-600'
                        : 'bg-indigo-50/40 border-indigo-100 hover:bg-indigo-50 text-slate-900'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 flex-shrink-0 ${task.done ? 'text-emerald-500' : 'text-slate-300'
                          }`}
                      />
                      <span className={`text-xs font-medium ${task.done ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${task.done
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-indigo-100 text-indigo-700'
                        }`}
                    >
                      {task.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real-time Activity Feed Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-3">
            {/* Header with live pulse */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Floor Activity Feed
                  </h3>
                  <p className="text-[10px] text-slate-500">Live operational event stream</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200/70">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold text-slate-600">
                  {filteredFeedActivities.length} Recent {filteredFeedActivities.length === 1 ? 'Activity' : 'Activities'}
                </span>
              </div>
            </div>

            {/* Mobile Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={feedSearchQuery}
                onChange={(e) => setFeedSearchQuery(e.target.value)}
                placeholder="Search lot, tailor, master, invoice..."
                className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
              {feedSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFeedSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills (Touch Scrollable) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-nowrap">
              {[
                { id: 'all', label: 'All', icon: Activity, count: feedCategoryCounts.all },
                { id: 'cutting', label: 'Cutting', icon: Scissors, count: feedCategoryCounts.cutting },
                { id: 'stitching', label: 'Stitching', icon: Layers, count: feedCategoryCounts.stitching },
                { id: 'quality', label: 'Quality', icon: ShieldCheck, count: feedCategoryCounts.quality },
                { id: 'delivery', label: 'Delivery', icon: Truck, count: feedCategoryCounts.delivery },
                { id: 'expense', label: 'Expenses', icon: IndianRupee, count: feedCategoryCounts.expense },
              ].map((pill) => {
                const isSelected = feedCategory === pill.id;
                const Icon = pill.icon;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setFeedCategory(pill.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 border border-slate-200/50'
                      }`}
                  >
                    {Icon && <Icon className="w-3 h-3 shrink-0" />}
                    <span>{pill.label}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-full font-black ${isSelected ? 'bg-indigo-700/80 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Activities List */}
            <div className="space-y-2 pt-1">
              {filteredFeedActivities.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No activity recorded</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {feedSearchQuery || feedCategory !== 'all'
                      ? 'No events match your active filters.'
                      : 'Events will appear here as your floor operates.'}
                  </p>
                  {(feedSearchQuery || feedCategory !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setFeedCategory('all');
                        setFeedSearchQuery('');
                      }}
                      className="mt-2.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                filteredFeedActivities.map((act) => {
                  const Icon = act.icon;
                  return (
                    <div
                      key={act.id}
                      onClick={() => navigate(act.route)}
                      className="group p-2.5 rounded-xl border border-slate-200/70 bg-white hover:bg-slate-50/80 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs"
                    >
                      {/* Left: Icon container */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${act.iconBg}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-slate-800 truncate leading-snug">
                              {act.title}
                            </p>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${act.badgeColor}`}
                            >
                              {act.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {act.subtitle}
                          </p>
                          <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">
                            {act.displayDate}
                          </span>
                        </div>
                      </div>

                      {/* Right: Metrics & Chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-900 leading-tight">
                            {act.metric}
                          </p>
                          {act.metricSub && (
                            <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                              {act.metricSub}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
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
