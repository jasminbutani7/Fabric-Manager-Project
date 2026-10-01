import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Scissors,
  Shirt,
  TrendingUp,
  Archive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Phone,
  MapPin,
  Cog,
  LogOut,
  Loader2,
  Trash2,
  IndianRupee,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { useManagement, useFactory, useFabric, useProduction } from '../context/useManagement';
import { useAuth } from '../context/useAuth';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { verifyPassword } from '../utils/cryptoAuth';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';
import LogDailyWorkModal from '../components/modals/LogDailyWorkModal';
import ReviewAcceptWorkModal from '../components/modals/ReviewAcceptWorkModal';
import { formatPieceName } from '../utils/productUtils';
import {
  isAssignmentForTailor,
  isAssignmentActive,
  getTailorAssignmentMetrics,
} from '../utils/tailorHelpers';
import TailorAssignmentsTab from '../components/tailor/TailorAssignmentsTab';
import TailorHistoryTab from '../components/tailor/TailorHistoryTab';
import TailorArchiveTab from '../components/tailor/TailorArchiveTab';

const VALID_TAILOR_TABS = ['assignments', 'history', 'archive'];

export default function TailorPortal() {
  const { tailorId, tab: pathTab } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isInitialized } = useManagement();
  const { tailors = [], machines = [], refreshAllData } = useFactory();
  const { fabrics = [], cuttings = [] } = useFabric();
  const {
    tailorAssignments = [],
    acceptTailorAssignment,
    toggleArchiveTailorAssignment,
    deleteDailyTailorSubmission,
    refreshTailorAssignments,
  } = useProduction();
  const { currentUser, loginAsWorker, logout } = useAuth();

  const rawTab = pathTab || searchParams.get('tab');
  const activeTab = rawTab && VALID_TAILOR_TABS.includes(rawTab.toLowerCase())
    ? rawTab.toLowerCase()
    : 'assignments';

  const setActiveTab = (tab) => {
    navigate(`/portal/tailor/${tailorId}/${tab}`);
  };
  const [archiveSubFilter, setArchiveSubFilter] = useState('orders'); // 'orders' | 'logs'
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [deleteSubConfirm, setDeleteSubConfirm] = useState(null);
  const [assignmentToAccept, setAssignmentToAccept] = useState(null);
  const [expandedAssignmentIds, setExpandedAssignmentIds] = useState(() => new Set());

  const handleLogout = () => {
    logout();
    navigate('/signin', { replace: true });
  };

  // Live approval toast state
  const [approvedToast, setApprovedToast] = useState(null);
  const knownApprovedSubsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  // Auto-sync polling & focus listener to ensure UI auto-updates whenever Master accepts work
  useEffect(() => {
    const doSync = () => {
      if (refreshAllData) refreshAllData();
      else if (refreshTailorAssignments) refreshTailorAssignments();
    };

    const handleFocus = () => {
      doSync();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        doSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshTailorAssignments, refreshAllData]);

  // Resolve tailor: memoized from database or from URL query params
  const queryName = searchParams.get('name');
  const queryPhone = searchParams.get('phone');
  const [dbTailor, setDbTailor] = useState(null);

  // Directly fetch tailor info from Supabase if opening directly via /portal/tailor/:tailorId
  useEffect(() => {
    if (!tailorId || !isSupabaseConfigured || !supabase) return;
    let isMounted = true;
    const fetchTailorDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('tailors')
          .select('id, name, phone, role, assigned_machine_id, user_id, specialty, status')
          .eq('id', tailorId)
          .maybeSingle();
        if (!error && data && isMounted) {
          setDbTailor({
            id: data.id,
            name: data.name,
            phone: data.phone || '',
            role: 'Tailor',
            assignedMachineId: data.assigned_machine_id || data.assignedMachineId || null,
            user_id: data.user_id,
          });
        }

      } catch (err) {
        console.error('Failed to fetch tailor info', err);
      }
    };
    fetchTailorDetails();
    return () => {
      isMounted = false;
    };
  }, [tailorId]);

  const tailor = useMemo(() => {
    let found = tailors.find((t) => String(t.id) === String(tailorId));
    if (!found && dbTailor && String(dbTailor.id) === String(tailorId)) {
      found = dbTailor;
    }
    if (!found && queryPhone) {
      const qPhone = queryPhone.replace(/\D/g, '');
      if (qPhone) {
        found = tailors.find((t) => t.phone && t.phone.replace(/\D/g, '') === qPhone);
      }
    }
    if (!found && queryName) {
      found = tailors.find(
        (t) => t.name && t.name.trim().toLowerCase() === queryName.trim().toLowerCase()
      );
    }
    if (!found && tailorAssignments?.length > 0) {
      const linkedAsgn = tailorAssignments.find(
        (a) => String(a.tailorId || a.tailor_id || '') === String(tailorId)
      );
      if (linkedAsgn) {
        found = {
          id: tailorId,
          name: linkedAsgn.tailorName || linkedAsgn.tailor_name || 'Tailor',
          phone: linkedAsgn.tailorPhone || linkedAsgn.tailor_phone || '',
          assignedMachineId: linkedAsgn.machineId || linkedAsgn.machine_id,
          role: 'Tailor',
          user_id: linkedAsgn.user_id,
        };
      }
    }
    if (!found && machines?.length > 0) {
      const linkedMachine = machines.find(
        (m) => String(m.assignedTailorId || m.currentTailorId || '') === String(tailorId)
      );
      if (linkedMachine) {
        found = {
          id: tailorId,
          name: linkedMachine.assignedTailorName || 'Tailor',
          assignedMachineId: linkedMachine.id,
          role: 'Tailor',
          user_id: linkedMachine.user_id,
        };
      }
    }
    if (found) return found;
    if (queryName || tailorId) {
      return {
        id: tailorId,
        name: queryName || 'Tailor',
        phone: queryPhone || '',
        role: 'Tailor',
      };
    }
    return null;
  }, [tailors, tailorId, queryName, queryPhone, dbTailor, tailorAssignments, machines]);

  // Worker authentication state check
  const isTailorAuthenticated = Boolean(
    currentUser &&
    String(currentUser.id) === String(tailorId) &&
    (currentUser.role === 'Tailor' || currentUser.role === 'Admin')
  );

  // Tailor's assigned machine
  const machine = machines.find(
    (m) =>
      m.id === tailor?.assignedMachineId ||
      m.code === tailor?.assignedMachineId ||
      m.assignedTailorId === tailor?.id
  );

  const assignments = tailorAssignments.filter((a) =>
    isAssignmentForTailor(a, tailor, machine, tailorId, queryName)
  );

  // Detect live Master approvals and trigger celebration notification strictly for THIS tailor
  useEffect(() => {
    if (!assignments || assignments.length === 0) return;

    const currentApproved = new Set();
    const newApprovals = [];

    const currentTailorId = String(tailor?.id || tailorId || '').trim();
    const targetUserId = String(tailor?.user_id || tailor?.userId || currentUser?.user_id || currentUser?.adminUserId || '').trim();

    if (!currentTailorId) return;

    assignments.forEach((a) => {
      // Strict tailor validation: must belong explicitly to this tailor
      const aTailorId = String(a.tailorId || a.tailor_id || '').trim();
      if (!aTailorId || aTailorId !== currentTailorId) {
        return;
      }
      // Strict admin/tenant validation: if tenant is known, must match tenant
      const aUserId = String(a.user_id || a.userId || '').trim();
      if (targetUserId && aUserId && aUserId !== targetUserId) {
        return;
      }

      (a.dailySubmissions || []).forEach((s) => {
        if (s.approvalStatus === 'Approved') {
          currentApproved.add(s.id);
          if (!isFirstLoadRef.current && !knownApprovedSubsRef.current.has(s.id)) {
            newApprovals.push({
              id: s.id,
              qty: parseInt(s.quantity, 10) || parseInt(s.pscQuantity, 10) || 0,
              fabricName: a.fabricName || 'Garment',
              approvedBy: s.approvedBy || 'Cutting Master',
            });
          }
        }
      });
    });

    knownApprovedSubsRef.current = currentApproved;

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      return;
    }

    if (newApprovals.length > 0) {
      const latest = newApprovals[0];
      const timer = setTimeout(() => {
        setApprovedToast({
          id: latest.id,
          message: `Master ${latest.approvedBy} verified ${latest.qty} PCs for ${latest.fabricName}!`,
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [assignments, tailorId, tailor, currentUser]);

  // Auto-dismiss approved toast after 4 seconds
  useEffect(() => {
    if (!approvedToast) return;
    const timer = setTimeout(() => {
      setApprovedToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [approvedToast]);

  // Loading state while remote storage is syncing and tailor not yet resolved
  if (!isInitialized && !tailor) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-sm w-full rounded-3xl p-6 text-center shadow-xl border border-slate-200 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Connecting Tailor Portal...</h3>
          <p className="text-xs text-slate-500">Retrieving assigned stitching work</p>
        </div>
      </div>
    );
  }

  // If tailor not found
  if (!tailor) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-6 text-center shadow-xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Tailor Portal Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This Tailor portal link may have expired or the record does not exist. Please contact your factory admin to receive an updated link.
          </p>
          <Link
            to="/signin"
            className="inline-block px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md"
          >
            Go to Factory Login
          </Link>
        </div>
      </div>
    );
  }

  // Security gate: require PIN verification before granting access
  if (!isTailorAuthenticated) {
    return (
      <TailorPinGate
        tailor={tailor}
        onVerifySuccess={(verifiedWorker) => {
          const w = verifiedWorker || tailor;
          loginAsWorker({
            id: w.id,
            name: w.name,
            phone: w.phone,
            role: 'Tailor',
            companyName: 'Fabric Factory',
            user_id: w.user_id || w.userId || w.adminUserId,
            token: w.token || verifiedWorker?.token || null,
          });
        }}
      />
    );
  }


  const activeAssignments = assignments.filter((a) => isAssignmentActive(a, fabrics));
  const archivedAssignments = assignments.filter((a) => !isAssignmentActive(a, fabrics));

  const toggleAssignmentExpand = (id) => {
    setExpandedAssignmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandableAssignments = activeAssignments.filter((a) => {
    const hasSubs = (a.dailySubmissions || []).length > 0;
    const isPending =
      (!a.tailorAccepted || a.status === 'Pending Acceptance') &&
      !hasSubs &&
      (parseInt(a.completedQuantity, 10) || 0) === 0;
    if (isPending) return false;
    const m = getTailorAssignmentMetrics(a, { cuttings, fabrics });
    if (m.leftToStitch === 0 && m.pendingReview > 0) return false;
    return true;
  });

  const isAllAssignmentsExpanded =
    expandableAssignments.length > 0 &&
    expandableAssignments.every((a) => expandedAssignmentIds.has(a.id));

  const toggleAllAssignmentsExpand = () => {
    if (isAllAssignmentsExpanded) {
      setExpandedAssignmentIds(new Set());
    } else {
      setExpandedAssignmentIds(new Set(expandableAssignments.map((a) => a.id)));
    }
  };

  // Active workload stats (Garment / Sub-part Pcs)
  let activeAssignedPieces = 0;
  let activeCompletedPieces = 0;
  let activePendingPieces = 0;
  let activeRemainingPieces = 0;

  activeAssignments.forEach((a) => {
    const m = getTailorAssignmentMetrics(a, { cuttings, fabrics });
    activeAssignedPieces += m.assigned;
    activeCompletedPieces += m.approvedDone;
    activePendingPieces += m.pendingReview;
    activeRemainingPieces += m.leftToStitch;
  });

  // Archived workload stats
  const archivedCompletedPieces = archivedAssignments.reduce(
    (acc, a) => acc + getTailorAssignmentMetrics(a, { cuttings, fabrics }).approvedDone,
    0
  );

  // Calculate verified vs pending earnings across active & archived
  let totalApprovedEarned = 0;
  let totalPendingEarned = 0;

  assignments.forEach((a) => {
    const m = getTailorAssignmentMetrics(a, { cuttings, fabrics });
    totalApprovedEarned += m.batchApprovedEarned;
    totalPendingEarned += m.batchPendingEarned;
  });

  // Flat list of all daily submissions
  const allSubmissions = assignments
    .flatMap((a) => {
      const m = getTailorAssignmentMetrics(a, { cuttings, fabrics });
      const isJobActive = isAssignmentActive(a, fabrics);
      const cutting = (cuttings || []).find((c) => c.id === a.cuttingId);
      const fabric = (fabrics || []).find((f) => f.id === (cutting?.fabricId || a.fabricId));
      const spList = m.subPartsBreakdown || [];
      const rates = a.tailorRates || cutting?.tailorRates || fabric?.tailorRates || {};

      return (a.dailySubmissions || []).map((s) => {
        let subQty = parseInt(s.pscQuantity, 10) || 0;
        if (subQty === 0 && s.subParts && typeof s.subParts === 'object') {
          subQty = Object.values(s.subParts).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
        }
        if (subQty === 0) subQty = parseInt(s.quantity, 10) || 0;

        let subEarned = 0;
        if (s.subParts && typeof s.subParts === 'object' && Object.keys(s.subParts).length > 0) {
          Object.entries(s.subParts).forEach(([k, v]) => {
            const cnt = parseInt(v, 10) || 0;
            const spObj = spList?.find((p) => p.id === k || p.name?.toLowerCase() === k.toLowerCase());
            const pRate = spObj?.rate ? parseFloat(spObj.rate) : (parseFloat(rates[k]) || parseFloat(rates[k?.toLowerCase()]) || m.rate);
            subEarned += cnt * pRate;
          });
          subEarned = Math.round(subEarned * 100) / 100;
        } else if (s.earnedAmount !== undefined && s.earnedAmount !== null) {
          subEarned = parseFloat(s.earnedAmount);
        } else {
          const subRate = parseFloat(s.ratePerPiece) > 0 ? parseFloat(s.ratePerPiece) : m.rate;
          subEarned = Math.round(subQty * subRate * 100) / 100;
        }

        const effectiveRate = subQty > 0 ? Math.round((subEarned / subQty) * 100) / 100 : m.rate;

        return {
          ...s,
          assignmentId: a.id,
          fabricId: a.fabricId || cutting?.fabricId,
          cuttingId: a.cuttingId,
          fabricName: a.fabricName,
          masterName: a.masterName,
          pieceType: s.pieceType || m.pieceType,
          ratePerPiece: effectiveRate,
          earnedAmount: subEarned,
          approvalStatus: s.approvalStatus || 'Approved',
          approvedBy: s.approvedBy || null,
          approvedAt: s.approvedAt || null,
          rejectionReason: s.rejectionReason || null,
          isJobActive,
        };
      });
    })
    .sort((x, y) => new Date(y.createdAt || y.date) - new Date(x.createdAt || x.date));

  // Active submissions: ONLY submissions from active jobs (archived fabric lot logs move to archive)
  const activeSubmissions = allSubmissions.filter(
    (s) => s.isJobActive
  );

  // Archived submissions: submissions belonging to completed / archived jobs
  const archivedSubmissions = allSubmissions.filter(
    (s) => !s.isJobActive
  );

  const pendingSubmissions = allSubmissions.filter(
    (s) => s.isJobActive && (s.approvalStatus === 'Pending Approval' || s.approvalStatus === 'Pending')
  );
  const pendingSubmissionsCount = pendingSubmissions.length;
  const pendingPcsCount = pendingSubmissions.reduce(
    (sum, s) => sum + (parseInt(s.pscQuantity, 10) || parseInt(s.quantity, 10) || 0),
    0
  );

  const rejectedSubmissions = allSubmissions.filter(
    (s) => s.approvalStatus === 'Rejected' && s.isJobActive
  );
  const rejectedSubmissionsCount = rejectedSubmissions.length;
  const rejectedPcsCount = rejectedSubmissions.reduce(
    (sum, s) => sum + (parseInt(s.pscQuantity, 10) || parseInt(s.quantity, 10) || 0),
    0
  );

  // Derive human-friendly piece breakdown for pending submissions banner
  let pendingPiecesSummary = '';
  if (pendingSubmissions.length > 0) {
    const partCounts = {};
    let generic = 0;
    let genericLabel = 'PCs';

    pendingSubmissions.forEach((s) => {
      if (s.subParts && typeof s.subParts === 'object') {
        Object.entries(s.subParts).forEach(([k, v]) => {
          const qty = parseInt(v, 10) || 0;
          if (qty > 0) {
            partCounts[k] = (partCounts[k] || 0) + qty;
          }
        });
      } else {
        const qty = parseInt(s.pscQuantity, 10) || parseInt(s.quantity, 10) || 0;
        generic += qty;
        if (s.pieceType && s.pieceType !== 'PCs') {
          genericLabel = s.pieceType;
        }
      }
    });

    const parts = [];
    Object.entries(partCounts).forEach(([k, qty]) => {
      const label = k.charAt(0).toUpperCase() + k.slice(1);
      parts.push(`${qty} ${formatPieceName(label, qty)}`);
    });
    if (generic > 0) parts.push(`${generic} ${formatPieceName(genericLabel, generic)}`);
    pendingPiecesSummary = parts.length > 0 ? parts.join(', ') : `${pendingPcsCount} PCs`;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Floating Live Approval Notification Toast */}
      {approvedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] px-2 animate-in slide-in-from-top-3 duration-300">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 rounded-2xl shadow-xl border border-emerald-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black">Work Approved by Master!</h4>
                <p className="text-[11px] text-emerald-100 font-medium truncate">
                  {approvedToast.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setApprovedToast(null)}
              className="text-white/80 hover:text-white text-xs font-bold p-1 cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 py-2.5 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs font-bold shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-sm font-extrabold text-slate-900 leading-tight truncate">
                  {tailor.name}
                </h1>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.2 rounded-full shrink-0">
                  Tailor
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate">
                  {machine ? `${machine.code} • ${machine.line || 'Block A'}` : 'Float / Standby'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              title="Auto-Logged In via Secure Device Link"
              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Auto-Logged In</span>
            </span>
            <button
              onClick={handleLogout}
              title="Log Out"
              className="px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Tailor Profile & Machine Card */}
        <div className="p-4 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl shadow-xl shadow-emerald-950/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-200 text-lg font-black border border-white/10">
                {tailor.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-base font-bold">{tailor.name}</h2>
                <p className="text-xs text-emerald-200">
                  {machine ? (
                    <span className="flex items-center gap-1">
                      <Cog className="w-3.5 h-3.5" />
                      <span>{machine.name} ({machine.code})</span>
                    </span>
                  ) : (
                    'No machine assigned'
                  )}
                </p>
              </div>
            </div>
            {tailor.phone && (
              <a
                href={`tel:${tailor.phone}`}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                title="Call"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Machine Badge banner */}
          {machine && (
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                <span className="font-semibold">{machine.line ? (machine.line.toLowerCase().startsWith('block') ? machine.line : `Block ${machine.line}`) : 'Block A'}</span>
              </div>
              <span className="font-mono text-xs bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-md font-bold">
                {machine.code}
              </span>
            </div>
          )}

          {/* KPI Mini-Tiles - Matching Master Portal's 5-grid style */}
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5 pt-2 border-t border-white/10 text-center">
            <div className="p-1 sm:p-1.5 bg-white/5 rounded-xl">
              <span className="text-[8px] sm:text-[9px] text-emerald-200 font-bold uppercase block leading-none mb-1">
                <span className="hidden sm:inline">Active Jobs</span>
                <span className="sm:hidden">Active</span>
              </span>
              <span className="text-xs sm:text-sm font-black text-white">{activeAssignments.length}</span>
            </div>
            <div className="p-1 sm:p-1.5 bg-white/5 rounded-xl">
              <span className="text-[8px] sm:text-[9px] text-emerald-200 font-bold uppercase block leading-none mb-1">
                <span className="hidden sm:inline">Total Assigned</span>
                <span className="sm:hidden">Assigned</span>
              </span>
              <span className="text-xs sm:text-sm font-black text-white">{activeAssignedPieces}</span>
            </div>
            <div className="p-1 sm:p-1.5 bg-white/5 rounded-xl">
              <span className="text-[8px] sm:text-[9px] text-emerald-200 font-bold uppercase block leading-none mb-1">
                <span className="hidden sm:inline">Stitched Done</span>
                <span className="sm:hidden">Stitched</span>
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-400">{activeCompletedPieces}</span>
            </div>
            <div className="p-1 sm:p-1.5 bg-white/5 rounded-xl">
              <span className="text-[8px] sm:text-[9px] text-amber-300 font-bold uppercase block leading-none mb-1">
                <span className="hidden sm:inline">In Review</span>
                <span className="sm:hidden">Review</span>
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-300">
                {activePendingPieces}
              </span>
            </div>
            <div className="p-1 sm:p-1.5 bg-white/5 rounded-xl">
              <span className="text-[8px] sm:text-[9px] text-emerald-200 font-bold uppercase block leading-none mb-1">
                <span className="hidden sm:inline">To Stitch</span>
                <span className="sm:hidden">To Stitch</span>
              </span>
              <span className="text-xs sm:text-sm font-black text-white">{activeRemainingPieces}</span>
            </div>
          </div>

          {/* Earnings Strip */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-emerald-200">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="font-semibold text-[11px]">Approved Earnings:</span>
              <strong className="text-white text-sm font-black">₹{Math.round(totalApprovedEarned).toLocaleString('en-IN')}</strong>
            </div>
            {totalPendingEarned > 0 && (
              <span className="text-[10px] font-bold text-amber-200 bg-amber-400/20 px-2 py-0.5 rounded-lg border border-amber-300/30 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-300 animate-pulse" />
                <span>+₹{Math.round(totalPendingEarned).toLocaleString('en-IN')} in Master Review</span>
              </span>
            )}
          </div>

          {/* Pending Verification Notice Banner */}
          {pendingSubmissionsCount > 0 && (
            <div className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-2xl flex items-center justify-between text-xs text-amber-100 gap-2">
              <span className="flex items-center gap-2 font-medium min-w-0 flex-1">
                <Clock className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
                <span className="text-[11px] leading-tight">
                  <strong>{pendingSubmissionsCount}</strong> submission(s) ({pendingPiecesSummary}) awaiting Master count &amp; verification
                </span>
              </span>
              {activeTab !== 'history' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="text-[10px] font-black bg-amber-400/30 hover:bg-amber-400/40 text-amber-100 px-2.5 py-1 rounded-lg border border-amber-300/30 transition-colors shrink-0 cursor-pointer"
                >
                  View Logs
                </button>
              )}
            </div>
          )}

          {/* Rejected Submissions Notice Banner */}
          {rejectedSubmissionsCount > 0 && (
            <div className="p-2.5 bg-rose-500/25 border border-rose-400/50 rounded-2xl flex items-center justify-between text-xs text-rose-100 gap-2 animate-in fade-in">
              <span className="flex items-center gap-2 font-medium min-w-0 flex-1">
                <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
                <span className="text-[11px] leading-tight">
                  <strong>{rejectedSubmissionsCount}</strong> submission(s) ({rejectedPcsCount} PCs) rejected by Master — check reason
                </span>
              </span>
              {activeTab !== 'history' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="text-[10px] font-black bg-rose-500/40 hover:bg-rose-500/60 text-white px-2.5 py-1 rounded-lg border border-rose-300/40 transition-colors shrink-0 cursor-pointer"
                >
                  View Reason →
                </button>
              )}
            </div>
          )}

          {/* Archived summary strip */}
          {archivedAssignments.length > 0 && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200">
              <span className="flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>
                  <strong>{archivedAssignments.length}</strong> completed orders in Archive ({archivedCompletedPieces} PCs)
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('archive');
                  setArchiveSubFilter('orders');
                }}
                className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View Archive</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Switcher - Mobile Friendly 3-Column Grid */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer ${activeTab === 'assignments'
              ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-black/5 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <Scissors className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Active ({activeAssignments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer relative ${activeTab === 'history'
              ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-black/5 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <div className="relative flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              {pendingSubmissionsCount > 0 && (
                <span className="sm:hidden absolute -top-1.5 -right-2 px-1 py-0.2 bg-amber-500 text-white text-[8px] font-black rounded-full animate-pulse">
                  {pendingSubmissionsCount}
                </span>
              )}
            </div>
            <span className="truncate">Logs ({activeSubmissions.length})</span>
            {pendingSubmissionsCount > 0 && (
              <span className="hidden sm:inline-block px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-extrabold rounded-full animate-pulse">
                {pendingSubmissionsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer ${activeTab === 'archive'
              ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-black/5 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <Archive className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Archive ({archivedAssignments.length})</span>
          </button>
        </div>

        {/* ==================== TAB 1: ACTIVE STITCHING WORK ==================== */}
        {activeTab === 'assignments' && (
          <TailorAssignmentsTab
            activeAssignments={activeAssignments}
            archivedAssignments={archivedAssignments}
            expandableAssignments={expandableAssignments}
            isAllAssignmentsExpanded={isAllAssignmentsExpanded}
            toggleAllAssignmentsExpand={toggleAllAssignmentsExpand}
            expandedAssignmentIds={expandedAssignmentIds}
            toggleAssignmentExpand={toggleAssignmentExpand}
            cuttings={cuttings}
            fabrics={fabrics}
            onAcceptAssignment={(a) => setAssignmentToAccept(a)}
            onSubmitStitched={(a) => {
              setSelectedAssignment(a);
              setShowLogModal(true);
            }}
            onArchiveAssignment={(id) => toggleArchiveTailorAssignment(id, true)}
            setActiveTab={setActiveTab}
            setArchiveSubFilter={setArchiveSubFilter}
          />
        )}

        {/* ==================== TAB 2: WORK SUBMISSIONS ==================== */}
        {activeTab === 'history' && (
          <TailorHistoryTab
            activeSubmissions={activeSubmissions}
            archivedSubmissions={archivedSubmissions}
            pendingSubmissionsCount={pendingSubmissionsCount}
            rejectedSubmissionsCount={rejectedSubmissionsCount}
            rejectedPcsCount={rejectedPcsCount}
            tailorAssignments={tailorAssignments}
            cuttings={cuttings}
            fabrics={fabrics}
            onDeleteSubmission={(confirmData) => setDeleteSubConfirm(confirmData)}
            setActiveTab={setActiveTab}
            setArchiveSubFilter={setArchiveSubFilter}
          />
        )}

        {/* ==================== TAB 3: ARCHIVE (COMPLETED & APPROVED DATA) ==================== */}
        {activeTab === 'archive' && (
          <TailorArchiveTab
            archivedAssignments={archivedAssignments}
            archivedSubmissions={archivedSubmissions}
            archiveSubFilter={archiveSubFilter}
            setArchiveSubFilter={setArchiveSubFilter}
            totalApprovedEarned={totalApprovedEarned}
            cuttings={cuttings}
            fabrics={fabrics}
            tailorAssignments={tailorAssignments}
            toggleArchiveTailorAssignment={toggleArchiveTailorAssignment}
          />
        )}
      </main>

      {/* Daily Work Logging Modal */}
      {selectedAssignment && (
        <LogDailyWorkModal
          key={selectedAssignment.id}
          isOpen={showLogModal}
          onClose={() => {
            setShowLogModal(false);
            setSelectedAssignment(null);
          }}
          assignment={
            tailorAssignments.find((a) => a.id === selectedAssignment.id) || selectedAssignment
          }
        />
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
          machineName={machine?.name}
        />
      )}

      {/* Delete Submission Confirmation Modal */}
      {deleteSubConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-100 shadow-2xl space-y-3 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {deleteSubConfirm.isRejected ? 'Dismiss Rejected Log?' : 'Undo Work Submission?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {deleteSubConfirm.isRejected ? (
                  <>
                    Are you sure you want to dismiss this rejected log of{' '}
                    <strong className="text-slate-800">{deleteSubConfirm.qty} PCs</strong> for{' '}
                    <span className="font-semibold">{deleteSubConfirm.fabricName}</span>?
                  </>
                ) : (
                  <>
                    Are you sure you want to remove this submission of{' '}
                    <strong className="text-slate-800">{deleteSubConfirm.qty} PCs</strong> for{' '}
                    <span className="font-semibold">{deleteSubConfirm.fabricName}</span>?
                  </>
                )}
              </p>
              {deleteSubConfirm.isRejected ? (
                <div className="mt-2 p-2 bg-slate-100 rounded-xl text-slate-700 text-xs font-semibold">
                  These {deleteSubConfirm.qty} pieces are already restored in your stitch quota so you can re-submit them anytime.
                </div>
              ) : (
                <div className="mt-2 p-2 bg-rose-50 rounded-xl text-rose-800 text-xs font-bold">
                  Your pending amount will reduce by ₹{Math.round(deleteSubConfirm.earned)}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteSubConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteDailyTailorSubmission(
                    deleteSubConfirm.assignmentId,
                    deleteSubConfirm.submissionId
                  );
                  setDeleteSubConfirm(null);
                }}
                className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl transition-all cursor-pointer ${
                  deleteSubConfirm.isRejected
                    ? 'bg-slate-800 hover:bg-slate-900 shadow-md'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200'
                }`}
              >
                {deleteSubConfirm.isRejected ? 'Dismiss Log' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TailorPinGate({ tailor, onVerifySuccess }) {
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const cleanPhone = (tailor?.phone || '').replace(/\D/g, '');
  const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : '';
  const maskedPhone = cleanPhone.length === 10
    ? `+91 ${cleanPhone.slice(0, 2)}••••••${cleanPhone.slice(-2)}`
    : tailor?.phone || '';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    const entered = pin.trim();
    if (!entered) {
      setError('Please enter your 4-digit PIN or password.');
      return;
    }

    try {
      setLoading(true);

      // Verify PIN via secure database RPC without exposing password hashes
      if (isSupabaseConfigured && supabase) {
        const { data: vResult, error: vErr } = await supabase.rpc('verify_worker_pin', {
          p_worker_id: tailor.id,
          p_role: 'Tailor',
          p_pin: entered,
          p_phone: cleanPhone || null,
        });

        if (!vErr && vResult?.success) {
          const workerData = { ...(vResult.worker || tailor) };
          if (vResult.token) workerData.token = vResult.token;
          onVerifySuccess(workerData);
          return;
        } else {
          setError(vResult?.error || 'Incorrect PIN or password. Default is tailor123 or check with Admin.');
          return;
        }
      }

      // Offline / local fallback check
      let isValid = false;
      if (tailor?.password) {
        if (tailor.password === entered) isValid = true;
        else {
          try {
            const res = await verifyPassword(entered, tailor.password);
            isValid = res.valid;
          } catch {}
        }
      } else if (entered === 'tailor123' || (last4 && entered === last4)) {
        isValid = true;
      }

      if (isValid) {
        onVerifySuccess(tailor);
      } else {
        setError('Incorrect PIN or password. Default is tailor123 or the last 4 digits of your mobile number.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[420px] mx-auto">
        {/* Brand & Header matching Admin sign in */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-200 mb-2.5 sm:mb-3 transition-all duration-300">
            <Shirt className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Fabric Manager
          </h1>
          <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 border rounded-full bg-teal-50 border-teal-100/80 text-teal-700 transition-all">
            <Shirt className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              Tailor Portal Verification
            </span>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
            Enter your security PIN or password to unlock your stitching jobs and earnings
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white py-6 px-5 sm:py-7 sm:px-7 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-100">
          {/* Worker Identity Card */}
          <div className="mb-5 bg-teal-50/70 border border-teal-100/80 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              {tailor?.name?.charAt(0) || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900 truncate">{tailor?.name || 'Tailor'}</p>
                <span className="text-[10px] font-bold bg-teal-100/80 text-teal-700 px-2 py-0.5 rounded-full shrink-0">
                  Tailor
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs text-slate-500">
                {maskedPhone && (
                  <span className="font-mono whitespace-nowrap font-medium">
                    {maskedPhone}
                  </span>
                )}
                {tailor?.assignedMachineId && (
                  <span
                    className="inline-flex items-center text-[10px] font-mono text-slate-600 bg-white/90 px-1.5 py-0.5 rounded-md border border-teal-200/70 truncate max-w-[150px] shadow-2xs"
                    title={`Machine: ${tailor.assignedMachineId}`}
                  >
                    Mach. #{String(tailor.assignedMachineId).replace(/^mch_/, '')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Error notification */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Enter PIN / Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-500 p-1 -mr-1 cursor-pointer touch-manipulation"
                >
                  Forgot PIN?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                  autoComplete="current-password"
                  placeholder="4-digit PIN or password"
                  className="w-full pl-10 pr-11 py-3 sm:py-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer touch-manipulation"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                Default PIN is <span className="font-semibold text-slate-600">tailor123</span> or the last 4 digits of your phone.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 min-h-[46px] sm:min-h-[48px] py-3 sm:py-3.5 px-4 bg-teal-600 hover:bg-teal-700 shadow-teal-200 active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer touch-manipulation"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Unlock Stitching Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
              <span>Need to sign in as Administrator?</span>
              <Link
                to="/signin"
                className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>Factory Admin Login</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </p>
          </div>
        </div>

        {/* Trust Badges matching Admin sign in */}
        <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Secure Access
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Fast PIN Login
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Mobile Ready
          </span>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        initialRole="Tailor"
        initialPhone={tailor?.phone || ''}
      />
    </div>
  );
}
