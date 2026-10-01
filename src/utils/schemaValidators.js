/**
 * Runtime Schema Type-Guards and Sanitizers
 * Defends against malformed, unvalidated, or corrupted JSONB data arriving
 * from PostgreSQL or client forms.
 */

/**
 * Validates and sanitizes a ProductStructure JSON payload.
 *
 * @param {unknown} input
 * @param {string} [fallbackProductName='Garment']
 * @returns {import('../types/domain').ProductStructure}
 */
export function validateProductStructure(input, fallbackProductName = 'Garment', fallbackRate = 0) {
  let raw = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  const defaultName = String(fallbackProductName || 'Garment').trim() || 'Garment';
  const defaultRate = Math.max(0, parseFloat(fallbackRate) || parseFloat(raw?.pricePerPiece) || parseFloat(raw?.price_per_piece) || parseFloat(raw?.fullSetRate) || parseFloat(raw?.tailorRate) || 0);

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      productName: defaultName,
      fullSetRate: defaultRate,
      subParts: [
        {
          id: 'piece',
          name: defaultName,
          rate: defaultRate,
          components: [],
        },
      ],
    };
  }

  const obj = /** @type {Record<string, any>} */ (raw);
  const productName = typeof obj.productName === 'string' && obj.productName.trim()
    ? obj.productName.trim()
    : defaultName;

  const rawSubParts = Array.isArray(obj.subParts)
    ? obj.subParts
    : Array.isArray(obj.parts)
    ? obj.parts
    : [];

  const subParts = rawSubParts.map((sp, idx) => {
    if (!sp || typeof sp !== 'object') {
      return {
        id: `part_${idx + 1}`,
        name: `Part ${idx + 1}`,
        rate: 0,
        components: [],
      };
    }

    const id = typeof sp.id === 'string' && sp.id.trim()
      ? sp.id.trim()
      : (typeof sp.name === 'string' && sp.name.trim()
          ? sp.name.trim().toLowerCase().replace(/\s+/g, '_')
          : `part_${idx + 1}`);

    const name = typeof sp.name === 'string' && sp.name.trim()
      ? sp.name.trim()
      : `Part ${idx + 1}`;

    const rate = Math.max(0, parseFloat(sp.rate) || 0);

    const rawComps = Array.isArray(sp.components) ? sp.components : [];
    const components = rawComps.map((c, cIdx) => {
      if (!c || typeof c !== 'object') {
        return { id: `comp_${cIdx + 1}`, name: `Component ${cIdx + 1}`, qty: 1 };
      }
      const cId = typeof c.id === 'string' && c.id.trim()
        ? c.id.trim()
        : (typeof c.name === 'string' && c.name.trim()
            ? c.name.trim().toLowerCase().replace(/\s+/g, '_')
            : `comp_${cIdx + 1}`);
      const cName = typeof c.name === 'string' && c.name.trim() ? c.name.trim() : `Component ${cIdx + 1}`;
      const qty = Math.max(1, parseInt(c.qty, 10) || 1);
      return { id: cId, name: cName, qty };
    });

    return {
      id,
      name,
      rate,
      components,
    };
  });

  return {
    ...obj,
    productName,
    subParts: subParts.length > 0 ? subParts : [
      {
        id: 'piece',
        name: productName,
        rate: Math.max(0, parseFloat(obj.fullSetRate) || 0),
        components: [],
      },
    ],
  };
}

/**
 * Validates and normalizes a TailorRates dictionary.
 *
 * @param {unknown} input
 * @returns {Record<string, number>}
 */
export function validateTailorRates(input) {
  let raw = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const result = {};
  Object.entries(raw).forEach(([k, v]) => {
    if (typeof k === 'string' && k.trim()) {
      const num = parseFloat(v);
      if (!isNaN(num) && num >= 0) {
        result[k.trim()] = Math.round(num * 100) / 100;
      }
    }
  });

  return result;
}

/**
 * Validates and normalizes a CutPiecesMap or AssignedPiecesMap dictionary.
 *
 * @param {unknown} input
 * @returns {Record<string, number>}
 */
export function validatePieceCounts(input) {
  let raw = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const result = {};
  Object.entries(raw).forEach(([k, v]) => {
    if (typeof k === 'string' && k.trim()) {
      const num = parseInt(v, 10);
      if (!isNaN(num) && num >= 0) {
        result[k.trim()] = num;
      }
    }
  });

  return result;
}
