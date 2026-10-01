-- =============================================================================
-- FABRIC MANAGER - ATOMIC STORED PROCEDURES & MULTI-TABLE TRANSACTIONS
-- Migration 004: Atomic RPCs for Cutting Batches, Tailor Assignments & Invoicing
-- =============================================================================

-- 1. ATOMIC RECORD CUTTING BATCH
-- Atomically inserts cutting record and transitions fabric status to 'In Cutting'
CREATE OR REPLACE FUNCTION public.rpc_record_cutting_batch(
    p_cutting_id TEXT,
    p_user_id TEXT,
    p_fabric_id TEXT,
    p_fabric_name TEXT,
    p_fabric_color TEXT,
    p_master_id TEXT,
    p_master_name TEXT,
    p_product_name TEXT,
    p_cut_pieces JSONB,
    p_total_pieces INTEGER,
    p_sets_count INTEGER,
    p_meters_used NUMERIC,
    p_tailor_rates JSONB,
    p_product_structure JSONB,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fabric RECORD;
BEGIN
    -- 1. Validate target fabric exists
    SELECT * INTO v_fabric FROM public.fabrics WHERE id = p_fabric_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fabric lot % not found', p_fabric_id;
    END IF;

    -- 2. Insert Cutting Record
    INSERT INTO public.cuttings (
        id,
        user_id,
        fabric_id,
        fabric_name,
        fabric_color,
        master_id,
        master_name,
        product_name,
        cut_pieces,
        total_pieces,
        sets_count,
        meters_used,
        status,
        notes,
        tailor_rates,
        product_structure,
        created_at,
        updated_at
    ) VALUES (
        p_cutting_id,
        p_user_id,
        p_fabric_id,
        p_fabric_name,
        p_fabric_color,
        p_master_id,
        p_master_name,
        p_product_name,
        p_cut_pieces,
        p_total_pieces,
        p_sets_count,
        p_meters_used,
        'Ready for Stitching',
        p_notes,
        p_tailor_rates,
        p_product_structure,
        NOW(),
        NOW()
    );

    -- 3. Update fabric status to 'In Cutting' if currently 'In Stock'
    IF v_fabric.status = 'In Stock' THEN
        UPDATE public.fabrics
        SET status = 'In Cutting', updated_at = NOW()
        WHERE id = p_fabric_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cutting_id', p_cutting_id,
        'fabric_id', p_fabric_id
    );
END;
$$;

-- 2. ATOMIC CREATE TAILOR ASSIGNMENT
-- Atomically checks remaining cut pieces, inserts assignment, and updates cutting status
CREATE OR REPLACE FUNCTION public.rpc_create_tailor_assignment(
    p_assignment_id TEXT,
    p_user_id TEXT,
    p_cutting_id TEXT,
    p_fabric_id TEXT,
    p_fabric_name TEXT,
    p_master_name TEXT,
    p_tailor_id TEXT,
    p_tailor_name TEXT,
    p_assigned_pieces JSONB,
    p_assigned_sub_parts JSONB,
    p_total_assigned_pieces INTEGER,
    p_rate_per_piece NUMERIC,
    p_total_job_amount NUMERIC,
    p_piece_type TEXT,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutting RECORD;
    v_previously_assigned INTEGER := 0;
    v_new_total_assigned INTEGER := 0;
    v_new_cutting_status TEXT;
BEGIN
    -- 1. Validate cutting batch exists and lock row
    SELECT * INTO v_cutting FROM public.cuttings WHERE id = p_cutting_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cutting batch % not found', p_cutting_id;
    END IF;

    -- 2. Calculate remaining pieces available in this batch
    SELECT COALESCE(SUM(total_assigned_pieces), 0)
    INTO v_previously_assigned
    FROM public.tailor_assignments
    WHERE cutting_id = p_cutting_id AND status != 'Declined';

    IF (v_cutting.total_pieces > 0) AND ((v_previously_assigned + p_total_assigned_pieces) > v_cutting.total_pieces) THEN
        RAISE EXCEPTION 'Assignment of % pieces exceeds available unassigned pieces (%) in cutting %',
            p_total_assigned_pieces, (v_cutting.total_pieces - v_previously_assigned), p_cutting_id;
    END IF;

    -- 3. Insert tailor assignment
    INSERT INTO public.tailor_assignments (
        id,
        user_id,
        cutting_id,
        fabric_id,
        fabric_name,
        master_name,
        tailor_id,
        tailor_name,
        assigned_pieces,
        assigned_sub_parts,
        total_assigned_pieces,
        rate_per_piece,
        total_job_amount,
        piece_type,
        status,
        completed_quantity,
        total_earned,
        daily_submissions,
        tailor_accepted,
        created_at,
        updated_at
    ) VALUES (
        p_assignment_id,
        p_user_id,
        p_cutting_id,
        p_fabric_id,
        p_fabric_name,
        p_master_name,
        p_tailor_id,
        p_tailor_name,
        p_assigned_pieces,
        p_assigned_sub_parts,
        p_total_assigned_pieces,
        p_rate_per_piece,
        p_total_job_amount,
        p_piece_type,
        'Pending Acceptance',
        0,
        0,
        '[]'::jsonb,
        false,
        NOW(),
        NOW()
    );

    -- 4. Update cutting status
    v_new_total_assigned := v_previously_assigned + p_total_assigned_pieces;
    IF v_new_total_assigned >= v_cutting.total_pieces THEN
        v_new_cutting_status := 'Fully Assigned';
    ELSE
        v_new_cutting_status := 'Partially Assigned';
    END IF;

    UPDATE public.cuttings
    SET status = v_new_cutting_status, updated_at = NOW()
    WHERE id = p_cutting_id;

    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', p_assignment_id,
        'cutting_status', v_new_cutting_status,
        'total_assigned', v_new_total_assigned
    );
