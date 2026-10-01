/**
 * Product Utilities (Domain Facade)
 *
 * Encapsulates domain logic for:
 * 1. cuttingUtils: Piece labels, cut piece calculations, piece rates, formulas, tailor work details
 * 2. trimmingUtils: Handovers breakdown, master verified trimmed & skipped pieces, fabric trimming decisions
 * 3. deliveryUtils: Ready product set calculations, fully delivered checks, archiving helpers, notes formatting
 */

export * from './cuttingUtils';
export * from './trimmingUtils';
export * from './deliveryUtils';
