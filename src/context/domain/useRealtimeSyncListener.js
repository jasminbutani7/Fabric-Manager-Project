import { useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sanitizeFabricName } from '../managementContextInstance';
import { normalizeTailorAssignment } from '../../services/dbMappers';
import {
  syncChannel,
  registerCloudBroadcastSender,
  setActiveSyncTenant,
  isPayloadForTenant,
  LOCAL_TAB_ID,
  hasSeenSyncMessage,
  mergeAssignmentSafely,
} from '../../services/realtimeSync';

export function useRealtimeSyncListener({
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
}) {
  const isItemOwnedRef = useRef(isItemOwned);
  useEffect(() => {
    isItemOwnedRef.current = isItemOwned;
  }, [isItemOwned]);

  const lastHandledSyncTimeRef = useRef(0);
  const lastHandledSyncIdRef = useRef(null);

  // Maintain active tenant for cross-tab sync signals
  useEffect(() => {
    setActiveSyncTenant(ownerUserId || currentUserId || null);
  }, [ownerUserId, currentUserId]);

  const handleBroadcastData = useCallback((data) => {
    const { type, item, id, tenantId, msgId, originTabId } = data || {};
    if (!type) return;

    // Discard local reflections of mutations already handled in this tab
    if (originTabId && originTabId === LOCAL_TAB_ID) {
      return;
    }

    // Discard duplicates across storage, broadcast channel, or cloud broadcast
    if (msgId && hasSeenSyncMessage(msgId)) {
      return;
    }

    const syncId = id || item?.id;
    if (syncId && syncId === lastHandledSyncIdRef.current && Date.now() - lastHandledSyncTimeRef.current < 500) {
      return;
    }
    lastHandledSyncTimeRef.current = Date.now();
    lastHandledSyncIdRef.current = syncId;

    // Strict multi-tenant isolation: discard events originating from other tenants
    const candidateIds = candidateUserIdsRef?.current || [];
    const eventTenantId = tenantId || item?.user_id || item?.userId || item?.tenantId;
    if (candidateIds.length > 0 && eventTenantId) {
      const matchesTenant = candidateIds.some((cid) => String(cid).trim() === String(eventTenantId).trim());
      if (!matchesTenant) {
        return;
      }
    }

    if (item && !isItemOwned(item)) {
      return;
    }

    if (type === 'ASSIGNMENT_UPDATED' && item?.id) {
      setTailorAssignments((prev) => {
        const exists = prev.some((a) => a.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((a) => (a.id === item.id ? mergeAssignmentSafely(a, item) : a));
      });
      if (recentAssignmentUpdatesRef?.current) {
        const prevRecent = recentAssignmentUpdatesRef.current.get(item.id);
        recentAssignmentUpdatesRef.current.set(item.id, mergeAssignmentSafely(prevRecent, item));
      }
    } else if (type === 'ASSIGNMENT_DELETED' && syncId) {
      setTailorAssignments((prev) => prev.filter((a) => a.id !== syncId));
    } else if (type === 'CUTTING_UPDATED' && item?.id) {
      setCuttings((prev) => {
        const exists = prev.some((c) => c.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((c) => (c.id === item.id ? { ...c, ...item } : c));
      });
    } else if (type === 'CUTTING_DELETED' && syncId) {
      setCuttings((prev) => prev.filter((c) => c.id !== syncId));
    } else if (type === 'HANDOVER_UPDATED' && item?.id) {
      setMasterHandovers((prev) => {
        const exists = prev.some((h) => h.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((h) => (h.id === item.id ? { ...h, ...item } : h));
      });
    } else if (type === 'HANDOVER_DELETED' && syncId) {
      setMasterHandovers((prev) => prev.filter((h) => h.id !== syncId));
    } else if (type === 'FABRIC_UPDATED' && item?.id) {
      setFabrics((prev) => {
        const exists = prev.some((f) => f.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((f) => (f.id === item.id ? { ...f, ...item } : f));
      });
    } else if (type === 'FABRIC_DELETED' && syncId) {
      setFabrics((prev) => prev.filter((f) => f.id !== syncId));
    } else if (type === 'THREAD_UPDATED' && item?.id) {
      setThreadCuttingAssignments((prev) => {
        const exists = prev.some((t) => t.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((t) => (t.id === item.id ? { ...t, ...item } : t));
      });
    } else if (type === 'THREAD_DELETED' && syncId) {
      setThreadCuttingAssignments((prev) => prev.filter((t) => t.id !== syncId));
    } else if ((type === 'INVOICE_UPDATED' || type === 'INVOICES_UPDATED') && item?.id) {
      setInvoices((prev) => {
        const exists = prev.some((inv) => inv.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((inv) => (inv.id === item.id ? { ...inv, ...item } : inv));
      });
    } else if ((type === 'INVOICE_DELETED' || type === 'INVOICES_DELETED') && syncId) {
      setInvoices((prev) => prev.filter((inv) => inv.id !== syncId));
    } else if ((type === 'EXPENSE_UPDATED' || type === 'EXPENSES_UPDATED') && item?.id) {
      setExpenses((prev) => {
        const exists = prev.some((exp) => exp.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((exp) => (exp.id === item.id ? { ...exp, ...item } : exp));
      });
    } else if ((type === 'EXPENSE_DELETED' || type === 'EXPENSES_DELETED') && syncId) {
      setExpenses((prev) => prev.filter((exp) => exp.id !== syncId));
    } else if ((type === 'DELIVERY_LOG_UPDATED' || type === 'DELIVERY_LOGS_UPDATED') && item?.id) {
      setDeliveryLogs((prev) => {
        const exists = prev.some((dl) => dl.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((dl) => (dl.id === item.id ? { ...dl, ...item } : dl));
      });
    } else if ((type === 'DELIVERY_LOG_DELETED' || type === 'DELIVERY_LOGS_DELETED') && syncId) {
      setDeliveryLogs((prev) => prev.filter((dl) => dl.id !== syncId));
    } else if ((type === 'MASTER_UPDATED' || type === 'MASTERS_UPDATED') && item?.id) {
      setMasters((prev) => {
        const exists = prev.some((m) => m.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((m) => (m.id === item.id ? { ...m, ...item } : m));
      });
    } else if ((type === 'MASTER_DELETED' || type === 'MASTERS_DELETED') && syncId) {
      setMasters((prev) => prev.filter((m) => m.id !== syncId));
    } else if ((type === 'MACHINE_UPDATED' || type === 'MACHINES_UPDATED') && item?.id) {
      setMachines((prev) => {
        const exists = prev.some((m) => m.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((m) => (m.id === item.id ? { ...m, ...item } : m));
      });
    } else if ((type === 'MACHINE_DELETED' || type === 'MACHINES_DELETED') && syncId) {
      setMachines((prev) => prev.filter((m) => m.id !== syncId));
    } else if ((type === 'TAILOR_UPDATED' || type === 'TAILORS_UPDATED') && item?.id) {
      setTailors((prev) => {
        const exists = prev.some((t) => t.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((t) => (t.id === item.id ? { ...t, ...item } : t));
      });
    } else if ((type === 'TAILOR_DELETED' || type === 'TAILORS_DELETED') && syncId) {
      setTailors((prev) => prev.filter((t) => t.id !== syncId));
    } else if ((type === 'HELPER_UPDATED' || type === 'HELPERS_UPDATED') && item?.id) {
      setHelpers((prev) => {
        const exists = prev.some((h) => h.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((h) => (h.id === item.id ? { ...h, ...item } : h));
      });
    } else if ((type === 'HELPER_DELETED' || type === 'HELPERS_DELETED') && syncId) {
      setHelpers((prev) => prev.filter((h) => h.id !== syncId));
    } else if ((type === 'SUPPLIER_UPDATED' || type === 'SUPPLIERS_UPDATED') && item?.id) {
      setSuppliers((prev) => {
        const exists = prev.some((s) => s.id === item.id);
        if (!exists) return [item, ...prev];
        return prev.map((s) => (s.id === item.id ? { ...s, ...item } : s));
      });
    } else if ((type === 'SUPPLIER_DELETED' || type === 'SUPPLIERS_DELETED') && syncId) {
      setSuppliers((prev) => prev.filter((s) => s.id !== syncId));
    } else if (type === 'ALL_DATA_CLEARED') {
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
      setDeliveryLogs([]);
    } else if (type === 'FABRIC_DATA_CLEARED') {
      setFabrics([]);
      setCuttings([]);
      setTailorAssignments([]);
      setMasterHandovers([]);
      setThreadCuttingAssignments([]);
      setExpenses([]);
      setInvoices([]);
      setInvoiceExpenses([]);
      setDeliveryLogs([]);
    } else if (type === 'PROFILE_UPDATED' && item) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('fm_sync_event', { detail: { type: 'PROFILE_UPDATED', item, id: item.id } })
        );
      }
    }

    debouncedRefreshAllData();
  }, [debouncedRefreshAllData, isItemOwned, candidateUserIdsRef, recentAssignmentUpdatesRef, setTailorAssignments, setCuttings, setMasterHandovers, setFabrics, setThreadCuttingAssignments, setInvoices, setExpenses, setDeliveryLogs, setMasters, setMachines, setTailors, setHelpers, setSuppliers, setInvoiceExpenses]);

  const handleBroadcastDataRef = useRef(handleBroadcastData);
  useEffect(() => {
    handleBroadcastDataRef.current = handleBroadcastData;
  }, [handleBroadcastData]);

  // Cross-tab synchronization listener
  useEffect(() => {
    const handleSyncMessage = (e) => {
      const data = e.data || {};
      if (data.originTabId === LOCAL_TAB_ID) return;
      if (!isPayloadForTenant(data, candidateUserIdsRef?.current)) return;
      if (data.type === 'ASSIGNMENT_UPDATED' && data.assignment) {
        handleBroadcastDataRef.current?.({ type: 'ASSIGNMENT_UPDATED', item: data.assignment, tenantId: data.tenantId, msgId: data.msgId, originTabId: data.originTabId });
      } else if (data.type) {
        handleBroadcastDataRef.current?.(data);
      }
    };

    const handleStorageEvent = (e) => {
      // If BroadcastChannel is supported, other tabs already received it via BroadcastChannel
      if (syncChannel) return;
      if (e.key && e.key.startsWith('fm_sync_') && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.originTabId === LOCAL_TAB_ID) return;
          if (!isPayloadForTenant(parsed, candidateUserIdsRef?.current)) return;
          if (parsed.assignment) {
            handleBroadcastDataRef.current?.({ type: 'ASSIGNMENT_UPDATED', item: parsed.assignment, tenantId: parsed.tenantId, msgId: parsed.msgId, originTabId: parsed.originTabId });
          } else if (parsed.type) {
            handleBroadcastDataRef.current?.(parsed);
          }
        } catch { }
      }
    };

    const handleCustomEvent = (e) => {
      if (e.detail) {
        if (e.detail.originTabId === LOCAL_TAB_ID) return;
        if (!isPayloadForTenant(e.detail, candidateUserIdsRef?.current)) return;
        if (e.detail.type) {
          handleBroadcastDataRef.current?.(e.detail);
        } else if (e.detail.id) {
          handleBroadcastDataRef.current?.({ type: 'ASSIGNMENT_UPDATED', item: e.detail, tenantId: e.detail.tenantId, msgId: e.detail.msgId, originTabId: e.detail.originTabId });
        }
      }
    };

    if (syncChannel) {
      syncChannel.addEventListener('message', handleSyncMessage);
    }
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('fm_sync_event', handleCustomEvent);

    return () => {
      if (syncChannel) {
        syncChannel.removeEventListener('message', handleSyncMessage);
      }
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('fm_sync_event', handleCustomEvent);
    };
  }, [candidateUserIdsRef]);

  // Persistent Real-time Postgres subscriptions for live sync across all devices
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const handleRealtimeChange = (table, payload) => {
      const { eventType, new: newRow, old: oldRow } = payload || {};

      if (eventType === 'DELETE' && oldRow?.id) {
        let existed = false;
        if (table === 'tailor_assignments') {
          existed = tailorAssignmentsRef?.current?.some((a) => a.id === oldRow.id);
          if (existed) setTailorAssignments((prev) => prev.filter((a) => a.id !== oldRow.id));
        } else if (table === 'cuttings') {
          existed = cuttingsRef?.current?.some((c) => c.id === oldRow.id);
          if (existed) setCuttings((prev) => prev.filter((c) => c.id !== oldRow.id));
        } else if (table === 'master_handovers') {
          existed = masterHandoversRef?.current?.some((h) => h.id === oldRow.id);
          if (existed) setMasterHandovers((prev) => prev.filter((h) => h.id !== oldRow.id));
        } else if (table === 'fabrics') {
          existed = fabricsRef?.current?.some((f) => f.id === oldRow.id);
          if (existed) setFabrics((prev) => prev.filter((f) => f.id !== oldRow.id));
        } else if (table === 'thread_cutting_assignments') {
          existed = threadCuttingAssignmentsRef?.current?.some((t) => t.id === oldRow.id);
          if (existed) setThreadCuttingAssignments((prev) => prev.filter((t) => t.id !== oldRow.id));
        } else if (table === 'invoices') {
          setInvoices((prev) => {
            existed = prev.some((inv) => inv.id === oldRow.id);
            return existed ? prev.filter((inv) => inv.id !== oldRow.id) : prev;
          });
        } else if (table === 'expenses') {
          setExpenses((prev) => {
            existed = prev.some((exp) => exp.id === oldRow.id);
            return existed ? prev.filter((exp) => exp.id !== oldRow.id) : prev;
          });
        } else if (table === 'delivery_logs') {
          setDeliveryLogs((prev) => {
            existed = prev.some((dl) => dl.id === oldRow.id);
            return existed ? prev.filter((dl) => dl.id !== oldRow.id) : prev;
          });
        } else if (table === 'masters') {
          setMasters((prev) => {
            existed = prev.some((m) => m.id === oldRow.id);
            return existed ? prev.filter((m) => m.id !== oldRow.id) : prev;
          });
        } else if (table === 'machines') {
          setMachines((prev) => {
            existed = prev.some((m) => m.id === oldRow.id);
            return existed ? prev.filter((m) => m.id !== oldRow.id) : prev;
          });
        } else if (table === 'tailors') {
          setTailors((prev) => {
            existed = prev.some((t) => t.id === oldRow.id);
            return existed ? prev.filter((t) => t.id !== oldRow.id) : prev;
          });
        } else if (table === 'helpers') {
          setHelpers((prev) => {
            existed = prev.some((h) => h.id === oldRow.id);
            return existed ? prev.filter((h) => h.id !== oldRow.id) : prev;
          });
        } else if (table === 'suppliers') {
          setSuppliers((prev) => {
            existed = prev.some((s) => s.id === oldRow.id);
            return existed ? prev.filter((s) => s.id !== oldRow.id) : prev;
          });
        }
        if (existed) {
          debouncedRefreshAllData();
        }
        return;
      }

      if (!newRow || !newRow.id) return;
      if (!isItemOwnedRef.current(newRow)) return;

      if (table === 'tailor_assignments') {
        const cutPieces = newRow.assigned_cut_pieces || newRow.assigned_pieces;
        const rawGarmentPcs = newRow.assigned_garment_pcs || newRow.assigned_sub_parts || {};
        const meta = (rawGarmentPcs && typeof rawGarmentPcs === 'object' && rawGarmentPcs._meta) ? rawGarmentPcs._meta : {};
        const garmentPcs = (rawGarmentPcs && typeof rawGarmentPcs === 'object') ? { ...rawGarmentPcs } : {};
        delete garmentPcs._meta;
        const normalized = {
          id: newRow.id,
          userId: newRow.user_id,
          user_id: newRow.user_id,
          fabricId: newRow.fabric_id,
          fabricName: newRow.fabric_name,
          cuttingId: newRow.cutting_id,
          masterId: newRow.masterId || newRow.master_id || meta.masterId || null,
          masterName: newRow.master_name,
          tailorId: newRow.tailor_id,
          tailorName: newRow.tailor_name,
          machineId: newRow.machineId || newRow.machine_id || meta.machineId || null,
          machineCode: newRow.machineCode || newRow.machine_code || meta.machineCode || '',
          machineName: newRow.machineName || newRow.machine_name || meta.machineName || '',
          allocationMode: newRow.allocationMode || newRow.allocation_mode || meta.allocationMode || 'by_machine',
          assignedCutPieces: cutPieces,
          assignedGarmentPcs: garmentPcs,
          assignedPieces: cutPieces,
          assignedSubParts: garmentPcs,
          totalAssignedPieces: newRow.total_assigned_pieces,
          ratePerPiece: newRow.rate_per_piece,
          totalJobAmount: newRow.total_job_amount,
          tailorRates: newRow.tailor_rates || meta.tailorRates || null,
          subPartRates: newRow.sub_part_rates || meta.subPartRates || null,
          productStructure: newRow.product_structure,
          pieceType: newRow.piece_type,
          completedQuantity: newRow.completed_quantity,
          totalEarned: newRow.total_earned,
          dailySubmissions: newRow.daily_submissions || [],
          tailorAccepted: newRow.tailor_accepted,
          acceptedAt: newRow.accepted_at,
          notes: newRow.notes || meta.notes || null,
          assignDate: newRow.assign_date || newRow.assignDate || meta.assignDate || (newRow.created_at ? newRow.created_at.split('T')[0] : ''),
          status: newRow.status,
          isArchived: Boolean(newRow.is_archived),
          archivedAt: newRow.archived_at || meta.archivedAt || null,
          restoredAt: newRow.restored_at || meta.restoredAt || null,
          createdAt: newRow.created_at,
          updatedAt: newRow.updated_at,
        };
        const normalizedWithRates = normalizeTailorAssignment(normalized, fabricsRef?.current, cuttingsRef?.current);
        setTailorAssignments((prev) => {
          const exists = prev.some((a) => a.id === normalized.id);
          if (exists) {
            return prev.map((a) => (a.id === normalized.id ? mergeAssignmentSafely(a, normalizedWithRates) : a));
          }
          return [normalizedWithRates, ...prev];
        });
        if (recentAssignmentUpdatesRef?.current) {
          const prevRecent = recentAssignmentUpdatesRef.current.get(normalized.id);
          recentAssignmentUpdatesRef.current.set(normalized.id, mergeAssignmentSafely(prevRecent, normalizedWithRates));
        }
      } else if (table === 'cuttings') {
        const normalized = {
          ...newRow,
          fabricId: newRow.fabric_id || newRow.fabricId,
          fabricName: sanitizeFabricName(newRow.fabric_name || newRow.fabricName),
          fabricColor: newRow.fabric_color || newRow.fabricColor,
          masterId: newRow.master_id || newRow.masterId,
          masterName: newRow.master_name || newRow.masterName,
          productName: newRow.product_name || newRow.productName,
          cutPieces: newRow.cut_pieces || newRow.cutPieces,
          totalPieces: newRow.total_pieces || newRow.totalPieces,
          setsCount: newRow.sets_count || newRow.setsCount,
          metersUsed: newRow.meters_used || newRow.metersUsed,
          tailorRates: newRow.tailor_rates || newRow.tailorRates,
          productStructure: newRow.product_structure || newRow.productStructure,
        };
        setCuttings((prev) => {
          const exists = prev.some((c) => c.id === normalized.id);
          if (exists) return prev.map((c) => (c.id === normalized.id ? { ...c, ...normalized } : c));
          return [normalized, ...prev];
        });
      } else if (table === 'master_handovers') {
        let meta = {};
        if (newRow.notes && typeof newRow.notes === 'string' && newRow.notes.trim().startsWith('{')) {
          try { meta = JSON.parse(newRow.notes); } catch { meta = { userNotes: newRow.notes }; }
        } else {
          meta = { userNotes: newRow.notes };
        }
        const normalized = {
          ...newRow,
          notes: meta.userNotes !== undefined ? meta.userNotes : newRow.notes,
          _userNotes: meta.userNotes || null,
          masterId: newRow.master_id || newRow.masterId,
          masterName: newRow.master_name || newRow.masterName,
          fabricId: newRow.fabric_id || newRow.fabricId,
          fabricName: meta.fabricName || newRow.fabric_name || newRow.fabricName,
          productName: meta.productName || newRow.product_name || newRow.productName,
          cuttingId: newRow.cutting_id || newRow.cuttingId,
          piecesCount: parseInt(newRow.pieces_count ?? newRow.piecesCount ?? newRow.pieces ?? newRow.receivedQuantity, 10) || 0,
          pieces: parseInt(newRow.pieces_count ?? newRow.pieces ?? newRow.piecesCount ?? newRow.receivedQuantity, 10) || 0,
          subParts: meta.subParts || newRow.sub_parts || newRow.subParts || null,
          parts: meta.parts || newRow.parts || null,
          combinationFormula: meta.combinationFormula || newRow.combination_formula || newRow.combinationFormula || null,
          handoverDate: meta.handoverDate || newRow.handover_date || newRow.handoverDate || newRow.date || null,
          verifiedBy: meta.verifiedBy || newRow.verified_by || newRow.verifiedBy || null,
          verifiedAt: meta.verifiedAt || newRow.verified_at || newRow.verifiedAt || null,
          rejectionReason: meta.rejectionReason || newRow.rejection_reason || newRow.rejectionReason || null,
          rejectedAt: meta.rejectedAt || newRow.rejected_at || newRow.rejectedAt || null,
          receivedQuantity: newRow.received_quantity || newRow.receivedQuantity,
          acceptedQuantity: newRow.accepted_quantity || newRow.acceptedQuantity,
          rejectedQuantity: newRow.rejected_quantity || newRow.rejectedQuantity,
          trimmingStatus: meta.trimmingStatus || (meta.trimmedByMaster ? 'trimmed' : meta.skippedByMaster ? 'skipped' : null),
          trimmedByMaster: Boolean(meta.trimmedByMaster || meta.trimmingStatus === 'trimmed'),
          skippedByMaster: Boolean(meta.skippedByMaster || meta.trimmingStatus === 'skipped'),
          trimmedPieces: parseInt(meta.trimmedPieces, 10) || 0,
          skippedTrimmingPieces: parseInt(meta.skippedTrimmingPieces, 10) || 0,
          trimmedSubParts: meta.trimmedSubParts || newRow.trimmed_sub_parts || newRow.trimmedSubParts || null,
          skippedSubParts: meta.skippedSubParts || newRow.skipped_sub_parts || newRow.skippedSubParts || null,
          trimmingHelperName: meta.trimmingHelperName || null,
          trimmingHelperType: meta.trimmingHelperType || null,
        };
        setMasterHandovers((prev) => {
          const exists = prev.some((h) => h.id === normalized.id);
          if (exists) return prev.map((h) => (h.id === normalized.id ? { ...h, ...normalized } : h));
          return [normalized, ...prev];
        });
      } else if (table === 'fabrics') {
        const sets = parseInt(newRow.target_sets ?? newRow.print_pieces ?? newRow.lot_size_print_fabric_psc ?? newRow.printPieces, 10) || 0;
        const setPrice = parseFloat(newRow.price_per_set ?? newRow.price_per_piece ?? newRow.pricePerPiece) || 0;
        let parsedNotes = null;
        if (newRow.notes) {
          try { parsedNotes = typeof newRow.notes === 'string' ? JSON.parse(newRow.notes) : newRow.notes; } catch { }
        }
        const cleanUserNotes = parsedNotes && typeof parsedNotes === 'object'
          ? (typeof parsedNotes.userNotes === 'string' && parsedNotes.userNotes.trim() ? parsedNotes.userNotes.trim() : null)
          : (typeof newRow.notes === 'string' && !newRow.notes.trim().startsWith('{') && !newRow.notes.trim().startsWith('[') ? newRow.notes.trim() : null);

        const threadCuttingDecision = parsedNotes?.threadCuttingDecision || newRow.thread_cutting_decision || newRow.threadCuttingDecision || null;
        const subPartTrimmingDecisions = parsedNotes?.subPartTrimmingDecisions || parsedNotes?.threadCuttingDecisions || newRow.subPartTrimmingDecisions || {};
        const subPartSkippedPieces = parsedNotes?.subPartSkippedPieces || parsedNotes?.skippedPieces || newRow.subPartSkippedPieces || {};
        const skippedTrimmingLogs = Array.isArray(parsedNotes?.skippedTrimmingLogs)
          ? parsedNotes.skippedTrimmingLogs
          : (Array.isArray(newRow.skippedTrimmingLogs) ? newRow.skippedTrimmingLogs : []);
        const deliveredPSC = parseInt(parsedNotes?.deliveredPSC ?? newRow.delivered_psc ?? newRow.deliveredPSC, 10) || 0;
        const subPartsDelivered = parsedNotes?.subPartsDelivered || newRow.subPartsDelivered || {};
        const fabricDeliveryLogs = Array.isArray(parsedNotes?.deliveryLogs)
          ? parsedNotes.deliveryLogs
          : (Array.isArray(newRow.deliveryLogs) ? newRow.deliveryLogs : []);

        const normalized = {
          ...newRow,
          notes: cleanUserNotes,
          _rawNotes: typeof newRow.notes === 'string' ? newRow.notes : (parsedNotes ? JSON.stringify(parsedNotes) : null),
          supplierId: newRow.supplier_id || newRow.supplierId,
          supplierName: newRow.supplier_name || newRow.supplierName,
          supplierPhone: newRow.supplier_phone || newRow.supplierPhone,
          assignedMasterId: newRow.assigned_master_id || newRow.assignedMasterId,
          assignedMasterName: newRow.assigned_master_name || newRow.assignedMasterName,
          assignedMasterPhone: newRow.assigned_master_phone || newRow.assignedMasterPhone,
          plainMeters: parseFloat(newRow.plain_meters ?? newRow.plainMeters) || 0,
          targetSets: sets,
          printPieces: sets,
          lotSizePrintFabricPsc: sets,
          pricePerSet: setPrice,
          pricePerPiece: setPrice,
          totalAmount: parseFloat(newRow.total_amount ?? newRow.totalAmount) || 0,
          productName: newRow.product_name || newRow.productName,
          productStructure: newRow.product_structure || newRow.productStructure,
          fabricType: newRow.fabric_type || newRow.fabricType,
          dueDate: newRow.due_date || newRow.dueDate,
          tailorRates: newRow.tailor_rates || newRow.tailorRates,
          lotNo: parseInt(newRow.lot_no ?? newRow.lotNo, 10) || null,
          lotNumber: parseInt(newRow.lot_no ?? newRow.lotNo, 10) || null,
          createdAt: newRow.created_at || newRow.createdAt,
          updatedAt: newRow.updated_at || newRow.updatedAt,
          threadCuttingDecision,
          subPartTrimmingDecisions,
          subPartSkippedPieces,
          skippedTrimmingLogs,
          deliveredPSC,
          subPartsDelivered,
          deliveryLogs: fabricDeliveryLogs,
        };
        setFabrics((prev) => {
          const exists = prev.some((f) => f.id === normalized.id);
          if (exists) return prev.map((f) => (f.id === normalized.id ? { ...f, ...normalized } : f));
          return [normalized, ...prev];
        });
      } else if (table === 'thread_cutting_assignments') {
        let meta = {};
        if (newRow.notes && typeof newRow.notes === 'string' && newRow.notes.trim().startsWith('{')) {
          try { meta = JSON.parse(newRow.notes); } catch { meta = { userNotes: newRow.notes }; }
        } else {
          meta = { userNotes: newRow.notes };
        }
        const cId = newRow.cutting_id || newRow.cuttingId || meta.cuttingId || null;
        const fId = newRow.fabric_id || newRow.fabricId || meta.fabricId || null;
        const hId = newRow.helper_id || newRow.helperId || null;
        const cutting = cuttingsRef?.current?.find((c) => c.id === cId || (fId && (c.fabric_id === fId || c.fabricId === fId)));
        const resolvedCuttingId = cId || cutting?.id || null;
        const helper = helpersRef?.current?.find((h) => h.id === hId);
        const assigned = parseInt(newRow.assigned_pieces ?? newRow.assigned_psc ?? newRow.pieces_assigned ?? newRow.assignedPSC ?? newRow.assignedPieces ?? meta.assignedPSC, 10) || 0;
        const completed = parseInt(newRow.completed_pieces ?? newRow.completed_psc ?? newRow.pieces_completed ?? newRow.completedPSC ?? newRow.completedPieces ?? meta.completedPSC, 10) || 0;
        const rate = parseFloat(newRow.rate_per_piece ?? newRow.rate_per_psc ?? newRow.ratePerPiece ?? newRow.ratePerPSC ?? meta.ratePerPSC) || 0;
        const total = parseFloat(newRow.total_estimated_amount ?? newRow.total_earned ?? newRow.totalEarned ?? newRow.totalEstimatedAmount ?? meta.totalEstimatedAmount) || Math.round(assigned * rate * 100) / 100;
        const helperType = newRow.helper_type || newRow.helperType || meta.helperType || (helper?.helperCategory === 'external' || helper?.wageType === 'Piece Rate' ? 'external' : 'internal');

        const actionType = meta.actionType || newRow.action_type || newRow.actionType || (newRow.status === 'Skipped' || helperType === 'skip' ? 'skip' : 'assign');
        const subPart = meta.subPart || newRow.sub_part || newRow.subPart || null;
        const subPartName = meta.subPartName || newRow.sub_part_name || newRow.subPartName || null;
        const skippedLogs = meta.skippedLogs || newRow.skippedLogs || null;

        const normalized = {
          ...newRow,
          notes: meta.userNotes !== undefined ? meta.userNotes : newRow.notes,
          _userNotes: meta.userNotes || null,
          cuttingId: resolvedCuttingId,
          fabricId: fId || cutting?.fabricId || cutting?.fabric_id || null,
          fabricName: meta.fabricName || newRow.fabric_name || newRow.fabricName || cutting?.fabric_name || cutting?.fabricName || 'Fabric Batch',
          helperId: hId,
          helperName: newRow.helper_name || newRow.helperName || helper?.name || (actionType === 'skip' ? 'Direct Delivery (Skipped)' : 'Helper'),
          helperPhone: meta.helperPhone || newRow.helper_phone || newRow.helperPhone || helper?.phone || '',
          helperType,
          subPart,
          sub_part: subPart,
          subPartName,
          sub_part_name: subPartName,
          actionType,
          action_type: actionType,
          assignedPSC: assigned,
          assignedPieces: assigned,
          completedPSC: completed,
          completedPieces: completed,
          ratePerPSC: rate,
          ratePerPiece: rate,
          totalEstimatedAmount: total,
          totalEarned: total,
          subParts: meta.subParts || newRow.sub_parts || newRow.subParts || null,
          subPartQuantities: meta.subPartQuantities || meta.subParts || newRow.sub_parts || newRow.subParts || null,
          assignedDate: meta.assignedDate || newRow.assigned_date || newRow.assignedDate || newRow.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          completionDate: meta.completionDate || newRow.completion_date || newRow.completionDate || null,
          handoverId: meta.handoverId || newRow.handover_id || newRow.handoverId || null,
          expenseId: meta.expenseId || newRow.expense_id || newRow.expenseId || null,
          skippedLogs,
          masterId: newRow.master_id || newRow.masterId || meta.masterId || null,
          masterName: newRow.master_name || newRow.masterName || meta.masterName || null,
          createdByRole: newRow.createdByRole || meta.createdByRole || (newRow.master_id || newRow.masterId || meta.masterId ? 'master' : 'admin'),
          status: newRow.status || (actionType === 'skip' ? 'Skipped' : completed >= assigned && assigned > 0 ? 'Completed' : 'In Progress'),
          createdAt: newRow.created_at || newRow.createdAt,
          updatedAt: newRow.updated_at || newRow.updatedAt,
        };
        setThreadCuttingAssignments((prev) => {
          const exists = prev.some((t) => t.id === normalized.id);
          if (exists) return prev.map((t) => (t.id === normalized.id ? { ...t, ...normalized } : t));
          return [normalized, ...prev];
        });
      } else if (table === 'invoices') {
        let parsedItems = [];
        if (Array.isArray(newRow.items)) {
          parsedItems = newRow.items;
        } else if (typeof newRow.items === 'string') {
          try { parsedItems = JSON.parse(newRow.items); } catch { }
        }
        const firstFabricId = parsedItems.find((it) => it.fabricId || it.fabric_id)?.fabricId || null;
        const totalAmount = parseFloat(newRow.total_amount ?? newRow.totalAmount) || 0;
        const paidAmount = parseFloat(newRow.paid_amount ?? newRow.paidAmount) || 0;
        const rawDue = newRow.due_amount ?? newRow.dueAmount ?? newRow.pending_amount ?? newRow.pendingAmount;
        const pendingAmount =
          rawDue !== undefined && rawDue !== null && !isNaN(parseFloat(rawDue))
            ? parseFloat(rawDue)
            : Math.max(0, totalAmount - paidAmount);
        const status =
          newRow.status ||
          (paidAmount >= totalAmount && totalAmount > 0
            ? 'Paid'
            : paidAmount > 0
              ? 'Partial'
              : 'Pending');
        const normalized = {
          ...newRow,
          invoiceNumber: newRow.invoice_number || newRow.invoiceNumber,
          clientName: newRow.client_name || newRow.customerName || newRow.clientName || 'Supplier',
          customerName: newRow.client_name || newRow.customer_name || newRow.customerName,
          supplierName: newRow.client_name || newRow.supplier_name || newRow.supplierName || newRow.customerName || 'Supplier',
          clientPhone: newRow.client_phone || newRow.customerPhone || newRow.clientPhone || '',
          customerPhone: newRow.client_phone || newRow.customer_phone || newRow.customerPhone,
          supplierPhone: newRow.client_phone || newRow.supplier_phone || newRow.supplierPhone || '',
          date: newRow.date ? String(newRow.date).split('T')[0] : '',
          dueDate: newRow.due_date || newRow.dueDate || null,
          fabricId: newRow.fabric_id || newRow.fabricId || firstFabricId,
          items: parsedItems,
          totalAmount,
          paidAmount,
          dueAmount: pendingAmount,
          pendingAmount,
          status,
        };
        setInvoices((prev) => {
          const exists = prev.some((inv) => inv.id === normalized.id);
          if (exists) return prev.map((inv) => (inv.id === normalized.id ? { ...inv, ...normalized } : inv));
          return [normalized, ...prev];
        });
      } else if (table === 'expenses') {
        const expType = newRow.expense_type || newRow.expenseType || newRow.category || 'Other';
        const normalized = {
          ...newRow,
          id: newRow.id,
          expenseType: expType,
          category: expType,
          salarySubType: newRow.salary_sub_type || newRow.salarySubType || '',
          workerId: newRow.worker_id || newRow.workerId || '',
          workerName: newRow.worker_name || newRow.workerName || '',
          machineId: newRow.machine_id || newRow.machineId || '',
          machineCode: newRow.machine_code || newRow.machineCode || '',
          amount: parseFloat(newRow.amount) || 0,
          date: newRow.date || (newRow.created_at ? newRow.created_at.split('T')[0] : ''),
          month: newRow.month || (newRow.date ? newRow.date.slice(0, 7) : ''),
          paymentMethod: newRow.payment_method || newRow.paymentMethod || newRow.payment_mode || newRow.paymentMode || 'Cash',
          paidTo: newRow.paid_to || newRow.paidTo || newRow.recipient || '',
          referenceNo: newRow.reference_no || newRow.referenceNo || '',
          notes: newRow.notes || newRow.description || '',
          fabricId: newRow.fabric_id || newRow.fabricId || null,
          cuttingId: newRow.cutting_id || newRow.cuttingId || null,
          createdAt: newRow.created_at || newRow.createdAt,
          updatedAt: newRow.updated_at || newRow.updatedAt,
        };
        setExpenses((prev) => {
          const exists = prev.some((exp) => exp.id === normalized.id);
          if (exists) return prev.map((exp) => (exp.id === normalized.id ? { ...exp, ...normalized } : exp));
          return [normalized, ...prev];
        });
      } else if (table === 'delivery_logs') {
        const normalized = {
          ...newRow,
          fabricId: newRow.fabric_id || newRow.fabricId,
          cuttingId: newRow.cutting_id || newRow.cuttingId,
          threadJobId: newRow.thread_job_id || newRow.threadJobId,
          invoiceId: newRow.invoice_id || newRow.invoiceId,
          invoiceNumber: newRow.invoice_number || newRow.invoiceNumber,
          supplierId: newRow.supplier_id || newRow.supplierId,
          supplierName: newRow.supplier_name || newRow.supplierName,
          supplierPhone: newRow.supplier_phone || newRow.supplierPhone,
          totalPieces: parseInt(newRow.total_pieces ?? newRow.totalPieces ?? newRow.deliveredPSC, 10) || 0,
          subParts: newRow.sub_parts || newRow.subParts || {},
          subPartQuantities: newRow.sub_parts || newRow.subPartQuantities || newRow.subParts || {},
          pricePerPSC: parseFloat(newRow.price_per_piece ?? newRow.pricePerPSC) || 0,
          totalAmount: parseFloat(newRow.total_amount ?? newRow.totalAmount) || 0,
          deliveryDate: newRow.delivery_date || newRow.deliveryDate,
          dueDate: newRow.due_date || newRow.dueDate,
          vehicleNo: newRow.vehicle_no || newRow.vehicleNo,
        };
        setDeliveryLogs((prev) => {
          const exists = prev.some((dl) => dl.id === normalized.id);
          if (exists) return prev.map((dl) => (dl.id === normalized.id ? { ...dl, ...normalized } : dl));
          return [normalized, ...prev];
        });
      } else if (table === 'masters') {
        const normalized = {
          ...newRow,
          joinedDate: newRow.joined_date || newRow.joinedDate || null,
          leftDate: newRow.left_date || newRow.leftDate || null,
          exitReason: newRow.exit_reason || newRow.exitReason || null,
        };
        setMasters((prev) => {
          const exists = prev.some((m) => m.id === normalized.id);
          if (exists) return prev.map((m) => (m.id === normalized.id ? { ...m, ...normalized } : m));
          return [normalized, ...prev];
        });
      } else if (table === 'machines') {
        const normalized = {
          ...newRow,
          assignedTailorId: newRow.assigned_tailor_id || newRow.assignedTailorId || null,
          operatorHistory: newRow.operator_history || newRow.operatorHistory || [],
        };
        setMachines((prev) => {
          const exists = prev.some((m) => m.id === normalized.id);
          if (exists) return prev.map((m) => (m.id === normalized.id ? { ...m, ...normalized } : m));
          return [normalized, ...prev];
        });
      } else if (table === 'tailors') {
        const normalized = {
          ...newRow,
          assignedMachineId: newRow.assigned_machine_id || newRow.assignedMachineId || null,
          joinedDate: newRow.joined_date || newRow.joinedDate || null,
          leftDate: newRow.left_date || newRow.leftDate || null,
          exitReason: newRow.exit_reason || newRow.exitReason || null,
        };
        setTailors((prev) => {
          const exists = prev.some((t) => t.id === normalized.id);
          if (exists) return prev.map((t) => (t.id === normalized.id ? { ...t, ...normalized } : t));
          return [normalized, ...prev];
        });
      } else if (table === 'helpers') {
        const normalized = {
          ...newRow,
          assignedMasterId: newRow.assigned_master_id || newRow.assignedMasterId || null,
          helperCategory: newRow.helper_category || newRow.helperCategory || null,
          helperType: newRow.helper_type || newRow.helperType || null,
          workType: newRow.work_type || newRow.workType || null,
          wageType: newRow.wage_type || newRow.wageType || null,
          defaultRatePerPiece: parseFloat(newRow.default_rate_per_piece ?? newRow.default_rate_per_psc ?? newRow.defaultRatePerPSC) || 0,
          defaultRatePerPSC: parseFloat(newRow.default_rate_per_piece ?? newRow.default_rate_per_psc ?? newRow.defaultRatePerPSC) || 0,
          joinedDate: newRow.joined_date || newRow.joinedDate || null,
          leftDate: newRow.left_date || newRow.leftDate || null,
          exitReason: newRow.exit_reason || newRow.exitReason || null,
        };
        setHelpers((prev) => {
          const exists = prev.some((h) => h.id === normalized.id);
          if (exists) return prev.map((h) => (h.id === normalized.id ? { ...h, ...normalized } : h));
          return [normalized, ...prev];
        });
      } else if (table === 'suppliers') {
        const normalized = {
          ...newRow,
          contactPerson: newRow.contact_person || newRow.contactPerson || null,
          gstNumber: newRow.gst_number || newRow.gstNumber || null,
          paymentTerms: newRow.payment_terms || newRow.paymentTerms || null,
        };
        setSuppliers((prev) => {
          const exists = prev.some((s) => s.id === normalized.id);
          if (exists) return prev.map((s) => (s.id === normalized.id ? { ...s, ...normalized } : s));
          return [normalized, ...prev];
        });
      }
    };

    const tenantScope = String(ownerUserId || currentUserId || 'shared').trim();
    const channelName = `fabric-manager-live-cloud-sync-${tenantScope}`;
    const tenantFilter = ownerUserId ? `user_id=eq.${ownerUserId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'cloud_sync' }, ({ payload }) => {
        if (payload) {
          if (payload.originTabId === LOCAL_TAB_ID) return;
          if (!isPayloadForTenant(payload, candidateUserIdsRef?.current)) return;
          handleBroadcastDataRef.current?.(payload);
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tailor_assignments', filter: tenantFilter },
        (payload) => handleRealtimeChange('tailor_assignments', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cuttings', filter: tenantFilter },
        (payload) => handleRealtimeChange('cuttings', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'master_handovers', filter: tenantFilter },
        (payload) => handleRealtimeChange('master_handovers', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fabrics', filter: tenantFilter },
        (payload) => handleRealtimeChange('fabrics', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'thread_cutting_assignments', filter: tenantFilter },
        (payload) => handleRealtimeChange('thread_cutting_assignments', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: tenantFilter },
        (payload) => handleRealtimeChange('invoices', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: tenantFilter },
        (payload) => handleRealtimeChange('expenses', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_logs', filter: tenantFilter },
        (payload) => handleRealtimeChange('delivery_logs', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'masters', filter: tenantFilter },
        (payload) => handleRealtimeChange('masters', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'machines', filter: tenantFilter },
        (payload) => handleRealtimeChange('machines', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tailors', filter: tenantFilter },
        (payload) => handleRealtimeChange('tailors', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'helpers', filter: tenantFilter },
        (payload) => handleRealtimeChange('helpers', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suppliers', filter: tenantFilter },
        (payload) => handleRealtimeChange('suppliers', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: ownerUserId ? `id=eq.${ownerUserId}` : undefined },
        (payload) => {
          if (payload?.new && typeof window !== 'undefined') {
            const row = payload.new;
            window.dispatchEvent(
              new CustomEvent('fm_sync_event', {
                detail: {
                  type: 'PROFILE_UPDATED',
                  item: {
                    id: row.id,
                    name: row.name,
                    companyName: row.company_name,
                    phone: row.phone,
                  },
                },
              })
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          registerCloudBroadcastSender((payload) => {
            try {
              channel.send({
                type: 'broadcast',
                event: 'cloud_sync',
                payload,
              });
            } catch (e) {
              console.warn('[Sync] Broadcast send error:', e);
            }
          });
          debouncedRefreshAllData();
        }
      });

    return () => {
      registerCloudBroadcastSender(null);
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedRefreshAllData, ownerUserId, currentUserId]);

  // Periodic background sync: gentle 5-minute fallback (WebSocket realtime handles instant updates)
  useEffect(() => {
    const heartbeatTimer = setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (Date.now() - (lastNetworkErrorTimeRef?.current || 0) < 15000) return;
      // Only refresh if 5 minutes have elapsed since the last successful sync
      if (Date.now() - (lastSuccessfulFetchTimeRef?.current || 0) >= 300000 && document.visibilityState === 'visible') {
        debouncedRefreshAllData();
      }
    }, 60000); // Check once per minute

    return () => clearInterval(heartbeatTimer);
  }, [debouncedRefreshAllData, lastNetworkErrorTimeRef, lastSuccessfulFetchTimeRef]);

  // App-wide visibility & focus listeners (throttled to at most once per 60 seconds)
  useEffect(() => {
    const handleFocus = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (Date.now() - (lastNetworkErrorTimeRef?.current || 0) < 5000) return;
      if (Date.now() - (lastSuccessfulFetchTimeRef?.current || 0) < 60000) return;
      debouncedRefreshAllData();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        if (Date.now() - (lastNetworkErrorTimeRef?.current || 0) < 5000) return;
        if (Date.now() - (lastSuccessfulFetchTimeRef?.current || 0) < 60000) return;
        debouncedRefreshAllData();
      }
    };
    const handleOnline = () => {
      debouncedRefreshAllData();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [debouncedRefreshAllData, lastNetworkErrorTimeRef, lastSuccessfulFetchTimeRef]);

  return {
    handleBroadcastData,
  };
}
