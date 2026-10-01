import { describe, it, expect, vi } from 'vitest';
import {
  executeAtomicCuttingBatch,
  executeAtomicTailorAssignment,
  executeAtomicCompletedLotInvoice,
} from '../src/services/atomicTransactions';

describe('Atomic Multi-Table Transactions Service', () => {
  it('signals fallback when supabase client is null or offline', async () => {
    const res1 = await executeAtomicCuttingBatch(null, { id: 'cut_1', fabricId: 'fab_1' });
    expect(res1.fallbackRequired).toBe(true);
    expect(res1.rpcExecuted).toBe(false);

    const res2 = await executeAtomicTailorAssignment(null, { id: 'asgn_1', cuttingId: 'cut_1' });
    expect(res2.fallbackRequired).toBe(true);
    expect(res2.rpcExecuted).toBe(false);

    const res3 = await executeAtomicCompletedLotInvoice(null, { id: 'inv_1', fabricId: 'fab_1' });
    expect(res3.fallbackRequired).toBe(true);
    expect(res3.rpcExecuted).toBe(false);
  });

  it('successfully invokes rpc_record_cutting_batch when supabase is connected', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: true, cutting_id: 'cut_101', fabric_id: 'fab_101' },
      error: null,
    });
    const mockSupabase = { rpc: mockRpc };

    const cutting = {
      id: 'cut_101',
      user_id: 'usr_admin',
      fabricId: 'fab_101',
      fabricName: 'Cotton Cambric (Navy)',
      fabricColor: 'Navy',
      masterId: 'mst_1',
      masterName: 'Suresh Master',
      productName: 'Kurti Set',
      cutPieces: { top: 50, bottom: 50 },
      totalPieces: 100,
      totalSets: 50,
      metersUsed: 85,
      notes: 'Test cutting batch',
    };

    const result = await executeAtomicCuttingBatch(mockSupabase, cutting);
    expect(result.success).toBe(true);
    expect(result.rpcExecuted).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      'rpc_record_cutting_batch',
      expect.objectContaining({
        p_cutting_id: 'cut_101',
        p_fabric_id: 'fab_101',
        p_total_pieces: 100,
        p_sets_count: 50,
      })
    );
  });

  it('gracefully falls back when rpc_record_cutting_batch is not installed (PGRST202)', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function rpc_record_cutting_batch' },
    });
    const mockSupabase = { rpc: mockRpc };

    const result = await executeAtomicCuttingBatch(mockSupabase, { id: 'cut_101', fabricId: 'fab_101' });
    expect(result.success).toBe(false);
    expect(result.fallbackRequired).toBe(true);
    expect(result.rpcExecuted).toBe(false);
  });

  it('successfully invokes rpc_create_tailor_assignment when supabase is connected', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: true, assignment_id: 'asgn_101', cutting_status: 'Fully Assigned' },
      error: null,
    });
    const mockSupabase = { rpc: mockRpc };

    const assignment = {
      id: 'asgn_101',
      user_id: 'usr_admin',
      cuttingId: 'cut_101',
      fabricId: 'fab_101',
      fabricName: 'Cotton Cambric',
      masterName: 'Suresh Master',
      tailorId: 'tlr_1',
      tailorName: 'Ramesh Tailor',
      assignedPieces: { top: 50, bottom: 50 },
      totalAssignedPieces: 100,
      ratePerPiece: 35,
      totalJobAmount: 3500,
      pieceType: 'Kurti Set (Top + Bottom)',
      notes: 'Urgent stitching',
    };

    const result = await executeAtomicTailorAssignment(mockSupabase, assignment);
    expect(result.success).toBe(true);
    expect(result.rpcExecuted).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      'rpc_create_tailor_assignment',
      expect.objectContaining({
        p_assignment_id: 'asgn_101',
        p_cutting_id: 'cut_101',
        p_total_assigned_pieces: 100,
        p_rate_per_piece: 35,
      })
    );
  });

  it('successfully invokes rpc_create_completed_lot_invoice with multi-junction costs', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: true, invoice_id: 'inv_101', invoice_number: 'INV-2026-001', linked_expenses_count: 2 },
      error: null,
    });
    const mockSupabase = { rpc: mockRpc };

    const invoice = {
      id: 'inv_101',
      user_id: 'usr_admin',
      invoiceNumber: 'INV-2026-001',
      fabricId: 'fab_101',
      clientName: 'Shree Fashion Hub',
      clientPhone: '9876543210',
      date: '2026-09-29',
      items: [{ description: 'Kurti Sets', quantity: 50, unitPrice: 400, amount: 20000 }],
      subtotal: 20000,
      discount: 1000,
      totalAmount: 19000,
      notes: 'Delivered lot billing',
    };

    const costs = {
      materialCost: 8000,
      tailorCost: 3500,
      cuttingCost: 1000,
      trimmingCost: 500,
    };

    const result = await executeAtomicCompletedLotInvoice(mockSupabase, invoice, costs);
    expect(result.success).toBe(true);
    expect(result.rpcExecuted).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      'rpc_create_completed_lot_invoice',
      expect.objectContaining({
        p_invoice_id: 'inv_101',
        p_fabric_id: 'fab_101',
        p_material_cost: 8000,
        p_tailor_cost: 3500,
      })
    );
  });
});
