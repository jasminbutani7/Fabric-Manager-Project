/**
 * Atomic Multi-Table Transactions Service
 * Bridges client operations to PostgreSQL Stored Procedures (RPCs)
 * with robust offline fallback handling.
 */

/**
 * Execute atomic cutting batch creation + fabric status transition via PostgreSQL RPC.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {Object} cutting
 * @param {Object} [fabric]
 * @returns {Promise<{ success: boolean, rpcExecuted: boolean, error?: any }>}
 */
export async function executeAtomicCuttingBatch(supabase, cutting, _fabric = null) {
  if (!supabase || typeof supabase.rpc !== 'function') {
    return { success: false, rpcExecuted: false, fallbackRequired: true };
  }

  try {
    const payload = {
      p_cutting_id: cutting.id,
      p_user_id: cutting.user_id || null,
      p_fabric_id: cutting.fabricId || null,
      p_fabric_name: cutting.fabricName || '',
      p_fabric_color: cutting.fabricColor || '',
      p_master_id: cutting.masterId || null,
      p_master_name: cutting.masterName || '',
      p_product_name: cutting.productName || 'Garment',
      p_cut_pieces: cutting.cutPieces || {},
      p_total_pieces: parseInt(cutting.totalPieces, 10) || 0,
      p_sets_count: parseInt(cutting.totalSets, 10) || 0,
      p_meters_used: cutting.metersUsed !== undefined && cutting.metersUsed !== null ? parseFloat(cutting.metersUsed) : null,
      p_tailor_rates: cutting.tailorRates || null,
      p_product_structure: cutting.productStructure || null,
      p_notes: cutting.notes || '',
    };

    const { data, error } = await supabase.rpc('rpc_record_cutting_batch', payload);
    if (error) {
      // If RPC is missing on the remote server, permit local fallback
      if (error.code === 'PGRST202' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.warn('rpc_record_cutting_batch not installed on Supabase, using client sequence fallback:', error.message);
        return { success: false, rpcExecuted: false, fallbackRequired: true };
      }
      return { success: false, rpcExecuted: true, error: error.message };
    }

    return { success: true, rpcExecuted: true, data };
  } catch (err) {
    console.warn('executeAtomicCuttingBatch RPC exception, falling back to client-side:', err);
    return { success: false, rpcExecuted: false, fallbackRequired: true };
  }
}

/**
 * Execute atomic tailor assignment + piece balance verification + cutting status transition.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {Object} assignment
 * @returns {Promise<{ success: boolean, rpcExecuted: boolean, error?: any }>}
 */
export async function executeAtomicTailorAssignment(supabase, assignment) {
  if (!supabase || typeof supabase.rpc !== 'function' || !assignment.cuttingId) {
    return { success: false, rpcExecuted: false, fallbackRequired: true };
  }

  try {
    const payload = {
      p_assignment_id: assignment.id,
      p_user_id: assignment.user_id || null,
      p_cutting_id: assignment.cuttingId,
      p_fabric_id: assignment.fabricId || null,
      p_fabric_name: assignment.fabricName || '',
      p_master_name: assignment.masterName || '',
      p_tailor_id: assignment.tailorId || null,
      p_tailor_name: assignment.tailorName || '',
      p_assigned_pieces: assignment.assignedPieces || {},
      p_assigned_sub_parts: assignment.assignedSubParts || null,
      p_total_assigned_pieces: parseInt(assignment.totalAssignedPieces, 10) || 0,
      p_rate_per_piece: parseFloat(assignment.ratePerPiece) || 0,
      p_total_job_amount: parseFloat(assignment.totalJobAmount) || 0,
      p_piece_type: assignment.pieceType || 'Garment Piece',
      p_notes: assignment.notes || '',
    };

    const { data, error } = await supabase.rpc('rpc_create_tailor_assignment', payload);
    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.warn('rpc_create_tailor_assignment not installed on Supabase, using client sequence fallback:', error.message);
        return { success: false, rpcExecuted: false, fallbackRequired: true };
      }
      return { success: false, rpcExecuted: true, error: error.message };
    }

    return { success: true, rpcExecuted: true, data };
  } catch (err) {
    console.warn('executeAtomicTailorAssignment RPC exception, falling back to client-side:', err);
    return { success: false, rpcExecuted: false, fallbackRequired: true };
  }
}

/**
 * Execute atomic revenue invoicing + automatic junction cost linking + fabric lot completion flag.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {Object} invoice
 * @param {Object} costs - { materialCost, tailorCost, cuttingCost, trimmingCost }
 * @returns {Promise<{ success: boolean, rpcExecuted: boolean, error?: any }>}
 */
export async function executeAtomicCompletedLotInvoice(supabase, invoice, costs = {}) {
  if (!supabase || typeof supabase.rpc !== 'function' || !invoice.fabricId) {
    return { success: false, rpcExecuted: false, fallbackRequired: true };
  }

  try {
    const payload = {
      p_invoice_id: invoice.id,
      p_user_id: invoice.user_id || null,
      p_invoice_number: invoice.invoiceNumber,
      p_fabric_id: invoice.fabricId,
      p_client_name: invoice.clientName || 'Direct Customer',
      p_client_phone: invoice.clientPhone || '',
      p_date: invoice.date || new Date().toISOString().split('T')[0],
      p_due_date: invoice.dueDate || null,
      p_items: invoice.items || [],
      p_subtotal: parseFloat(invoice.subtotal) || 0,
      p_discount: parseFloat(invoice.discount) || 0,
      p_tax: parseFloat(invoice.taxAmount || invoice.tax) || 0,
      p_total_amount: parseFloat(invoice.totalAmount) || 0,
      p_material_cost: parseFloat(costs.materialCost) || 0,
      p_tailor_cost: parseFloat(costs.tailorCost) || 0,
      p_cutting_cost: parseFloat(costs.cuttingCost) || 0,
      p_trimming_cost: parseFloat(costs.trimmingCost) || 0,
      p_notes: invoice.notes || '',
    };

    const { data, error } = await supabase.rpc('rpc_create_completed_lot_invoice', payload);
    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.warn('rpc_create_completed_lot_invoice not installed on Supabase, using client sequence fallback:', error.message);
        return { success: false, rpcExecuted: false, fallbackRequired: true };
      }
      return { success: false, rpcExecuted: true, error: error.message };
    }

    return { success: true, rpcExecuted: true, data };
  } catch (err) {
    console.warn('executeAtomicCompletedLotInvoice RPC exception, falling back to client-side:', err);
    return { success: false, rpcExecuted: false, fallbackRequired: true };
  }
}
