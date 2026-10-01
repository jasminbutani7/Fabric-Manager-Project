import { useCallback, useRef, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import {
  normalizeTailorAssignment,
  mapLoadedFabric,
  mapLoadedCutting,
  mapLoadedInvoice,
} from '../../services/dbMappers';
import { mergeAssignmentSafely } from '../../services/realtimeSync';
import { getScopedExpenseCacheKey } from '../../utils/sessionSecurity';

export function useSupabaseDataLoader({
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
}) {
  // Fetch data directly from Supabase PostgreSQL cloud database, scoped to current logged-in user
  const loadAllFromSupabase = useCallback(async (opts = {}) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }
    if (opts?.silent && Date.now() - lastNetworkErrorTimeRef.current < 5000) {
      return;
    }

    if (!currentUserId) {
      // Clear active states if no admin user is logged in
      if (isMountedRef.current) {
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
        setDeliveryLogs([]);
        setIsInitialized(true);
      }
      return;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // Resolve target admin/user IDs for strict account isolation
        let adminUserId = currentUser?.adminUserId || currentUser?.adminId || currentUser?.user_id || currentUser?.userId;

        // If worker/master session is missing adminUserId, lookup parent user_id from database
        if ((!adminUserId || adminUserId.startsWith('mst_') || adminUserId.startsWith('tlr_') || adminUserId.startsWith('hlp_')) && currentUserId && (currentUserId.startsWith('mst_') || currentUserId.startsWith('tlr_') || currentUserId.startsWith('hlp_'))) {
          const isMst = currentUserId.startsWith('mst_');
          const isTlr = currentUserId.startsWith('tlr_');
          const targetTable = isMst ? 'masters' : isTlr ? 'tailors' : 'helpers';
          const { data: workerRecord } = await supabase.from(targetTable).select('user_id').eq('id', currentUserId).maybeSingle();
          if (workerRecord?.user_id) {
            adminUserId = workerRecord.user_id;
          }
        }

        const resolvedAdminId = (adminUserId && !adminUserId.startsWith('mst_') && !adminUserId.startsWith('tlr_') && !adminUserId.startsWith('hlp_'))
          ? adminUserId
          : (currentUserId && !currentUserId.startsWith('mst_') && !currentUserId.startsWith('tlr_') && !currentUserId.startsWith('hlp_') ? currentUserId : null);

        let extraWorkerIds = [];
        if (resolvedAdminId) {
          const [{ data: mList }, { data: tList }] = await Promise.all([
            supabase.from('masters').select('id').eq('user_id', resolvedAdminId),
            supabase.from('tailors').select('id').eq('user_id', resolvedAdminId)
          ]);
          if (mList && mList.length > 0) {
            extraWorkerIds.push(...mList.map((m) => m.id));
          }
          if (tList && tList.length > 0) {
            extraWorkerIds.push(...tList.map((t) => t.id));
          }
        }

        const candidateUserIds = Array.from(
          new Set(
            [
              currentUserId,
              currentUser?.id,
              currentUser?.user_id,
              currentUser?.userId,
              adminUserId,
              resolvedAdminId,
              ...extraWorkerIds,
            ].filter(Boolean)
          )
        );
        candidateUserIdsRef.current = candidateUserIds;

        const fetchScoped = (table, { limit = 2500, orderBy = 'created_at', ascending = false } = {}) => {
          if (candidateUserIds.length > 0) {
            const eqFilters = candidateUserIds.map((id) => `user_id.eq.${id}`).join(',');
            if (table === 'masters') {
              return supabase
                .from('masters')
                .select('id, user_id, role, name, phone, specialization, experience, status, joined_date, left_date, exit_reason, password, created_at, updated_at')
                .or(eqFilters);
            }
            if (table === 'tailors') {
              return supabase
                .from('tailors')
                .select('id, user_id, role, name, phone, assigned_machine_id, specialty, status, joined_date, left_date, exit_reason, password, created_at, updated_at')
                .or(eqFilters);
            }
            // For high-volume transaction & floor logs, order by date descending with safe ceiling limit
            if (['expenses', 'invoices', 'tailor_assignments', 'delivery_logs', 'thread_cutting_assignments'].includes(table)) {
              return supabase
                .from(table)
                .select('*')
                .or(eqFilters)
                .order(orderBy, { ascending })
                .limit(limit);
            }
            return supabase.from(table).select('*').or(eqFilters);
          }
          return Promise.resolve({ data: [] });
        };

        const fetchTemplates = () => {
          if (candidateUserIds.length > 0) {
            const eqFilters = candidateUserIds.map((id) => `user_id.eq.${id}`).join(',');
            return supabase.from('product_templates').select('*').or(eqFilters);
          }
          return Promise.resolve({ data: [] });
        };

        const fetchDeliveryLogsSafe = async () => {
          try {
            return await fetchScoped('delivery_logs');
          } catch {
            return { data: [] };
          }
        };

        const fetchGlobalInvoiceNumbers = async () => {
          try {
            if (candidateUserIds.length > 0) {
              const eqFilters = candidateUserIds.map((id) => `user_id.eq.${id}`).join(',');
              return await supabase.from('invoices').select('invoice_number').or(eqFilters);
            }
            return { data: [] };
          } catch {
            return { data: [] };
          }
        };

        const [
          { data: mastersData },
          { data: machinesData },
          { data: tailorsData },
          { data: helpersData },
          { data: suppliersData },
          { data: fabricsData },
          { data: cuttingsData },
          { data: assignmentsData },
          { data: handoversData },
          { data: threadData },
          { data: expensesData },
          { data: invoicesData },
          { data: invoiceExpensesData },
          { data: templatesData },
          { data: deliveryLogsData },
          { data: globalInvoiceNumbersData },
        ] = await Promise.all([
          fetchScoped('masters'),
          fetchScoped('machines'),
          fetchScoped('tailors'),
          fetchScoped('helpers'),
          fetchScoped('suppliers'),
          fetchScoped('fabrics'),
          fetchScoped('cuttings'),
          fetchScoped('tailor_assignments'),
          fetchScoped('master_handovers'),
          fetchScoped('thread_cutting_assignments'),
          fetchScoped('expenses'),
          fetchScoped('invoices'),
          fetchScoped('invoice_expenses'),
          fetchTemplates(),
          fetchDeliveryLogsSafe(),
          fetchGlobalInvoiceNumbers(),
        ]);

        if (globalInvoiceNumbersData && Array.isArray(globalInvoiceNumbersData)) {
          dbInvoiceNumbersRef.current = globalInvoiceNumbersData
            .map((r) => r.invoice_number)
            .filter(Boolean);
        }

        if (!isMountedRef.current) return;

        const isOwned = (item) => isItemOwned(item);

        if (mastersData) {
          setMasters(
            mastersData.filter(isOwned).map((m) => ({
              ...m,
              password: m.password || null,
              joinedDate: m.joined_date || m.joinedDate || null,
              leftDate: m.left_date || m.leftDate || null,
              exitReason: m.exit_reason || m.exitReason || null,
            }))
          );
        } else {
          setMasters([]);
        }

        if (machinesData) {
          setMachines(
            machinesData.filter(isOwned).map((m) => ({
              ...m,
              assignedTailorId: m.assigned_tailor_id || m.assignedTailorId || null,
              operatorHistory: m.operator_history || m.operatorHistory || [],
            }))
          );
        } else {
          setMachines([]);
        }

        if (tailorsData) {
          setTailors(
            tailorsData.filter(isOwned).map((t) => ({
              ...t,
              password: t.password || null,
              assignedMachineId: t.assigned_machine_id || t.assignedMachineId || null,
              joinedDate: t.joined_date || t.joinedDate || null,
              leftDate: t.left_date || t.leftDate || null,
              exitReason: t.exit_reason || t.exitReason || null,
            }))
          );
        } else {
          setTailors([]);
        }

        if (helpersData) {
          setHelpers(
            helpersData.filter(isOwned).map((h) => ({
              ...h,
              assignedMasterId: h.assigned_master_id || h.assignedMasterId || null,
              helperCategory: h.helper_category || h.helperCategory || null,
              helperType: h.helper_type || h.helperType || null,
              workType: h.work_type || h.workType || null,
              wageType: h.wage_type || h.wageType || null,
              defaultRatePerPiece: parseFloat(h.default_rate_per_piece ?? h.default_rate_per_psc ?? h.defaultRatePerPSC) || 0,
              defaultRatePerPSC: parseFloat(h.default_rate_per_piece ?? h.default_rate_per_psc ?? h.defaultRatePerPSC) || 0,
              joinedDate: h.joined_date || h.joinedDate || null,
              leftDate: h.left_date || h.leftDate || null,
              exitReason: h.exit_reason || h.exitReason || null,
            }))
          );
        } else {
          setHelpers([]);
        }

        if (suppliersData) {
          setSuppliers(
            suppliersData.filter(isOwned).map((s) => ({
              ...s,
              contactPerson: s.contact_person || s.contactPerson || null,
              gstNumber: s.gst_number || s.gstNumber || null,
              paymentTerms: s.payment_terms || s.paymentTerms || null,
            }))
          );
        } else {
          setSuppliers([]);
        }

        let allFabrics = [];
        if (fabricsData) {
          allFabrics = fabricsData.filter(isOwned).map(mapLoadedFabric);
          setFabrics(allFabrics);
        } else {
          setFabrics([]);
        }

        let allCuttings = [];
        if (cuttingsData) {
          allCuttings = cuttingsData.filter(isOwned).map(mapLoadedCutting);
          setCuttings(allCuttings);
        } else {
          setCuttings([]);
        }

        if (assignmentsData) {
          setTailorAssignments(
            assignmentsData.filter(isOwned).map((a) => {
              const cutPieces = a.assigned_cut_pieces || a.assigned_pieces || a.cutPieces || a.assignedCutPieces;
              const rawGarmentPcs = a.assigned_garment_pcs || a.assigned_sub_parts || a.garmentPcs || a.assignedGarmentPcs || {};
              const meta = (rawGarmentPcs && typeof rawGarmentPcs === 'object' && rawGarmentPcs._meta) ? rawGarmentPcs._meta : {};
              const garmentPcs = (rawGarmentPcs && typeof rawGarmentPcs === 'object') ? { ...rawGarmentPcs } : {};
              delete garmentPcs._meta;

              const normalized = {
                id: a.id,
                userId: a.user_id || a.userId,
                user_id: a.user_id || a.userId,
                fabricId: a.fabric_id || a.fabricId,
                fabricName: a.fabric_name || a.fabricName,
                cuttingId: a.cutting_id || a.cuttingId,
                masterId: a.masterId || a.master_id || meta.masterId || null,
                masterName: a.master_name || a.masterName,
                tailorId: a.tailor_id || a.tailorId,
                tailorName: a.tailor_name || a.tailorName,
                machineId: a.machineId || a.machine_id || meta.machineId || null,
                machineCode: a.machineCode || a.machine_code || meta.machineCode || '',
                machineName: a.machineName || a.machine_name || meta.machineName || '',
                allocationMode: a.allocationMode || a.allocation_mode || meta.allocationMode || 'by_machine',
                assignedPieces: cutPieces,
                assignedCutPieces: cutPieces,
                assignedSubParts: garmentPcs,
                assignedGarmentPcs: garmentPcs,
                totalAssignedPieces: a.total_assigned_pieces || a.totalAssignedPieces,
                ratePerPiece: a.rate_per_piece || a.ratePerPiece,
                totalJobAmount: a.total_job_amount || a.totalJobAmount,
                tailorRates: a.tailor_rates || a.tailorRates || meta.tailorRates || null,
                subPartRates: a.sub_part_rates || a.subPartRates || meta.subPartRates || null,
                productStructure: a.product_structure || a.productStructure,
                pieceType: a.piece_type || a.pieceType,
                completedQuantity: a.completed_quantity || a.completedQuantity,
                totalEarned: a.total_earned || a.totalEarned,
                dailySubmissions: a.daily_submissions || a.dailySubmissions || [],
                tailorAccepted: a.tailor_accepted || a.tailorAccepted,
                acceptedAt: a.accepted_at || a.acceptedAt,
                notes: a.notes || meta.notes || null,
                assignDate: a.assign_date || a.assignDate || meta.assignDate || (a.created_at ? a.created_at.split('T')[0] : ''),
                dueDate: a.due_date || a.dueDate || meta.dueDate || null,
                status: a.status,
                isArchived: Boolean(a.is_archived || a.isArchived),
                archivedAt: a.archived_at || a.archivedAt || null,
                createdAt: a.created_at || a.createdAt,
                updatedAt: a.updated_at || a.updatedAt,
              };
              return normalizeTailorAssignment(normalized, allFabrics, allCuttings);
            })
          );
        } else {
          setTailorAssignments([]);
        }

        if (handoversData) {
          setMasterHandovers(
            handoversData.filter(isOwned).map((h) => {
              let meta = {};
              if (h.notes && typeof h.notes === 'string' && h.notes.trim().startsWith('{')) {
                try { meta = JSON.parse(h.notes); } catch { meta = { userNotes: h.notes }; }
              } else {
                meta = { userNotes: h.notes };
              }

              const cutting = allCuttings.find((c) => c.id === (h.cutting_id || h.cuttingId));
              const fabric = allFabrics.find((f) => f.id === (h.fabric_id || h.fabricId || cutting?.fabricId));

              return {
                ...h,
                notes: meta.userNotes !== undefined ? meta.userNotes : h.notes,
                _userNotes: meta.userNotes || null,
                masterId: h.master_id || h.masterId,
                masterName: h.master_name || h.masterName,
                fabricId: h.fabric_id || h.fabricId || cutting?.fabricId || null,
                fabricName: meta.fabricName || h.fabric_name || h.fabricName || cutting?.fabricName || fabric?.fabricType || 'Fabric Batch',
                productName: meta.productName || h.product_name || h.productName || cutting?.productName || 'Garment',
                cuttingId: h.cutting_id || h.cuttingId,
                piecesCount: parseInt(h.pieces_count ?? h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0,
                pieces: parseInt(h.pieces_count ?? h.pieces ?? h.piecesCount ?? h.receivedQuantity, 10) || 0,
                subParts: meta.subParts || h.sub_parts || h.subParts || null,
                parts: meta.parts || h.parts || null,
                combinationFormula: meta.combinationFormula || h.combination_formula || h.combinationFormula || null,
                handoverDate: meta.handoverDate || h.handover_date || h.handoverDate || h.date || null,
                verifiedBy: meta.verifiedBy || h.verified_by || h.verifiedBy || null,
                verifiedAt: meta.verifiedAt || h.verified_at || h.verifiedAt || null,
                rejectionReason: meta.rejectionReason || h.rejection_reason || h.rejectionReason || null,
                rejectedAt: meta.rejectedAt || h.rejected_at || h.rejectedAt || null,
                receivedQuantity: h.received_quantity || h.receivedQuantity,
                acceptedQuantity: h.accepted_quantity || h.acceptedQuantity,
                rejectedQuantity: h.rejected_quantity || h.rejectedQuantity,
                trimmingStatus: meta.trimmingStatus || h.trimming_status || h.trimmingStatus || (meta.trimmedByMaster ? 'trimmed' : meta.skippedByMaster ? 'skipped' : null),
                trimmedByMaster: Boolean(meta.trimmedByMaster || meta.trimmingStatus === 'trimmed' || h.trimming_status === 'trimmed'),
                skippedByMaster: Boolean(meta.skippedByMaster || meta.trimmingStatus === 'skipped' || h.trimming_status === 'skipped'),
                trimmedPieces: parseInt(meta.trimmedPieces ?? h.trimmed_pieces ?? h.trimmedPieces, 10) || 0,
                skippedTrimmingPieces: parseInt(meta.skippedTrimmingPieces ?? h.skipped_trimming_pieces ?? h.skippedTrimmingPieces, 10) || 0,
                trimmedSubParts: meta.trimmedSubParts || h.trimmed_sub_parts || h.trimmedSubParts || null,
                skippedSubParts: meta.skippedSubParts || h.skipped_sub_parts || h.skippedSubParts || null,
                trimmingHelperName: meta.trimmingHelperName || null,
                trimmingHelperType: meta.trimmingHelperType || null,
                isArchived: Boolean(h.is_archived || h.isArchived),
                archivedAt: h.archived_at || h.archivedAt || null,
              };
            })
          );
        } else {
          setMasterHandovers([]);
        }

        if (threadData) {
          setThreadCuttingAssignments(
            threadData.filter(isOwned).map((tc) => {
              let meta = {};
              if (tc.notes && typeof tc.notes === 'string' && tc.notes.trim().startsWith('{')) {
                try { meta = JSON.parse(tc.notes); } catch { meta = { userNotes: tc.notes }; }
              } else {
                meta = { userNotes: tc.notes };
              }

              const cId = tc.cutting_id || tc.cuttingId;
              const fId = tc.fabric_id || tc.fabricId;
              const hId = tc.helper_id || tc.helperId;

              const cutting = allCuttings.find((c) => c.id === cId || (fId && (c.fabric_id === fId || c.fabricId === fId)));
              const resolvedCuttingId = cId || cutting?.id || null;
              const fabric = allFabrics.find((f) => f.id === fId || f.id === cutting?.fabric_id || f.id === cutting?.fabricId);
              const helper = helpersData?.find((h) => h.id === hId);

              const assigned = parseInt(
                tc.assigned_pieces ?? tc.assigned_psc ?? tc.pieces_assigned ?? tc.assignedPSC ?? tc.assignedPieces ?? meta.assignedPSC,
                10
              ) || 0;
              const completed = parseInt(
                tc.completed_pieces ?? tc.completed_psc ?? tc.pieces_completed ?? tc.completedPSC ?? tc.completedPieces ?? meta.completedPSC,
                10
              ) || 0;
              const rate = parseFloat(
                tc.rate_per_piece ?? tc.rate_per_psc ?? tc.ratePerPiece ?? tc.ratePerPSC ?? meta.ratePerPSC
              ) || 0;
              const total = parseFloat(
                tc.total_estimated_amount ?? tc.total_earned ?? tc.totalEarned ?? tc.totalEstimatedAmount ?? meta.totalEstimatedAmount
              ) || Math.round(assigned * rate * 100) / 100;

              const helperType = tc.helper_type || tc.helperType || meta.helperType || (helper?.helperCategory === 'external' || helper?.wageType === 'Piece Rate' ? 'external' : 'internal');
              const fabricName = tc.fabric_name || meta.fabricName || tc.fabricName || cutting?.fabric_name || cutting?.fabricName || fabric?.product_name || fabric?.fabric_type || 'Fabric Batch';
              const assignedDate = tc.assigned_date || meta.assignedDate || tc.assignedDate || tc.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
              const completionDate = tc.completion_date || meta.completionDate || tc.completionDate || null;
              const handoverId = tc.handover_id || meta.handoverId || tc.handoverId || null;
              const expenseId = tc.expense_id || meta.expenseId || tc.expenseId || null;

              const actionType = tc.action_type || meta.actionType || tc.actionType || (tc.status === 'Skipped' || helperType === 'skip' ? 'skip' : 'assign');
              const subPart = tc.sub_part || meta.subPart || tc.subPart || null;
              const subPartName = tc.sub_part_name || meta.subPartName || tc.subPartName || null;
              const skippedLogs = meta.skippedLogs || tc.skippedLogs || null;

              return {
                ...tc,
                cuttingId: resolvedCuttingId,
                fabricId: fId || cutting?.fabric_id || cutting?.fabricId || '',
                fabricName,
                helperId: hId,
                helperName: tc.helper_name || tc.helperName || helper?.name || (actionType === 'skip' ? 'Direct Delivery (Skipped)' : 'Helper'),
                helperPhone: tc.helper_phone || meta.helperPhone || tc.helperPhone || helper?.phone || '',
                helperType,
                subPart,
                sub_part: subPart,
                subPartName,
                sub_part_name: subPartName,
                actionType,
                action_type: actionType,
                assignedPieces: assigned,
                completedPieces: completed,
                ratePerPiece: rate,
                totalEarned: total,
                assignedPSC: assigned,
                completedPSC: completed,
                ratePerPSC: rate,
                totalEstimatedAmount: total,
                piecesAssigned: assigned,
                piecesCompleted: completed,
                assignedDate,
                completionDate,
                handoverId,
                expenseId,
                skippedLogs,
                masterId: tc.master_id || meta.masterId || tc.masterId || null,
                masterName: tc.master_name || meta.masterName || tc.masterName || null,
                createdByRole: tc.created_by_role || tc.createdByRole || meta.createdByRole || (tc.master_id || tc.masterId || meta.masterId ? 'master' : 'admin'),
                notes: meta.userNotes !== undefined ? meta.userNotes : tc.notes,
                _userNotes: meta.userNotes || null,
                status: tc.status || (actionType === 'skip' ? 'Skipped' : 'In Progress'),
                isArchived: Boolean(tc.is_archived || tc.isArchived),
                archivedAt: tc.archived_at || tc.archivedAt || null,
              };
            })
          );
        } else {
          setThreadCuttingAssignments([]);
        }

        if (expensesData && expensesData.length > 0) {
          const mappedExpenses = expensesData.filter(isOwned).map((e) => {
            const expType = e.expense_type || e.expenseType || e.category || 'Other';
            return {
              ...e,
              id: e.id,
              expenseType: expType,
              category: expType,
              salarySubType: e.salary_sub_type || e.salarySubType || '',
              workerId: e.worker_id || e.workerId || '',
              workerName: e.worker_name || e.workerName || '',
              machineId: e.machine_id || e.machineId || '',
              machineCode: e.machine_code || e.machineCode || '',
              amount: parseFloat(e.amount) || 0,
              date: e.date || (e.created_at ? e.created_at.split('T')[0] : ''),
              month: e.month || (e.date ? e.date.slice(0, 7) : ''),
              paymentMethod: e.payment_method || e.paymentMethod || e.payment_mode || e.paymentMode || 'Cash',
              paidTo: e.paid_to || e.paidTo || e.recipient || '',
              referenceNo: e.reference_no || e.referenceNo || '',
              notes: e.notes || e.description || '',
              fabricId: e.fabric_id || e.fabricId || null,
              cuttingId: e.cutting_id || e.cuttingId || null,
              createdAt: e.created_at || e.createdAt,
              updatedAt: e.updated_at || e.updatedAt,
            };
          });
          setExpenses(mappedExpenses);
          try {
            const cacheKey = getScopedExpenseCacheKey(resolvedAdminId || ownerUserId);
            if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(mappedExpenses));
          } catch { }
        } else if (!expensesData) {
          try {
            const cacheKey = getScopedExpenseCacheKey(resolvedAdminId || ownerUserId);
            const cached = cacheKey ? localStorage.getItem(cacheKey) : null;
            if (cached) setExpenses(JSON.parse(cached));
          } catch { }
        } else {
          setExpenses([]);
        }

        if (invoicesData) {
          setInvoices(invoicesData.filter(isOwned).map(mapLoadedInvoice));
        } else {
          setInvoices([]);
        }

        if (invoiceExpensesData) {
          setInvoiceExpenses(
            invoiceExpensesData.filter(isOwned).map((ie) => ({
              ...ie,
              invoiceId: ie.invoice_id || ie.invoiceId,
              expenseId: ie.expense_id || ie.expenseId,
              fabricId: ie.fabric_id || ie.fabricId,
              cuttingId: ie.cutting_id || ie.cuttingId,
              costType: ie.cost_type || ie.costType || 'direct_cost',
              allocatedAmount: parseFloat(ie.allocated_amount ?? ie.allocatedAmount) || 0,
            }))
          );
        } else {
          setInvoiceExpenses([]);
        }

        if (deliveryLogsData && deliveryLogsData.length > 0) {
          setDeliveryLogs(
            deliveryLogsData.filter(isOwned).map((d) => ({
              ...d,
              fabricId: d.fabric_id || d.fabricId,
              cuttingId: d.cutting_id || d.cuttingId,
              threadJobId: d.thread_job_id || d.threadJobId,
              invoiceId: d.invoice_id || d.invoiceId,
              invoiceNumber: d.invoice_number || d.invoiceNumber,
              supplierId: d.supplier_id || d.supplierId,
              supplierName: d.supplier_name || d.supplierName,
              supplierPhone: d.supplier_phone || d.supplierPhone,
              totalPieces: parseInt(d.total_pieces ?? d.totalPieces ?? d.deliveredPSC, 10) || 0,
              subParts: d.sub_parts || d.subParts || {},
              subPartQuantities: d.sub_parts || d.subPartQuantities || d.subParts || {},
              pricePerPSC: parseFloat(d.price_per_piece ?? d.pricePerPSC) || 0,
              totalAmount: parseFloat(d.total_amount ?? d.totalAmount) || 0,
              deliveryDate: d.delivery_date || d.deliveryDate,
              dueDate: d.due_date || d.dueDate,
              vehicleNo: d.vehicle_no || d.vehicleNo,
              isArchived: Boolean(d.is_archived || d.isArchived),
              archivedAt: d.archived_at || d.archivedAt || null,
              restoredAt: d.restored_at || d.restoredAt || null,
            }))
          );
        } else {
          const logsFromFabrics = allFabrics.flatMap((f) => f.deliveryLogs || []);
          setDeliveryLogs(logsFromFabrics);
        }

        if (templatesData && templatesData.length > 0) {
          setProductTemplates(
            templatesData.map((t) => ({
              ...t,
              productName: t.product_name || t.productName,
              fullSetRate: parseFloat(t.full_set_rate ?? t.fullSetRate) || 0,
              subParts: t.sub_parts || t.subParts || [],
              isDefault: Boolean(t.is_default ?? t.isDefault),
            }))
          );
        }
        lastSuccessfulFetchTimeRef.current = Date.now();
      } catch (err) {
        lastNetworkErrorTimeRef.current = Date.now();
        console.error('Failed to load initial data from Supabase:', err);
      } finally {
        if (isMountedRef.current) setIsInitialized(true);
      }
    } else {
      if (isMountedRef.current) setIsInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, currentUser?.id, currentUser?.adminUserId, currentUser?.adminId, currentUser?.user_id, currentUser?.userId, ownerUserId]);

  const loadAllFromSupabaseRef = useRef(loadAllFromSupabase);
  useEffect(() => {
    loadAllFromSupabaseRef.current = loadAllFromSupabase;
  }, [loadAllFromSupabase]);

  const refreshTimerRef = useRef(null);
  const debouncedRefreshAllData = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      if (loadAllFromSupabaseRef.current) {
        loadAllFromSupabaseRef.current({ silent: true });
      }
    }, 300);
  }, []);

  const refreshAllData = useCallback(async (opts) => {
    if (loadAllFromSupabaseRef.current) {
      return await loadAllFromSupabaseRef.current(opts);
    }
  }, []);

  const refreshTailorAssignments = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (Date.now() - lastNetworkErrorTimeRef.current < 5000) return;
    try {
      let query = supabase.from('tailor_assignments').select('*');
      if (candidateUserIdsRef.current.length > 0) {
        const eqFilters = candidateUserIdsRef.current.map((id) => `user_id.eq.${id}`).join(',');
        query = query.or(`${eqFilters},user_id.is.null`);
      }
      const { data, error } = await query;
      if (!error && data) {
        setTailorAssignments((prev) => {
          const map = new Map();
          prev.forEach((a) => map.set(a.id, a));
          data.forEach((raw) => {
            const cutPieces = raw.assigned_cut_pieces || raw.assigned_pieces;
            const rawGarmentPcs = raw.assigned_garment_pcs || raw.assigned_sub_parts || {};
            const meta = (rawGarmentPcs && typeof rawGarmentPcs === 'object' && rawGarmentPcs._meta) ? rawGarmentPcs._meta : {};
            const garmentPcs = (rawGarmentPcs && typeof rawGarmentPcs === 'object') ? { ...rawGarmentPcs } : {};
            delete garmentPcs._meta;
            const incoming = {
              id: raw.id,
              userId: raw.user_id,
              fabricId: raw.fabric_id,
              fabricName: raw.fabric_name,
              cuttingId: raw.cutting_id,
              masterId: raw.masterId || raw.master_id || meta.masterId || null,
              masterName: raw.master_name,
              tailorId: raw.tailor_id,
              tailorName: raw.tailor_name,
              machineId: raw.machineId || raw.machine_id || meta.machineId || null,
              machineCode: raw.machineCode || raw.machine_code || meta.machineCode || '',
              machineName: raw.machineName || raw.machine_name || meta.machineName || '',
              allocationMode: raw.allocationMode || raw.allocation_mode || meta.allocationMode || 'by_machine',
              assignedPieces: cutPieces,
              assignedCutPieces: cutPieces,
              assignedSubParts: garmentPcs,
              assignedGarmentPcs: garmentPcs,
              totalAssignedPieces: raw.total_assigned_pieces,
              ratePerPiece: raw.rate_per_piece,
              totalJobAmount: raw.total_job_amount,
              tailorRates: raw.tailor_rates || meta.tailorRates || null,
              subPartRates: raw.sub_part_rates || meta.subPartRates || null,
              productStructure: raw.product_structure,
              pieceType: raw.piece_type,
              completedQuantity: raw.completed_quantity,
              totalEarned: raw.total_earned,
              dailySubmissions: raw.daily_submissions || [],
              tailorAccepted: raw.tailor_accepted,
              acceptedAt: raw.accepted_at,
              notes: raw.notes || meta.notes || null,
              assignDate: raw.assign_date || raw.assignDate || meta.assignDate || (raw.created_at ? raw.created_at.split('T')[0] : ''),
              status: raw.status,
              isArchived: Boolean(raw.is_archived),
              archivedAt: raw.archived_at || meta.archivedAt || null,
              restoredAt: raw.restored_at || meta.restoredAt || null,
              createdAt: raw.created_at,
              updatedAt: raw.updated_at,
            };
            const merged = map.has(incoming.id)
              ? mergeAssignmentSafely(map.get(incoming.id), incoming)
              : incoming;
            const normalized = normalizeTailorAssignment(merged, fabricsRef.current, cuttingsRef.current);
            map.set(incoming.id, normalized);
            recentAssignmentUpdatesRef.current?.set(incoming.id, normalized);
          });
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.warn('refreshTailorAssignments error:', e);
    }
  };

  /**
   * Server-side pagination query for high-volume factories.
   * Efficiently queries Supabase with range-based slicing and exact count.
   */
  const fetchPagedTable = useCallback(
    async (
      table,
      {
        page = 1,
        pageSize = 50,
        filters = {},
        orderBy = 'created_at',
        ascending = false,
        searchField = null,
        searchQuery = '',
      } = {}
    ) => {
      if (!isSupabaseConfigured || !supabase) {
        return { data: [], count: 0, page, pageSize, totalPages: 0 };
      }
      const candidateIds = candidateUserIdsRef.current || [];
      if (candidateIds.length === 0) {
        return { data: [], count: 0, page, pageSize, totalPages: 0 };
      }

      try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const eqFilters = candidateIds.map((id) => `user_id.eq.${id}`).join(',');

        let query = supabase.from(table).select('*', { count: 'exact' }).or(eqFilters);

        // Apply filters
        Object.entries(filters).forEach(([col, val]) => {
          if (val !== undefined && val !== null && val !== '' && val !== 'all') {
            query = query.eq(col, val);
          }
        });

        // Search filtering
        if (searchField && searchQuery && searchQuery.trim()) {
          query = query.ilike(searchField, `%${searchQuery.trim()}%`);
        }

        if (orderBy) {
          query = query.order(orderBy, { ascending });
        }

        const { data, count, error } = await query.range(from, to);

        if (error) {
          console.warn(`fetchPagedTable error on ${table}:`, error);
          return { data: [], count: 0, page, pageSize, totalPages: 0, error };
        }

        const totalCount = count || 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        return {
          data: data || [],
          count: totalCount,
          page,
          pageSize,
          totalPages,
        };
      } catch (err) {
        console.error(`fetchPagedTable failed on ${table}:`, err);
        return { data: [], count: 0, page, pageSize, totalPages: 0, error: err };
      }
    },
    [candidateUserIdsRef]
  );

  /**
   * On-demand historical archive loader.
   * Loads older batches of historical data for factory audits and past records.
   */
  const fetchHistoricalArchive = useCallback(
    async (table, { beforeDate, limit = 100 } = {}) => {
      if (!isSupabaseConfigured || !supabase) return [];
      const candidateIds = candidateUserIdsRef.current || [];
      if (candidateIds.length === 0) return [];

      try {
        const eqFilters = candidateIds.map((id) => `user_id.eq.${id}`).join(',');
        let query = supabase
          .from(table)
          .select('*')
          .or(eqFilters)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (beforeDate) {
          query = query.lt('created_at', beforeDate);
        }

        const { data, error } = await query;
        if (error) {
          console.warn(`fetchHistoricalArchive error on ${table}:`, error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error(`fetchHistoricalArchive failed on ${table}:`, err);
        return [];
      }
    },
    [candidateUserIdsRef]
  );

  /**
   * Database-side pagination for archived fabrics.
   */
  const fetchArchivedFabricsPaginated = useCallback(
    async ({ page = 1, pageSize = 15, searchQuery = '' } = {}) => {
      if (!isSupabaseConfigured || !supabase) {
        const localArchived = (fabricsRef.current || []).filter((f) => f.isArchived);
        const filtered = searchQuery
          ? localArchived.filter((f) => {
              const q = searchQuery.toLowerCase();
              return (
                (f.fabricType && f.fabricType.toLowerCase().includes(q)) ||
                (f.productName && f.productName.toLowerCase().includes(q)) ||
                (f.supplierName && f.supplierName.toLowerCase().includes(q)) ||
                (f.color && f.color.toLowerCase().includes(q))
              );
            })
          : localArchived;
        const totalCount = filtered.length;
        const from = (page - 1) * pageSize;
        return {
          data: filtered.slice(from, from + pageSize),
          count: totalCount,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        };
      }

      const candidateIds = candidateUserIdsRef.current || [];
      if (candidateIds.length === 0) {
        return { data: [], count: 0, page, pageSize, totalPages: 0 };
      }

      try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const eqFilters = candidateIds.map((id) => `user_id.eq.${id}`).join(',');

        let query = supabase
          .from('fabrics')
          .select('*', { count: 'exact' })
          .or(eqFilters)
          .eq('is_archived', true)
          .order('archived_at', { ascending: false, nullsFirst: false })
          .order('updated_at', { ascending: false });

        if (searchQuery && searchQuery.trim()) {
          const q = searchQuery.trim();
          query = query.or(
            `fabric_type.ilike.%${q}%,product_name.ilike.%${q}%,color.ilike.%${q}%,supplier_name.ilike.%${q}%,assigned_master_name.ilike.%${q}%`
          );
        }

        const { data, count, error } = await query.range(from, to);
        if (error) {
          console.warn('fetchArchivedFabricsPaginated error:', error);
          return { data: [], count: 0, page, pageSize, totalPages: 0, error };
        }

        const mapped = (data || []).map(mapLoadedFabric);
        const totalCount = count || 0;
        return {
          data: mapped,
          count: totalCount,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        };
      } catch (err) {
        console.error('fetchArchivedFabricsPaginated failed:', err);
        return { data: [], count: 0, page, pageSize, totalPages: 0, error: err };
      }
    },
    [candidateUserIdsRef, fabricsRef]
  );

  /**
   * Database-side pagination for completed cuttings.
   */
  const fetchCompletedCuttingsPaginated = useCallback(
    async ({ page = 1, pageSize = 15, searchQuery = '', status = 'all' } = {}) => {
      if (!isSupabaseConfigured || !supabase) {
        const all = cuttingsRef.current || [];
        const completed = all.filter(
          (c) => c.isArchived || c.status === 'Completed' || c.status === 'Stitching Completed'
        );
        const filtered = searchQuery
          ? completed.filter((c) => {
              const q = searchQuery.toLowerCase();
              return (
                (c.fabricName && c.fabricName.toLowerCase().includes(q)) ||
                (c.masterName && c.masterName.toLowerCase().includes(q)) ||
                (c.productName && c.productName.toLowerCase().includes(q))
              );
            })
          : completed;
        const totalCount = filtered.length;
        const from = (page - 1) * pageSize;
        return {
          data: filtered.slice(from, from + pageSize),
          count: totalCount,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        };
      }

      const candidateIds = candidateUserIdsRef.current || [];
      if (candidateIds.length === 0) {
        return { data: [], count: 0, page, pageSize, totalPages: 0 };
      }

      try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const eqFilters = candidateIds.map((id) => `user_id.eq.${id}`).join(',');

        let query = supabase
          .from('cuttings')
          .select('*', { count: 'exact' })
          .or(eqFilters);

        if (status === 'archived') {
          query = query.eq('is_archived', true);
        } else if (status === 'Completed') {
          query = query.eq('status', 'Completed');
        } else if (status === 'Stitching Completed') {
          query = query.eq('status', 'Stitching Completed');
        } else {
          query = query.or('is_archived.eq.true,status.eq.Completed,status.eq.Stitching Completed');
        }

        query = query.order('updated_at', { ascending: false });

        if (searchQuery && searchQuery.trim()) {
          const q = searchQuery.trim();
          query = query.or(
            `fabric_name.ilike.%${q}%,master_name.ilike.%${q}%,product_name.ilike.%${q}%,notes.ilike.%${q}%`
          );
        }

        const { data, count, error } = await query.range(from, to);
        if (error) {
          console.warn('fetchCompletedCuttingsPaginated error:', error);
          return { data: [], count: 0, page, pageSize, totalPages: 0, error };
        }

        const mapped = (data || []).map(mapLoadedCutting);
        const totalCount = count || 0;
        return {
          data: mapped,
          count: totalCount,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        };
      } catch (err) {
        console.error('fetchCompletedCuttingsPaginated failed:', err);
        return { data: [], count: 0, page, pageSize, totalPages: 0, error: err };
      }
    },
    [candidateUserIdsRef, cuttingsRef]
  );

  /**
   * Database-side pagination for historical invoices.
   */
  const fetchHistoricalInvoicesPaginated = useCallback(
    async ({
      page = 1,
      pageSize = 20,
      searchQuery = '',
      statusFilter = 'all',
      selectedMonth = 'all',
    } = {}) => {
      if (!isSupabaseConfigured || !supabase) {
        return { data: [], count: 0, page, pageSize, totalPages: 0 };
      }

      const candidateIds = candidateUserIdsRef.current || [];
      if (candidateIds.length === 0) {
        return { data: [], count: 0, page, pageSize, totalPages: 0 };
      }

      try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const eqFilters = candidateIds.map((id) => `user_id.eq.${id}`).join(',');

        let query = supabase
          .from('invoices')
          .select('*', { count: 'exact' })
          .or(eqFilters);

        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        if (selectedMonth && selectedMonth !== 'all') {
          const startMonth = `${selectedMonth}-01`;
          const [yr, mo] = selectedMonth.split('-').map(Number);
          const nextMoDate = new Date(yr, mo, 0);
          const endMonth = `${selectedMonth}-${String(nextMoDate.getDate()).padStart(2, '0')}`;
          query = query.gte('date', startMonth).lte('date', endMonth);
        }

        query = query.order('date', { ascending: false }).order('created_at', { ascending: false });

        if (searchQuery && searchQuery.trim()) {
          const q = searchQuery.trim();
          query = query.or(
            `invoice_number.ilike.%${q}%,client_name.ilike.%${q}%,client_phone.ilike.%${q}%,notes.ilike.%${q}%`
          );
        }

        const { data, count, error } = await query.range(from, to);
        if (error) {
          console.warn('fetchHistoricalInvoicesPaginated error:', error);
          return { data: [], count: 0, page, pageSize, totalPages: 0, error };
        }

        const mapped = (data || []).map(mapLoadedInvoice);
        const totalCount = count || 0;
        return {
          data: mapped,
          count: totalCount,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        };
      } catch (err) {
        console.error('fetchHistoricalInvoicesPaginated failed:', err);
        return { data: [], count: 0, page, pageSize, totalPages: 0, error: err };
      }
    },
    [candidateUserIdsRef]
  );

  return {
    loadAllFromSupabase,
    refreshAllData,
    debouncedRefreshAllData,
    refreshTailorAssignments,
    fetchPagedTable,
    fetchHistoricalArchive,
    fetchArchivedFabricsPaginated,
    fetchCompletedCuttingsPaginated,
    fetchHistoricalInvoicesPaginated,
  };
}
