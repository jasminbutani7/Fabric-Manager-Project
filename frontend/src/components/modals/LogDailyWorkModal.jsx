import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  FileText,
  Sparkles,
  UserCheck,
  Minus,
  Plus,
  PackageCheck,
  IndianRupee,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useFabric, useProduction } from '../../context/useManagement';
import { sanitizeFabricName } from '../../context/managementContextInstance';
import {
  resolvePieceLabel,
  getNormalizedCutPiecesList,
  getPieceValueFromObject,
  getAssignmentSubPartsList,
  resolvePieceRate,
  formatPieceName,
  getAssignmentPieceName,
} from '../../utils/productUtils';
import AlertModal from './AlertModal';
import { sanitizeInteger, blockInvalidNumberKeys } from '../../utils/formValidation';

export default function LogDailyWorkModal({
  isOpen,
  onClose,
  assignment,
  onSuccess = null,
}) {
  const { cuttings = [], fabrics = [] } = useFabric();
  const { logDailyTailorSubmission } = useProduction();
  const todayStr = new Date().toISOString().split('T')[0];

  const totalAssigned = assignment ? parseInt(assignment.totalAssignedPieces, 10) || 0 : 0;
  const alreadyCompleted = assignment ? parseInt(assignment.completedQuantity, 10) || 0 : 0;

  const cutting = useMemo(() => {
    if (!assignment) return null;
    return (cuttings || []).find((c) => c.id === assignment.cuttingId) || null;
  }, [assignment, cuttings]);

  const fabric = useMemo(() => {
    if (!assignment) return null;
    return (
      (fabrics || []).find((f) => f.id === (cutting?.fabricId || assignment.fabricId)) ||
      (fabrics || []).find(
        (f) => sanitizeFabricName(f.fabricName) === sanitizeFabricName(assignment.fabricName || cutting?.fabricName)
      ) ||
      null
    );
  }, [assignment, cutting, fabrics]);

  // Derive primary garment piece name
  const pieceName = useMemo(() => {
    return getAssignmentPieceName(assignment, totalAssigned, fabric);
  }, [assignment, totalAssigned, fabric]);

  // Effective fallback piece rate
  const fallbackRate = useMemo(() => {
    if (!assignment) return 0;
    return resolvePieceRate('total', 'total', assignment, cutting, fabric);
  }, [assignment, cutting, fabric]);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Dynamically resolve pieces / sub-parts for this assignment
  const dynamicPiecesList = useMemo(() => {
    if (!assignment) return [];

    const struct = assignment.productStructure || cutting?.productStructure || fabric?.productStructure;

    // 1. Try getAssignmentSubPartsList first
    const subParts = getAssignmentSubPartsList(assignment, cutting, fabric);
    if (subParts && subParts.length > 0) {
      const seen = new Set();
      const list = [];
      subParts.forEach((sp) => {
        const normKey = (sp.id || sp.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
        if (seen.has(normKey)) return;
        seen.add(normKey);

        const rateVal = resolvePieceRate(sp.id, sp.name, assignment, cutting, fabric, struct) || sp.rate || fallbackRate;

        const doneCount = (assignment?.dailySubmissions || []).reduce((acc, sub) => {
          if (sub.approvalStatus === 'Rejected') return acc;
          const val =
            parseInt(sub.subParts?.[sp.id], 10) ||
            parseInt(sub.subParts?.[sp.name], 10) ||
            parseInt(sub.parts?.[sp.id], 10) ||
            parseInt(sub.parts?.[sp.name], 10) ||
            0;
          return acc + val;
        }, 0);

        const assignedQty = parseInt(sp.count, 10) || 0;
        list.push({
          key: sp.id,
          label: sp.name,
          recipeLabel: sp.recipeLabel,
          components: sp.components,
          assigned: assignedQty,
          done: doneCount,
          remaining: Math.max(0, assignedQty - doneCount),
          rate: rateVal,
        });
      });

      if (list.length > 0) return list;
    }

    // 2. Try normalized cut pieces list from productUtils
    const pseudoCutting = {
      cutPieces: assignment.assignedPieces || {},
      productStructure: struct,
    };
    const pseudoFabric = fabric || (struct ? { productStructure: struct } : null);
    const normList = getNormalizedCutPiecesList(pseudoCutting, pseudoFabric);

    if (normList.length > 0) {
      const seen = new Set();
      const list = [];
      normList.forEach((item) => {
        const normKey = (item.key || item.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
        if (seen.has(normKey)) return;
        seen.add(normKey);

        const rateVal = resolvePieceRate(item.key, item.label, assignment, cutting, fabric, struct) || fallbackRate;

        const doneCount = (assignment?.dailySubmissions || []).reduce((acc, sub) => {
          if (sub.approvalStatus === 'Rejected' || !sub.parts) return acc;
          return acc + (getPieceValueFromObject(sub.parts, item.label, item.key) || 0);
        }, 0);

        const assignedQty = parseInt(item.val, 10) || 0;
        list.push({
          key: item.key,
          label: item.label,
          assigned: assignedQty,
          done: doneCount,
          remaining: Math.max(0, assignedQty - doneCount),
          rate: rateVal,
        });
      });

      if (list.length > 0) return list;
    }

    // 3. Fallback deduplicating rawPieces entries by normalized key
    const rawPieces = assignment.assignedPieces || {};
    const seen = new Set();
    const result = [];

    Object.entries(rawPieces).forEach(([key, qty]) => {
      const assignedQty = parseInt(qty, 10) || 0;
      if (assignedQty <= 0) return;
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (seen.has(normalizedKey)) return;
      seen.add(normalizedKey);

      const rawLabel = resolvePieceLabel(key, struct) || key;
      const label =
        !rawLabel || rawLabel.toLowerCase().includes('suit set')
          ? 'pcs'
          : rawLabel.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const rateVal = resolvePieceRate(key, label, assignment, cutting, fabric, struct) || fallbackRate;

      const doneCount = (assignment?.dailySubmissions || []).reduce((acc, sub) => {
        if (sub.approvalStatus === 'Rejected' || !sub.parts) return acc;
        return acc + (getPieceValueFromObject(sub.parts, label, key) || 0);
      }, 0);

      result.push({
        key,
        label,
        assigned: assignedQty,
        done: doneCount,
        remaining: Math.max(0, assignedQty - doneCount),
        rate: rateVal,
      });
    });

    if (result.length > 0) return result;

    // 4. Single piece fallback
    return [
      {
        key: 'single_pc',
        label: assignment?.productName || 'pcs',
        assigned: totalAssigned,
        done: alreadyCompleted,
        remaining: Math.max(0, totalAssigned - alreadyCompleted),
        rate: fallbackRate,
      },
    ];
  }, [assignment, cutting, fabric, fallbackRate, totalAssigned, alreadyCompleted]);

  // Compute overall target statistics
  const targetPcsStats = useMemo(() => {
    if (!assignment) return { assigned: 0, done: 0, remaining: 0, percent: 0, minSetsAssigned: 0, minSetsDone: 0, minSetsPending: 0, isMultiPiece: false };

    if (dynamicPiecesList.length > 0) {
      const assigned = dynamicPiecesList.reduce((acc, i) => acc + (parseInt(i.assigned, 10) || 0), 0);
      const done = dynamicPiecesList.reduce((acc, i) => acc + (parseInt(i.done, 10) || 0), 0);
      const remainingPcs = Math.max(0, assigned - done);
      const percent = assigned > 0 ? Math.min(100, Math.round((done / assigned) * 100)) : 0;
      const minSetsAssigned = Math.min(...dynamicPiecesList.map((i) => parseInt(i.assigned, 10) || 0));
      const minSetsDone = Math.min(...dynamicPiecesList.map((i) => parseInt(i.done, 10) || 0));
      const minSetsPending = Math.min(...dynamicPiecesList.map((i) => Math.max(0, (parseInt(i.assigned, 10) || 0) - (parseInt(i.done, 10) || 0))));
      const isMultiPiece = dynamicPiecesList.length > 1;
      return { assigned, done, remaining: remainingPcs, percent, minSetsAssigned, minSetsDone, minSetsPending, isMultiPiece };
    }

    const assigned = totalAssigned;
    const done = alreadyCompleted;
    const remainingPcs = Math.max(0, assigned - done);
    const percent = assigned > 0 ? Math.min(100, Math.round((done / assigned) * 100)) : 0;
    return { assigned, done, remaining: remainingPcs, percent, minSetsAssigned: assigned, minSetsDone: done, minSetsPending: remainingPcs, isMultiPiece: false };
  }, [assignment, dynamicPiecesList, totalAssigned, alreadyCompleted]);

  const [formData, setFormData] = useState({
    date: todayStr,
    quantities: {},
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });

  const getQty = (key) => formData.quantities[key] || '';
  const getCount = (key) => parseInt(getQty(key), 10) || 0;

  const inputQty = useMemo(() => {
    return dynamicPiecesList.reduce((acc, item) => {
      const cnt = parseInt(formData.quantities[item.key], 10) || 0;
      return acc + cnt;
    }, 0);
  }, [dynamicPiecesList, formData.quantities]);

  const estimatedEarnings = useMemo(() => {
    return dynamicPiecesList.reduce((acc, item) => {
      const cnt = parseInt(formData.quantities[item.key], 10) || 0;
      return acc + cnt * item.rate;
    }, 0);
  }, [dynamicPiecesList, formData.quantities]);

  const handleStepPart = (key, delta, max) => {
    setFormData((prev) => {
      const cur = parseInt(prev.quantities[key], 10) || 0;
      const next = Math.max(0, Math.min(max, cur + delta));
      return {
        ...prev,
        quantities: {
          ...prev.quantities,
          [key]: next > 0 ? String(next) : '',
        },
      };
    });
  };

  const handleQuickAdd = (key, delta, max) => {
    setFormData((prev) => {
      const cur = parseInt(prev.quantities[key], 10) || 0;
      const next = Math.max(0, Math.min(max, cur + delta));
      return {
        ...prev,
        quantities: {
          ...prev.quantities,
          [key]: next > 0 ? String(next) : '',
        },
      };
    });
  };

  const handleFillPart = (key, max) => {
    setFormData((prev) => ({
      ...prev,
      quantities: {
        ...prev.quantities,
        [key]: max > 0 ? String(max) : '',
      },
    }));
  };

  const handleClearQuantities = () => {
    setFormData((prev) => ({
      ...prev,
      quantities: {},
    }));
  };

  const hasAnyRemaining = dynamicPiecesList.some((item) => item.remaining > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (inputQty <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'PCs Required',
        message: 'Please enter the number of completed PCs stitched today.',
        type: 'warning',
      });
      return;
    }

    // Validate limits
    for (const item of dynamicPiecesList) {
      const cnt = getCount(item.key);
      if (cnt > item.remaining) {
        setAlertModal({
          isOpen: true,
          title: `${item.label} Quantity Exceeded`,
          message: `You entered ${cnt} ${item.label}, but only ${item.remaining} are remaining for this assignment.`,
          type: 'warning',
        });
        return;
      }
    }

    const subPartsPayload = {};
    const partsPayload = {};

    dynamicPiecesList.forEach((item) => {
      const cnt = getCount(item.key);
      if (cnt > 0) {
        subPartsPayload[item.key] = cnt;
        if (item.components && Array.isArray(item.components) && item.components.length > 0) {
          item.components.forEach((c) => {
            const compKey = c.id || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            partsPayload[compKey] = (partsPayload[compKey] || 0) + cnt * (parseInt(c.qty, 10) || 1);
          });
        } else {
          partsPayload[item.key] = cnt;
        }
      }
    });

    try {
      setIsSubmitting(true);
      const result = await logDailyTailorSubmission(assignment.id, {
        date: formData.date,
        quantity: inputQty,
        pscQuantity: inputQty,
        subParts: Object.keys(subPartsPayload).length > 0 ? subPartsPayload : null,
        parts: partsPayload,
        notes: formData.notes,
      });

      if (result.success) {
        if (onSuccess) onSuccess(result.assignment);
        onClose();
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Submission Error',
          message: result.error || 'Failed to submit daily work.',
          type: 'danger',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !assignment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 text-left">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-white flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
              <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                  Submit Stitched {formatPieceName(pieceName, 2)}
                </h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">
                  Daily Handover
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {sanitizeFabricName(assignment.fabricName)} • Batch #{assignment.id.slice(-6)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0 text-left">
          {/* Scrollable Form Body */}
          <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3 overflow-y-auto flex-1">
            {/* SECTION 1: Tailor Custody & Overall Stitching Progress (Compact) */}
            <div className="p-2.5 sm:p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {assignment.tailorName || 'Tailor'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        {assignment.machineCode ? `MCH-${assignment.machineCode}` : 'In Stitching'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 shrink-0">
                  <span>Overall:</span>
                  <span className="text-emerald-700 font-black">{targetPcsStats.percent}%</span>
                </div>
              </div>

              {/* Slim Progress Bar */}
              <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${targetPcsStats.percent}%` }}
                />
              </div>

              {/* 3 Metric Overview Cards - Compact Row */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                {/* ASSIGNED */}
                <div className="py-1 px-1.5 bg-white rounded-lg border border-slate-200/70 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block leading-tight">Assigned</span>
                  <span className="text-xs font-black text-slate-800 block truncate max-w-full leading-tight">
                    {targetPcsStats.isMultiPiece
                      ? `${targetPcsStats.minSetsAssigned} Sets`
                      : `${targetPcsStats.assigned} PCs`}
                  </span>
                </div>

                {/* DELIVERED */}
                <div className="py-1 px-1.5 bg-emerald-50/70 rounded-lg border border-emerald-100 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[9px] text-emerald-600 font-bold uppercase block leading-tight">Delivered</span>
                  <span className="text-xs font-black text-emerald-700 block truncate max-w-full leading-tight">
                    {targetPcsStats.isMultiPiece
                      ? `${targetPcsStats.minSetsDone} Sets`
                      : `${targetPcsStats.done} PCs`}
                  </span>
                </div>

                {/* PENDING */}
                <div className="py-1 px-1.5 bg-amber-50/70 rounded-lg border border-amber-100 flex flex-col items-center justify-center min-w-0">
                  <span className="text-[9px] text-amber-600 font-bold uppercase block leading-tight">Pending</span>
                  <span className="text-xs font-black text-amber-700 block truncate max-w-full leading-tight">
                    {targetPcsStats.isMultiPiece
                      ? `${targetPcsStats.minSetsPending} Sets`
                      : `${targetPcsStats.remaining} PCs`}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: Work Submission Date (Compact Row) */}
            <div className="p-2 sm:p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Submission Date *</span>
              </label>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, date: todayStr }))}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      formData.date === todayStr
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, date: yesterdayStr }))}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      formData.date === yesterdayStr
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Yesterday
                  </button>
                </div>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="px-2.5 py-1 bg-white border border-slate-200/90 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  required
                />
              </div>
            </div>

            {/* SECTION 3: Stitched PCs Completed Today (Size Decreased & Compact) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-black text-slate-900 uppercase tracking-wide">
                    Stitched PCs Completed Today *
                  </span>
                </div>
                {inputQty > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {inputQty} PCs (+₹{Math.round(estimatedEarnings).toLocaleString('en-IN')})
                    </span>
                    <button
                      type="button"
                      onClick={handleClearQuantities}
                      className="text-[10px] font-bold text-slate-500 hover:text-rose-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200 active:scale-95 transition-all cursor-pointer shadow-2xs"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {!hasAnyRemaining ? (
                <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 text-center space-y-1">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                    All Assigned PCs Completed!
                  </h4>
                  <p className="text-[11px] text-emerald-700 font-medium max-w-xs mx-auto">
                    All pieces assigned for this job have already been stitched and submitted.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dynamicPiecesList.map((item) => {
                    const curVal = getQty(item.key);
                    const countNum = getCount(item.key);
                    const isComplete = item.remaining > 0 && countNum === item.remaining;
                    const isOverLimit = countNum > item.remaining;
                    const remainingLeft = Math.max(0, item.remaining - countNum);

                    return (
                      <div
                        key={item.key}
                        className={`p-2.5 sm:p-3 rounded-xl border transition-all space-y-1.5 ${
                          isOverLimit
                            ? 'bg-rose-50/20 border-rose-300 ring-1 ring-rose-200'
                            : isComplete
                            ? 'bg-emerald-50/30 border-emerald-300 ring-1 ring-emerald-200/60 shadow-2xs'
                            : countNum > 0
                            ? 'bg-emerald-50/15 border-emerald-300/80 shadow-2xs'
                            : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        {/* Row 1: Name & Rate (Left) + Stepper (Right) */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs sm:text-sm font-black text-slate-900 uppercase shrink-0">
                              {item.label}
                            </span>
                            <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                              ₹{item.rate}/PC
                            </span>
                            {countNum > 0 && (
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded shrink-0">
                                +₹{Math.round(countNum * item.rate).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>

                          {/* Stepper on Right - Compact */}
                          <div className="flex items-center bg-slate-50 p-0.5 rounded-lg border border-slate-200/90 shadow-2xs shrink-0">
                            <button
                              type="button"
                              disabled={countNum <= 0}
                              onClick={() => handleStepPart(item.key, -1, item.remaining)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer active:scale-95 shrink-0"
                              title={`Subtract 1 ${item.label}`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              max={item.remaining}
                              placeholder="0"
                              value={curVal}
                              onWheel={(e) => e.target.blur()}
                              onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                              onChange={(e) => {
                                const sanitized = sanitizeInteger(e.target.value, { min: 0, max: item.remaining });
                                setFormData((prev) => ({
                                  ...prev,
                                  quantities: {
                                    ...prev.quantities,
                                    [item.key]: sanitized,
                                  },
                                }));
                              }}
                              className={`w-10 sm:w-11 bg-transparent text-center font-black text-xs sm:text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                                isComplete
                                  ? 'text-emerald-700'
                                  : countNum > 0
                                  ? 'text-emerald-900'
                                  : 'text-slate-800'
                              }`}
                            />

                            <button
                              type="button"
                              disabled={countNum >= item.remaining}
                              onClick={() => handleStepPart(item.key, 1, item.remaining)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer active:scale-95 shrink-0"
                              title={`Add 1 ${item.label}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Remaining Status (Left) + Quick Preset Chips (Right) */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                          {isComplete ? (
                            <>
                              <div className="flex items-center gap-1 text-[11px] font-black text-emerald-700 min-w-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate">Target Met ({item.remaining} PCs)</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStepPart(item.key, -countNum, item.remaining)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 transition-colors cursor-pointer active:scale-95"
                                  title="Reset to 0"
                                >
                                  Reset
                                </button>
                                <span className="px-2 py-0.2 rounded text-[10px] font-black bg-emerald-600 text-white shadow-2xs shrink-0 cursor-default">
                                  Max ✓
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-[10px] text-slate-500 font-medium truncate min-w-0">
                                {isOverLimit ? (
                                  <span className="text-rose-600 font-bold truncate block">
                                    +{countNum - item.remaining} over max ({item.remaining})
                                  </span>
                                ) : (
                                  <span className="truncate block">
                                    <strong className="text-slate-800 font-bold">{remainingLeft}</strong> left to stitch
                                  </span>
                                )}
                              </div>

                              {/* Quick Chips */}
                              <div className="flex items-center gap-1 shrink-0">
                                {[10, 25, 50].map((step) => {
                                  const canAdd = item.remaining > 0 && countNum + step <= item.remaining;
                                  return (
                                    <button
                                      key={step}
                                      type="button"
                                      disabled={!canAdd}
                                      onClick={() => handleQuickAdd(item.key, step, item.remaining)}
                                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed rounded text-[10px] font-bold active:scale-95 transition-all cursor-pointer"
                                    >
                                      +{step}
                                    </button>
                                  );
                                })}

                                {item.remaining > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleFillPart(item.key, item.remaining)}
                                    className="px-2 py-0.5 rounded text-[10px] font-black active:scale-95 transition-all cursor-pointer shrink-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    title={`Set to maximum remaining (${item.remaining})`}
                                  >
                                    Max
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 4: Live Earnings Calculator Card (Compact) */}
            <div
              className={`p-2.5 sm:p-3 rounded-xl border transition-all space-y-1.5 ${
                inputQty > 0
                  ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border-emerald-300 shadow-2xs'
                  : 'bg-slate-50/60 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                      inputQty > 0
                        ? 'bg-emerald-600 text-white shadow-emerald-200'
                        : 'bg-slate-200/80 text-slate-500'
                    }`}
                  >
                    <IndianRupee className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">
                      Today's Estimated Payout
                    </span>
                    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                      <span
                        className={`text-sm sm:text-base font-black tracking-tight whitespace-nowrap ${
                          inputQty > 0 ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {inputQty > 0 ? `+₹${Math.round(estimatedEarnings).toLocaleString('en-IN')}` : '₹0'}
                      </span>
                      {inputQty > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600/90 whitespace-nowrap">
                          for {inputQty} PCs
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {inputQty > 0 ? (
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs inline-block whitespace-nowrap">
                      Ready to Submit
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                    0 PCs
                  </span>
                )}
              </div>

              {/* Itemized Calculation breakdown when inputQty > 0 */}
              {inputQty > 0 && (
                <div className="pt-1.5 border-t border-emerald-100 flex items-center justify-between text-[10px] text-emerald-900 font-semibold gap-2">
                  <span className="truncate">
                    {dynamicPiecesList
                      .filter((item) => getCount(item.key) > 0)
                      .map((item) => `${getCount(item.key)} ${item.label} @ ₹${item.rate}`)
                      .join(' + ')}
                  </span>
                  <span className="font-extrabold text-emerald-800 shrink-0 whitespace-nowrap">
                    = ₹{Math.round(estimatedEarnings).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* SECTION 5: Physical Handover Notice (Compact) */}
            <div className="p-2 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-1.5 text-xs text-amber-900">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="text-[10px] leading-snug">
                Hand over these {inputQty > 0 ? <strong className="text-amber-950 font-bold">{inputQty} stitched PCs</strong> : 'stitched PCs'} to{' '}
                <strong className="text-amber-950 font-bold">Master {assignment.masterName || 'Cutting Master'}</strong> in Cutting Dept.
              </span>
            </div>

            {/* SECTION 6: Notes (Optional - Compact) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                <span>Work Notes (Optional)</span>
              </label>
              <input
                type="text"
                placeholder={`e.g. Bundle of ${inputQty || 50} PCs completed`}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-semibold"
              />
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-white/95 backdrop-blur-xs flex items-center gap-2 flex-shrink-0 shadow-lg">
            <button
              type="button"
              onClick={onClose}
              className="w-20 sm:w-24 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold active:scale-95 transition-all cursor-pointer shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                inputQty <= 0 ||
                !hasAnyRemaining ||
                dynamicPiecesList.some((item) => getCount(item.key) > item.remaining)
              }
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0 ${
                !isSubmitting &&
                inputQty > 0 &&
                hasAnyRemaining &&
                !dynamicPiecesList.some((item) => getCount(item.key) > item.remaining)
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Submitting to Master...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4 shrink-0" />
                  <span className="font-black whitespace-nowrap">
                    {inputQty > 0 ? `Submit ${inputQty} PCs` : 'Submit Stitched PCs'}
                  </span>
                  {inputQty > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-700/90 text-white text-[10px] sm:text-xs font-black shrink-0 shadow-2xs whitespace-nowrap">
                      +₹{Math.round(estimatedEarnings).toLocaleString('en-IN')}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
