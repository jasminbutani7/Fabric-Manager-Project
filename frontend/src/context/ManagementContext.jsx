import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ManagementContext } from './managementContextInstance';
import {
  FactoryContext,
  FabricContext,
  ProductionContext,
  FinanceContext,
  useFactoryOperations,
  useFinanceOperations,
  useFabricOperations,
  useProductionOperations,
  useSupabaseDataLoader,
  useRealtimeSyncListener,
} from './domain';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { calculateAssignmentFinancials, getProductStructure } from '../services/dbMappers';
import { broadcastSyncUpdate } from '../services/realtimeSync';
import { purgeExpenseCaches } from '../utils/sessionSecurity';

const DEFAULT_PRODUCT_TEMPLATES = [];

function getScopedTableCache(tableName, userId) {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(`fm_${tableName}_cache_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setScopedTableCache(tableName, userId, data) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(`fm_${tableName}_cache_${userId}`, JSON.stringify(data));
  } catch {}
}

const dbSave = async (tableName, dbObject) => {
  if (isSupabaseConfigured && supabase) {
    try {
      let currentObj = { ...dbObject };
      let { error } = await supabase.from(tableName).upsert([currentObj]);
      
      // Auto-heal missing parent user in public.users if foreign key 23503 fails
      if (error && error.code === '23503' && error.message?.includes('users') && currentObj.user_id) {
        try {
          const userRaw = typeof window !== 'undefined' ? sessionStorage.getItem('fabric_app_session') : null;
          if (userRaw) {
            const userObj = JSON.parse(userRaw);
            if (userObj?.id) {
              await supabase.from('users').upsert([
                {
                  id: userObj.id,
                  name: userObj.name || 'Admin',
                  phone: userObj.phone || '',
                  email: userObj.email || null,
                  company_name: userObj.companyName || userObj.company_name || 'Fabric Manager',
                  role: 'Admin',
                },
              ], { onConflict: 'id' });

              const retryRes = await supabase.from(tableName).upsert([currentObj]);
              if (!retryRes.error) {
                console.info(`Auto-healed user reference and saved to ${tableName}`);
                return { success: true };
              }
              error = retryRes.error;
            }
          }
        } catch (healErr) {
          console.warn('Auto-heal user error in dbSave:', healErr);
        }
      }

      // If Supabase schema cache doesn't have certain optional columns (PGRST204),
      // retry by stripping the missing column(s) until it succeeds or retries exhausted
      let retries = 0;
      while (error && error.code === 'PGRST204' && retries < 5) {
        retries++;
        const match = error.message?.match(/Could not find the '([^']+)' column/i);
        const missingCol = match ? match[1] : null;
        if (missingCol && missingCol in currentObj) {
          delete currentObj[missingCol];
          // Also proactively delete counterpart archive timestamp if one was missing
          if (missingCol === 'restored_at' && 'archived_at' in currentObj) delete currentObj.archived_at;
          if (missingCol === 'archived_at' && 'restored_at' in currentObj) delete currentObj.restored_at;

          const retryRes = await supabase.from(tableName).upsert([currentObj]);
          if (!retryRes.error) {
            console.warn(`Saved ${tableName} using schema fallback (column '${missingCol}' missing in database)`);
            return { success: true };
          }
          error = retryRes.error;
        } else {
          // If we can't extract the specific column name, strip known optional archive columns
          let strippedAny = false;
          ['restored_at', 'archived_at', 'is_archived'].forEach((col) => {
            if (col in currentObj) {
              delete currentObj[col];
              strippedAny = true;
            }
          });
          if (strippedAny) {
            const retryRes = await supabase.from(tableName).upsert([currentObj]);
            if (!retryRes.error) {
              console.warn(`Saved ${tableName} using schema fallback (stripped archive columns)`);
              return { success: true };
            }
            error = retryRes.error;
          }
          break;
        }
      }

      if (error) {
        console.error(`Error saving to Supabase table ${tableName}:`, error);
        return { success: false, error };
      }
      return { success: true };
    } catch (e) {
      console.error(`Failed to sync to Supabase table ${tableName}:`, e);
      return { success: false, error: e };
    }
  }
  return { success: false, error: new Error('Supabase not configured') };
};

const dbRemove = async (tableName, id) => {
  try {
    const userRaw = typeof window !== 'undefined' ? sessionStorage.getItem('fabric_app_session') : null;
    const uId = userRaw ? JSON.parse(userRaw)?.id : null;
    if (uId) {
      const cached = getScopedTableCache(tableName, uId);
      setScopedTableCache(tableName, uId, cached.filter((x) => x.id !== id));
    }
  } catch {}
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) console.error(`Error deleting from Supabase table ${tableName}:`, error);
    } catch (e) {
      console.error(`Failed to delete from Supabase table ${tableName}:`, e);
    }
  }
  const eventType = tableName === 'tailor_assignments'
    ? 'ASSIGNMENT_DELETED'
    : tableName === 'cuttings'
      ? 'CUTTING_DELETED'
      : tableName === 'master_handovers'
        ? 'HANDOVER_DELETED'
        : tableName === 'fabrics'
          ? 'FABRIC_DELETED'
          : tableName === 'thread_cutting_assignments'
            ? 'THREAD_DELETED'
            : `${tableName.toUpperCase()}_DELETED`;
  broadcastSyncUpdate({ type: eventType, id });
};

export function ManagementProvider({ children }) {
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id || null;

  const ownerUserId =
    (currentUser?.role === 'Admin' ? currentUser?.id : null) ||
    currentUser?.user_id ||
    currentUser?.adminUserId ||
    currentUser?.userId ||
    (currentUserId && !currentUserId.startsWith('mst_') && !currentUserId.startsWith('tlr_') && !currentUserId.startsWith('hlp_') ? currentUserId : null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [invoices, setInvoices] = useState(() => getScopedTableCache('invoices', ownerUserId));
  const [expenses, setExpenses] = useState(() => getScopedTableCache('expenses', ownerUserId));
  const [invoiceExpenses, setInvoiceExpenses] = useState([]);
  const [masters, setMasters] = useState(() => getScopedTableCache('masters', ownerUserId));
  const [machines, setMachines] = useState(() => getScopedTableCache('machines', ownerUserId));
  const [tailors, setTailors] = useState(() => getScopedTableCache('tailors', ownerUserId));
  const [helpers, setHelpers] = useState(() => getScopedTableCache('helpers', ownerUserId));
  const [suppliers, setSuppliers] = useState(() => getScopedTableCache('suppliers', ownerUserId));
  const [fabrics, setFabrics] = useState(() => getScopedTableCache('fabrics', ownerUserId));
  const [cuttings, setCuttings] = useState(() => getScopedTableCache('cuttings', ownerUserId));
  const [tailorAssignments, setTailorAssignments] = useState(() => getScopedTableCache('tailor_assignments', ownerUserId));
  const [masterHandovers, setMasterHandovers] = useState(() => getScopedTableCache('master_handovers', ownerUserId));
  const [threadCuttingAssignments, setThreadCuttingAssignments] = useState(() => getScopedTableCache('thread_cutting_assignments', ownerUserId));
  const [deliveryLogs, setDeliveryLogs] = useState(() => getScopedTableCache('delivery_logs', ownerUserId));
  const [productTemplates, setProductTemplates] = useState(DEFAULT_PRODUCT_TEMPLATES);
  const recentAssignmentUpdatesRef = useRef(new Map());
  const dbInvoiceNumbersRef = useRef([]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fabricsRef = useRef(fabrics);
  const cuttingsRef = useRef(cuttings);
  const tailorAssignmentsRef = useRef(tailorAssignments);
  const masterHandoversRef = useRef(masterHandovers);
  const threadCuttingAssignmentsRef = useRef(threadCuttingAssignments);
  const helpersRef = useRef(helpers);

  useEffect(() => {
    fabricsRef.current = fabrics;
    cuttingsRef.current = cuttings;
    tailorAssignmentsRef.current = tailorAssignments;
    masterHandoversRef.current = masterHandovers;
    threadCuttingAssignmentsRef.current = threadCuttingAssignments;
    helpersRef.current = helpers;
  }, [fabrics, cuttings, tailorAssignments, masterHandovers, threadCuttingAssignments, helpers]);

  const candidateUserIdsRef = useRef([]);
  const lastNetworkErrorTimeRef = useRef(0);
  const lastSuccessfulFetchTimeRef = useRef(0);

  const isItemOwned = useCallback((item) => {
    if (!item) return false;
    const uId = String(item.user_id || item.userId || item.tenantId || '').trim();
    const candidateIds = candidateUserIdsRef.current || [];

    if (candidateIds.length > 0) {
      if (uId) {
        return candidateIds.some((id) => String(id).trim() === uId);
      }
      const fId = item.fabric_id || item.fabricId;
      if (fId && fabricsRef.current && fabricsRef.current.length > 0) {
        return fabricsRef.current.some((f) => f.id === fId);
      }
      return false;
    }

    if (ownerUserId) {
      return uId ? uId === String(ownerUserId).trim() : false;
    }

    return false;
  }, [ownerUserId]);

  const saveToDb = (tableName, mapFn, item) => {
    if (!item) return;
    const itemUserId = item.user_id || item.userId;
    const validItemUserId =
      itemUserId && !itemUserId.startsWith('mst_') && !itemUserId.startsWith('tlr_') && !itemUserId.startsWith('hlp_')
        ? itemUserId
        : null;
    const fabricItem = (fabricsRef.current || fabrics).find((f) => f.id === (item.fabricId || item.fabric_id));
    const fabricUserId = fabricItem?.user_id || fabricItem?.userId;
    const validFabricUserId =
      fabricUserId && !fabricUserId.startsWith('mst_') && !fabricUserId.startsWith('tlr_') && !fabricUserId.startsWith('hlp_')
        ? fabricUserId
        : null;
    const effectiveUserId = validItemUserId || validFabricUserId || ownerUserId;

    // Immediately persist to scoped localStorage cache
    if (effectiveUserId) {
      try {
        const cached = getScopedTableCache(tableName, effectiveUserId);
        const idx = cached.findIndex((x) => x.id === item.id);
        const updatedCache = idx >= 0
          ? cached.map((x) => (x.id === item.id ? { ...x, ...item } : x))
          : [item, ...cached];
        setScopedTableCache(tableName, effectiveUserId, updatedCache);
      } catch {}
    }

    const dbObj = mapFn(item, effectiveUserId);
    dbSave(tableName, dbObj);

    const eventType = tableName === 'tailor_assignments'
      ? 'ASSIGNMENT_UPDATED'
      : tableName === 'cuttings'
        ? 'CUTTING_UPDATED'
        : tableName === 'master_handovers'
          ? 'HANDOVER_UPDATED'
          : tableName === 'fabrics'
            ? 'FABRIC_UPDATED'
            : tableName === 'thread_cutting_assignments'
              ? 'THREAD_UPDATED'
              : `${tableName.toUpperCase()}_UPDATED`;
    broadcastSyncUpdate({ type: eventType, item, id: item.id, tenantId: effectiveUserId });
  };

  // Modular Data Loader (Supabase direct fetch & normalization)
  const {
    loadAllFromSupabase,
    refreshAllData,
    debouncedRefreshAllData,
    refreshTailorAssignments,
    fetchPagedTable,
    fetchHistoricalArchive,
    fetchArchivedFabricsPaginated,
    fetchCompletedCuttingsPaginated,
    fetchHistoricalInvoicesPaginated,
  } = useSupabaseDataLoader({
    currentUserId,
    currentUser,
    ownerUserId,
    isMountedRef,
    candidateUserIdsRef,
    isItemOwned,
    fabricsRef,
    cuttingsRef,
    lastNetworkErrorTimeRef,
    lastSuccessfulFetchTimeRef,
    dbInvoiceNumbersRef,
    recentAssignmentUpdatesRef,
    setMasters,
    setMachines,
    setTailors,
    setHelpers,
    setSuppliers,
    setFabrics,
    setCuttings,
    setTailorAssignments,
    setMasterHandovers,
    setThreadCuttingAssignments,
    setDeliveryLogs,
    setProductTemplates,
    setExpenses,
    setInvoices,
    setInvoiceExpenses,
    setIsInitialized,
  });

  // Initial load on mount or user change
  useEffect(() => {
    loadAllFromSupabase();
  }, [loadAllFromSupabase]);

  // Modular Realtime Sync & Listeners
  useRealtimeSyncListener({
    ownerUserId,
    currentUserId,
    candidateUserIdsRef,
    fabricsRef,
    cuttingsRef,
    tailorAssignmentsRef,
    masterHandoversRef,
    threadCuttingAssignmentsRef,
    helpersRef,
    recentAssignmentUpdatesRef,
    lastNetworkErrorTimeRef,
    lastSuccessfulFetchTimeRef,
    isItemOwned,
    debouncedRefreshAllData,
    setMasters,
    setMachines,
    setTailors,
    setHelpers,
    setSuppliers,
    setFabrics,
    setCuttings,
    setTailorAssignments,
    setMasterHandovers,
    setThreadCuttingAssignments,
    setExpenses,
    setInvoices,
    setInvoiceExpenses,
    setDeliveryLogs,
  });

  // Factory setup operations delegated to dedicated domain hook
  const { factoryValue } = useFactoryOperations({
    masters,
    setMasters,
    machines,
    setMachines,
    tailors,
    setTailors,
    helpers,
    setHelpers,
    suppliers,
    setSuppliers,
    saveToDb,
    dbRemove,
  });

  // Fabric Inventory & Cutting Operations
  const {
    addFabric,
    updateFabric,
    deleteFabric,
    saveProductTemplate,
    deleteProductTemplate,
    addCutting,
    updateCutting,
    deleteCutting,
    getCuttingBalance,
    getFabricBalance,
    toggleArchiveFabric,
    archiveFabricLot,
    unarchiveFabricLot,
    toggleArchiveCutting,
  } = useFabricOperations({
    fabrics,
    setFabrics,
    cuttings,
    setCuttings,
    productTemplates,
    setProductTemplates,
    suppliers,
    masters,
    tailorAssignments,
    setTailorAssignments,
    masterHandovers,
    setMasterHandovers,
    threadCuttingAssignments,
    setThreadCuttingAssignments,
    deliveryLogs,
    setDeliveryLogs,
    saveToDb,
    dbRemove,
    ownerUserId,
    currentUser,
    supabase,
  });

  // Production Operations (Tailor Assignments, Handovers, Thread Cutting, Delivery)
  const {
    addTailorAssignment,
    acceptTailorAssignment,
    rejectTailorAssignment,
    toggleArchiveTailorAssignment,
    updateAssignmentStatus,
    deleteAssignment,
    logDailyTailorSubmission,
    approveDailyTailorSubmission,
    approveAllDailyTailorSubmissions,
    rejectDailyTailorSubmission,
    deleteDailyTailorSubmission,
    submitMasterHandover,
    verifyMasterHandover,
    rejectMasterHandover,
    deleteMasterHandover,
    getMasterHandoverStats,
    assignThreadCutting,
    setFabricThreadCuttingDecision,
    updateThreadCuttingProgress,
    deleteThreadCuttingAssignment,
    linkThreadCuttingExpense,
    getThreadCuttingStats,
    deliverGoodsToSupplier,
  } = useProductionOperations({
    tailorAssignments,
    setTailorAssignments,
    tailorAssignmentsRef,
    masterHandovers,
    setMasterHandovers,
    threadCuttingAssignments,
    setThreadCuttingAssignments,
    deliveryLogs,
    setDeliveryLogs,
    fabrics,
    setFabrics,
    cuttings,
    setCuttings,
    machines,
    tailors,
    masters,
    helpers,
    suppliers,
    invoices,
    recentAssignmentUpdatesRef,
    getFabricBalance,
    saveToDb,
    dbRemove,
    ownerUserId,
    currentUser,
    supabase,
  });

  // Finance Operations (Expenses, Invoices, Junction & P&L Engine)
  const {
    addExpense,
    updateExpense,
    deleteExpense,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    recordInvoicePayment,
    linkInvoiceExpense,
    unlinkInvoiceExpense,
    getInvoiceExpenses,
    createCompletedLotInvoice,
    settleFabricLotInvoices,
    getFinancialDecisionData,
  } = useFinanceOperations({
    expenses,
    setExpenses,
    invoices,
    setInvoices,
    invoiceExpenses,
    setInvoiceExpenses,
    dbInvoiceNumbersRef,
    fabrics,
    setFabrics,
    updateFabric,
    cuttings,
    tailors,
    machines,
    masters,
    helpers,
    tailorAssignments,
    saveToDb,
    dbRemove,
    ownerUserId,
    currentUserId,
    supabase,
  });

  const clearAllData = useCallback(async () => {
    setMasters([]);
    setMachines([]);
    setTailors([]);
    setHelpers([]);
    setSuppliers([]);
    setFabrics([]);
    setCuttings([]);
    setTailorAssignments([]);
    setMasterHandovers([]);
    setThreadCuttingAssignments([]);
    setExpenses([]);
    setInvoices([]);
    setInvoiceExpenses([]);
    setProductTemplates(DEFAULT_PRODUCT_TEMPLATES);
    try {
      purgeExpenseCaches();
    } catch { }

    broadcastSyncUpdate({ type: 'ALL_DATA_CLEARED' });

    if (isSupabaseConfigured && supabase && currentUserId) {
      try {
        const allTables = [
          'thread_cutting_assignments',
          'master_handovers',
          'tailor_assignments',
          'cuttings',
          'fabrics',
          'invoice_expenses',
          'invoices',
          'expenses',
          'machines',
          'tailors',
          'helpers',
          'masters',
          'suppliers',
          'product_templates',
        ];
        for (const t of allTables) {
          const { error } = await supabase.from(t).delete().eq('user_id', currentUserId);
          if (error) console.error(`Error clearing ${t} for user ${currentUserId}:`, error);
        }
      } catch (e) {
        console.error('Failed to clear all data in Supabase:', e);
      }
    }
  }, [currentUserId]);

  const clearFabricData = useCallback(async () => {
    setFabrics([]);
    setCuttings([]);
    setTailorAssignments([]);
    setMasterHandovers([]);
    setThreadCuttingAssignments([]);
    setExpenses([]);
    setInvoices([]);
    setInvoiceExpenses([]);
    setDeliveryLogs([]);

    broadcastSyncUpdate({ type: 'FABRIC_DATA_CLEARED' });

    if (isSupabaseConfigured && supabase && currentUserId) {
      try {
        const fabricTables = [
          'thread_cutting_assignments',
          'master_handovers',
          'tailor_assignments',
          'cuttings',
          'fabrics',
          'invoice_expenses',
          'expenses',
          'invoices',
        ];
        for (const t of fabricTables) {
          const { error } = await supabase.from(t).delete().eq('user_id', currentUserId);
          if (error) console.error(`Error clearing ${t} for user ${currentUserId}:`, error);
        }
      } catch (e) {
        console.error('Failed to clear fabric & production data in Supabase:', e);
      }
    }
  }, [currentUserId]);

  const fabricValue = useMemo(() => ({
    fabrics,
    cuttings,
    productTemplates,
    addFabric,
    updateFabric,
    deleteFabric,
    addCutting,
    updateCutting,
    deleteCutting,
    getProductStructure,
    getCuttingBalance,
    getFabricBalance,
    saveProductTemplate,
    deleteProductTemplate,
    toggleArchiveFabric,
    archiveFabricLot,
    unarchiveFabricLot,
    toggleArchiveCutting,
    fetchArchivedFabricsPaginated,
  }), [fabrics, cuttings, productTemplates, addFabric, updateFabric, deleteFabric, addCutting, updateCutting, deleteCutting, getCuttingBalance, getFabricBalance, saveProductTemplate, deleteProductTemplate, toggleArchiveFabric, archiveFabricLot, unarchiveFabricLot, toggleArchiveCutting, fetchArchivedFabricsPaginated]);

  const productionValue = useMemo(() => ({
    tailorAssignments,
    masterHandovers,
    threadCuttingAssignments,
    deliveryLogs,
    addTailorAssignment,
    acceptTailorAssignment,
    rejectTailorAssignment,
    toggleArchiveTailorAssignment,
    updateAssignmentStatus,
    deleteAssignment,
    logDailyTailorSubmission,
    approveDailyTailorSubmission,
    approveAllDailyTailorSubmissions,
    rejectDailyTailorSubmission,
    deleteDailyTailorSubmission,
    refreshTailorAssignments,
    refreshAllData,
    submitMasterHandover,
    verifyMasterHandover,
    rejectMasterHandover,
    deleteMasterHandover,
    getMasterHandoverStats,
    assignThreadCutting,
    setFabricThreadCuttingDecision,
    updateThreadCuttingProgress,
    deleteThreadCuttingAssignment,
    linkThreadCuttingExpense,
    getThreadCuttingStats,
    deliverGoodsToSupplier,
    fetchCompletedCuttingsPaginated,
  }), [tailorAssignments, masterHandovers, threadCuttingAssignments, deliveryLogs, addTailorAssignment, acceptTailorAssignment, rejectTailorAssignment, toggleArchiveTailorAssignment, updateAssignmentStatus, deleteAssignment, logDailyTailorSubmission, approveDailyTailorSubmission, approveAllDailyTailorSubmissions, rejectDailyTailorSubmission, deleteDailyTailorSubmission, refreshTailorAssignments, refreshAllData, submitMasterHandover, verifyMasterHandover, rejectMasterHandover, deleteMasterHandover, getMasterHandoverStats, assignThreadCutting, setFabricThreadCuttingDecision, updateThreadCuttingProgress, deleteThreadCuttingAssignment, linkThreadCuttingExpense, getThreadCuttingStats, deliverGoodsToSupplier, fetchCompletedCuttingsPaginated]);

  const financeValue = useMemo(() => ({
    expenses,
    invoices,
    invoiceExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    recordInvoicePayment,
    linkInvoiceExpense,
    unlinkInvoiceExpense,
    getInvoiceExpenses,
    createCompletedLotInvoice,
    settleFabricLotInvoices,
    getFinancialDecisionData,
    fetchPagedTable,
    fetchHistoricalArchive,
    fetchHistoricalInvoicesPaginated,
  }), [expenses, invoices, invoiceExpenses, addExpense, updateExpense, deleteExpense, addInvoice, updateInvoice, deleteInvoice, recordInvoicePayment, linkInvoiceExpense, unlinkInvoiceExpense, getInvoiceExpenses, createCompletedLotInvoice, settleFabricLotInvoices, getFinancialDecisionData, fetchPagedTable, fetchHistoricalArchive, fetchHistoricalInvoicesPaginated]);

  const enrichedFactoryValue = useMemo(() => ({
    ...factoryValue,
    clearAllData,
    clearFabricData,
  }), [factoryValue, clearAllData, clearFabricData]);

  const combinedValue = useMemo(() => ({
    isInitialized,
    ...enrichedFactoryValue,
    ...fabricValue,
    ...productionValue,
    ...financeValue,
    calculateAssignmentFinancials,
    clearAllData,
    clearFabricData,
    isSupabaseConfigured,
    supabase,
    refreshAllData,
    fetchPagedTable,
    fetchHistoricalArchive,
    fetchArchivedFabricsPaginated,
    fetchCompletedCuttingsPaginated,
    fetchHistoricalInvoicesPaginated,
  }), [isInitialized, enrichedFactoryValue, fabricValue, productionValue, financeValue, refreshAllData, clearAllData, clearFabricData, fetchPagedTable, fetchHistoricalArchive, fetchArchivedFabricsPaginated, fetchCompletedCuttingsPaginated, fetchHistoricalInvoicesPaginated]);

  return (
    <FactoryContext.Provider value={enrichedFactoryValue}>
      <FabricContext.Provider value={fabricValue}>
        <ProductionContext.Provider value={productionValue}>
          <FinanceContext.Provider value={financeValue}>
            <ManagementContext.Provider value={combinedValue}>
              {children}
            </ManagementContext.Provider>
          </FinanceContext.Provider>
        </ProductionContext.Provider>
      </FabricContext.Provider>
    </FactoryContext.Provider>
  );
}
