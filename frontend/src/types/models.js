/**
 * @file models.js
 * Domain model schemas and JSDoc type definitions for Fabric Manager ERP.
 */

/**
 * @typedef {Object} SubPartComponent
 * @property {string} id - Component identifier (e.g., 'front_panel', 'collar')
 * @property {string} name - Human-readable label
 * @property {number} qty - Quantity needed per subpart/garment
 * @property {number} [rate] - Rate per component piece
 */

/**
 * @typedef {Object} SubPart
 * @property {string} id - Unique subpart identifier
 * @property {string} name - Display name (e.g., 'Shirt Stitching', 'Pant Finishing')
 * @property {number} rate - Piece wage rate for tailor
 * @property {SubPartComponent[]} [components] - Optional nested cut components
 */

/**
 * @typedef {Object} ProductStructure
 * @property {string} productName - Name of the garment
 * @property {number} fullSetRate - Full garment set manufacturing rate
 * @property {SubPart[]} subParts - Breakdown of constituent stitching components
 */

/**
 * @typedef {Object} Fabric
 * @property {string} id - Unique fabric identifier (e.g., 'fab_1711234567890')
 * @property {number|null} lotNo - Sequential lot number
 * @property {string} [supplierId] - Vendor/supplier reference ID
 * @property {string} [supplierName] - Supplier business name
 * @property {string} [supplierPhone] - Contact phone number
 * @property {string} [assignedMasterId] - Assigned cutting master ID
 * @property {string} [assignedMasterName] - Assigned cutting master name
 * @property {number} plainMeters - Total inward fabric length in meters
 * @property {number} printPieces - Expected full garment piece target
 * @property {number} pricePerPiece - Unit cost or rate per garment set
 * @property {number} totalAmount - Total procurement cost (meters or pieces * price)
 * @property {string} productName - Target garment style name
 * @property {ProductStructure|null} [productStructure] - Product assembly structure
 * @property {string} [color] - Fabric shade or color name
 * @property {string} date - Inward arrival date (YYYY-MM-DD)
 * @property {string} [dueDate] - Target delivery date (YYYY-MM-DD)
 * @property {string} fabricType - Fabric grade/material (e.g., 'Cotton Cambric 60x60')
 * @property {string} status - Lifecycle status ('In Stock', 'In Cutting', 'Delivered', 'Archived')
 * @property {string} [notes] - Additional factory remarks
 * @property {string} [createdAt] - ISO timestamp
 * @property {string} [updatedAt] - ISO timestamp
 */

/**
 * @typedef {Object} Cutting
 * @property {string} id - Cutting batch identifier (e.g., 'cut_1711234567890')
 * @property {string} fabricId - Linked fabric lot ID
 * @property {string} [fabricName] - Fabric lot name or type
 * @property {string} [fabricColor] - Fabric shade
 * @property {string} masterId - Master tailor identifier
 * @property {string} masterName - Master tailor name
 * @property {string} productName - Garment product name
 * @property {ProductStructure|null} [productStructure] - Associated product structure
 * @property {Record<string, number>} cutPieces - Count of physical pieces produced per component
 * @property {number} totalPieces - Total individual cut pieces produced
 * @property {number} setsCount - Calculated total full garment sets
 * @property {number} metersUsed - Fabric length consumed from roll
 * @property {string} cutDate - Date cutting was completed (YYYY-MM-DD)
 * @property {Record<string, number>} [tailorRates] - Stitching rate per component
 * @property {string} [notes] - Master's cutting remarks
 * @property {string} [createdAt] - ISO timestamp
 * @property {string} [updatedAt] - ISO timestamp
 */

/**
 * @typedef {Object} DailySubmission
 * @property {string} id - Unique log entry ID
 * @property {string} date - Submission date (YYYY-MM-DD)
 * @property {number} quantity - Pieces completed
 * @property {string} [status] - 'Pending' | 'Approved' | 'Rejected'
 * @property {string} [notes] - Worker or approver note
 */

