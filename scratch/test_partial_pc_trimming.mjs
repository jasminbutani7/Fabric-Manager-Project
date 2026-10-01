import {
  calculateReadyProductSets,
  getFabricSubPartSkippedPieces,
  getFabricThreadCuttingDecision,
} from '../src/utils/productUtils.js';

console.log('--- Running Partial PC Trimming Lifecycle Tests ---');

// Test Case 1: 100 Tops + 100 Pants.
// Admin skips 100 Pants (0 needed trimming).
// Admin assigns 80 Tops to trimming, skips 20 Tops directly.
// Helper completes 50 Tops.
const fabric1 = {
  id: 'fab_test_1',
  productName: 'Kurti Set',
  productStructure: {
    productName: 'Kurti Set',
    subParts: [
      { id: 'top', name: 'Top', qty: 1 },
      { id: 'pant', name: 'Pant', qty: 1 },
    ],
  },
  notes: JSON.stringify({
    subPartTrimmingDecisions: {
      pant: 'skipped',
      top: 'partial',
    },
    subPartSkippedPieces: {
      pant: 100,
      top: 20,
    },
  }),
};

const handovers1 = [
  {
    id: 'h1',
    fabricId: 'fab_test_1',
    status: 'Verified',
    subParts: { top: 100, pant: 100 },
    piecesCount: 200,
  },
];

const threadAssignments1 = [
  {
    id: 'tc1',
    fabricId: 'fab_test_1',
    subPart: 'top',
    assignedPieces: 80,
    completedPieces: 50,
    status: 'In Progress',
  },
];

const res1 = calculateReadyProductSets(fabric1, {
  masterHandovers: handovers1,
  threadCuttingAssignments: threadAssignments1,
  cuttings: [],
  invoices: [],
});

console.log('Test 1 Results:');
console.log('- Top Status:', res1.subPartTrimmingStatus.top);
console.log('- Pant Status:', res1.subPartTrimmingStatus.pant);
console.log('- Ready Sets Count:', res1.readyProductsCount);
console.log('- Is Awaiting Decision:', res1.isAwaitingTrimmingDecision);
console.log('- Is Trimming In Progress:', res1.isTrimmingInProgress);

if (res1.subPartTrimmingStatus.pant.readyPieces !== 100) {
  throw new Error(`Expected pant readyPieces == 100, got ${res1.subPartTrimmingStatus.pant.readyPieces}`);
}
// Top: 20 skipped + 50 completed = 70 ready pieces!
if (res1.subPartTrimmingStatus.top.readyPieces !== 70) {
  throw new Error(`Expected top readyPieces == 70, got ${res1.subPartTrimmingStatus.top.readyPieces}`);
}
// Ready Sets: min(70, 100) = 70 sets
if (res1.readyProductsCount !== 70) {
  throw new Error(`Expected readyProductsCount == 70, got ${res1.readyProductsCount}`);
}
if (!res1.isTrimmingInProgress) {
  throw new Error('Expected isTrimmingInProgress to be true since 30 Tops are still in progress');
}

// Test Case 2: All 80 Tops complete trimming
const threadAssignments2 = [
  {
    id: 'tc1',
    fabricId: 'fab_test_1',
    subPart: 'top',
    assignedPieces: 80,
    completedPieces: 80,
    status: 'Completed',
  },
];

const res2 = calculateReadyProductSets(fabric1, {
  masterHandovers: handovers1,
  threadCuttingAssignments: threadAssignments2,
  cuttings: [],
  invoices: [],
});

console.log('\nTest 2 Results (All 80 Tops completed):');
console.log('- Top Ready Pieces:', res2.subPartTrimmingStatus.top.readyPieces);
console.log('- Ready Sets Count:', res2.readyProductsCount);
console.log('- Is Trimming In Progress:', res2.isTrimmingInProgress);
console.log('- Is Complete Product Ready:', res2.isCompleteProductReady);

if (res2.subPartTrimmingStatus.top.readyPieces !== 100) {
  throw new Error(`Expected top readyPieces == 100, got ${res2.subPartTrimmingStatus.top.readyPieces}`);
}
if (res2.readyProductsCount !== 100) {
  throw new Error(`Expected readyProductsCount == 100, got ${res2.readyProductsCount}`);
}
if (res2.isTrimmingInProgress) {
  throw new Error('Expected isTrimmingInProgress to be false when all jobs completed');
}

// Test Case 3: 3-piece structure (Top: 1, Pant: 1, Dupatta: 1).
// Top: 50 trimmed. Pant: 50 skipped. Dupatta: 0 decided (50 pending).
const fabric3 = {
  id: 'fab_test_3',
  productName: '3-Piece Suit',
  productStructure: {
    subParts: [
      { id: 'top', name: 'Top', qty: 1 },
      { id: 'pant', name: 'Pant', qty: 1 },
      { id: 'dupatta', name: 'Dupatta', qty: 1 },
    ],
  },
  notes: JSON.stringify({
    subPartSkippedPieces: { pant: 50 },
  }),
};

const handovers3 = [
  {
    id: 'h3',
    fabricId: 'fab_test_3',
    status: 'Verified',
    subParts: { top: 50, pant: 50, dupatta: 50 },
    piecesCount: 150,
  },
];

const threadAssignments3 = [
  {
    id: 'tc3',
    fabricId: 'fab_test_3',
    subPart: 'top',
    assignedPieces: 50,
    completedPieces: 50,
    status: 'Completed',
  },
];

const res3 = calculateReadyProductSets(fabric3, {
  masterHandovers: handovers3,
  threadCuttingAssignments: threadAssignments3,
  cuttings: [],
  invoices: [],
});

console.log('\nTest 3 Results (3-Piece Suit with Dupatta pending decision):');
console.log('- Top ready:', res3.subPartTrimmingStatus.top.readyPieces);
console.log('- Pant ready:', res3.subPartTrimmingStatus.pant.readyPieces);
console.log('- Dupatta ready:', res3.subPartTrimmingStatus.dupatta.readyPieces);
console.log('- Ready Sets Count:', res3.readyProductsCount);
console.log('- Is Awaiting Decision:', res3.isAwaitingTrimmingDecision);

if (res3.readyProductsCount !== 0) {
  throw new Error(`Expected ready sets == 0 because Dupatta has 0 ready pieces, got ${res3.readyProductsCount}`);
}
if (!res3.isAwaitingTrimmingDecision) {
  throw new Error('Expected isAwaitingTrimmingDecision == true because Dupatta is pending');
}

console.log('\n🎉 ALL PARTIAL PC TRIMMING TESTS PASSED 100%! 🎉');