END;
$$;

-- 3. ATOMIC CREATE COMPLETED LOT INVOICE
-- Atomically creates revenue invoice, multi-junction expense records, and marks fabric as invoiced
CREATE OR REPLACE FUNCTION public.rpc_create_completed_lot_invoice(
    p_invoice_id TEXT,
    p_user_id TEXT,
    p_invoice_number TEXT,
    p_fabric_id TEXT,
    p_client_name TEXT,
    p_client_phone TEXT,
    p_date DATE,
    p_due_date DATE,
    p_items JSONB,
    p_subtotal NUMERIC,
    p_discount NUMERIC,
    p_tax NUMERIC,
    p_total_amount NUMERIC,
    p_material_cost NUMERIC,
    p_tailor_cost NUMERIC,
    p_cutting_cost NUMERIC,
    p_trimming_cost NUMERIC,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fabric RECORD;
    v_junction_count INTEGER := 0;
BEGIN
    -- 1. Validate fabric lot exists
    SELECT * INTO v_fabric FROM public.fabrics WHERE id = p_fabric_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fabric lot % not found', p_fabric_id;
    END IF;

    -- 2. Insert invoice
    INSERT INTO public.invoices (
        id,
        user_id,
        invoice_number,
        client_name,
        client_phone,
        date,
        due_date,
        items,
        subtotal,
        discount,
        tax,
        total_amount,
        paid_amount,
        due_amount,
        status,
        notes,
        created_at,
        updated_at
    ) VALUES (
        p_invoice_id,
        p_user_id,
        p_invoice_number,
        p_client_name,
        p_client_phone,
        p_date,
        p_due_date,
        p_items,
        p_subtotal,
        p_discount,
        p_tax,
        p_total_amount,
        0,
        p_total_amount,
        'Unpaid',
        p_notes,
        NOW(),
        NOW()
    );

    -- 3. Link material cost in invoice_expenses
    IF p_material_cost > 0 THEN
        INSERT INTO public.invoice_expenses (
            id, user_id, invoice_id, fabric_id, cost_type, allocated_amount, notes, created_at, updated_at
        ) VALUES (
            'invexp_' || p_invoice_id || '_mat',
            p_user_id,
            p_invoice_id,
            p_fabric_id,
            'direct_fabric_material',
            p_material_cost,
            'Direct material cost for lot ' || COALESCE(v_fabric.lot_no::text, ''),
            NOW(),
            NOW()
        );
        v_junction_count := v_junction_count + 1;
    END IF;

    -- 4. Link tailor stitching cost in invoice_expenses
    IF p_tailor_cost > 0 THEN
        INSERT INTO public.invoice_expenses (
            id, user_id, invoice_id, fabric_id, cost_type, allocated_amount, notes, created_at, updated_at
        ) VALUES (
            'invexp_' || p_invoice_id || '_tlr',
            p_user_id,
            p_invoice_id,
            p_fabric_id,
            'tailor_stitching_labor',
            p_tailor_cost,
            'Tailor stitching labor for lot ' || COALESCE(v_fabric.lot_no::text, ''),
            NOW(),
            NOW()
        );
        v_junction_count := v_junction_count + 1;
    END IF;

    -- 5. Link cutting master cost in invoice_expenses
    IF p_cutting_cost > 0 THEN
        INSERT INTO public.invoice_expenses (
            id, user_id, invoice_id, fabric_id, cost_type, allocated_amount, notes, created_at, updated_at
        ) VALUES (
            'invexp_' || p_invoice_id || '_mst',
            p_user_id,
            p_invoice_id,
            p_fabric_id,
            'cutting_master_labor',
            p_cutting_cost,
            'Cutting master labor for lot ' || COALESCE(v_fabric.lot_no::text, ''),
            NOW(),
            NOW()
        );
        v_junction_count := v_junction_count + 1;
    END IF;

    -- 6. Link thread trimming cost in invoice_expenses
    IF p_trimming_cost > 0 THEN
        INSERT INTO public.invoice_expenses (
            id, user_id, invoice_id, fabric_id, cost_type, allocated_amount, notes, created_at, updated_at
        ) VALUES (
            'invexp_' || p_invoice_id || '_trm',
            p_user_id,
            p_invoice_id,
            p_fabric_id,
            'thread_trimming_labor',
            p_trimming_cost,
            'Thread trimming labor for lot ' || COALESCE(v_fabric.lot_no::text, ''),
            NOW(),
            NOW()
        );
        v_junction_count := v_junction_count + 1;
    END IF;

    -- 7. Update fabric is_invoiced flag
    UPDATE public.fabrics
    SET is_invoiced = true, updated_at = NOW()
    WHERE id = p_fabric_id;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'invoice_number', p_invoice_number,
        'linked_expenses_count', v_junction_count
    );
END;
$$;
