import React from 'react';
import {
  resolvePieceLabel,
  getCuttingTotalPieces,
  getHandoversBreakdownSummary,
  getFabricSubPartSkippedPieces,
  getFabricSkippedTrimmingLogs,
  calculateReadyProductSets,
  isEntityArchived,
} from '../utils/productUtils';
import { groupItemsByLot } from '../utils/lotGrouping';

export function useOrdersMetricsAndGrouping({
  fabrics = [],
  cuttings = [],
  tailorAssignments = [],
  masterHandovers = [],
  threadCuttingAssignments = [],
  deliveryLogs = [],
  invoices = [],
  getProductStructure,
  getThreadCuttingStats,
  groupingMode = 'lot',
  statusFilter = 'all',
  handoverStatusFilter = 'all',
  deliveryStatusFilter = 'all',
  threadCuttingFilter = 'all',
  searchQuery = '',
  today,
  activeTab,
  collapsedLots,
}) {
  // Active and Archived datasets
  const activeCuttings = React.useMemo(
    () => cuttings.filter((c) => !isEntityArchived(c, fabrics)),
    [cuttings, fabrics]
  );
  const archivedCuttings = React.useMemo(
    () => cuttings.filter((c) => isEntityArchived(c, fabrics)),
    [cuttings, fabrics]
  );

  const activeAssignments = React.useMemo(
    () => tailorAssignments.filter((a) => !isEntityArchived(a, fabrics)),
    [tailorAssignments, fabrics]
  );
  const archivedAssignments = React.useMemo(
    () => tailorAssignments.filter((a) => isEntityArchived(a, fabrics)),
    [tailorAssignments, fabrics]
  );

  const activeMasterHandovers = React.useMemo(
    () => masterHandovers.filter((h) => !isEntityArchived(h, fabrics)),
    [masterHandovers, fabrics]
  );
  const archivedMasterHandovers = React.useMemo(
    () => masterHandovers.filter((h) => isEntityArchived(h, fabrics)),
    [masterHandovers, fabrics]
  );

  const activeThreadAssignments = React.useMemo(
    () => threadCuttingAssignments.filter((tc) => !isEntityArchived(tc, fabrics)),
    [threadCuttingAssignments, fabrics]
  );
  const archivedThreadAssignments = React.useMemo(
    () => threadCuttingAssignments.filter((tc) => isEntityArchived(tc, fabrics)),
    [threadCuttingAssignments, fabrics]
  );

  // Global KPIs
  const todayCompletedPieces = activeAssignments.reduce((acc, a) => {
    const todaySubs = (a.dailySubmissions || []).filter((s) => s.date === today);
    return acc + todaySubs.reduce((subAcc, s) => subAcc + (parseInt(s.quantity, 10) || 0), 0);
  }, 0);

  const totalPiecesCut = activeCuttings.reduce(
    (acc, c) => acc + getCuttingTotalPieces(c),
    0
  );
  const activeInStitching = activeAssignments.filter(
    (a) => a.status === 'Assigned' || a.status === 'In Stitching'
  ).length;
  const completedAssignments = activeAssignments.filter(
    (a) => a.status === 'Completed'
  ).length;

  // Filtered Cuttings
  const filteredCuttings = (groupingMode === 'archive' ? archivedCuttings : activeCuttings).filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      (c.fabricName && c.fabricName.toLowerCase().includes(q)) ||
      (c.masterName && c.masterName.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q));

    if (!matchesQuery) return false;
    if (statusFilter === 'all') return true;
    return c.status.toLowerCase().includes(statusFilter.toLowerCase());
  });

  // Filtered Tailor Assignments
  const filteredAssignments = (groupingMode === 'archive' ? archivedAssignments : activeAssignments).filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    return (
      (a.tailorName && a.tailorName.toLowerCase().includes(q)) ||
      (a.machineCode && a.machineCode.toLowerCase().includes(q)) ||
      (a.machineName && a.machineName.toLowerCase().includes(q)) ||
      (a.masterName && a.masterName.toLowerCase().includes(q)) ||
      (a.fabricName && a.fabricName.toLowerCase().includes(q)) ||
      (a.notes && a.notes.toLowerCase().includes(q))
    );
  });

  // Master Handover KPIs & Filters
  const currentMasterHandovers = groupingMode === 'archive' ? archivedMasterHandovers : activeMasterHandovers;
  const pendingHandovers = activeMasterHandovers.filter((h) => h.status === 'Pending Verification');
  const verifiedHandovers = currentMasterHandovers.filter((h) => h.status === 'Verified');
  const verifiedHandoverPieces = verifiedHandovers.reduce(
    (acc, h) => acc + (parseInt(h.piecesCount ?? h.pieces ?? h.receivedQuantity, 10) || 0),
    0
  );

  const pendingBreakdownSummary = getHandoversBreakdownSummary(pendingHandovers);
  const verifiedBreakdownSummary = getHandoversBreakdownSummary(verifiedHandovers);

  const filteredHandovers = currentMasterHandovers.filter((h) => {
    if (handoverStatusFilter !== 'all' && h.status !== handoverStatusFilter) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const linkedFabric = fabrics.find((f) => f.id === h.fabricId);
    return (
      (h.fabricName && h.fabricName.toLowerCase().includes(q)) ||
      (h.productName && h.productName.toLowerCase().includes(q)) ||
      (h.masterName && h.masterName.toLowerCase().includes(q)) ||
      (h.notes && h.notes.toLowerCase().includes(q)) ||
      (h.pieces && h.pieces.toString().includes(q)) ||
      (h.fabricId && h.fabricId.toLowerCase().includes(q)) ||
      (linkedFabric?.lotNo && String(linkedFabric.lotNo).includes(q)) ||
      (linkedFabric?.lotNumber && String(linkedFabric.lotNumber).includes(q)) ||
      (linkedFabric?.fabricType && linkedFabric.fabricType.toLowerCase().includes(q)) ||
      (linkedFabric?.productName && linkedFabric.productName.toLowerCase().includes(q))
    );
  });

  // Thread Cutting KPIs & Filters
  const globalThreadStats = getThreadCuttingStats ? getThreadCuttingStats() : {
    totalVerifiedPSC: 0,
    totalAssignedPSC: 0,
    totalCompletedPSC: 0,
    totalInProgressPSC: 0,
    totalAvailableToAssignPSC: 0,
    totalExternalAmount: 0,
    totalSkippedPSC: 0,
  };

  const allSkippedBatches = React.useMemo(() => {
    const targetFabrics = fabrics.filter((f) =>
      groupingMode === 'archive' ? isEntityArchived(f, fabrics) : !isEntityArchived(f, fabrics)
    );
    const targetThreadAssignments = groupingMode === 'archive' ? archivedThreadAssignments : activeThreadAssignments;
    return targetFabrics
      .map((f) => {
        const skippedMap = getFabricSubPartSkippedPieces(f, targetThreadAssignments);
        const totalSkipped = Object.values(skippedMap).reduce(
          (sum, v) => sum + (parseInt(v, 10) || 0),
          0
        );
        if (totalSkipped <= 0) return null;
        return {
          fabric: f,
          skippedMap,
          totalSkipped,
        };
      })
      .filter(Boolean);
  }, [fabrics, groupingMode, archivedThreadAssignments, activeThreadAssignments]);

  const totalSkippedPSC =
    globalThreadStats.totalSkippedPSC ||
    allSkippedBatches.reduce((acc, b) => acc + b.totalSkipped, 0);

  const verifiedHandoversList = (groupingMode === 'archive' ? archivedMasterHandovers : activeMasterHandovers).filter((h) => h.status === 'Verified');
  const totalAdminReceivedPSC =
    globalThreadStats.totalVerifiedPSC ||
    verifiedHandoversList.reduce(
      (acc, h) => acc + (parseInt(h.piecesCount || h.pieces, 10) || 0),
      0
    );

  const allSkippedRecords = React.useMemo(() => {
    const records = [];
    const isSkip = (tc) => tc.status === 'Skipped' || tc.actionType === 'skip' || tc.action_type === 'skip';
    const currentThreadAssignments = groupingMode === 'archive' ? archivedThreadAssignments : activeThreadAssignments;
    const skipAssignments = (currentThreadAssignments || []).filter(isSkip);

    skipAssignments.forEach((tc) => {
      const linkedFabric = fabrics.find((f) => f.id === tc.fabricId || f.id === tc.fabric_id);
      if (groupingMode !== 'archive' && linkedFabric && isEntityArchived(linkedFabric, fabrics)) return;
      if (groupingMode === 'archive' && linkedFabric && !isEntityArchived(linkedFabric, fabrics)) return;
      const pcs = parseInt(tc.assignedPieces ?? tc.assignedPSC, 10) || 0;
      const subKey = (tc.subPart || tc.sub_part || 'pieces').toLowerCase().trim();
      const pName = tc.subPartName || tc.sub_part_name || (tc.subPart ? tc.subPart.toUpperCase() : 'PSC');
      const dateStr = tc.assignedDate || (tc.createdAt ? tc.createdAt.split('T')[0] : '');
      let timeStr = '';
      if (tc.createdAt && tc.createdAt.includes('T')) {
        try {
          timeStr = new Date(tc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch {}
      }
      records.push({
        id: tc.id,
        isSkippedRecord: true,
        fabricId: tc.fabricId || tc.fabric_id,
        cuttingId: tc.cuttingId || tc.cutting_id,
        fabric: linkedFabric,
        fabricName: linkedFabric?.fabricType || linkedFabric?.productName || tc.fabricName || 'Fabric Lot',
        productName: linkedFabric?.productName || tc.productName,
        totalSkipped: pcs,
        pieces: pcs,
        subPartKey: subKey,
        subPartName: pName,
        skippedMap: { [subKey]: pcs },
        date: dateStr,
        time: timeStr,
        timestamp: tc.createdAt || '',
        createdAt: tc.createdAt || '',
        createdByRole: tc.createdByRole || (tc.masterId ? 'master' : 'admin'),
        masterId: tc.masterId || null,
        masterName: tc.masterName || null,
      });
    });

    allSkippedBatches.forEach((b) => {
      const f = b.fabric;
      const alreadyHasAssignmentSkip = skipAssignments.some((tc) => (tc.fabricId === f.id || tc.fabric_id === f.id));
      if (!alreadyHasAssignmentSkip) {
        const targetAssignments = groupingMode === 'archive' ? archivedThreadAssignments : threadCuttingAssignments;
        const logs = getFabricSkippedTrimmingLogs(f, targetAssignments);
        if (logs && logs.length > 0) {
          logs.forEach((log) => {
            records.push({
              id: log.id || `skipped_${f.id}_${log.timestamp}`,
              isSkippedRecord: true,
              fabricId: f.id,
              fabric: f,
              fabricName: f.fabricType || f.productName || 'Fabric Lot',
              productName: f.productName,
              totalSkipped: log.pieces,
              pieces: log.pieces,
              subPartKey: log.subPartKey,
              subPartName: log.subPartName,
              skippedMap: { [log.subPartKey || 'pieces']: log.pieces },
              date: log.date || (log.timestamp ? log.timestamp.split('T')[0] : ''),
              time: log.time || '',
              timestamp: log.timestamp || '',
              createdAt: log.timestamp || f.updatedAt || f.createdAt || '',
              createdByRole: log.createdByRole || (log.masterId ? 'master' : 'admin'),
              masterId: log.masterId || null,
              masterName: log.masterName || null,
            });
          });
        } else {
          const dateStr = f.updatedAt?.split('T')[0] || f.createdAt?.split('T')[0] || f.lotDate || f.date || '';
          records.push({
            id: `skipped_${f.id}`,
            isSkippedRecord: true,
            fabricId: f.id,
            fabric: f,
            fabricName: f.fabricType || f.productName || 'Fabric Lot',
            productName: f.productName,
            totalSkipped: b.totalSkipped,
            pieces: b.totalSkipped,
            skippedMap: b.skippedMap,
            date: dateStr,
            time: '',
            createdAt: f.createdAt || f.updatedAt || '',
            createdByRole: 'admin',
            masterId: null,
            masterName: null,
          });
        }
      }
    });

    return records;
  }, [allSkippedBatches, groupingMode, activeThreadAssignments, archivedThreadAssignments, fabrics, threadCuttingAssignments]);

  const filteredSkippedBatches = allSkippedRecords.filter((rec) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const f = rec.fabric;
    const lotStr = f ? String(f.lotNo ?? f.lotNumber ?? f.lot_no ?? '') : '';
    return (
      (f?.fabricType && f.fabricType.toLowerCase().includes(q)) ||
      (f?.productName && f.productName.toLowerCase().includes(q)) ||
      (lotStr && lotStr.includes(q)) ||
      (f?.supplierName && f.supplierName.toLowerCase().includes(q)) ||
      (f?.color && f.color.toLowerCase().includes(q)) ||
      (rec.subPartName && rec.subPartName.toLowerCase().includes(q)) ||
      Object.keys(rec.skippedMap || {}).some((k) => k.toLowerCase().includes(q))
    );
  });

  const filteredVerifiedHandovers = verifiedHandoversList.filter((h) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const linkedFabric = fabrics.find((f) => f.id === h.fabricId);
    return (
      (h.masterName && h.masterName.toLowerCase().includes(q)) ||
      (h.productName && h.productName.toLowerCase().includes(q)) ||
      (linkedFabric?.fabricType && linkedFabric.fabricType.toLowerCase().includes(q)) ||
      (linkedFabric?.productName && linkedFabric.productName.toLowerCase().includes(q)) ||
      (linkedFabric?.lotNo && String(linkedFabric.lotNo).includes(q)) ||
      (linkedFabric?.lotNumber && String(linkedFabric.lotNumber).includes(q)) ||
      (h.notes && h.notes.toLowerCase().includes(q)) ||
      (h.pieces && h.pieces.toString().includes(q))
    );
  });

  const filteredThreadJobs = React.useMemo(() => {
    const isSkip = (tc) => tc.status === 'Skipped' || tc.actionType === 'skip' || tc.action_type === 'skip';
    const currentThreadAssignments = groupingMode === 'archive' ? archivedThreadAssignments : activeThreadAssignments;
    const actualThreadJobs = (currentThreadAssignments || []).filter((tc) => !isSkip(tc));

    let pool = [];
    if (threadCuttingFilter === 'all') {
      pool = [...actualThreadJobs, ...allSkippedRecords];
    } else if (threadCuttingFilter === 'skipped') {
      pool = allSkippedRecords;
    } else if (threadCuttingFilter === 'received') {
      return [];
    } else {
      pool = [...actualThreadJobs];
    }

    const filtered = pool.filter((rec) => {
      if (rec.isSkippedRecord) {
        if (threadCuttingFilter === 'master' && rec.createdByRole !== 'master' && !rec.masterId) return false;
        if (threadCuttingFilter === 'admin' && (rec.createdByRole === 'master' || Boolean(rec.masterId))) return false;
        if (threadCuttingFilter !== 'all' && threadCuttingFilter !== 'skipped' && threadCuttingFilter !== 'master' && threadCuttingFilter !== 'admin') return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase().trim();
        const f = rec.fabric;
        const lotStr = f ? String(f.lotNo ?? f.lotNumber ?? f.lot_no ?? '') : '';
        return (
          (f?.fabricType && f.fabricType.toLowerCase().includes(q)) ||
          (f?.productName && f.productName.toLowerCase().includes(q)) ||
          (lotStr && lotStr.includes(q)) ||
          (f?.supplierName && f.supplierName.toLowerCase().includes(q)) ||
          (f?.color && f.color.toLowerCase().includes(q)) ||
          (rec.subPartName && rec.subPartName.toLowerCase().includes(q)) ||
          (rec.masterName && rec.masterName.toLowerCase().includes(q)) ||
          (rec.createdByRole && rec.createdByRole.toLowerCase().includes(q)) ||
          Object.keys(rec.skippedMap || {}).some((k) => k.toLowerCase().includes(q))
        );
      } else {
        const tc = rec;
        if (threadCuttingFilter === 'master' && tc.createdByRole !== 'master' && !tc.masterId) return false;
        if (threadCuttingFilter === 'admin' && (tc.createdByRole === 'master' || Boolean(tc.masterId))) return false;
        if (threadCuttingFilter === 'In Progress' && tc.status === 'Completed') return false;
        if (threadCuttingFilter === 'Completed' && tc.status !== 'Completed') return false;
        if (threadCuttingFilter === 'external' && tc.helperType !== 'external') return false;
        if (threadCuttingFilter === 'internal' && tc.helperType !== 'internal') return false;
        if (threadCuttingFilter === 'skipped') return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase().trim();
        const linkedFabric = fabrics.find((f) => f.id === tc.fabricId);
        const linkedCutting = cuttings.find((c) => c.id === tc.cuttingId);
        return (
          (tc.fabricName && tc.fabricName.toLowerCase().includes(q)) ||
          (linkedFabric?.fabricType && linkedFabric.fabricType.toLowerCase().includes(q)) ||
          (linkedFabric?.productName && linkedFabric.productName.toLowerCase().includes(q)) ||
          (linkedFabric?.color && linkedFabric.color.toLowerCase().includes(q)) ||
          (linkedFabric?.supplierName && linkedFabric.supplierName.toLowerCase().includes(q)) ||
          (linkedCutting?.fabricName && linkedCutting.fabricName.toLowerCase().includes(q)) ||
          (linkedCutting?.productName && linkedCutting.productName.toLowerCase().includes(q)) ||
          (tc.helperName && tc.helperName.toLowerCase().includes(q)) ||
          (tc.helperPhone && tc.helperPhone.includes(q)) ||
          (tc.notes && tc.notes.toLowerCase().includes(q)) ||
          (tc.subPart && tc.subPart.toLowerCase().includes(q)) ||
          (tc.subPartName && tc.subPartName.toLowerCase().includes(q)) ||
          (tc.masterName && tc.masterName.toLowerCase().includes(q)) ||
          (tc.createdByRole && tc.createdByRole.toLowerCase().includes(q)) ||
          (tc.status && tc.status.toLowerCase().includes(q))
        );
      }
    });

    return filtered.sort((a, b) => {
      const dateA = a.completionDate || a.assignedDate || a.timestamp || a.date || a.createdAt || '';
      const dateB = b.completionDate || b.assignedDate || b.timestamp || b.date || b.createdAt || '';
      const timeA = new Date(dateA).getTime() || 0;
      const timeB = new Date(dateB).getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [groupingMode, archivedThreadAssignments, activeThreadAssignments, allSkippedRecords, threadCuttingFilter, searchQuery, fabrics, cuttings]);

  // Delivery Logs
  const allDeliveryLogs = React.useMemo(() => {
    const map = new Map();

    (deliveryLogs || []).forEach((dl) => {
      if (!dl) return;
      const key = dl.id || dl.invoiceNumber || dl.invoice_number;
      if (key) {
        map.set(key, { ...dl });
      }
    });

    (fabrics || []).forEach((f) => {
      (f.deliveryLogs || []).forEach((dl) => {
        if (!dl) return;
        const key = dl.id || dl.invoiceNumber || dl.invoice_number;
        if (key && !map.has(key)) {
          map.set(key, {
            ...dl,
            fabricId: dl.fabricId || dl.fabric_id || f.id,
            fabricName: dl.fabricName || f.fabricName || f.productName || f.name,
            supplierName: dl.supplierName || f.supplierName,
          });
        }
      });
    });

    return Array.from(map.values())
      .map((log) => {
        const inv = (invoices || []).find(
          (i) =>
            (log.invoiceId && (i.id === log.invoiceId || i.id === log.invoice_id)) ||
            (log.invoiceNumber && (i.invoiceNumber === log.invoiceNumber || i.invoice_number === log.invoiceNumber))
        );
        const fabric = (fabrics || []).find(
          (f) => f.id === (log.fabricId || log.fabric_id)
        );
        const struct = fabric && typeof getProductStructure === 'function'
          ? getProductStructure(fabric)
          : null;

        const totalPieces = parseInt(
          log.totalPieces ?? log.total_pieces ?? log.deliveredPSC ?? log.delivered_psc,
          10
        ) || 0;
        const totalAmount = parseFloat(
          log.totalAmount ?? log.total_amount ?? inv?.totalAmount ?? inv?.total_amount
        ) || 0;

        const rawItems = Array.isArray(inv?.items) && inv.items.length > 0
          ? inv.items.map((it) => {
              const qty = parseFloat(it.quantity) || 0;
              const unitPrice = parseFloat(it.unitPrice ?? it.rate ?? 0);
              const amount = parseFloat(it.amount ?? it.total) || (qty * unitPrice);
              return {
                ...it,
                quantity: qty,
                unitPrice,
                amount,
                pieceName: it.pieceName || it.description || it.name,
              };
            })
          : (log.subParts || log.subPartQuantities
            ? Object.entries(log.subParts || log.subPartQuantities).map(([k, q]) => {
                const qty = parseInt(q, 10) || 0;
                const pLabel = resolvePieceLabel(k, struct);
                const unitPrice = parseFloat(log.pricePerPSC || log.price_per_piece || (totalPieces > 0 ? totalAmount / totalPieces : 0));
                return {
                  subPart: k,
                  pieceName: pLabel,
                  description: pLabel,
                  name: pLabel,
                  quantity: qty,
                  unitPrice,
                  rate: unitPrice,
                  amount: qty * unitPrice,
                };
              })
            : []);

        return {
          ...log,
          fabric,
          struct,
          fabricName: log.fabricName || fabric?.fabricName || fabric?.productName || fabric?.fabricType || 'Fabric Batch',
          supplierName: log.supplierName || log.supplier_name || inv?.clientName || fabric?.supplierName || 'Unknown Supplier',
          supplierPhone: log.supplierPhone || log.supplier_phone || inv?.clientPhone || fabric?.supplierPhone || '',
          totalPieces,
          totalAmount,
          invoiceNumber: log.invoiceNumber || log.invoice_number || inv?.invoiceNumber || inv?.invoice_number || log.id,
          createdAt: log.createdAt || log.created_at || inv?.createdAt || inv?.created_at || '',
          deliveryDate: log.deliveryDate || log.delivery_date || inv?.invoiceDate || inv?.created_at?.split('T')[0] || log.createdAt?.split('T')[0] || '',
          vehicleNo: log.vehicleNo || log.vehicle_no || '',
          notes: log.notes || inv?.notes || '',
          items: rawItems,
        };
      })
      .sort((a, b) => {
        const timeB = new Date(b.createdAt || b.deliveryDate || 0).getTime();
        const timeA = new Date(a.createdAt || a.deliveryDate || 0).getTime();
        if (timeB && timeA && timeB !== timeA) return timeB - timeA;
        const dateB = (b.deliveryDate || '').toString();
        const dateA = (a.deliveryDate || '').toString();
        if (dateB !== dateA) return dateB.localeCompare(dateA);
        const numB = parseInt(String(b.invoiceNumber || b.id || '').replace(/\D/g, ''), 10) || 0;
        const numA = parseInt(String(a.invoiceNumber || a.id || '').replace(/\D/g, ''), 10) || 0;
        if (numB !== numA) return numB - numA;
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
  }, [deliveryLogs, fabrics, invoices, getProductStructure]);

  const activeDeliveryLogs = React.useMemo(
    () => allDeliveryLogs.filter((dl) => !isEntityArchived(dl, fabrics)),
    [allDeliveryLogs, fabrics]
  );
  const archivedDeliveryLogs = React.useMemo(
    () => allDeliveryLogs.filter((dl) => isEntityArchived(dl, fabrics)),
    [allDeliveryLogs, fabrics]
  );

  const deliverySuppliersList = React.useMemo(() => {
    const set = new Set();
    const targetLogs = groupingMode === 'archive' ? archivedDeliveryLogs : activeDeliveryLogs;
    targetLogs.forEach((d) => {
      if (d.supplierName && d.supplierName !== 'Unknown Supplier') {
        set.add(d.supplierName);
      }
    });
    return Array.from(set);
  }, [groupingMode, activeDeliveryLogs, archivedDeliveryLogs]);

  const filteredDeliveryLogs = React.useMemo(() => {
    const targetLogs = groupingMode === 'archive' ? archivedDeliveryLogs : activeDeliveryLogs;
    return targetLogs.filter((dl) => {
      if (deliveryStatusFilter !== 'all' && dl.supplierName !== deliveryStatusFilter) {
        return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        dl.invoiceNumber?.toLowerCase().includes(q) ||
        dl.supplierName?.toLowerCase().includes(q) ||
        dl.fabricName?.toLowerCase().includes(q) ||
        dl.vehicleNo?.toLowerCase().includes(q) ||
        dl.notes?.toLowerCase().includes(q)
      );
    });
  }, [groupingMode, activeDeliveryLogs, archivedDeliveryLogs, deliveryStatusFilter, searchQuery]);

  const archivedCountForActiveTab = React.useMemo(() => {
    switch (activeTab) {
      case 'cuttings': return archivedCuttings.length;
      case 'assignments': return archivedAssignments.length;
      case 'handovers': return archivedMasterHandovers.length;
      case 'thread_cutting': return archivedThreadAssignments.length;
      case 'delivery': return archivedDeliveryLogs.length;
      default: return 0;
    }
  }, [activeTab, archivedCuttings, archivedAssignments, archivedMasterHandovers, archivedThreadAssignments, archivedDeliveryLogs]);

  const totalDeliveredPiecesAcrossAll = React.useMemo(() => {
    return activeDeliveryLogs.reduce((sum, d) => sum + (parseInt(d.totalPieces, 10) || 0), 0);
  }, [activeDeliveryLogs]);

  const deliveryLotsStats = React.useMemo(() => {
    const totalDelivered = totalDeliveredPiecesAcrossAll;
    const deliveredFabricIds = new Set(
      allDeliveryLogs.map((d) => d.fabricId || d.fabric_id).filter(Boolean)
    );

    const relevantFabrics = (fabrics || []).filter((f) => {
      if (deliveredFabricIds.has(f.id)) return true;
      return (cuttings || []).some(
        (c) => c.fabricId === f.id || c.fabric_id === f.id
      );
    });

    let totalExpected = 0;
    let totalReadyForDelivery = 0;
    const fabricLotStatsMap = {};

    (fabrics || []).forEach((f) => {
      const readyData = typeof calculateReadyProductSets === 'function'
        ? calculateReadyProductSets(f, { cuttings, masterHandovers, threadCuttingAssignments, invoices, deliveryLogs })
        : null;
      totalReadyForDelivery += (readyData?.totalReadyPieces || 0);
    });

    relevantFabrics.forEach((f) => {
      const struct = typeof getProductStructure === 'function' ? getProductStructure(f) : null;
      const subParts = struct?.subParts || struct?.parts || [];
      const targetSets = parseInt(f.productQuantity || f.targetSets, 10) || 0;

      let expFromSub = 0;
      if (subParts.length > 0 && targetSets > 0) {
        expFromSub = subParts.reduce(
          (s, sp) => s + (targetSets * (parseInt(sp.qty || sp.ratio || 1, 10) || 1)),
          0
        );
      }

      const lotCutPieces = (cuttings || []).filter(
        (c) => c.fabricId === f.id || c.fabric_id === f.id
      ).reduce((s, c) => s + (parseInt(c.totalPiecesCut || c.piecesCut || c.quantity, 10) || 0), 0);

      const readyData = typeof calculateReadyProductSets === 'function'
        ? calculateReadyProductSets(f, { cuttings, masterHandovers, threadCuttingAssignments, invoices, deliveryLogs })
        : null;

      const grossVerified = readyData?.totalGrossVerifiedPieces || 0;
      const lotExpectedRaw = Math.max(
        expFromSub,
        grossVerified,
        parseInt(f.printPieces || f.productQuantity, 10) || 0,
        lotCutPieces
      );

      const lotDeliveredFromLogs = allDeliveryLogs
        .filter((d) => (d.fabricId || d.fabric_id) === f.id)
        .reduce((sum, d) => sum + (parseInt(d.totalPieces, 10) || 0), 0);

      const lotDelivered = Math.max(
        lotDeliveredFromLogs,
        parseInt(f.deliveredPSC || f.delivered_psc, 10) || 0,
        readyData?.alreadyDeliveredPieces || 0
      );

      const lotExpected = Math.max(lotExpectedRaw, lotDelivered);
      const lotNotDelivered = Math.max(0, lotExpected - lotDelivered);

      fabricLotStatsMap[f.id] = {
        lotExpected,
        lotDelivered,
        lotNotDelivered,
      };

      totalExpected += lotExpected;
    });

    const finalExpected = Math.max(totalExpected, totalDelivered);
    const notDelivered = Math.max(0, finalExpected - totalDelivered);

    return {
      totalDelivered,
      totalExpected: finalExpected,
      notDelivered,
      totalReadyForDelivery,
      fabricLotStatsMap,
    };
  }, [allDeliveryLogs, deliveryLogs, fabrics, cuttings, masterHandovers, threadCuttingAssignments, invoices, getProductStructure, totalDeliveredPiecesAcrossAll]);

  // Grouped Collections for Lot-wise Mode
  const groupedCuttings = React.useMemo(
    () => groupItemsByLot(filteredCuttings, fabrics, cuttings),
    [filteredCuttings, fabrics, cuttings]
  );

  const groupedAssignments = React.useMemo(
    () => groupItemsByLot(filteredAssignments, fabrics, cuttings),
    [filteredAssignments, fabrics, cuttings]
  );

  const groupedHandovers = React.useMemo(
    () => groupItemsByLot(filteredHandovers, fabrics, cuttings),
    [filteredHandovers, fabrics, cuttings]
  );

  const groupedThreadJobs = React.useMemo(
    () => groupItemsByLot(filteredThreadJobs, fabrics, cuttings),
    [filteredThreadJobs, fabrics, cuttings]
  );

  const groupedVerifiedHandovers = React.useMemo(
    () => groupItemsByLot(filteredVerifiedHandovers, fabrics, cuttings),
    [filteredVerifiedHandovers, fabrics, cuttings]
  );

  const groupedDeliveryLogs = React.useMemo(
    () => groupItemsByLot(filteredDeliveryLogs, fabrics, cuttings),
    [filteredDeliveryLogs, fabrics, cuttings]
  );

  const currentTabLotKeys = React.useMemo(() => {
    switch (activeTab) {
      case 'cuttings': return groupedCuttings.map((g) => g.lotKey);
      case 'assignments': return groupedAssignments.map((g) => g.lotKey);
      case 'handovers': return groupedHandovers.map((g) => g.lotKey);
      case 'thread_cutting':
        return threadCuttingFilter === 'received'
          ? groupedVerifiedHandovers.map((g) => g.lotKey)
          : groupedThreadJobs.map((g) => g.lotKey);
      case 'delivery': return groupedDeliveryLogs.map((g) => g.lotKey);
      default: return [];
    }
  }, [
    activeTab,
    threadCuttingFilter,
    groupedCuttings,
    groupedAssignments,
    groupedHandovers,
    groupedThreadJobs,
    groupedVerifiedHandovers,
    groupedDeliveryLogs,
  ]);

  const isAllLotsCollapsed =
    currentTabLotKeys.length > 0 &&
    currentTabLotKeys.every((k) => collapsedLots.has(k));

  return {
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
    allSkippedBatches,
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
  };
}
