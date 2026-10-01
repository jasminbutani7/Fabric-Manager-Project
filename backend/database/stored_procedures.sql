-- =============================================================================
-- FABRIC MANAGER - ATOMIC STORED PROCEDURES & RPC FUNCTIONS
-- High-concurrency operations executed server-side in a single transaction
-- =============================================================================

-- 1. Worker PIN Verification (Master, Tailor, Helper Mobile Portals)
CREATE OR REPLACE FUNCTION public.verify_worker_pin(
    p_worker_id TEXT,
    p_role TEXT,
    p_pin TEXT,
    p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_worker RECORD;
    v_token TEXT;
BEGIN
    IF lower(p_role) = 'master' THEN
        SELECT id, user_id, role, name, phone, password, status
        INTO v_worker
        FROM public.masters
        WHERE (id = p_worker_id OR (p_phone IS NOT NULL AND phone = p_phone))
          AND status = 'Active'
        LIMIT 1;
    ELSIF lower(p_role) = 'tailor' THEN
        SELECT id, user_id, role, name, phone, password, status
        INTO v_worker
        FROM public.tailors
        WHERE (id = p_worker_id OR (p_phone IS NOT NULL AND phone = p_phone))
          AND status = 'Active'
        LIMIT 1;
    ELSIF lower(p_role) = 'helper' THEN
        SELECT id, user_id, role, name, phone, password, status
        INTO v_worker
        FROM public.helpers
        WHERE (id = p_worker_id OR (p_phone IS NOT NULL AND phone = p_phone))
          AND status = 'Active'
        LIMIT 1;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role specified');
    END IF;

    IF v_worker IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Worker not found or inactive');
    END IF;

    IF v_worker.password IS DISTINCT FROM p_pin THEN
        RETURN jsonb_build_object('success', false, 'error', 'Incorrect PIN code');
    END IF;

    v_token := encode(digest(v_worker.id || now()::text || gen_random_uuid()::text, 'sha256'), 'hex');

    RETURN jsonb_build_object(
        'success', true,
        'token', v_token,
        'worker', jsonb_build_object(
            'id', v_worker.id,
            'user_id', v_worker.user_id,
            'role', v_worker.role,
            'name', v_worker.name,
            'phone', v_worker.phone,
            'status', v_worker.status
        )
    );
END;
$$;

-- 2. Atomic Cutting Batch Recording
CREATE OR REPLACE FUNCTION public.rpc_record_cutting_batch(
    p_cutting_payload JSONB,
    p_fabric_update JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutting_id TEXT;
    v_inserted_record RECORD;
BEGIN
    v_cutting_id := p_cutting_payload->>'id';
    IF v_cutting_id IS NULL THEN
        v_cutting_id := 'cut_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 6);
    END IF;

    INSERT INTO public.cuttings (
        id, user_id, fabric_id, fabric_name, fabric_color,
        master_id, master_name, product_name, cut_pieces,
        total_pieces, sets_count, meters_used, tailor_rates,
        product_structure, notes, status, created_at, updated_at
    ) VALUES (
        v_cutting_id,
        p_cutting_payload->>'user_id',
        p_cutting_payload->>'fabric_id',
        p_cutting_payload->>'fabric_name',
        p_cutting_payload->>'fabric_color',
        p_cutting_payload->>'master_id',
        p_cutting_payload->>'master_name',
        p_cutting_payload->>'product_name',
        p_cutting_payload->'cut_pieces',
        COALESCE((p_cutting_payload->>'total_pieces')::INT, 0),
        COALESCE((p_cutting_payload->>'sets_count')::INT, 0),
        COALESCE((p_cutting_payload->>'meters_used')::NUMERIC, 0),
        p_cutting_payload->'tailor_rates',
        p_cutting_payload->'product_structure',
        p_cutting_payload->>'notes',
        COALESCE(p_cutting_payload->>'status', 'Active'),
        NOW(), NOW()
    )
    RETURNING * INTO v_inserted_record;

    IF p_fabric_update IS NOT NULL AND p_cutting_payload->>'fabric_id' IS NOT NULL THEN
        UPDATE public.fabrics
        SET status = COALESCE(p_fabric_update->>'status', status),
            delivered_psc = COALESCE((p_fabric_update->>'delivered_psc')::INT, delivered_psc),
            updated_at = NOW()
        WHERE id = p_cutting_payload->>'fabric_id';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cutting_id', v_cutting_id,
        'record', to_jsonb(v_inserted_record)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
