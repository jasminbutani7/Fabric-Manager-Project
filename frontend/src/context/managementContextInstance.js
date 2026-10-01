import { createContext } from 'react';
import { formatPieceName } from '../utils/productUtils';

export const ManagementContext = createContext(null);

export const sanitizeFabricName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name.replace(/\s*\(\s*\)$/, '').trim();
};

export const getSubmissionPscDetails = (sub) => {
  if (!sub) {
    return {
      pscCount: 0,
      subPartCounts: {},
      fullSetsCount: 0,
      consumedCutPieces: 0,
      pscLabel: '0 pcs',
      pieceName: 'pcs',
      badges: [],
      cutPiecesBreakdown: '',
    };
  }

  const subParts = sub.subParts || null;
  const parts = sub.parts || null;
  const badges = [];
  let pscCount = 0;
  const subPartCounts = {};

  if (subParts && typeof subParts === 'object') {
    Object.entries(subParts).forEach(([key, val]) => {
      const cnt = parseInt(val, 10) || 0;
      if (cnt > 0) {
        pscCount += cnt;
        subPartCounts[key] = cnt;
        const cleanName = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        badges.push({
          id: key,
          name: cleanName,
          label: `${cnt} ${formatPieceName(cleanName, cnt)}`,
          icon: '✨',
          color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          count: cnt,
        });
      }
    });
  } else if (parts && typeof parts === 'object') {
    Object.entries(parts).forEach(([key, val]) => {
      const cnt = parseInt(val, 10) || 0;
      if (cnt > 0) {
        pscCount += cnt;
        subPartCounts[key] = cnt;
        const cleanName = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        badges.push({
          id: key,
          name: cleanName,
          label: `${cnt} ${formatPieceName(cleanName, cnt)}`,
          icon: '✨',
          color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          count: cnt,
        });
      }
    });
  } else {
    pscCount = parseInt(sub.pscQuantity, 10) || parseInt(sub.quantity, 10) || 0;
    const rawPieceType = sub.pieceType || 'Piece';
    const cleanPieceName = formatPieceName(rawPieceType, pscCount);
    if (pscCount > 0) {
      badges.push({
        id: 'custom',
        name: cleanPieceName,
        label: `${pscCount} ${cleanPieceName}`,
        icon: '✨',
        color: 'bg-purple-50 text-purple-800 border-purple-200',
        count: pscCount,
      });
    }
  }

  // Determine pieceName and pscLabel dynamically
  let pieceName = 'Pieces';
  if (badges.length === 1) {
    pieceName = formatPieceName(badges[0].name || badges[0].id, pscCount);
  } else if (badges.length > 1) {
    pieceName = 'Pieces';
  } else if (sub.pieceType) {
    pieceName = formatPieceName(sub.pieceType, pscCount);
  }

  const pscLabel = badges.length > 0
    ? badges.map((b) => b.label).join(' + ')
    : `${pscCount} ${pieceName}`;

  let consumedCutPieces = parseInt(sub.quantity, 10) || pscCount;
  let cutPiecesBreakdown = '';
  if (parts && typeof parts === 'object') {
    const details = [];
    let sumParts = 0;
    Object.entries(parts).forEach(([k, v]) => {
      const pCount = parseInt(v, 10) || 0;
      if (pCount > 0) {
        sumParts += pCount;
        const kName = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        details.push(`${pCount} ${kName}`);
      }
    });
    if (sumParts > 0) {
      consumedCutPieces = sumParts;
      cutPiecesBreakdown = details.join(', ');
    }
  } else if (badges.length > 0) {
    cutPiecesBreakdown = badges.map((b) => b.label).join(', ');
  }

  const subValues = Object.values(subPartCounts);
  const fullSetsCount = subValues.length > 0 ? Math.min(...subValues) : 0;

  return {
    pscCount,
    pieceCount: pscCount,
    piecesCount: pscCount,
    stitchedPiecesCount: pscCount,
    subPartCounts,
    fullSetsCount,
    consumedCutPieces,
    pscLabel,
    pieceLabel: pscLabel,
    piecesLabel: pscLabel,
    stitchedPiecesLabel: pscLabel,
    pieceName,
    badges,
    cutPiecesBreakdown,
  };
};

export const getSubmissionPieceDetails = getSubmissionPscDetails;
