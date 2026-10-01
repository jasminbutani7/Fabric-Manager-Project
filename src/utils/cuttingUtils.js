/**
 * Resolves a piece / part ID (e.g. 'custom_part_2', 't_sirt', 'front') into a human-readable display label
 * using product structure metadata if available.
 */
export const resolvePieceLabel = (key, productStructure) => {
  if (!key) return '';

  const subParts = productStructure?.subParts || productStructure?.parts || [];

  // 1. Match key directly with subPart ID or component ID
  if (Array.isArray(subParts) && subParts.length > 0) {
    for (const sp of subParts) {
      if (sp.id === key) return sp.name;
      if (Array.isArray(sp.components)) {
        for (const c of sp.components) {
          if (c.id === key) return c.name;
        }
      }
    }
  }

  // 2. If key is like custom_part_1, custom_part_2, etc., match by order (1-indexed) or fallback to name
  if (typeof key === 'string' && key.startsWith('custom_part_')) {
    const match = key.match(/custom_part_(\d+)/i);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (Array.isArray(subParts) && subParts[idx]?.name) {
        return subParts[idx].name;
      }
    }
  }

  // 3. Fallback: replace underscores/dashes with spaces and capitalize
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Normalizes a cutPieces object by collapsing duplicate case-insensitive keys.
 */
export const normalizeCutPiecesObject = (rawCutPieces) => {
  if (!rawCutPieces || typeof rawCutPieces !== 'object') return {};
  const normalized = {};
  Object.entries(rawCutPieces).forEach(([key, val]) => {
    const numVal = Math.max(0, parseInt(val, 10) || 0);
    const existingKey = Object.keys(normalized).find(
      (k) => k.toLowerCase() === key.toLowerCase()
    );
    if (existingKey) {
      normalized[existingKey] = Math.max(normalized[existingKey], numVal);
    } else {
      normalized[key] = numVal;
    }
  });
  return normalized;
};

/**
 * Looks up the piece count for a component name/ID from rawPieces, checking aliases, slugified names, and positions.
 */
