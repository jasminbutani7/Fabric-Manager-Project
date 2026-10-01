import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Scissors,
  Layers,
  Phone,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  UserCheck,
  LogOut,
  Loader2,
  X,
  Archive,
  PackageCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { useManagement, useFactory, useFabric, useProduction } from '../context/useManagement';
import { getSubmissionPscDetails } from '../context/managementContextInstance';
import { getHandoversBreakdownSummary, isEntityArchived } from '../utils/productUtils';
import { useAuth } from '../context/useAuth';
import { verifyPassword } from '../utils/cryptoAuth';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';
import RecordCuttingModal from '../components/modals/RecordCuttingModal';
import AssignTailorModal from '../components/modals/AssignTailorModal';
import SubmitToAdminModal from '../components/modals/SubmitToAdminModal';
import ReviewAcceptFabricModal from '../components/modals/ReviewAcceptFabricModal';
import ReviewAcceptWorkModal from '../components/modals/ReviewAcceptWorkModal';

import MasterFabricsTab from '../components/master/MasterFabricsTab';
import MasterCuttingsTab from '../components/master/MasterCuttingsTab';
import MasterAssignmentsTab from '../components/master/MasterAssignmentsTab';
import MasterTrimmingTab from '../components/master/MasterTrimmingTab';
import MasterHelpersTab from '../components/master/MasterHelpersTab';
import MasterArchiveTab from '../components/master/MasterArchiveTab';
import MasterAssignTrimmingModal from '../components/modals/MasterAssignTrimmingModal';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  isFabricAssignedToMaster,
  isCuttingForMaster,
  isHelperAvailableToMaster,
} from '../utils/masterHelpers';

const VALID_MASTER_TABS = ['fabrics', 'cuttings', 'assignments', 'trimming', 'helpers', 'archive'];

export default function MasterPortal() {
  const { masterId } = useParams();
  const [searchParams] = useSearchParams();
  const { isInitialized } = useManagement();
  const { masters = [] } = useFactory();
  const { currentUser, loginAsWorker } = useAuth();
  const [dbMaster, setDbMaster] = useState(null);

  // Directly fetch master info from Supabase if opening directly via /portal/master/:masterId
  useEffect(() => {
    if (!masterId || !isSupabaseConfigured || !supabase) return;
    let isMounted = true;
    const fetchMasterDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('masters')
          .select('id, name, phone, role, user_id, specialization, experience, status')
          .eq('id', masterId)
          .maybeSingle();
        if (!error && data && isMounted) {

          setDbMaster({
            id: data.id,
            name: data.name,
            phone: data.phone || '',
            role: 'Master',
            user_id: data.user_id,
            specialization: data.specialization || '',
            experience: data.experience || '',
          });
        }
      } catch (err) {
        console.error('Failed to fetch master info', err);
      }
    };
    fetchMasterDetails();
    return () => {
      isMounted = false;
    };
  }, [masterId]);

  // Resolve master: memoized from database or from URL query params (with multi-field fallback)
  const queryName = searchParams.get('name');
  const queryPhone = searchParams.get('phone');
  const master = useMemo(() => {
    let found = masters.find((m) => String(m.id) === String(masterId));
    if (!found && dbMaster && String(dbMaster.id) === String(masterId)) {
      found = dbMaster;
    }
    if (!found && queryPhone) {
      const qPhone = queryPhone.replace(/\D/g, '');
      if (qPhone) {
        found = masters.find((m) => m.phone && m.phone.replace(/\D/g, '') === qPhone);
      }
    }
    if (!found && queryName) {
      found = masters.find(
        (m) => m.name && m.name.trim().toLowerCase() === queryName.trim().toLowerCase()
      );
    }
    if (found) return found;
    if (queryName || masterId) {
      return {
        id: masterId,
        name: queryName || 'Master',
        phone: queryPhone || '',
        role: 'Master',
      };
    }
    return null;
  }, [masters, masterId, queryName, queryPhone, dbMaster]);

  // Worker authentication state check
  const isMasterAuthenticated = Boolean(
    currentUser &&
    String(currentUser.id) === String(masterId) &&
    (currentUser.role === 'Master' || currentUser.role === 'Admin')
  );

  // Loading state while remote storage is syncing and master not yet resolved
  if (!isInitialized && !master) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-xs font-bold text-slate-700">Connecting to Master Portal...</p>
        </div>
      </div>
    );
  }

  // If master not found
  if (!master) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-6 text-center shadow-xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Portal Link Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This Master portal link may have expired or the record does not exist. Please contact your factory admin to receive an updated link.
          </p>
          <Link
            to="/signin"
            className="inline-block px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md"
          >
            Go to Factory Login
          </Link>
        </div>
      </div>
    );
  }

  // Security gate: require PIN verification before granting access
  if (!isMasterAuthenticated) {
    return (
      <MasterPinGate
        master={master}
        onVerifySuccess={(verifiedWorker) => {
          const w = verifiedWorker || master;
          loginAsWorker({
            id: w.id,
            name: w.name,
            phone: w.phone,
            role: 'Master',
            companyName: 'Fabric Manager',
            user_id: w.user_id || w.userId || w.adminUserId,
            token: w.token || verifiedWorker?.token || null,
          });
        }}
      />
    );
  }


  return (
    <MasterPortalDashboard
      master={master}
      masterId={masterId}
      queryName={queryName}
      queryPhone={queryPhone}
    />
  );
}

