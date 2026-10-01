import { sanitizeFabricName } from '../managementContextInstance';
import {
  mapExpenseToDb,
  mapInvoiceToDb,
  mapInvoiceExpenseToDb,
  mapFabricToDb,
} from '../../services/dbMappers';
import { executeAtomicCompletedLotInvoice } from '../../services/atomicTransactions';
import { generateEntityId } from '../../utils/idGenerator';
import { getScopedExpenseCacheKey } from '../../utils/sessionSecurity';

export function useFinanceOperations({
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
}) {
  // Expense Operations
  const addExpense = (expenseData) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const expType = expenseData.expenseType || expenseData.category || 'Other';
    const newExpense = {
      id: generateEntityId('exp'),
      expenseType: expType, // 'Rent' | 'Maintainance' | 'Light Bill' | 'Salary' | 'Other'
      category: expType,
      title: expenseData.title || expType,
      salarySubType: expenseData.salarySubType || '', // 'Master' | 'Helper' | ''
      workerId: expenseData.workerId || '',
      workerName: expenseData.workerName ? expenseData.workerName.trim() : '',
      machineId: expenseData.machineId || '',
      machineCode: expenseData.machineCode || '',
      amount: parseFloat(expenseData.amount) || 0,
      date: expenseData.date || todayStr,
      month: expenseData.month || (expenseData.date ? expenseData.date.slice(0, 7) : ''),
      paymentMethod: expenseData.paymentMethod || 'Cash',
      paidTo: expenseData.paidTo ? expenseData.paidTo.trim() : '',
      referenceNo: expenseData.referenceNo ? expenseData.referenceNo.trim() : '',
      notes: expenseData.notes ? expenseData.notes.trim() : '',
      fabricId: expenseData.fabricId || null,
      cuttingId: expenseData.cuttingId || null,
      createdAt: new Date().toISOString(),
    };

    setExpenses((prev) => {
      const updatedList = [newExpense, ...prev];
      try {
        const cacheKey = getScopedExpenseCacheKey(ownerUserId);
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });
    saveToDb('expenses', mapExpenseToDb, newExpense);
    return { success: true, expense: newExpense };
  };

  const updateExpense = (id, updatedData) => {
    setExpenses((prev) => {
      const updatedList = prev.map((item) => {
        if (item.id === id) {
          const expType = updatedData.expenseType || item.expenseType || updatedData.category || item.category || 'Other';
          const updated = {
            ...item,
            ...updatedData,
            expenseType: expType,
            category: expType,
            amount:
              updatedData.amount !== undefined
                ? parseFloat(updatedData.amount) || 0
                : item.amount,
            updatedAt: new Date().toISOString(),
          };
          saveToDb('expenses', mapExpenseToDb, updated);
          return updated;
        }
        return item;
      });
      try {
        const cacheKey = getScopedExpenseCacheKey(ownerUserId);
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });
    return { success: true };
  };

  const deleteExpense = (id) => {
    setExpenses((prev) => {
      const updatedList = prev.filter((item) => item.id !== id);
      try {
        const cacheKey = getScopedExpenseCacheKey(ownerUserId);
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });
    dbRemove('expenses', id);
    return { success: true };
  };

  /**
   * INVOICE MANAGEMENT
   */
  const addInvoice = (invoiceData) => {
    const currentYear = new Date().getFullYear();
    const allKnown = new Set([
      ...(invoices || []).map((inv) => String(inv.invoiceNumber || inv.invoice_number || '').trim()),
      ...((dbInvoiceNumbersRef.current || []).map((n) => String(n || '').trim())),
    ]);
    let seq = 1;
    let candidate = `INV-${currentYear}-${String(seq).padStart(3, '0')}`;
    while (allKnown.has(candidate)) {
      seq++;
      candidate = `INV-${currentYear}-${String(seq).padStart(3, '0')}`;
    }
    const invNumber = invoiceData.invoiceNumber || candidate;
    allKnown.add(invNumber);
    if (dbInvoiceNumbersRef.current) {
      dbInvoiceNumbersRef.current = Array.from(allKnown);
    }

    const items = (invoiceData.items || []).map((item) => {
      const qty = parseInt(item.quantity, 10) || 0;
      const rate = parseFloat(item.unitPrice) || 0;
      return {
        id: item.id || generateEntityId('item'),
        description: (item.description || 'Garment Lot').trim(),
        subPart: item.subPart || null,
        pieceName: item.pieceName || null,
        fabricId: item.fabricId || null,
        fabricName: item.fabricName || '',
        quantity: qty,
        unitPrice: rate,
        amount: qty * rate,
      };
    });

    const subtotal = items.reduce((acc, it) => acc + it.amount, 0);
    const discount = parseFloat(invoiceData.discount) || 0;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const taxPercent = parseFloat(invoiceData.taxPercent) || 0;
    const taxAmount = Math.round((discountedSubtotal * taxPercent) / 100);
    const totalAmount = discountedSubtotal + taxAmount;

    // Optional initial payment
    const initialPaid = parseFloat(invoiceData.initialPaymentAmount) || 0;
    const payments = [];
    if (initialPaid > 0) {
      payments.push({
        id: generateEntityId('pmt'),
        amount: initialPaid,
        date: invoiceData.date || new Date().toISOString().split('T')[0],
        method: invoiceData.initialPaymentMethod || 'Cash',
        referenceNo: (invoiceData.initialPaymentRef || '').trim(),
        notes: 'Initial Payment / Advance',
        createdAt: new Date().toISOString(),
      });
    }

    const paidAmount = payments.reduce(
      (acc, p) => acc + (parseFloat(p.amount) || 0),
      0
    );
    const pendingAmount = Math.max(0, totalAmount - paidAmount);

    let status = 'Pending';
    if (paidAmount >= totalAmount && totalAmount > 0) {
      status = 'Paid';
    } else if (paidAmount > 0) {
      status = 'Partial';
    }

    // Extract linked Fabric & Supplier details
    const linkedFabric = fabrics.find((f) => f.id === invoiceData.fabricId);
    const fabricType = linkedFabric ? linkedFabric.fabricType : (invoiceData.fabricType || '');
    const fabricColor = linkedFabric ? linkedFabric.color : (invoiceData.fabricColor || '');
    const supplierName = (linkedFabric ? linkedFabric.supplierName : (invoiceData.supplierName || invoiceData.clientName || 'Direct Vendor')).trim();
    const supplierPhone = (linkedFabric ? (linkedFabric.supplierPhone || '') : (invoiceData.supplierPhone || invoiceData.clientPhone || '')).trim();
    const supplierId = linkedFabric ? linkedFabric.supplierId : (invoiceData.supplierId || null);

    const newInvoice = {
      id: generateEntityId('inv'),
      invoiceNumber: invNumber,
      fabricId: invoiceData.fabricId || null,
      fabricType,
      fabricColor,
      supplierId,
      supplierName,
      supplierPhone,
      // Backward compatibility aliases for views
      clientName: supplierName,
      clientCompany: (invoiceData.clientCompany || (linkedFabric ? `Supplier: ${supplierName}` : '')).trim(),
      clientPhone: supplierPhone,
      clientGst: (invoiceData.clientGst || '').trim().toUpperCase(),
      clientAddress: (invoiceData.clientAddress || '').trim(),
      date: invoiceData.date || new Date().toISOString().split('T')[0],
      dueDate: invoiceData.dueDate || '',
      items,
      subtotal,
      discount,
      taxPercent,
      taxAmount,
      totalAmount,
      paidAmount,
      pendingAmount,
      dueAmount: pendingAmount,
      payments,
      status,
      notes: (invoiceData.notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    saveToDb('invoices', mapInvoiceToDb, newInvoice);

    if (invoiceData.fabricId) {
      setFabrics((prev) =>
        prev.map((f) => {
          if (f.id === invoiceData.fabricId) {
            const updated = {
              ...f,
              invoiceId: newInvoice.id,
              invoiceNumber: newInvoice.invoiceNumber,
              updatedAt: new Date().toISOString(),
            };
            saveToDb('fabrics', mapFabricToDb, updated);
            return updated;
          }
          return f;
        })
      );
    }

    return { success: true, invoice: newInvoice };
  };

  const updateInvoice = (id, updatedData) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const items =
            updatedData.items !== undefined
              ? updatedData.items.map((item) => {
                const qty = parseInt(item.quantity, 10) || 0;
                const rate = parseFloat(item.unitPrice) || 0;
                return {
                  id: item.id || generateEntityId('item'),
                  description: (item.description || '').trim(),
                  subPart: item.subPart || null,
                  pieceName: item.pieceName || null,
                  fabricId: item.fabricId || null,
                  fabricName: item.fabricName || '',
                  quantity: qty,
                  unitPrice: rate,
                  amount: qty * rate,
                };
              })
              : inv.items;

          const subtotal = items.reduce((acc, it) => acc + it.amount, 0);
          const discount =
            updatedData.discount !== undefined
              ? parseFloat(updatedData.discount) || 0
              : inv.discount;
          const discountedSubtotal = Math.max(0, subtotal - discount);
          const taxPercent =
            updatedData.taxPercent !== undefined
              ? parseFloat(updatedData.taxPercent) || 0
              : inv.taxPercent;
          const taxAmount = Math.round((discountedSubtotal * taxPercent) / 100);
          const totalAmount = discountedSubtotal + taxAmount;

          const payments = updatedData.payments || inv.payments || [];
          const paidAmount = payments.reduce(
            (acc, p) => acc + (parseFloat(p.amount) || 0),
            0
          );
          const pendingAmount = Math.max(0, totalAmount - paidAmount);

          let status = inv.status;
          if (paidAmount >= totalAmount && totalAmount > 0) {
            status = 'Paid';
          } else if (paidAmount > 0) {
            status = 'Partial';
          } else {
            status = 'Pending';
          }

          let fabricUpdates = {};
          const targetFabricId = updatedData.fabricId || inv.fabricId;
          if (targetFabricId) {
            const linked = fabrics.find((f) => f.id === targetFabricId);
            if (linked) {
              fabricUpdates = {
                fabricId: targetFabricId,
                fabricType: linked.fabricType,
                fabricColor: linked.color,
                supplierId: linked.supplierId,
                supplierName: linked.supplierName,
                supplierPhone: linked.supplierPhone,
                clientName: linked.supplierName,
                clientPhone: linked.supplierPhone,
              };
            }
          }

          const updatedInv = {
            ...inv,
            ...fabricUpdates,
            ...updatedData,
            items,
            subtotal,
            discount,
            taxPercent,
            taxAmount,
            totalAmount,
            paidAmount,
            pendingAmount,
            payments,
            status,
            updatedAt: new Date().toISOString(),
          };
          saveToDb('invoices', mapInvoiceToDb, updatedInv);
          return updatedInv;
        }
        return inv;
      })
    );
    return { success: true };
  };

  const deleteInvoice = (id) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    dbRemove('invoices', id);
    return { success: true };
  };

  const recordInvoicePayment = (invoiceId, paymentData) => {
    const amount = parseFloat(paymentData.amount) || 0;
    if (amount <= 0) return { success: false, error: 'Payment amount must be greater than 0.' };

    let resultInvoice = null;

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const newPayment = {
            id: generateEntityId('pmt'),
            amount,
            date: paymentData.date || new Date().toISOString().split('T')[0],
            method: paymentData.method || 'Cash',
            referenceNo: (paymentData.referenceNo || '').trim(),
            notes: (paymentData.notes || '').trim(),
            createdAt: new Date().toISOString(),
          };

          const payments = [...(inv.payments || []), newPayment];
          const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
          const total = parseFloat(inv.totalAmount || inv.total_amount) || 0;
          const due = Math.max(0, total - totalPaid);
          const status = due === 0 && total > 0 ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');

          const updatedInvoice = {
            ...inv,
            payments,
            paidAmount: totalPaid,
            dueAmount: due,
            pendingAmount: due,
            status,
            updatedAt: new Date().toISOString(),
          };

          saveToDb('invoices', mapInvoiceToDb, updatedInvoice);
          resultInvoice = updatedInvoice;
          return updatedInvoice;
        }
        return inv;
      })
    );

    return { success: true, invoice: resultInvoice };
  };

  /**
   * INVOICE - EXPENSE JUNCTION MANAGEMENT
   */
  const linkInvoiceExpense = (linkData) => {
    const newLink = {
      id: linkData.id || generateEntityId('inexp'),
      userId: currentUserId || ownerUserId,
      invoiceId: linkData.invoiceId || null,
      expenseId: linkData.expenseId || null,
      fabricId: linkData.fabricId || null,
      cuttingId: linkData.cuttingId || null,
      costType: linkData.costType || 'direct_cost',
      allocatedAmount: parseFloat(linkData.allocatedAmount) || 0,
      notes: linkData.notes ? String(linkData.notes).trim() : '',
      createdAt: new Date().toISOString(),
    };

    setInvoiceExpenses((prev) => [newLink, ...prev]);
    saveToDb('invoice_expenses', mapInvoiceExpenseToDb, newLink);
    return { success: true, link: newLink };
  };

  const unlinkInvoiceExpense = (id) => {
    setInvoiceExpenses((prev) => prev.filter((item) => item.id !== id));
    dbRemove('invoice_expenses', id);
    return { success: true };
  };

  const getInvoiceExpenses = (invoiceId) => {
    return invoiceExpenses.filter((ie) => ie.invoiceId === invoiceId);
  };

  /**
   * LIFECYCLE: Create Revenue Invoice when a Fabric Lot is 100% Completed
   */
  const createCompletedLotInvoice = (fabricId, options = {}) => {
    const fabric = fabrics.find((f) => f.id === fabricId);
    if (!fabric) {
      return { success: false, error: 'Fabric lot not found.' };
    }

    const fabricCuttings = cuttings.filter((c) => c.fabricId === fabricId || c.fabric_id === fabricId);
    let totalCutPieces = 0;
    let totalSets = parseInt(fabric.target_sets || fabric.targetSets, 10) || 0;

    fabricCuttings.forEach((c) => {
      totalCutPieces += parseInt(c.totalPieces || c.total_pieces, 10) || 0;
      if (c.setsCount || c.sets_count) {
        totalSets = Math.max(totalSets, parseInt(c.setsCount || c.sets_count, 10) || 0);
      }
    });

    const calculatedSets = totalSets > 0 ? totalSets : (totalCutPieces > 0 ? Math.max(1, Math.round(totalCutPieces / 4)) : 1);
    const pricePerSet = parseFloat(options.pricePerSet || fabric.price_per_set || fabric.pricePerSet) || 0;
    const clientName = (options.clientName || fabric.supplierName || 'Direct Customer').trim();
    const dueDate = options.dueDate || '';
    const notes = options.notes ? String(options.notes).trim() : `Revenue invoice for completed Fabric Lot #${fabric.lot_no || 'N/A'}`;

    const fabricName = sanitizeFabricName(
      fabric.fabricType ? `${fabric.fabricType}${fabric.color ? ` (${fabric.color})` : ''}` : 'Finished Garment Lot'
    );

    const quantity = calculatedSets;
    const items = [
      {
        id: generateEntityId('item'),
        description: `Completed Garments - ${fabricName} (${quantity} Sets)`,
        fabricId: fabric.id,
        fabricName,
        quantity,
        unitPrice: pricePerSet,
        amount: quantity * pricePerSet,
      },
    ];

    const invoicePayload = {
      fabricId: fabric.id,
      fabricType: fabric.fabricType || '',
      fabricColor: fabric.color || '',
      supplierId: fabric.supplierId || null,
      supplierName: clientName,
      clientName: clientName,
      clientPhone: fabric.supplierPhone || options.clientPhone || '',
      date: options.date || new Date().toISOString().split('T')[0],
      dueDate,
      items,
      discount: parseFloat(options.discount) || 0,
      taxPercent: parseFloat(options.taxPercent) || 0,
      notes,
    };

    const invResult = addInvoice(invoicePayload);
    if (!invResult?.success || !invResult.invoice) {
      return { success: false, error: 'Failed to create revenue invoice.' };
    }

    const createdInvoice = invResult.invoice;

    const fabricTotalCost = parseFloat(fabric.totalAmount || fabric.total_amount) || 0;
    const lotAssignments = (tailorAssignments || []).filter(
      (a) => a.fabricId === fabricId || a.fabric_id === fabricId
    );
    let totalTailorLabor = 0;
    lotAssignments.forEach((asgn) => {
      (asgn.dailySubmissions || []).forEach((sub) => {
        const qty = parseInt(sub.quantity, 10) || 0;
        const rate =
          sub.earnedAmount !== undefined && sub.earnedAmount !== null
            ? parseFloat(sub.earnedAmount)
            : qty * (parseFloat(asgn.ratePerPiece) || 25);
        totalTailorLabor += rate;
      });
    });

    // Execute atomic stored procedure on Supabase with client-side offline fallback
    executeAtomicCompletedLotInvoice(supabase, createdInvoice, {
      materialCost: fabricTotalCost,
      tailorCost: totalTailorLabor,
    }).then((rpcRes) => {
      if (rpcRes.rpcExecuted && rpcRes.success) {
        return;
      }
      // Offline fallback: link in junction table client-side
      if (fabricTotalCost > 0) {
        linkInvoiceExpense({
          invoiceId: createdInvoice.id,
          fabricId: fabric.id,
          costType: 'direct_fabric_material',
          allocatedAmount: fabricTotalCost,
          notes: `Fabric material cost for Lot #${fabric.lot_no || ''}`,
        });
      }
      if (totalTailorLabor > 0) {
        linkInvoiceExpense({
          invoiceId: createdInvoice.id,
          fabricId: fabric.id,
          costType: 'direct_tailor_labor',
          allocatedAmount: totalTailorLabor,
          notes: `Tailor stitching labor for Lot #${fabric.lot_no || ''}`,
        });
      }
    }).catch(() => {
      if (fabricTotalCost > 0) {
        linkInvoiceExpense({
          invoiceId: createdInvoice.id,
          fabricId: fabric.id,
          costType: 'direct_fabric_material',
          allocatedAmount: fabricTotalCost,
          notes: `Fabric material cost for Lot #${fabric.lot_no || ''}`,
        });
      }
    });

    return { success: true, invoice: createdInvoice, totalSets: quantity, totalRevenue: quantity * pricePerSet };
  };

  /**
   * Settle all invoices for a completed fabric lot:
   * Marks pending delivery invoices as Paid, removes from Collections (Pending) and adds to Net Profit!
   */
  const settleFabricLotInvoices = (fabricId) => {
    const fabric = fabrics.find((f) => f.id === fabricId);
    if (!fabric) return { success: false, error: 'Fabric lot not found.' };

    const nowIso = new Date().toISOString();

    // 1. Find all invoices linked to this fabric lot
    const linkedInvoices = invoices.filter((inv) => {
      if (inv.fabricId === fabricId) return true;
      const items = inv.items || [];
      return items.some((it) => it.fabricId === fabricId);
    });

    if (linkedInvoices.length > 0) {
      // Mark all linked delivery invoices as Paid (payment collected -> moves to Net Profit!)
      setInvoices((prev) =>
        prev.map((inv) => {
          const isLinked =
            inv.fabricId === fabricId ||
            (inv.items || []).some((it) => it.fabricId === fabricId);
          if (isLinked) {
            const tot = parseFloat(inv.totalAmount) || 0;
            const updated = {
              ...inv,
              paidAmount: tot,
              pendingAmount: 0,
              dueAmount: 0,
              status: 'Paid',
              updatedAt: nowIso,
            };
            saveToDb('invoices', mapInvoiceToDb, updated);
            return updated;
          }
          return inv;
        })
      );
    } else {
      // If no delivery invoice was created yet, create the completed lot invoice as Paid directly!
      const res = createCompletedLotInvoice(fabricId, {
        notes: `Final payment settled for completed lot #${fabric.lot_no || 'N/A'}`,
      });
      if (res?.invoice) {
        const tot = parseFloat(res.invoice.totalAmount) || 0;
        const updated = {
          ...res.invoice,
          paidAmount: tot,
          pendingAmount: 0,
          dueAmount: 0,
          status: 'Paid',
          updatedAt: nowIso,
        };
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === updated.id ? updated : inv))
        );
        saveToDb('invoices', mapInvoiceToDb, updated);
      }
    }

    // Mark fabric lot as completely Delivered / Completed
    if (typeof updateFabric === 'function') {
      updateFabric(fabricId, { status: 'Delivered', isDelivered: true });
    }
    return { success: true };
  };

  /**
   * FINANCIAL DECISION ENGINE
   * Profit & Loss, Receivables Aging, Tailor Payroll, Master/Helper Salary Balances
   */
  const getFinancialDecisionData = (selectedMonth = 'all') => {
    // 1. Invoices & Revenue
    const filteredInvoices =
      selectedMonth === 'all'
        ? invoices
        : invoices.filter((inv) => inv.date && inv.date.startsWith(selectedMonth));

    const totalInvoicedRevenue = filteredInvoices.reduce(
      (acc, inv) => acc + (parseFloat(inv.totalAmount) || 0),
      0
    );
    const totalCollectedRevenue = filteredInvoices.reduce(
      (acc, inv) => acc + (parseFloat(inv.paidAmount) || 0),
      0
    );
    const totalPendingCollections = filteredInvoices.reduce(
      (acc, inv) => acc + (parseFloat(inv.pendingAmount) || 0),
      0
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueInvoices = filteredInvoices.filter(
      (inv) => inv.dueDate && inv.dueDate < todayStr && inv.pendingAmount > 0
    );
    const totalOverdueCollections = overdueInvoices.reduce(
      (acc, inv) => acc + (parseFloat(inv.pendingAmount) || 0),
      0
    );

    // 2. Direct Material Costs (Fabrics)
    const filteredFabrics =
      selectedMonth === 'all'
        ? fabrics
        : fabrics.filter((f) => f.date && f.date.startsWith(selectedMonth));

    const totalFabricCost = filteredFabrics.reduce(
      (acc, f) => acc + (parseFloat(f.totalAmount) || 0),
      0
    );

    // 3. Tailor Stitching Earnings & Monthly Payouts
    const tailorPayrollMap = {};
    tailors.forEach((t) => {
      tailorPayrollMap[t.id] = {
        tailorId: t.id,
        tailorName: t.name,
        tailorPhone: t.phone,
        machineCode: machines.find((m) => m.id === t.assignedMachineId)?.code || '—',
        piecesCompleted: { total: 0 },
        stitchingEarnings: 0,
        advancesPaid: 0,
        netPayable: 0,
      };
    });

    tailorAssignments.forEach((asgn) => {
      const rates = asgn.tailorRates || {};
      const tId = asgn.tailorId;
      if (!tId) return;

      if (!tailorPayrollMap[tId]) {
        tailorPayrollMap[tId] = {
          tailorId: tId,
          tailorName: asgn.tailorName || 'Tailor',
          tailorPhone: asgn.tailorPhone || '',
          machineCode: asgn.machineCode || '—',
          piecesCompleted: { total: 0 },
          stitchingEarnings: 0,
          advancesPaid: 0,
          netPayable: 0,
        };
      }

      const subs = (asgn.dailySubmissions || []).filter((s) =>
        selectedMonth === 'all' ? true : s.date && s.date.startsWith(selectedMonth)
      );

      subs.forEach((sub) => {
        const qty = parseInt(sub.quantity, 10) || 0;
        tailorPayrollMap[tId].piecesCompleted.total += qty;
        const setRate = Object.values(rates).reduce((acc, r) => acc + (parseFloat(r) || 0), 0);
        const earned =
          sub.earnedAmount !== undefined && sub.earnedAmount !== null
            ? parseFloat(sub.earnedAmount)
            : asgn.ratePerPiece
              ? qty * parseFloat(asgn.ratePerPiece)
              : setRate > 0
                ? qty * setRate
                : qty * 25;
        tailorPayrollMap[tId].stitchingEarnings += earned;
      });
    });

    // 4. Factory Operational Expenses
    const filteredExpenses =
      selectedMonth === 'all'
        ? expenses
        : expenses.filter((e) => e.date && e.date.startsWith(selectedMonth));

    let rentExpense = 0;
    let maintExpense = 0;
    let lightExpense = 0;
    let masterSalaryExpense = 0;
    let helperSalaryExpense = 0;
    let otherExpense = 0;

    filteredExpenses.forEach((exp) => {
      const amt = parseFloat(exp.amount) || 0;
      switch (exp.expenseType) {
        case 'Rent':
          rentExpense += amt;
          break;
        case 'Maintainance':
        case 'Maintenance':
          maintExpense += amt;
          break;
        case 'Light Bill':
          lightExpense += amt;
          break;
        case 'Salary':
          if (exp.salarySubType === 'Master') {
            masterSalaryExpense += amt;
          } else if (exp.salarySubType === 'Helper') {
            helperSalaryExpense += amt;
          } else if (exp.salarySubType === 'Tailor' && exp.workerId && tailorPayrollMap[exp.workerId]) {
            tailorPayrollMap[exp.workerId].advancesPaid += amt;
          }
          break;
        case 'Other':
          otherExpense += amt;
          break;
        default:
          break;
      }
      if (exp.workerId && tailorPayrollMap[exp.workerId] && (exp.expenseType === 'Salary' || exp.category === 'Salary')) {
        tailorPayrollMap[exp.workerId].advancesPaid += amt;
      }
    });

    Object.values(tailorPayrollMap).forEach((t) => {
      t.netPayable = Math.max(0, t.stitchingEarnings - t.advancesPaid);
    });

    // Master & Helper Salary Status calculation
    const masterSalaryList = masters.map((m) => {
      const paid = filteredExpenses
        .filter((e) => e.expenseType === 'Salary' && e.salarySubType === 'Master' && e.workerId === m.id)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const standardSalary = 25000;
      return {
        workerId: m.id,
        name: m.name,
        phone: m.phone,
        role: 'Master',
        standardSalary,
        paid,
        pending: Math.max(0, standardSalary - paid),
        status: paid >= standardSalary ? 'Fully Paid' : paid > 0 ? 'Partial' : 'Unpaid',
      };
    });

    const helperSalaryList = helpers.map((h) => {
      const paid = filteredExpenses
        .filter((e) => e.expenseType === 'Salary' && e.salarySubType === 'Helper' && e.workerId === h.id)
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const standardSalary = 12000;
      return {
        workerId: h.id,
        name: h.name,
        phone: h.phone,
        role: 'Helper',
        standardSalary,
        paid,
        pending: Math.max(0, standardSalary - paid),
        status: paid >= standardSalary ? 'Fully Paid' : paid > 0 ? 'Partial' : 'Unpaid',
      };
    });

    const totalTailorStitchingLabor = Object.values(tailorPayrollMap).reduce(
      (acc, t) => acc + t.stitchingEarnings,
      0
    );

    // Total Recorded Operational Expenses from Expenses Table
    const totalRecordedExpenses =
      rentExpense + maintExpense + lightExpense + masterSalaryExpense + helperSalaryExpense + otherExpense;

    // Direct Costs Linked to Invoices via Junction Table (COGS)
    const filteredJunctionExpenses = (invoiceExpenses || []).filter((ie) => {
      if (selectedMonth === 'all') return true;
      const linkedInv = invoices.find((inv) => inv.id === ie.invoiceId);
      return (
        (linkedInv?.date && linkedInv.date.startsWith(selectedMonth)) ||
        (ie.created_at && String(ie.created_at).startsWith(selectedMonth))
      );
    });

    const totalJunctionCosts = filteredJunctionExpenses.reduce(
      (sum, ie) => sum + (parseFloat(ie.allocatedAmount ?? ie.allocated_amount) || 0),
      0
    );

    // Total Company Costs = Recorded Outflow Expenses + Invoiced Direct Costs
    const totalCompanyCosts = totalRecordedExpenses + totalJunctionCosts;

    const grossProfit = totalInvoicedRevenue - totalJunctionCosts;
    const netProfit = totalInvoicedRevenue - totalCompanyCosts;
    const profitMarginPercent =
      totalInvoicedRevenue > 0 ? ((netProfit / totalInvoicedRevenue) * 100).toFixed(1) : '0.0';

    // Generate chronological monthly growth trends for the analytics graph
    const monthKeys = new Set();
    const curDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(curDate.getFullYear(), curDate.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.add(ym);
    }
    invoices.forEach((inv) => {
      if (inv.date && inv.date.length >= 7) monthKeys.add(inv.date.slice(0, 7));
    });
    expenses.forEach((exp) => {
      if (exp.date && exp.date.length >= 7) monthKeys.add(exp.date.slice(0, 7));
    });

    const sortedMonths = Array.from(monthKeys).sort();
    const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' });

    const growthTrends = sortedMonths.map((ym) => {
      const [y, m] = ym.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      const label = monthFormatter.format(d);

      const mInvoices = invoices.filter((inv) => inv.date && inv.date.startsWith(ym));
      const mExpenses = expenses.filter((exp) => exp.date && exp.date.startsWith(ym));

      const revInvoiced = mInvoices.reduce((s, inv) => s + (parseFloat(inv.totalAmount) || 0), 0);
      const revCollected = mInvoices.reduce((s, inv) => s + (parseFloat(inv.paidAmount) || 0), 0);
      const opExpenses = mExpenses.reduce((s, exp) => s + (parseFloat(exp.amount) || 0), 0);
      const jCosts = (invoiceExpenses || [])
        .filter((ie) => mInvoices.some((inv) => inv.id === ie.invoiceId))
        .reduce((s, ie) => s + (parseFloat(ie.allocatedAmount ?? ie.allocated_amount) || 0), 0);

      const totalExp = opExpenses + jCosts;
      const profit = revInvoiced - totalExp;
      const margin = revInvoiced > 0 ? parseFloat(((profit / revInvoiced) * 100).toFixed(1)) : 0;

      return {
        month: ym,
        label,
        revenue: revInvoiced,
        collected: revCollected,
        expenses: totalExp,
        netProfit: profit,
        margin,
        isProfitable: profit >= 0,
      };
    });

    return {
      revenue: {
        invoiced: totalInvoicedRevenue,
        collected: totalCollectedRevenue,
        pending: totalPendingCollections,
        overdue: totalOverdueCollections,
        overdueCount: overdueInvoices.length,
      },
      costs: {
        recordedExpenses: totalRecordedExpenses,
        junctionCosts: totalJunctionCosts,
        overhead: totalRecordedExpenses,
        rent: rentExpense,
        maintenance: maintExpense,
        lightBill: lightExpense,
        masterSalary: masterSalaryExpense,
        helperSalary: helperSalaryExpense,
        other: otherExpense,
        total: totalCompanyCosts,
        inventoryFabricValue: totalFabricCost,
        tailorLabor: totalTailorStitchingLabor,
        fabric: totalJunctionCosts > 0 ? totalJunctionCosts : 0,
      },
      profitability: {
        grossProfit,
        netProfit,
        marginPercent: profitMarginPercent,
        isProfitable: netProfit >= 0,
      },
      growthTrends,
      tailorPayroll: Object.values(tailorPayrollMap),
      staffSalaries: {
        masters: masterSalaryList,
        helpers: helperSalaryList,
        totalMasterPaid: masterSalaryExpense,
        totalHelperPaid: helperSalaryExpense,
      },
    };
  };

  return {
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
  };
}