export const getPieceValueFromObject = (rawPieces, name, id = null, index = -1) => {
  if (!rawPieces || typeof rawPieces !== 'object') return 0;

  const candidateKeys = new Set();
  if (name) {
    candidateKeys.add(name);
    candidateKeys.add(name.toLowerCase());
    candidateKeys.add(name.toLowerCase().replace(/\s+/g, '_'));
    candidateKeys.add(name.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }
  if (id) {
    candidateKeys.add(id);
    candidateKeys.add(id.toLowerCase());
    candidateKeys.add(id.toLowerCase().replace(/\s+/g, '_'));
    candidateKeys.add(id.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }

  let maxVal = 0;
  let matched = false;

  Object.entries(rawPieces).forEach(([k, v]) => {
    const numVal = Math.max(0, parseInt(v, 10) || 0);
    const kLower = k.toLowerCase().replace(/\s+/g, '_');
    const kPlain = k.toLowerCase();
    const kAlpha = k.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const cand of candidateKeys) {
      const candLower = cand.toLowerCase().replace(/\s+/g, '_');
      const candAlpha = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (
        k === cand ||
        kPlain === cand.toLowerCase() ||
        kLower === candLower ||
        (kAlpha && candAlpha && kAlpha === candAlpha)
      ) {
        maxVal = Math.max(maxVal, numVal);
        matched = true;
      }
    }
  });

  if (matched) return maxVal;

  // Positional fallback ONLY for legacy records where rawPieces keys are numeric indices (e.g. '0', '1')
  const rawEntries = Object.entries(rawPieces);
  const rawKeys = Object.keys(rawPieces);
  const isNumericKeys =
    rawKeys.length > 0 &&
    rawKeys.every((k) => !isNaN(parseInt(k, 10)) && String(parseInt(k, 10)) === String(k));

  if (isNumericKeys && index !== undefined && index >= 0 && index < rawEntries.length) {
    return Math.max(0, parseInt(rawEntries[index][1], 10) || 0);
  }

  return 0;
};

/**
 * Returns a clean, deduplicated list of cut piece objects { key, label, val } to display for a cutting batch.
 * Respects product design subParts if defined, avoiding hardcoded zeroes or duplicate cards.
 */
export const getNormalizedCutPiecesList = (cutting, fabric) => {
  if (!cutting) return [];
  const struct = cutting.productStructure || fabric?.productStructure;
  const rawPieces = normalizeCutPiecesObject(cutting.cutPieces || {});

  const subParts = struct?.subParts || [];
  const definedPieces = [];

  if (subParts.length > 0) {
    subParts.forEach((sp) => {
      const spId = sp.id || (sp.name ? sp.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : '');
      if (Array.isArray(sp.components) && sp.components.length > 0) {
        sp.components.forEach((comp) => {
          if (comp.name) {
            const compId = comp.id || comp.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            definedPieces.push({ name: comp.name, id: compId, spId });
          }
        });
      } else if (sp.name) {
        definedPieces.push({ name: sp.name, id: spId, spId });
      }
    });
  }

  const labelMap = new Map();

  if (definedPieces.length > 0) {
    definedPieces.forEach((pieceObj, idx) => {
      const label = resolvePieceLabel(pieceObj.name, struct).toUpperCase();
      const val = getPieceValueFromObject(rawPieces, pieceObj.name, pieceObj.id, idx);

      if (!labelMap.has(label)) {
        labelMap.set(label, { key: pieceObj.name, id: pieceObj.id, spId: pieceObj.spId, label, val });
      }
    });
  } else {
    // If no defined subParts, iterate rawPieces and filter out zero values unless all are zero
    Object.entries(rawPieces).forEach(([k, v]) => {
      const val = parseInt(v, 10) || 0;
      const label = resolvePieceLabel(k, struct).toUpperCase();
      if (!labelMap.has(label)) {
        labelMap.set(label, { key: k, id: k, spId: null, label, val });
      } else {
        const existing = labelMap.get(label);
        if (val > existing.val) {
          existing.val = val;
        }
      }
    });
  }

  return Array.from(labelMap.values());
};

/**
 * Returns dynamic piece conversion formula string (e.g. "1 PC = 1 Front Cut PC + 1 Back Cut PC") based on product structure.
 */
export const getGarmentPieceFormula = (struct, targetSubPart = null) => {
  const subParts = struct?.subParts || [];
  if (Array.isArray(subParts) && subParts.length > 0) {
    let filtered = subParts;
    if (targetSubPart) {
      const normTarget = String(targetSubPart).toLowerCase();
      filtered = subParts.filter(
        (sp) =>
          sp.id?.toLowerCase() === normTarget ||
          sp.name?.toLowerCase() === normTarget
      );
      if (filtered.length === 0) filtered = subParts;
    }
    const formulas = filtered
      .filter((sp) => Array.isArray(sp.components) && sp.components.length > 1)
      .map((sp) => {
        const compsText = sp.components
          .map((comp) => `${parseInt(comp.qty, 10) || 1} ${comp.name || 'Piece'} Cut PC${(parseInt(comp.qty, 10) || 1) > 1 ? 's' : ''}`)
          .join(' + ');
        return `1 ${sp.name || 'PC'} = ${compsText}`;
      });
    return formulas.join(' • ');
  }

  const parts = struct?.parts || [];
  if (Array.isArray(parts) && parts.length > 1) {
    const partsText = parts.map((p) => {
      const qty = parseInt(p.qty, 10) || 1;
      const name = p.name || resolvePieceLabel(p.id || p.key, struct);
      return `${qty} ${name} PC${qty > 1 ? 's' : ''}`;
    });
    return `1 Set = ${partsText.join(' + ')}`;
  }

  return '';
};

export const getGarmentPscFormula = getGarmentPieceFormula;

/**
 * Calculates total cut pieces for a cutting batch from normalized piece entries.
 */
export const getCuttingTotalPieces = (cutting, fabric) => {
  if (!cutting) return 0;
  const list = getNormalizedCutPiecesList(cutting, fabric);
  if (list && list.length > 0) {
    const sum = list.reduce((acc, item) => acc + (parseInt(item.val, 10) || 0), 0);
    if (sum > 0) return sum;
  }
  return parseInt(cutting.totalPieces, 10) || 0;
};

/**
 * Case-insensitively resolves the tailor rate for a piece or subpart
 * looking across assignment, cutting, fabric, productStructure, and fallbacks.
 */
export const resolvePieceRate = (pieceKey, pieceLabel, assignment, cutting, fabric, struct = null) => {
  const normKey = (pieceKey || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const normLabel = (pieceLabel || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

  const rateMaps = [
    assignment?.subPartRates,
    assignment?.tailorRates,
    cutting?.tailorRates,
    fabric?.tailorRates,
  ];

  for (const map of rateMaps) {
    if (map && typeof map === 'object') {
      for (const [k, v] of Object.entries(map)) {
        const val = parseFloat(v);
        if (!isNaN(val) && val > 0) {
          const kNorm = k.toLowerCase().replace(/[^a-z0-9]+/g, '');
          if (
            k === pieceKey ||
            k === pieceLabel ||
            kNorm === normKey ||
            kNorm === normLabel ||
            (normKey && (normKey.includes(kNorm) || kNorm.includes(normKey))) ||
            (normLabel && (normLabel.includes(kNorm) || kNorm.includes(normLabel)))
          ) {
            return val;
          }
        }
      }
    }
  }

  // Check struct subParts rates
  const effectiveStruct = struct || assignment?.productStructure || cutting?.productStructure || fabric?.productStructure;
  const subParts = effectiveStruct?.subParts || [];
  if (Array.isArray(subParts)) {
    for (const sp of subParts) {
      const spVal = parseFloat(sp.rate);
      if (!isNaN(spVal) && spVal > 0) {
        const spIdNorm = (sp.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
        const spNameNorm = (sp.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
        if (
          spIdNorm === normKey ||
          spNameNorm === normKey ||
          spIdNorm === normLabel ||
          spNameNorm === normLabel
        ) {
          return spVal;
        }
        if (Array.isArray(sp.components)) {
          for (const comp of sp.components) {
            const compIdNorm = (comp.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
            const compNameNorm = (comp.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
            if (
              compIdNorm === normKey ||
              compNameNorm === normKey ||
              compIdNorm === normLabel ||
              compNameNorm === normLabel
            ) {
              return spVal;
            }
          }
        }
      }
    }
  }

  // Global single rate fallbacks
  const singleRate =
    parseFloat(assignment?.ratePerPiece) ||
    parseFloat(fabric?.pricePerPiece) ||
    parseFloat(fabric?.tailorRate) ||
    parseFloat(fabric?.stitchingRate) ||
    parseFloat(effectiveStruct?.fullSetRate) ||
    0;

  if (singleRate > 0) return singleRate;

  // Average of non-zero rates in rateMaps
  let sum = 0;
  let count = 0;
  for (const map of rateMaps) {
    if (map && typeof map === 'object') {
      for (const v of Object.values(map)) {
        const val = parseFloat(v);
        if (!isNaN(val) && val > 0) {
          sum += val;
          count++;
        }
      }
    }
  }

  if (count > 0) {
    return Math.round((sum / count) * 100) / 100;
  }

  return 0;
};

/**
 * Builds a sub-part display list for a tailor assignment.
 * Returns ONE entry per configured sub-part (e.g., TYU, BYU) with the assigned count
 * from `assignedSubParts`, so the UI shows deduplicated boxes.
 *
 * Each entry: { id, name, count, formula, rate }
 */
export const getAssignmentSubPartsList = (assignment, cutting, fabric) => {
  if (!assignment) return [];

  const sub = assignment.assignedSubParts || {};
  const rawPieces = assignment.assignedPieces || {};
  const struct =
    assignment.productStructure ||
    cutting?.productStructure ||
    fabric?.productStructure ||
    null;

  const subParts = struct?.subParts || [];

  if (subParts.length > 0) {
    const result = [];
    const seen = new Set();

    subParts.forEach((sp, idx) => {
      const spId =
        sp.id ||
        (sp.name
          ? sp.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
          : `custom_part_${idx + 1}`);
      const spName = sp.name || resolvePieceLabel(spId, struct) || `Part ${idx + 1}`;
      const normKey = (spId || spName).toLowerCase().replace(/[^a-z0-9]+/g, '');

      if (seen.has(normKey)) return;
      seen.add(normKey);

      // Look up count from sub object using multiple candidate keys
      let count =
        parseInt(sub[spId], 10) ||
        parseInt(sub[spName], 10) ||
        parseInt(sub[spName.toLowerCase()], 10) ||
        parseInt(sub[normKey], 10) ||
        parseInt(sub[`custom_part_${idx + 1}`], 10) ||
        parseInt(sub[`subpart_${idx}`], 10) ||
        parseInt(sub[`part_${idx + 1}`], 10) ||
        0;

      const comps = Array.isArray(sp.components) && sp.components.length > 0 ? sp.components : [];

      const componentList = [];
      if (comps.length > 0) {
        comps.forEach((c, cIdx) => {
          const compQty = parseInt(c.qty, 10) || 1;
          const compName = c.name || `Piece ${cIdx + 1}`;
          const valFromRaw = getPieceValueFromObject(rawPieces, compName, c.id);
          const pieceCount = valFromRaw > 0 ? valFromRaw : count * compQty;
          componentList.push({
            id: c.id || compName,
            name: compName,
            count: pieceCount,
            qty: compQty,
          });
        });
      } else {
        // Direct single piece sub-part
        const valFromRaw = getPieceValueFromObject(rawPieces, spName, spId, idx);
        const pieceCount = valFromRaw > 0 ? valFromRaw : count;
        componentList.push({
          id: spId,
          name: spName,
          count: pieceCount,
          qty: 1,
        });
      }

      if (count <= 0 && componentList.length > 0) {
        const minDerived = Math.min(
          ...componentList.map((c) => Math.floor((c.count || 0) / (c.qty || 1)))
        );
        if (minDerived > 0) {
          count = minDerived;
        }
      }

      const formula =
        comps.length > 1
          ? comps.map((c) => `${parseInt(c.qty, 10) || 1} ${c.name}`).join(' + ')
          : '';

      const rate = resolvePieceRate(spId, spName, assignment, cutting, fabric, struct);

      if (count > 0 || componentList.some((c) => c.count > 0)) {
        result.push({
          id: spId,
          name: spName,
          count,
          rate,
          formula,
          components: componentList,
        });
      }
    });

    if (result.length > 0) return result;
  }

  // Fallback: iterate assignedSubParts keys directly, strictly deduplicating
  const dynamicKeys = Object.keys(sub).filter(
    (k) => parseInt(sub[k], 10) > 0
  );

  if (dynamicKeys.length > 0) {
    const seen = new Set();
    const result = [];
    dynamicKeys.forEach((k) => {
      const normKey = k.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (seen.has(normKey)) return;
      seen.add(normKey);

      const cnt = parseInt(sub[k], 10) || 0;
      const rawLabel = resolvePieceLabel(k, struct) || k;
      const label = rawLabel.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const rate = resolvePieceRate(k, label, assignment, cutting, fabric, struct);

      result.push({
        id: k,
        name: label,
        count: cnt,
        rate,
        formula: '',
        components: [{ id: k, name: label, count: cnt, qty: 1 }],
      });
    });
    if (result.length > 0) return result;
  }

  return [];
};

/**
 * Returns ONE entry per configured sub-part for a cutting batch, containing
 * inner cut piece components (e.g. SLV + BODY inside TRY, BYU inside BYU),
 * matching the sub-part container design requested by user.
 */
export const getCuttingSubPartsList = (cutting, fabric, balance) => {
  if (!cutting) return [];
  const struct = cutting.productStructure || fabric?.productStructure;
  const rawPieces = normalizeCutPiecesObject(cutting.cutPieces || {});
  const remainingObj = balance?.remaining || {};

  const subParts = struct?.subParts || [];

  if (subParts.length > 0) {
    const result = [];
    subParts.forEach((sp, idx) => {
      const spId =
        sp.id ||
        (sp.name
          ? sp.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
          : `part_${idx + 1}`);
      const spName = sp.name || resolvePieceLabel(spId, struct) || `Part ${idx + 1}`;

      const comps = Array.isArray(sp.components) && sp.components.length > 0 ? sp.components : [];

      const componentList = [];
      if (comps.length > 0) {
        comps.forEach((c, cIdx) => {
          const compQty = parseInt(c.qty, 10) || 1;
          const compName = c.name || `Piece ${cIdx + 1}`;
          const compId = c.id || compName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          const valFromRaw = getPieceValueFromObject(rawPieces, compName, compId, cIdx);

          let remVal = undefined;
          if (balance && remainingObj) {
            remVal = getPieceValueFromObject(remainingObj, compName, compId, cIdx);
          }

          componentList.push({
            id: compId,
            name: compName.toUpperCase(),
            count: valFromRaw,
            remaining: remVal,
            qty: compQty,
          });
        });
      } else {
        // Direct single piece sub-part (e.g. BYU)
        const valFromRaw = getPieceValueFromObject(rawPieces, spName, spId, idx);
        let remVal = undefined;
        if (balance && remainingObj) {
          remVal = getPieceValueFromObject(remainingObj, spName, spId, idx);
        }

        componentList.push({
          id: spId,
          name: spName.toUpperCase(),
          count: valFromRaw,
          remaining: remVal,
          qty: 1,
        });
      }

      // Calculate complete sub-part count from component piece values
      let subPartCount = 0;
      if (componentList.length > 0) {
        const minDerived = Math.min(
          ...componentList.map((c) => Math.floor((c.count || 0) / (c.qty || 1)))
        );
        if (minDerived > 0) {
          subPartCount = minDerived;
        }
      }

      // Compact formula e.g. "2 SLV + 1 BODY" or "1 BYU"
      const formula =
        comps.length > 1
          ? comps.map((c) => `${parseInt(c.qty, 10) || 1} ${c.name}`).join(' + ')
          : comps.length === 1
            ? `${parseInt(comps[0].qty, 10) || 1} ${comps[0].name}`
            : `1 ${spName}`;

      result.push({
        id: spId,
        name: spName,
        count: subPartCount,
        formula,
        components: componentList,
      });
    });

    if (result.length > 0) return result;
  }

  // Fallback if no struct subParts: fallback each normalized cut piece into a single sub-part container
  const normalizedList = getNormalizedCutPiecesList(cutting, fabric);
  return normalizedList.map(({ key, label, val }) => {
    let remVal = undefined;
    if (balance && remainingObj) {
      remVal = getPieceValueFromObject(remainingObj, key, key);
    }
    return {
      id: key,
      name: label,
      count: val,
      formula: `1 ${label}`,
      components: [
        {
          id: key,
          name: label,
          count: val,
          remaining: remVal,
          qty: 1,
        },
      ],
    };
  });
};

/**
 * Formats a piece or subpart name with singular/plural based on count.
 * E.g. ("Piece", 1) -> "Piece", ("Piece", 50) -> "Pieces"
 */
export const formatPieceName = (name, count = 1) => {
  if (!name) return Math.abs(count) === 1 ? 'PC' : 'PCs';
  let clean = String(name).trim();

  // Strip leading numbers e.g. "100 Pant" -> "Pant"
  clean = clean.replace(/^\d+\s*/, '').trim();
  if (!clean || clean.toLowerCase() === 'pcs' || clean.toLowerCase() === 'pc' || clean.toLowerCase() === 'piece' || clean.toLowerCase() === 'pieces') {
    return Math.abs(count) === 1 ? 'PC' : 'PCs';
  }

  const lower = clean.toLowerCase();

  if (lower === 'set' || lower === 'sets') {
    return Math.abs(count) === 1 ? 'Set' : 'Sets';
  }

  if (lower === 'cut pc' || lower === 'cut pcs' || lower === 'cut piece' || lower === 'cut pieces') {
    return Math.abs(count) === 1 ? 'Cut PC' : 'Cut PCs';
  }

  // Singularize if count is 1
  if (Math.abs(count) === 1) {
    if (lower.endsWith('pieces')) return `${clean.slice(0, -6).trim()} PC`;
    if (lower.endsWith('pcs')) return `${clean.slice(0, -3).trim()} PC`;
    if (lower.endsWith('ies') && lower.length > 3) return `${clean.slice(0, -3)}y`;
    if (lower.endsWith('es') && (lower.endsWith('ches') || lower.endsWith('shes') || lower.endsWith('xes'))) return clean.slice(0, -2);
    if (lower.endsWith('s') && !lower.endsWith('ss')) return clean.slice(0, -1);
    return clean;
  }

  // Pluralize if count != 1
  if (lower.endsWith('s')) return clean;
  if (lower.endsWith('ch') || lower.endsWith('sh') || lower.endsWith('x') || lower.endsWith('z')) return `${clean}es`;
  if (lower.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lower[lower.length - 2])) {
    return `${clean.slice(0, -1)}ies`;
  }
  return `${clean}s`;
};

/**
 * Returns the primary human-friendly piece name for a tailor assignment.
 * E.g. "Sets", "PCs", etc.
 */
export const getAssignmentPieceName = (a, count = 1, fabric = null) => {
  if (!a) return Math.abs(count) === 1 ? 'PC' : 'PCs';

  const struct = a.productStructure || fabric?.productStructure;
  const subParts = struct?.subParts || [];

  // 1. Check assignedSubParts (e.g. { [subPartId]: qty })
  const sub = a.assignedSubParts || a.assigned_sub_parts || {};
  const nonZeroSubKeys = Object.keys(sub).filter((k) => (parseInt(sub[k], 10) || 0) > 0);
  if (nonZeroSubKeys.length > 0) {
    const names = nonZeroSubKeys.map((k) => {
      const sp = subParts.find((s) => s.id === k || s.name?.toLowerCase() === k.toLowerCase());
      const rawName = sp?.name || resolvePieceLabel(k, struct) || k;
      return formatPieceName(rawName, count);
    });
    if (names.length === 1) return names[0];
    if (names.length > 1) return names.join(' & ');
  }

  // 2. Check assignedPieces object keys
  const pieces = a.assignedPieces || a.assigned_pieces;
  if (pieces && typeof pieces === 'object') {
    const nonZeroPieceKeys = Object.keys(pieces).filter((k) => (parseInt(pieces[k], 10) || 0) > 0);
    if (nonZeroPieceKeys.length > 0) {
      const names = nonZeroPieceKeys.map((k) => {
        const rawName = resolvePieceLabel(k, struct) || k;
        return formatPieceName(rawName, count);
      });
      if (names.length === 1) return names[0];
      if (names.length > 1) return names.join(' & ');
    }
  }

  // 3. Check pieceType on assignment
  const pt = a.pieceType || a.piece_type;
  if (pt && !pt.toLowerCase().includes('suit set') && pt.toLowerCase() !== 'pcs' && pt.toLowerCase() !== 'pc') {
    return formatPieceName(pt, count);
  }

  // 4. Check fabric / product name
  const prodName = fabric?.productName || a.productName;
  if (prodName && !prodName.toLowerCase().includes('suit set') && prodName.toLowerCase() !== 'pcs' && prodName.toLowerCase() !== 'pc') {
    return formatPieceName(prodName, count);
  }

  return Math.abs(count) === 1 ? 'PC' : 'PCs';
};

/**
 * Resolves the full work details for a tailor assignment (cut pieces, PSC target, earnings).
 * Accepts an optional `fabric` object for product structure context.
 */
export function resolveWorkDetails(assignment, fabricOrCutting = null, maybeFabric = null) {
  if (!assignment) return null;

  const cutting = (fabricOrCutting && (fabricOrCutting.cutPieces || fabricOrCutting.cut_pieces)) ? fabricOrCutting : null;
  const fabric = cutting ? maybeFabric : fabricOrCutting;

  const rawPieces = assignment.assignedPieces || assignment.assigned_pieces || assignment.assigned_cut_pieces || {};
  const sub = assignment.assignedSubParts || assignment.assigned_sub_parts || assignment.assigned_garment_pcs || {};

  // Derive productStructure from assignment or cutting or fabric
  const struct = assignment.productStructure || cutting?.productStructure || fabric?.productStructure || null;

  // ─── 1. Build piecesList dynamically ──────────────────────────────────────
  // Build a pseudo-cutting object so getNormalizedCutPiecesList can resolve labels
  const pseudoCutting = cutting ? { ...cutting, cutPieces: rawPieces } : {
    cutPieces: rawPieces,
    productStructure: struct,
  };
  const pseudoFabric = fabric || (struct ? { productStructure: struct } : null);

  let piecesList = [];
  let totalCutPieces = 0;

  const hasAnyPiece = Object.values(rawPieces).some((v) => parseInt(v, 10) > 0);

  if (hasAnyPiece) {
    // Use getNormalizedCutPiecesList to resolve labels and values from product structure
    const normList = getNormalizedCutPiecesList(pseudoCutting, pseudoFabric);

    if (normList.length > 0) {
      piecesList = normList
        .filter((item) => item.val > 0)
        .map((item) => ({
          id: item.key,
          name: item.label, // e.g. "F SIDE", "B SIDE", "LOWER" – exactly as configured
          count: item.val,
          label: `${item.val} pcs`,
        }));
    }

    // Fallback: if normList is empty or all zero, iterate rawPieces directly
    if (piecesList.length === 0) {
      Object.entries(rawPieces).forEach(([k, v]) => {
        const count = parseInt(v, 10) || 0;
        if (count > 0) {
          const label = resolvePieceLabel(k, struct);
          piecesList.push({ id: k, name: label, count, label: `${count} pcs` });
        }
      });
    }

    totalCutPieces = piecesList.reduce((acc, p) => acc + p.count, 0);
  }

  // If still empty (no assignedPieces), derive from sub-parts in submission
  if (piecesList.length === 0) {
    if (struct?.subParts?.length > 0) {
      struct.subParts.forEach((sp) => {
        const spId = sp.id || sp.name;
        const qty =
          parseInt(sub[spId], 10) ||
          parseInt(sub[sp.name?.toLowerCase()], 10) ||
          0;
        if (qty > 0 && Array.isArray(sp.components)) {
          sp.components.forEach((c) => {
            const compQty = (parseInt(c.qty, 10) || 1) * qty;
            piecesList.push({ id: c.name, name: c.name, count: compQty, label: `${compQty} pcs` });
          });
        }
      });
    }
    totalCutPieces = piecesList.reduce((acc, p) => acc + p.count, 0);
  }

  // Final fallback
  if (piecesList.length === 0) {
    const total = parseInt(assignment.totalAssignedPieces, 10) || 0;
    piecesList.push({ id: 'cut_pieces', name: 'Cut Pieces', count: total, label: `${total} pcs` });
    totalCutPieces = total;
  }

  // Sub-parts display list
  const subPartsList = getAssignmentSubPartsList(assignment, pseudoCutting, pseudoFabric);

  // ─── 2. PSC to make ────────────────────────────────────────────────────────
  const hasSubParts = subPartsList.length > 0 || Object.keys(sub || {}).some((k) => parseInt(sub[k], 10) > 0);
  let totalTargetPSC = 0;
  let pscDescription = '';
  let subPartsSummary = '';

  // Dynamic PSC formula: ONLY include formulas for sub-parts / pieces actually assigned to this tailor that require assembly
  let pscFormula = '';
  if (subPartsList.length > 0) {
    const multiCompFormulas = subPartsList
      .filter((sp) => Array.isArray(sp.components) && sp.components.length > 1)
      .map((sp) => {
        const compsText = sp.components
          .map((c) => `${parseInt(c.qty, 10) || 1} ${c.name || 'Piece'} Cut PC${(parseInt(c.qty, 10) || 1) > 1 ? 's' : ''}`)
          .join(' + ');
        return `1 ${sp.name || 'PC'} = ${compsText}`;
      });
    if (multiCompFormulas.length > 0) {
      pscFormula = multiCompFormulas.join(' • ');
    }
  } else if (piecesList.length > 1) {
    const assignedPiecesNames = piecesList.map((p) => p.name.toLowerCase());
    const matchedSubPart = struct?.subParts?.find(
      (sp) =>
        assignedPiecesNames.includes(sp.name.toLowerCase()) ||
        assignedPiecesNames.includes((sp.id || '').toLowerCase())
    );
    if (matchedSubPart && Array.isArray(matchedSubPart.components) && matchedSubPart.components.length > 1) {
      const compsText = matchedSubPart.components
        .map((c) => `${parseInt(c.qty, 10) || 1} ${c.name || 'Piece'} Cut PC${(parseInt(c.qty, 10) || 1) > 1 ? 's' : ''}`)
        .join(' + ');
      pscFormula = `1 ${matchedSubPart.name || 'PC'} = ${compsText}`;
    }
  }

  const adminPieceName = getAssignmentPieceName(assignment, 1, fabric);

  if (subPartsList.length > 0) {
    totalTargetPSC = subPartsList.reduce((acc, sp) => acc + (parseInt(sp.count, 10) || 0), 0);
    subPartsSummary = subPartsList.map((sp) => `${sp.count} ${sp.name} PC${sp.count > 1 ? 's' : ''}`).join(' + ');
    pscDescription = subPartsSummary || `${totalTargetPSC} ${formatPieceName(adminPieceName, totalTargetPSC)}`;
  } else {
    const explicitSets =
      parseInt(assignment.totalSets, 10) ||
      parseInt(fabric?.totalSets, 10) ||
      0;
    if (explicitSets > 0) {
      totalTargetPSC = explicitSets;
      pscDescription = `${explicitSets} Complete Sets`;
    } else if (piecesList.length > 0) {
      const garmentCounts = piecesList.map((p) => {
        let factor = p.ratio || p.multiplier;
        if (!factor && struct?.components) {
          const comp = struct.components.find((c) => c.name?.toLowerCase() === p.name?.toLowerCase() || c.id?.toLowerCase() === p.id?.toLowerCase());
          if (comp?.qty) factor = parseInt(comp.qty, 10);
        }
        if (!factor) {
          const isPair = p.name?.toLowerCase().includes('pair') || p.id?.toLowerCase().includes('pair');
          factor = isPair ? 2 : 1;
        }
        return Math.floor(p.count / (factor || 1));
      });
      totalTargetPSC = Math.min(...garmentCounts);
      pscDescription = `${totalTargetPSC} ${formatPieceName(adminPieceName, totalTargetPSC)}`;
    } else {
      totalTargetPSC = parseInt(assignment.totalAssignedPieces, 10) || totalCutPieces;
      pscDescription = `${totalTargetPSC} ${formatPieceName(adminPieceName, totalTargetPSC)}`;
    }
  }

  // ─── 3. Financial breakdown ────────────────────────────────────────────────
  const subRates = assignment.subPartRates || assignment.tailorRates || fabric?.tailorRates || {};
  const singleRate =
    parseFloat(assignment.ratePerPiece) ||
    parseFloat(fabric?.pricePerPiece) ||
    parseFloat(fabric?.tailorRate) ||
    0;

  let totalPayout = 0;
  const rateBreakdown = [];

  if (hasSubParts) {
    // Build rateBreakdown dynamically from subPartsList or sub-part IDs
    if (subPartsList.length > 0) {
      subPartsList.forEach((sp) => {
        let rate = parseFloat(sp.rate) || 0;
        if (rate <= 0) {
          rate =
            parseFloat(subRates[sp.id]) ||
            parseFloat(subRates[sp.name]) ||
            parseFloat(assignment.tailorRates?.[sp.id]) ||
            parseFloat(assignment.tailorRates?.[sp.name]) ||
            parseFloat(fabric?.tailorRates?.[sp.id]) ||
            parseFloat(fabric?.tailorRates?.[sp.name]) ||
            singleRate;
        }
        const payout = Math.round(sp.count * rate * 100) / 100;
        totalPayout += payout;
        rateBreakdown.push({ item: sp.name, count: sp.count, rate, total: payout });
      });
    } else {
      const allSubIds = Object.keys(sub).filter((k) => parseInt(sub[k], 10) > 0);
      allSubIds.forEach((spId) => {
        const count = parseInt(sub[spId], 10) || 0;
        if (count <= 0) return;
        let rate =
          parseFloat(subRates[spId]) ||
          parseFloat(assignment.tailorRates?.[spId]) ||
          parseFloat(fabric?.tailorRates?.[spId]);
        if (!rate) {
          const structSub = struct?.subParts?.find((s) => s.id === spId || s.name === spId);
          rate = parseFloat(structSub?.rate) || singleRate;
        }
        const itemLabel = resolvePieceLabel(spId, struct) || spId;
        const payout = Math.round(count * rate * 100) / 100;
        totalPayout += payout;
        rateBreakdown.push({ item: itemLabel, count, rate, total: payout });
      });
    }
  } else {
    totalPayout =
      parseFloat(assignment.totalJobAmount) ||
      Math.round(totalTargetPSC * singleRate * 100) / 100;

    const rawName = struct?.productName || assignment.productName || fabric?.productName;
    const dynamicItemName = adminPieceName || ((rawName && !rawName.toLowerCase().includes('suit set')) ? rawName : 'pcs');

    rateBreakdown.push({
      item: dynamicItemName,
      count: totalTargetPSC,
      rate: singleRate,
      total: totalPayout,
    });
  }

  if (parseFloat(assignment.totalJobAmount) > 0) {
    totalPayout = parseFloat(assignment.totalJobAmount);
  }

  return {
    piecesList,
    subPartsList,
    subPartsSummary,
    totalCutPieces,
    hasSubParts,
    totalTargetPSC,
    totalTargetPieces: totalTargetPSC,
    pscDescription,
    targetPiecesDescription: pscDescription,
    pscFormula,
    pieceFormula: pscFormula,
    totalPayout: Math.round(totalPayout),
    rateBreakdown,
  };
}

export const getAssignmentWorkDetails = resolveWorkDetails;