function MasterPortalDashboard({ master, masterId, queryName, queryPhone }) {
  const { tab: pathTab } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    fabrics = [],
    cuttings = [],
    toggleArchiveFabric,
    updateFabric,
    getCuttingBalance,
    getProductStructure,
  } = useFabric();
  const { helpers = [], refreshAllData } = useFactory();
  const {
    tailorAssignments = [],
    masterHandovers = [],
    threadCuttingAssignments = [],
    assignThreadCutting,
    updateThreadCuttingProgress,
    deleteThreadCuttingAssignment,
    getMasterHandoverStats,
    approveDailyTailorSubmission,
    approveAllDailyTailorSubmissions,
    rejectDailyTailorSubmission,
    acceptTailorAssignment,
  } = useProduction();
  const { logout } = useAuth();

  // Auto-sync polling & focus listener to ensure Master Portal auto-updates whenever activities happen
  useEffect(() => {
    if (!refreshAllData) return;

    const handleFocus = () => {
      refreshAllData();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAllData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshAllData]);

  const [showCutModal, setShowCutModal] = useState(false);
  const [editingCutting, setEditingCutting] = useState(null);
  const [selectedFabricId, setSelectedFabricId] = useState(null);
  const [showAssignTailorModal, setShowAssignTailorModal] = useState(false);
  const [selectedCuttingForAssign, setSelectedCuttingForAssign] = useState(null);
  const [showSubmitToAdminModal, setShowSubmitToAdminModal] = useState(false);
  const [selectedCuttingForHandover, setSelectedCuttingForHandover] = useState(null);
  const [selectedFabricForHandover, setSelectedFabricForHandover] = useState(null);
  const [showAssignTrimmingModal, setShowAssignTrimmingModal] = useState(false);
  const [assignTrimmingMode, setAssignTrimmingMode] = useState('assign');
  const [fabricToAccept, setFabricToAccept] = useState(null);
  const [assignmentToAccept, setAssignmentToAccept] = useState(null);

  const rawTab = pathTab || searchParams.get('tab');
  const activeTab = rawTab && VALID_MASTER_TABS.includes(rawTab.toLowerCase())
    ? rawTab.toLowerCase()
    : 'fabrics';

  const setActiveTab = (tab) => {
    navigate(`/portal/master/${masterId}/${tab}`);
  };

  const [archiveSubFilter, setArchiveSubFilter] = useState('fabrics'); // 'fabrics' | 'cuttings' | 'assignments' | 'trimming'
  const [rejectModal, setRejectModal] = useState(null); // { assignmentId, submissionId, tailorName, qty, fabricName }
  const [rejectReason, setRejectReason] = useState('');
  const [expandedFabricIds, setExpandedFabricIds] = useState(() => new Set());
  const [expandedCuttingIds, setExpandedCuttingIds] = useState(() => new Set());
  const [expandedAssignmentIds, setExpandedAssignmentIds] = useState(() => new Set());
  const [expandedCuttingSectionIds, setExpandedCuttingSectionIds] = useState(() => new Set());
  const [expandedTailorSectionIds, setExpandedTailorSectionIds] = useState(() => new Set());
  const [isPendingWorkExpanded, setIsPendingWorkExpanded] = useState(true);

  const toggleCuttingSectionExpand = (fabricId) => {
    setExpandedCuttingSectionIds((prev) => {
      const next = new Set(prev);
      const strId = String(fabricId);
      if (next.has(strId)) next.delete(strId);
      else next.add(strId);
      return next;
    });
  };

  const toggleTailorSectionExpand = (fabricId) => {
    setExpandedTailorSectionIds((prev) => {
      const next = new Set(prev);
      const strId = String(fabricId);
      if (next.has(strId)) next.delete(strId);
      else next.add(strId);
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/signin', { replace: true });
  };

  const isFabricAssigned = useCallback(
    (f) => isFabricAssignedToMaster(f, master, masterId, queryName, queryPhone),
    [master, masterId, queryName, queryPhone]
  );
  const isCuttingAssigned = useCallback(
    (c) => isCuttingForMaster(c, master, masterId, queryName),
    [master, masterId, queryName]
  );
  const isHelperAssigned = useCallback(
    (h) => isHelperAvailableToMaster(h, master, masterId, queryName),
    [master, masterId, queryName]
  );

  const assignedFabrics = useMemo(() => fabrics.filter(isFabricAssigned), [fabrics, isFabricAssigned]);
  const masterCuttings = useMemo(() => cuttings.filter(isCuttingAssigned), [cuttings, isCuttingAssigned]);
  const assignedHelpers = useMemo(() => helpers.filter(isHelperAssigned), [helpers, isHelperAssigned]);
  const masterAssignments = useMemo(() => {
    const list = tailorAssignments.filter((a) =>
      masterCuttings.some((c) => c.id === a.cuttingId) ||
      assignedFabrics.some((f) => String(f.id) === String(a.fabricId)) ||
      (master?.id && (a.masterId === master.id || a.master_id === master.id)) ||
      (master?.name && a.masterName && a.masterName.toLowerCase().trim() === master.name.toLowerCase().trim())
    );
    const seen = new Set();
    return list.filter((a) => {
      if (!a || !a.id || seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [tailorAssignments, masterCuttings, assignedFabrics, master]);

  // Active vs Archived Items (respecting cascaded parent fabric lot archive state)
  const activeFabrics = useMemo(() => assignedFabrics.filter((f) => !isEntityArchived(f, fabrics)), [assignedFabrics, fabrics]);
  const archivedFabrics = useMemo(() => assignedFabrics.filter((f) => isEntityArchived(f, fabrics)), [assignedFabrics, fabrics]);

  const activeCuttings = useMemo(() => masterCuttings.filter((c) => !isEntityArchived(c, fabrics)), [masterCuttings, fabrics]);
  const archivedCuttings = useMemo(() => masterCuttings.filter((c) => isEntityArchived(c, fabrics)), [masterCuttings, fabrics]);

  const activeAssignments = useMemo(() => masterAssignments.filter((a) => !isEntityArchived(a, fabrics)), [masterAssignments, fabrics]);
  const archivedAssignments = useMemo(() => masterAssignments.filter((a) => isEntityArchived(a, fabrics)), [masterAssignments, fabrics]);

  const masterThreadJobs = useMemo(() => {
    const masterFabricIds = new Set(assignedFabrics.map((f) => String(f.id)));
    return (threadCuttingAssignments || []).filter((tc) => {
      if (tc.createdByRole && tc.createdByRole !== 'master') return false;
      const isThisMaster = tc.masterId && master?.id && String(tc.masterId) === String(master.id);
      const isMasterFabric = tc.fabricId && masterFabricIds.has(String(tc.fabricId));
      if (tc.createdByRole === 'master') {
        if (tc.masterId) return isThisMaster;
        return isMasterFabric;
      }
      return isThisMaster;
    });
  }, [threadCuttingAssignments, assignedFabrics, master]);

  const activeThreadJobs = useMemo(
    () => masterThreadJobs.filter((tc) => !isEntityArchived(tc, fabrics)),
    [masterThreadJobs, fabrics]
  );
  const archivedThreadJobs = useMemo(
    () => masterThreadJobs.filter((tc) => isEntityArchived(tc, fabrics)),
    [masterThreadJobs, fabrics]
  );

  const activeMasterHandovers = useMemo(
    () => (masterHandovers || []).filter((h) => !isEntityArchived(h, fabrics)),
    [masterHandovers, fabrics]
  );
  const archivedMasterHandovers = useMemo(
    () => (masterHandovers || []).filter((h) => isEntityArchived(h, fabrics)),
    [masterHandovers, fabrics]
  );

  const toggleFabricExpand = (id) => {
    const sId = String(id);
    setExpandedFabricIds((prev) => {
      const next = new Set(prev);
      if (next.has(sId) || next.has(id)) {
        next.delete(sId);
        next.delete(id);
      } else {
        next.add(sId);
      }
      return next;
    });
  };

  const expandableFabrics = activeFabrics.filter((f) => f.status !== 'In Stock');

  const isAllFabricsExpanded =
    expandableFabrics.length > 0 &&
    expandableFabrics.every((f) => expandedFabricIds.has(f.id) || expandedFabricIds.has(String(f.id)));

  const toggleAllFabricsExpand = () => {
    if (isAllFabricsExpanded) {
      setExpandedFabricIds(new Set());
    } else {
      setExpandedFabricIds(new Set(expandableFabrics.map((f) => String(f.id))));
    }
  };

  const toggleCuttingExpand = (id) => {
    setExpandedCuttingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllCuttingsExpanded =
    activeCuttings.length > 0 && activeCuttings.every((c) => expandedCuttingIds.has(c.id));

  const toggleAllCuttingsExpand = () => {
    if (isAllCuttingsExpanded) {
      setExpandedCuttingIds(new Set());
    } else {
      setExpandedCuttingIds(new Set(activeCuttings.map((c) => c.id)));
    }
  };

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

  const isAllAssignmentsExpanded =
    activeAssignments.length > 0 &&
    activeAssignments.every((a) => expandedAssignmentIds.has(a.id));

  const toggleAllAssignmentsExpand = () => {
    if (isAllAssignmentsExpanded) {
      setExpandedAssignmentIds(new Set());
    } else {
      setExpandedAssignmentIds(new Set(activeAssignments.map((a) => a.id)));
    }
  };

  const totalArchivedCount =
    archivedCuttings.length + archivedFabrics.length + archivedAssignments.length + archivedThreadJobs.length;

  const pendingSubmissions = useMemo(() => {
    const rawList = masterAssignments
      .flatMap((a) =>
        (a.dailySubmissions || [])
          .filter(
            (s) =>
              (s.approvalStatus === 'Pending Approval' || s.approvalStatus === 'Pending') &&
              s.approvalStatus !== 'Approved' &&
              s.approvalStatus !== 'Rejected'
          )
          .map((s) => ({
            ...s,
            assignmentId: a.id,
            fabricName: a.fabricName,
            pieceType: a.pieceType,
            tailorName: a.tailorName,
            tailorPhone: a.tailorPhone,
            machineCode: a.machineCode,
          }))
      )
      .sort((x, y) => new Date(y.createdAt || y.date) - new Date(x.createdAt || x.date));

    // Deduplicate strictly by unique submission ID
    const seenIds = new Set();
    const uniqueList = [];

    for (const sub of rawList) {
      if (!sub || !sub.id) continue;
      if (seenIds.has(sub.id)) continue;
      seenIds.add(sub.id);
      uniqueList.push(sub);
    }

    return uniqueList;
  }, [masterAssignments]);

  const masterThreadJobsCount = activeThreadJobs.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 py-2.5 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs font-bold shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-sm font-extrabold text-slate-900 leading-tight truncate">
                  {master.name}
                </h1>
                <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60 px-2 py-0.2 rounded-full shrink-0">
                  Master
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate">Cutting &amp; Pattern Dept</span>
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
        {/* Master Profile Summary Card */}
        <div className="p-4 bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-xl shadow-purple-950/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-purple-200 text-lg font-black border border-white/10">
                {master.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-base font-bold">{master.name}</h2>
                <p className="text-xs text-purple-200">
                  {master.specialization || 'Master Pattern Maker & Cutter'}
                </p>
              </div>
            </div>
            {master.phone && (
              <a
                href={`tel:${master.phone}`}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                title="Call"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>



          {(() => {
            const pendingHandoversList = masterHandovers.filter(
              (h) => h.masterId === master?.id && h.status === 'Pending Verification'
            );
            if (pendingHandoversList.length === 0) return null;
            const pendingBreakdown = getHandoversBreakdownSummary(pendingHandoversList);
            return (
              <div className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-2xl flex items-center justify-between text-xs text-amber-100">
                <span className="flex items-center gap-1.5 font-medium">
                  <PackageCheck className="w-4 h-4 text-amber-300" />
                  <span>
                    {pendingHandoversList.length} Handover(s) ({pendingBreakdown}) awaiting Admin verification
                  </span>
                </span>
                <span className="text-[10px] font-black bg-amber-400/30 px-2 py-0.5 rounded-full border border-amber-300/30">
                  Under Admin Review
                </span>
              </div>
            );
          })()}
        </div>

        {/* Tab Switcher - Mobile Friendly 6-Column Grid */}
        <div className="grid grid-cols-6 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
          {[
            { id: 'fabrics', label: 'Fabrics', icon: Layers, count: activeFabrics.length },
            { id: 'cuttings', label: 'Cuts', icon: Scissors, count: activeCuttings.length },
            {
              id: 'assignments',
              label: 'Tailors',
              icon: UserCheck,
              count: activeAssignments.length,
              badge: pendingSubmissions.length > 0 ? pendingSubmissions.length : null,
            },
            {
              id: 'trimming',
              label: 'Trimming',
              icon: Scissors,
              count: masterThreadJobsCount,
            },
            { id: 'helpers', label: 'Helpers', icon: HeartHandshake, count: assignedHelpers.length },
            { id: 'archive', label: 'Archive', icon: Archive, count: totalArchivedCount },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-0.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 relative cursor-pointer ${isActive
                    ? 'bg-white text-purple-700 shadow-xs ring-1 ring-black/5 font-extrabold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <div className="relative">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {tab.badge && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.2 bg-amber-500 text-white rounded-full text-[8px] font-black leading-none animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs truncate font-bold">{tab.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold leading-none shrink-0 ${isActive ? 'bg-purple-50 text-purple-700' : 'bg-slate-200/70 text-slate-600'
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ==================== TAB 1: FABRICS RECEIVED FOR CUTTING ==================== */}
        {activeTab === 'fabrics' && (
          <MasterFabricsTab
            activeFabrics={activeFabrics}
            archivedFabrics={archivedFabrics}
            expandableFabrics={expandableFabrics}
            isAllFabricsExpanded={isAllFabricsExpanded}
            toggleAllFabricsExpand={toggleAllFabricsExpand}
            expandedFabricIds={expandedFabricIds}
            toggleFabricExpand={toggleFabricExpand}
            expandedCuttingSectionIds={expandedCuttingSectionIds}
            toggleCuttingSectionExpand={toggleCuttingSectionExpand}
            expandedTailorSectionIds={expandedTailorSectionIds}
            toggleTailorSectionExpand={toggleTailorSectionExpand}
            fabrics={fabrics}
            cuttings={cuttings}
            tailorAssignments={tailorAssignments}
            masterHandovers={masterHandovers}
            threadCuttingAssignments={threadCuttingAssignments}
            master={master}
            getMasterHandoverStats={getMasterHandoverStats}
            getProductStructure={getProductStructure}
            toggleArchiveFabric={toggleArchiveFabric}
            onOpenAssignTrimming={(mode = 'assign', fabricId = null, cuttingId = null) => {
              setAssignTrimmingMode(mode);
              if (fabricId) setSelectedFabricId(fabricId);
              if (cuttingId) setSelectedCuttingForAssign(cuttingId);
              setShowAssignTrimmingModal(true);
            }}
            onOpenCutModal={(fabricId) => {
              setSelectedFabricId(fabricId);
              setEditingCutting(null);
              setShowCutModal(true);
            }}
            onOpenAssignTailor={(cuttingId, fabricId) => {
              setSelectedCuttingForAssign(cuttingId);
              setSelectedFabricId(fabricId);
              setShowAssignTailorModal(true);
            }}
            onOpenSubmitAdmin={(readyCutting, f) => {
              setSelectedCuttingForHandover(readyCutting);
              setSelectedFabricForHandover(f);
              setShowSubmitToAdminModal(true);
            }}
            onAcceptFabric={(fabric) => {
              setFabricToAccept(fabric);
            }}
            setActiveTab={setActiveTab}
            setArchiveSubFilter={setArchiveSubFilter}
          />
        )}

        {/* ==================== TAB 2: FABRIC CUTTINGS & BALANCES ==================== */}
        {activeTab === 'cuttings' && (
          <MasterCuttingsTab
            activeCuttings={activeCuttings}
            archivedCuttings={archivedCuttings}
            fabrics={fabrics}
            tailorAssignments={tailorAssignments}
            expandedCuttingIds={expandedCuttingIds}
            toggleCuttingExpand={toggleCuttingExpand}
            isAllCuttingsExpanded={isAllCuttingsExpanded}
            toggleAllCuttingsExpand={toggleAllCuttingsExpand}
            getCuttingBalance={getCuttingBalance}
            onOpenNewCut={() => {
              setEditingCutting(null);
              setSelectedFabricId(null);
              setShowCutModal(true);
            }}
            onEditCutting={(cutting) => {
              setEditingCutting(cutting);
              setShowCutModal(true);
            }}
            setActiveTab={setActiveTab}
            setArchiveSubFilter={setArchiveSubFilter}
          />
        )}

        {/* ==================== TAB 3: TAILOR ASSIGNMENTS & DAILY WORK ==================== */}
        {activeTab === 'assignments' && (
          <MasterAssignmentsTab
            activeAssignments={activeAssignments}
            archivedAssignments={archivedAssignments}
            activeCuttings={activeCuttings}
            cuttings={cuttings}
            fabrics={fabrics}
            pendingSubmissions={pendingSubmissions}
            isPendingWorkExpanded={isPendingWorkExpanded}
            setIsPendingWorkExpanded={setIsPendingWorkExpanded}
            expandedAssignmentIds={expandedAssignmentIds}
            toggleAssignmentExpand={toggleAssignmentExpand}
            isAllAssignmentsExpanded={isAllAssignmentsExpanded}
            toggleAllAssignmentsExpand={toggleAllAssignmentsExpand}
            masterName={master?.name}
            approveDailyTailorSubmission={approveDailyTailorSubmission}
            approveAllDailyTailorSubmissions={approveAllDailyTailorSubmissions}
            setRejectModal={setRejectModal}
            setRejectReason={setRejectReason}
            onOpenAssignTailor={(cuttingId, fabricId) => {
              setSelectedCuttingForAssign(cuttingId);
              setSelectedFabricId(fabricId);
              setShowAssignTailorModal(true);
            }}
            setActiveTab={setActiveTab}
            setArchiveSubFilter={setArchiveSubFilter}
          />
        )}

        {/* ==================== TAB 4: FLOOR TRIMMING ==================== */}
        {activeTab === 'trimming' && (
          <MasterTrimmingTab
            master={master}
            fabrics={activeFabrics}
            cuttings={activeCuttings}
            helpers={assignedHelpers}
            tailorAssignments={activeAssignments}
            masterHandovers={activeMasterHandovers}
            threadCuttingAssignments={activeThreadJobs}
            onOpenAssignTrimming={(mode = 'assign') => {
              setAssignTrimmingMode(mode);
              setShowAssignTrimmingModal(true);
            }}
            onOpenSubmitAdmin={(readyCutting, f) => {
              setSelectedCuttingForHandover(readyCutting);
              setSelectedFabricForHandover(f);
              setShowSubmitToAdminModal(true);
            }}
            updateThreadCuttingProgress={updateThreadCuttingProgress}
            deleteThreadCuttingAssignment={deleteThreadCuttingAssignment}
          />
        )}

        {/* ==================== TAB 5: ASSIGNED HELPERS ==================== */}
        {activeTab === 'helpers' && (
          <MasterHelpersTab
            assignedHelpers={assignedHelpers}
            masterName={master?.name}
          />
        )}

        {/* ==================== TAB 5: COMPLETED & ARCHIVED ==================== */}
        {activeTab === 'archive' && (
          <MasterArchiveTab
            archivedFabrics={archivedFabrics}
            archivedCuttings={archivedCuttings}
            archivedAssignments={archivedAssignments}
            archivedThreadJobs={archivedThreadJobs}
            archivedMasterHandovers={archivedMasterHandovers}
            fabrics={fabrics}
            cuttings={cuttings}
            tailorAssignments={tailorAssignments}
            totalArchivedCount={totalArchivedCount}
            archiveSubFilter={archiveSubFilter}
            setArchiveSubFilter={setArchiveSubFilter}
            getMasterHandoverStats={getMasterHandoverStats}
          />
        )}
      </main>

      {/* Cutting Modal */}
      <RecordCuttingModal
        isOpen={showCutModal}
        onClose={() => {
          setShowCutModal(false);
          setEditingCutting(null);
          setSelectedFabricId(null);
        }}
        initialFabricId={selectedFabricId}
        masterId={master?.id}
        isMasterView={true}
        cuttingToEdit={editingCutting}
      />

      {/* Assign Tailor Modal */}
      <AssignTailorModal
        key={showAssignTailorModal ? 'master-asgn-open' : 'master-asgn-closed'}
        isOpen={showAssignTailorModal}
        onClose={() => {
          setShowAssignTailorModal(false);
          setSelectedCuttingForAssign(null);
          setSelectedFabricId(null);
        }}
        initialCuttingId={selectedCuttingForAssign}
        fabricId={selectedFabricId}
        initialFabricId={selectedFabricId}
        masterId={master?.id}
        isMasterView={true}
      />

      {/* Submit To Admin Modal */}
      <SubmitToAdminModal
        isOpen={showSubmitToAdminModal}
        onClose={() => {
          setShowSubmitToAdminModal(false);
          setSelectedCuttingForHandover(null);
          setSelectedFabricForHandover(null);
        }}
        cutting={selectedCuttingForHandover}
        fabric={selectedFabricForHandover}
        master={master}
        onOpenTrimming={() => {
          setShowSubmitToAdminModal(false);
          setActiveTab('trimming');
        }}
      />

      {/* Master Assign Trimming Modal */}
      <MasterAssignTrimmingModal
        isOpen={showAssignTrimmingModal}
        onClose={() => setShowAssignTrimmingModal(false)}
        master={master}
        fabrics={activeFabrics}
        cuttings={activeCuttings}
        helpers={assignedHelpers}
        initialMode={assignTrimmingMode}
        assignThreadCutting={assignThreadCutting}
        onSuccess={() => {
          if (refreshAllData) refreshAllData();
        }}
      />

      {/* Reject Work Log Modal */}
      {rejectModal && (() => {
        const rejectPsc = getSubmissionPscDetails(rejectModal);
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Reject Work Log</h3>
                    <p className="text-[11px] text-slate-600 font-semibold">
                      {rejectModal.tailorName} • {rejectPsc.pscLabel}
                    </p>
                    {rejectPsc.consumedCutPieces > 0 && (
                      <span className="block text-[10px] text-slate-400">
                        ({rejectPsc.consumedCutPieces} Cut PCs consumed)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Are you sure the physical PC count or quality does not match? Provide a reason for the tailor:
              </p>

              {/* Quick preset reason chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['Count mismatch', 'Stitching defect', 'Bundle incomplete', 'Damaged fabric'].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectReason(reason)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${rejectReason === reason
                        ? 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-200'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={`e.g. Received 18 ${rejectPsc.pieceName || 'PCs'} instead of ${rejectPsc.pscCount || 20}, or stitching defect found...`}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRejectModal(null)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    rejectDailyTailorSubmission(
                      rejectModal.assignmentId,
                      rejectModal.id,
                      rejectReason.trim() || 'Count mismatch or rejected by master'
                    );
                    setRejectModal(null);
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs shadow-rose-200 cursor-pointer"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Fabric Review & Accept Modal for Master */}
      {fabricToAccept && (
        <ReviewAcceptFabricModal
          key={fabricToAccept.id}
          isOpen={Boolean(fabricToAccept)}
          onClose={() => setFabricToAccept(null)}
          fabric={fabricToAccept}
          onAccept={(id) => {
            updateFabric(id, {
              status: 'In Cutting',
              acceptedByMaster: true,
              masterAcceptedAt: new Date().toISOString(),
            });
            setExpandedFabricIds((prev) => new Set([...prev, String(id), id]));
            setFabricToAccept(null);
          }}
        />
      )}

      {/* Tailor Work Assignment Review & Accept Modal */}
      {assignmentToAccept && (
        <ReviewAcceptWorkModal
          key={assignmentToAccept.id}
          isOpen={Boolean(assignmentToAccept)}
          onClose={() => setAssignmentToAccept(null)}
          isMaster={true}
          assignment={
            tailorAssignments.find((a) => a.id === assignmentToAccept.id) || assignmentToAccept
          }
          onAccept={(id) => {
            acceptTailorAssignment(id);
            setAssignmentToAccept(null);
          }}
        />
      )}
    </div>
  );
}

function MasterPinGate({ master, onVerifySuccess }) {
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const cleanPhone = (master?.phone || '').replace(/\D/g, '');
  const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : '';
  const maskedPhone = cleanPhone.length === 10
    ? `+91 ${cleanPhone.slice(0, 2)}••••••${cleanPhone.slice(-2)}`
    : master?.phone || '';

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
          p_worker_id: master.id,
          p_role: 'Master',
          p_pin: entered,
          p_phone: cleanPhone || null,
        });

        if (!vErr && vResult?.success) {
          const workerData = { ...(vResult.worker || master) };
          if (vResult.token) workerData.token = vResult.token;
          onVerifySuccess(workerData);
          return;
        } else {
          setError(vResult?.error || 'Incorrect PIN or password. Default is master123 or check with Admin.');
          return;
        }
      }

      // Offline / local fallback check
      let isValid = false;
      if (master?.password) {
        if (master.password === entered) isValid = true;
        else {
          try {
            const res = await verifyPassword(entered, master.password);
            isValid = res.valid;
          } catch {}
        }
      } else if (entered === 'master123' || (last4 && entered === last4)) {
        isValid = true;
      }

      if (isValid) {
        onVerifySuccess(master);
      } else {
        setError('Incorrect PIN or password. Default is master123 or the last 4 digits of your mobile number.');
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
          <div className="inline-flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-200 mb-2.5 sm:mb-3 transition-all duration-300">
            <Scissors className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Fabric Manager
          </h1>
          <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 border rounded-full bg-purple-50 border-purple-100/80 text-purple-700 transition-all">
            <Scissors className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              Cutting Master Verification
            </span>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
            Enter your security PIN or password to access cuttings, fabrics & allotments
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white py-6 px-5 sm:py-7 sm:px-7 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-100">
          {/* Worker Identity Card */}
          <div className="mb-5 bg-purple-50/70 border border-purple-100/80 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              {master?.name?.charAt(0) || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900 truncate">{master?.name || 'Cutting Master'}</p>
                <span className="text-[10px] font-bold bg-purple-100/80 text-purple-700 px-2 py-0.5 rounded-full shrink-0">
                  Master
                </span>
              </div>
              {maskedPhone && (
                <p className="text-xs text-slate-500 font-mono mt-0.5 whitespace-nowrap">
                  {maskedPhone}
                </p>
              )}
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
                  className="text-xs font-semibold text-purple-600 hover:text-purple-500 p-1 -mr-1 cursor-pointer touch-manipulation"
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
                  className="w-full pl-10 pr-11 py-3 sm:py-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all tracking-wider"
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
                Default PIN is <span className="font-semibold text-slate-600">master123</span> or the last 4 digits of your phone.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 min-h-[46px] sm:min-h-[48px] py-3 sm:py-3.5 px-4 bg-purple-600 hover:bg-purple-700 shadow-purple-200 active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer touch-manipulation"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Unlock Master Portal</span>
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
        initialRole="Master"
        initialPhone={master?.phone || ''}
      />
    </div>
  );
}
