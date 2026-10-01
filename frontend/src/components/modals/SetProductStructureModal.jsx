import React, { useState, useRef } from 'react';
import {
  X,
  Scissors,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  BookmarkPlus,
  FolderOpen,
} from 'lucide-react';
import { useFabric } from '../../context/useManagement';
import { useAuth } from '../../context/useAuth';
import AlertModal from './AlertModal';
import { sanitizeDecimal, sanitizeInteger, blockInvalidNumberKeys } from '../../utils/formValidation';
import { generateEntityId } from '../../utils/idGenerator';
import CustomSelect from '../common/CustomSelect';

function normalizeComponents(components, partId = '') {
  if (Array.isArray(components)) {
    return components.map((c, i) => ({
      id: c.id || (c.name ? c.name.toLowerCase().replace(/\s+/g, '_') : `comp_${i + 1}`),
      name: c.name || `Component ${i + 1}`,
      qty: parseInt(c.qty, 10) || 1,
    }));
  }

  if (components && typeof components === 'object') {
    const entries = Object.entries(components);
    if (entries.length === 1 && (entries[0][0] === partId || entries[0][0] === 'piece')) {
      return [];
    }
    return entries.map(([key, qty]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      qty: parseInt(qty, 10) || 1,
    }));
  }

  return [];
}

function computeRecipeLabel(components, partName) {
  if (!components || components.length === 0) {
    return `1 ${partName || 'PC'}`;
  }
  const validComps = components.filter((c) => c && c.name && c.name.trim());
  if (validComps.length === 0) {
    return `1 ${partName || 'PC'}`;
  }
  return validComps
    .map((c) => `${c.qty || 1} ${c.name.trim()}${parseInt(c.qty, 10) > 1 ? 's' : ''}`)
    .join(' + ');
}

function getInitialSubParts(fabric) {
  if (fabric?.productStructure?.subParts && Array.isArray(fabric.productStructure.subParts) && fabric.productStructure.subParts.length > 0) {
    return fabric.productStructure.subParts.map((sp) => {
      const comps = normalizeComponents(sp.components, sp.id);
      return {
        id: sp.id || (sp.name ? sp.name.toLowerCase().replace(/\s+/g, '_') : 'part'),
        name: sp.name || '',
        rate: sp.rate !== undefined && sp.rate !== null && sp.rate !== '' ? String(sp.rate) : '',
        recipeLabel: sp.recipeLabel || computeRecipeLabel(comps, sp.name),
        components: comps,
      };
    });
  }

  // If fabric has existing tailorRates, load those keys dynamically
  if (fabric?.tailorRates && typeof fabric.tailorRates === 'object') {
    const rateEntries = Object.entries(fabric.tailorRates).filter(
      ([k, v]) => v !== undefined && v !== null && k !== 'total' && typeof v !== 'object'
    );
    if (rateEntries.length > 0) {
      return rateEntries.map(([key, rate]) => ({
        id: key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        rate: rate !== undefined && rate !== null && rate !== '' ? String(rate) : '',
        recipeLabel: `1 ${key.charAt(0).toUpperCase() + key.slice(1)} `,
        components: [],
      }));
    }
  }

  // Unconfigured fabric starts with an empty sub-parts list
  return [];
}