/**
 * @typedef {Object} TailorAssignment
 * @property {string} id - Job allocation identifier (e.g., 'asg_1711234567890')
 * @property {string} fabricId - Parent fabric lot ID
 * @property {string} cuttingId - Linked cutting batch ID
 * @property {string} tailorId - Assigned tailor ID
 * @property {string} tailorName - Tailor full name
 * @property {string} [machineId] - Machine ID assigned to
 * @property {string} [machineCode] - Machine asset tag
 * @property {Record<string, number>} [assignedPieces] - Component pieces assigned
 * @property {Record<string, number>} [assignedSubParts] - Garment subparts assigned
 * @property {number} totalAssignedPieces - Total pieces allocated
 * @property {number} ratePerPiece - Average rate or set piece rate
 * @property {number} totalJobAmount - Total estimated payable amount
 * @property {number} completedQuantity - Total approved finished pieces
 * @property {number} totalEarned - Accumulated verified wages earned
 * @property {DailySubmission[]} [dailySubmissions] - Daily submitted piece logs
 * @property {string} status - 'Assigned' | 'In Progress' | 'Completed' | 'Declined'
 * @property {string} assignDate - Assignment date (YYYY-MM-DD)
 * @property {string} [dueDate] - Estimated deadline
 */

/**
 * @typedef {Object} InvoiceItem
 * @property {string} [fabricId] - Linked fabric ID
 * @property {string} description - Item or lot line description
 * @property {number} quantity - Quantity of pieces or sets
 * @property {number} rate - Unit rate
 * @property {number} amount - Total line amount (quantity * rate)
 */

/**
 * @typedef {Object} Invoice
 * @property {string} id - Unique invoice identifier
 * @property {string} invoiceNumber - Invoice display number (e.g., 'INV-2026-001')
 * @property {string} clientName - Client or party name
 * @property {string} [clientPhone] - Contact number
 * @property {string} date - Billing date (YYYY-MM-DD)
 * @property {string} [dueDate] - Payment due date
 * @property {string} [fabricId] - Primary linked fabric lot
 * @property {InvoiceItem[]} items - Line items
 * @property {number} totalAmount - Grand total invoice amount
 * @property {number} paidAmount - Total amount received so far
 * @property {number} pendingAmount - Outstanding due balance
 * @property {string} status - 'Pending' | 'Partial' | 'Paid'
 */

/**
 * @typedef {Object} Expense
 * @property {string} id - Unique expense entry ID
 * @property {string} expenseType - 'Raw Material' | 'Salary' | 'Machine Maintenance' | 'Electricity' | 'Other'
 * @property {string} [salarySubType] - 'Tailor Piece Rate' | 'Master Salary' | 'Helper Wage'
 * @property {string} [workerId] - Linked worker ID if wage expense
 * @property {string} [workerName] - Linked worker name
 * @property {number} amount - Expense amount in INR
 * @property {string} date - Transaction date (YYYY-MM-DD)
 * @property {string} paymentMethod - 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque'
 * @property {string} [paidTo] - Payee recipient name
 * @property {string} [referenceNo] - UPI / Cheque reference number
 * @property {string} [fabricId] - Linked fabric lot ID for direct cost allocation
 * @property {string} [notes] - Additional details
 */

/**
 * @typedef {Object} BalanceResult
 * @property {Record<string, number>} assigned - Assigned piece counts per component
 * @property {Record<string, number>} remaining - Remaining unassigned counts per component
 * @property {Record<string, number>} availableSubParts - Subpart readiness including fullSets
 * @property {boolean} isFullyAssigned - True when all cut pieces have been assigned
 * @property {boolean} isPartiallyAssigned - True when some pieces are assigned and some remain
 * @property {boolean} isUnassigned - True when 0 pieces have been assigned
 */

/**
 * @typedef {Object} ScrapAnalysis
 * @property {number} plainMeters - Total inward fabric length
 * @property {number} metersUsed - Total fabric consumed across cuttings
 * @property {number} unusedMeters - Residual unused fabric length
 * @property {number} totalCutPieces - Total garment pieces cut
 * @property {number} metersPerPiece - Average fabric consumption per piece
 * @property {number} totalAcceptedPieces - Finished pieces accepted in handovers
 * @property {number} totalRejectedPieces - Defective / rejected pieces
 * @property {number} rejectionRatePercent - Rejection percentage
 * @property {number} fabricUtilizationRatePercent - Percentage of roll length utilized
 */

export const DOMAIN_CONSTANTS = {
  INVOICE_STATUSES: ['Pending', 'Partial', 'Paid'],
  ASSIGNMENT_STATUSES: ['Assigned', 'In Progress', 'Completed', 'Declined'],
  EXPENSE_CATEGORIES: ['Raw Material', 'Salary', 'Machine Maintenance', 'Electricity', 'Other'],
};