export default function SetProductStructureModal({
  isOpen,
  onClose,
  fabric,
  onSaved,
}) {
  const { currentUser } = useAuth();
  const isMaster = currentUser?.role === 'Master';

  const {
    updateFabric,
    productTemplates = [],
    saveProductTemplate,
  } = useFabric();

  const [productName, setProductName] = useState(
    () => fabric?.productName || fabric?.productStructure?.productName || ''
  );

  const [subParts, setSubParts] = useState(() => getInitialSubParts(fabric));

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState(
    () => fabric?.productName || ''
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const partCounterRef = useRef(subParts.length + 1);

  // Defense in depth: NEVER expose stitching rates or product structure editing to Master users
  if (!isOpen || !fabric || isMaster) return null;

  // Calculate live Full Set Garment Rate
  const fullSetRate = subParts.reduce(
    (acc, sp) => acc + (parseFloat(sp.rate) || 0),
    0
  );
  const roundedFullSetRate = Math.round(fullSetRate * 100) / 100;

  // Handle template selection
  const handleSelectTemplate = (tmplId) => {
    setSelectedTemplateId(tmplId);
    if (!tmplId) return;

    const tmpl = productTemplates.find((t) => t.id === tmplId);
    if (tmpl) {
      setProductName(tmpl.productName || tmpl.name);
      setTemplateName(tmpl.name);
      if (Array.isArray(tmpl.subParts) && tmpl.subParts.length > 0) {
        setSubParts(
          tmpl.subParts.map((sp) => {
            const comps = normalizeComponents(sp.components, sp.id);
            return {
              id: sp.id || (sp.name ? sp.name.toLowerCase().replace(/\s+/g, '_') : 'part'),
              name: sp.name || 'Part',
              rate: String(sp.rate !== undefined ? sp.rate : 0),
              recipeLabel: sp.recipeLabel || computeRecipeLabel(comps, sp.name),
              components: comps,
            };
          })
        );
      }
    }
  };

  // Add blank custom sub-part (defaults to direct single piece without predefined values)
  const handleAddCustomSubPart = () => {
    partCounterRef.current += 1;
    setSubParts([
      ...subParts,
      {
        id: `custom_part_${partCounterRef.current}`,
        name: '',
        rate: '',
        recipeLabel: '',
        components: [],
      },
    ]);
  };

  // Update a sub-part field
  const handleUpdateSubPart = (index, field, value) => {
    setSubParts((prev) =>
      prev.map((sp, idx) => {
        if (idx !== index) return sp;
        const updated = { ...sp, [field]: value };
        if (field === 'name') {
          updated.recipeLabel = computeRecipeLabel(updated.components, value);
        }
        return updated;
      })
    );
  };

  // Add a cut piece to a sub-part
  const handleAddCutPiece = (subPartIndex) => {
    partCounterRef.current += 1;
    setSubParts((prev) =>
      prev.map((sp, idx) => {
        if (idx !== subPartIndex) return sp;
        const currentComps = sp.components || [];
        const newComp = {
          id: generateEntityId('cut'),
          name: '',
          qty: '',
        };
        const updatedComps = [...currentComps, newComp];
        return {
          ...sp,
          components: updatedComps,
          recipeLabel: computeRecipeLabel(updatedComps, sp.name),
        };
      })
    );
  };

  // Update a cut piece
  const handleUpdateCutPiece = (subPartIndex, compIndex, field, value) => {
    setSubParts((prev) =>
      prev.map((sp, idx) => {
        if (idx !== subPartIndex) return sp;
        const updatedComps = (sp.components || []).map((c, cIdx) =>
          cIdx === compIndex ? { ...c, [field]: value } : c
        );
        return {
          ...sp,
          components: updatedComps,
          recipeLabel: computeRecipeLabel(updatedComps, sp.name),
        };
      })
    );
  };

  // Remove a cut piece (if all removed, becomes direct piece)
  const handleRemoveCutPiece = (subPartIndex, compIndex) => {
    setSubParts((prev) =>
      prev.map((sp, idx) => {
        if (idx !== subPartIndex) return sp;
        const updatedComps = (sp.components || []).filter((_, cIdx) => cIdx !== compIndex);
        return {
          ...sp,
          components: updatedComps,
          recipeLabel: computeRecipeLabel(updatedComps, sp.name),
        };
      })
    );
  };

  // Remove a sub-part
  const handleRemoveSubPart = (index) => {
    setSubParts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);

    const prodName = productName.trim();
    if (!prodName) {
      setAlertModal({
        isOpen: true,
        title: 'Product Name Required',
        message: 'Please specify the target Garment Product Name (e.g. Kurti, Salwar Suit, Gown).',
        type: 'warning',
      });
      return;
    }

    if (subParts.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Garment PCs Required',
        message: 'Please add at least one garment PC (e.g. Top, Bottom) with a tailor stitching rate.',
        type: 'warning',
      });
      return;
    }

    const hasEmptyName = subParts.some((sp) => !sp.name.trim());
    if (hasEmptyName) {
      setAlertModal({
        isOpen: true,
        title: 'PC Name Required',
        message: 'Please enter a name for each added PC (e.g. Top, Bottom).',
        type: 'warning',
      });
      return;
    }

    const hasAnyPositiveRate = subParts.some(
      (sp) => parseFloat(sp.rate) > 0
    );
    if (!hasAnyPositiveRate) {
      setAlertModal({
        isOpen: true,
        title: 'Stitching Rates Required',
        message: 'Please enter a tailor stitching rate greater than ₹0 for at least one PC.',
        type: 'warning',
      });
      return;
    }

    // Validate Cut PC rows if any sub-part has Cut PCs added
    for (let i = 0; i < subParts.length; i++) {
      const sp = subParts[i];
      const spDisplayName = sp.name?.trim() || `PC ${i + 1}`;
      if (Array.isArray(sp.components) && sp.components.length > 0) {
        for (let cIdx = 0; cIdx < sp.components.length; cIdx++) {
          const comp = sp.components[cIdx];
          const hasName = Boolean(comp?.name && comp.name.trim());
          const qtyNum = parseInt(comp?.qty, 10);
          const hasValidQty = !isNaN(qtyNum) && qtyNum > 0;

          if (!hasName && !hasValidQty) {
            setAlertModal({
              isOpen: true,
              title: 'Cut PC Details Required',
              message: `Please fill in all Cut PC rows for "${spDisplayName}". Row ${cIdx + 1} is empty — please enter the Cut PC name (e.g. Front, Back) and quantity. If this row is not needed, please remove it using the trash icon.`,
              type: 'warning',
            });
            return;
          }

          if (!hasName) {
            setAlertModal({
              isOpen: true,
              title: 'Cut PC Name Required',
              message: `Please enter a Cut PC name for row ${cIdx + 1} in "${spDisplayName}" (e.g. Front, Back, Sleeve). If this row is not needed, please remove it using the trash icon.`,
              type: 'warning',
            });
            return;
          }

          if (!hasValidQty) {
            setAlertModal({
              isOpen: true,
              title: 'Cut PC Quantity Required',
              message: `Please enter a valid quantity of at least 1 for "${comp.name?.trim() || `Row ${cIdx + 1}`}" in "${spDisplayName}". If this row is not needed, please remove it using the trash icon.`,
              type: 'warning',
            });
            return;
          }
        }
      }
    }

    const cleanSubParts = subParts.map((sp, idx) => {
      const spName = sp.name.trim() || `Part ${idx + 1}`;
      const cleanComps = Array.isArray(sp.components) && sp.components.length > 0
        ? sp.components.map((c, cIdx) => ({
            id: (c.id || c.name || `comp_${cIdx + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
            name: c.name.trim(),
            qty: parseInt(c.qty, 10) || 1,
          }))
        : [];
      const derivedId = spName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const finalId = (!sp.id || sp.id.startsWith('custom_part_'))
        ? (derivedId || `part_${idx + 1}`)
        : sp.id.toLowerCase().replace(/\s+/g, '_');
      return {
        id: finalId,
        name: spName,
        rate: parseFloat(sp.rate) || 0,
        recipeLabel: computeRecipeLabel(cleanComps, spName),
        components: cleanComps,
      };
    });

    // Build tailor rates object
    const tailorRates = {
      ...(fabric.tailorRates || {}),
    };
    cleanSubParts.forEach((sp) => {
      tailorRates[sp.id] = sp.rate;
    });

    const productStructurePayload = {
      productName: prodName,
      fullSetRate: roundedFullSetRate,
      subParts: cleanSubParts,
    };

    // Save as template if checked
    if (saveAsTemplate) {
      const finalTemplateName = (templateName || prodName).trim();
      saveProductTemplate({
        name: finalTemplateName,
        productName: prodName,
        fullSetRate: roundedFullSetRate,
        subParts: cleanSubParts,
        isDefault: false,
      });
    }

    const payload = {
      productName: prodName,
      productStructure: productStructurePayload,
      tailorRates,
    };

    updateFabric(fabric.id, payload);
    if (onSaved) {
      onSaved(payload);
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div
          className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom sm:zoom-in-95 text-left"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/90 via-purple-50/40 to-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
                <Scissors className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Product Design & Piece Rates
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  Define garment components & stitching payout per piece
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form with Flex Layout for 100% Sticky Bottom Footer */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Scrollable Inner Body */}
            <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">
              {/* Linked Fabric Lot Badge */}
              <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-slate-900 truncate block">
                    {fabric.fabricType || 'Fabric Lot'}{fabric.color ? ` • ${fabric.color}` : ''}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate block">
                    {fabric.supplierName ? `${fabric.supplierName} • ` : ''}
                    {fabric.plainMeters ? `${fabric.plainMeters}m ` : ''}
                    {fabric.printPieces ? `${fabric.printPieces} Sets Target` : ''}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 shrink-0">
                  {fabric.status || 'Active'}
                </span>
              </div>

              {/* Target Product Name with Template Action */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider shrink-0">
                    Product Name *
                  </label>

                  {/* Template selector */}
                  {productTemplates.length > 0 ? (
                    <div className="flex items-center gap-1 w-full sm:w-auto">
                      <CustomSelect
                        value={selectedTemplateId}
                        onChange={(val) => handleSelectTemplate(val)}
                        options={productTemplates.map((tmpl) => ({
                          value: tmpl.id,
                          badge: `₹${tmpl.fullSetRate || 0}/Set`,
                          label: tmpl.name,
                          subLabel: `${tmpl.subParts?.length || 0} Sub-Parts`,
                        }))}
                        placeholder={`Load Template (${productTemplates.length})`}
                        theme="indigo"
                        className="w-full sm:min-w-[200px]"
                      />
                      {selectedTemplateId && (
                        <button
                          type="button"
                          onClick={() => setSelectedTemplateId('')}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="Clear template"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg select-none"
                    >
                      <FolderOpen className="w-3 h-3 text-slate-300" />
                      <span>0 Templates Saved</span>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Kurti, 2-Piece Suit, Gown, Shirt"
                  className="w-full px-3 py-2 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:font-normal placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Section: Set Breakdown into PCs & Tailor Rates */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="min-w-0">
                    <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                      Garment Pieces & Rates
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-extrabold rounded-lg border border-emerald-200 text-xs shadow-2xs inline-flex items-center gap-1"
                      title={`Full set tailor payout across ${subParts.length} PC${subParts.length !== 1 ? 's' : ''}`}
                    >
                      <span>₹{roundedFullSetRate} / Set</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleAddCustomSubPart}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-all border border-indigo-200 cursor-pointer shadow-2xs active:scale-95 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add PC</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Part Rows */}
                <div className="space-y-2">
                  {subParts.length === 0 ? (
                    <div className="p-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 text-center space-y-1.5">
                      <Sparkles className="w-5 h-5 text-indigo-500 mx-auto" />
                      <div className="text-xs font-bold text-indigo-950">No Pieces Added</div>
                      <p className="text-[11px] text-slate-600 max-w-xs mx-auto">
                        Click <strong>Add PC</strong> above to configure pieces (e.g. Top, Bottom).
                      </p>
                    </div>
                  ) : (
                    subParts.map((part, index) => (
                      <div
                        key={part.id || index}
                        className="p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-indigo-300 hover:bg-white transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              value={part.name}
                              onChange={(e) => handleUpdateSubPart(index, 'name', e.target.value)}
                              placeholder="Piece name (e.g. Top, Bottom)"
                              className="w-full px-2.5 py-1.5 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                              required
                            />
                          </div>

                          {/* Tailor Rate Input */}
                          <div className="w-28 shrink-0">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                ₹
                              </span>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10000"
                                placeholder="0.00"
                                value={part.rate}
                                onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: true })}
                                onChange={(e) => {
                                  const sanitized = sanitizeDecimal(e.target.value, { min: 0, max: 10000, maxDecimals: 2 });
                                  handleUpdateSubPart(index, 'rate', sanitized);
                                }}
                                className="w-full pl-6 pr-8 py-1.5 bg-emerald-50/60 focus:bg-white border border-emerald-200 focus:border-emerald-500 rounded-lg text-xs font-black text-emerald-800 focus:outline-none text-right"
                                required
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                                /PC
                              </span>
                            </div>
                          </div>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveSubPart(index)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                            title="Remove Piece"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Cut Breakdown or Direct */}
                        <div className="pt-1.5 border-t border-slate-100">
                          {part.components && part.components.length > 0 ? (
                            <div className="space-y-1.5 bg-purple-50/40 p-2 rounded-lg border border-purple-100/70">
                              <div className="flex items-center justify-between text-[10px] font-bold text-purple-900">
                                <span>Master Cut Breakdown ({part.name || 'Piece'}):</span>
                                <button
                                  type="button"
                                  onClick={() => handleAddCutPiece(index)}
                                  className="text-purple-700 hover:text-purple-900 flex items-center gap-0.5 cursor-pointer font-extrabold"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>Cut PC</span>
                                </button>
                              </div>
                              {part.components.map((comp, cIdx) => {
                                const isNameEmpty = !comp.name || !comp.name.trim();
                                const qNum = parseInt(comp.qty, 10);
                                const isQtyInvalid = isNaN(qNum) || qNum <= 0;

                                return (
                                  <div key={comp.id || cIdx} className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={comp.name}
                                      onChange={(e) =>
                                        handleUpdateCutPiece(index, cIdx, 'name', e.target.value)
                                      }
                                      placeholder="Cut part (e.g. Front, Back, Sleeve)"
                                      className={`flex-1 px-2 py-1 bg-white border rounded text-[11px] font-semibold text-slate-800 focus:outline-none transition-colors ${
                                        isSubmitted && isNameEmpty
                                          ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                                          : 'border-purple-200 focus:border-purple-400'
                                      }`}
                                      required
                                    />
                                    <div
                                      className={`flex items-center gap-1 bg-white border rounded px-1.5 py-0.5 shrink-0 transition-colors ${
                                        isSubmitted && isQtyInvalid
                                          ? 'border-rose-400 bg-rose-50/40'
                                          : 'border-purple-200 focus-within:border-purple-400'
                                      }`}
                                    >
                                      <span
                                        className={`text-[9px] font-bold ${
                                          isSubmitted && isQtyInvalid ? 'text-rose-500' : 'text-slate-400'
                                        }`}
                                      >
                                        Qty
                                      </span>
                                      <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        placeholder="1"
                                        value={comp.qty !== undefined && comp.qty !== null ? comp.qty : ''}
                                        onKeyDown={(e) => blockInvalidNumberKeys(e, { allowDecimals: false })}
                                        onChange={(e) => {
                                          const valStr = e.target.value;
                                          if (valStr === '') {
                                            handleUpdateCutPiece(index, cIdx, 'qty', '');
                                            return;
                                          }
                                          const sanitized = sanitizeInteger(valStr, { min: 1, max: 50 });
                                          handleUpdateCutPiece(index, cIdx, 'qty', sanitized === '' ? '' : parseInt(sanitized, 10));
                                        }}
                                        className="w-7 text-center text-[11px] font-black text-purple-900 focus:outline-none"
                                        required
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCutPiece(index, cIdx)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors shrink-0 cursor-pointer"
                                      title="Remove Cut PC"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-[10px] text-slate-500 py-0.5">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>1 Direct Cut Piece</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddCutPiece(index)}
                                className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 transition-all flex items-center gap-0.5 cursor-pointer"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Add Cut Breakdown</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Save Structure as Template */}
              <div className="p-3 rounded-xl border border-slate-200 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Save structure as reusable template</span>
                  </span>
                </label>

                {saveAsTemplate && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template Name (e.g. 2-Piece Kurti Set)"
                      className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none shadow-2xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 100% STICKY BOTTOM FOOTER (Mobile Touch Friendly) */}
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2 sm:justify-end flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs font-bold text-white shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Product Design</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
}
