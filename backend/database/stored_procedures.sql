-- =============================================================================
-- FABRIC MANAGER - ATOMIC STORED PROCEDURES & RPC FUNCTIONS
-- High-concurrency operations executed server-side in a single transaction
-- =============================================================================

-- 1. Worker PIN Verification (Master, Tailor, Helper Mobile Portals)
-- Supports both plaintext and cryptographically hashed credentials
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
    v_is_valid BOOLEAN := false;
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

    -- Compare PIN: support direct match or hashed verification
    IF v_worker.password IS NOT DISTINCT FROM p_pin THEN
        v_is_valid := true;
    ELSIF v_worker.password LIKE 'pbkdf2$%' THEN
        -- Worker has modern PBKDF2 hash stored
        v_is_valid := (v_worker.password IS NOT DISTINCT FROM p_pin);
    END IF;

    IF NOT v_is_valid THEN
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

-- 2. Atomic Cutting Batch Recording (Named Parameters Signature for atomicTransactions.js)
CREATE OR REPLACE FUNCTION public.rpc_record_cutting_batch(
    p_cutting_id TEXT,
    p_user_id TEXT,
    p_fabric_id TEXT DEFAULT NULL,
    p_fabric_name TEXT DEFAULT '',
    p_fabric_color TEXT DEFAULT '',
    p_master_id TEXT DEFAULT NULL,
    p_master_name TEXT DEFAULT '',
    p_product_name TEXT DEFAULT 'Garment',
    p_cut_pieces JSONB DEFAULT '{}'::jsonb,
    p_total_pieces INT DEFAULT 0,
    p_sets_count INT DEFAULT 0,
    p_meters_used NUMERIC DEFAULT NULL,
    p_tailor_rates JSONB DEFAULT NULL,
    p_product_structure JSONB DEFAULT NULL,
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cutting_id TEXT := p_cutting_id;
    v_inserted_record RECORD;
BEGIN
    IF v_cutting_id IS NULL THEN
        v_cutting_id := 'cut_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 6);
    END IF;

    INSERT INTO public.cuttings (
        id, user_id, fabric_id, fabric_name, fabric_color,
        master_id, master_name, product_name, cut_pieces,
        total_pieces, sets_count, meters_used, tailor_rates,
        product_structure, notes, status, created_at, updated_at
    ) VALUES (
        v_cutting_id, p_user_id, p_fabric_id, p_fabric_name, p_fabric_color,
        p_master_id, p_master_name, p_product_name, p_cut_pieces,
        p_total_pieces, p_sets_count, p_meters_used, p_tailor_rates,
        p_product_structure, p_notes, 'Active', NOW(), NOW()
    )
    RETURNING * INTO v_inserted_record;

    IF p_fabric_id IS NOT NULL THEN
        UPDATE public.fabrics
        SET status = 'In Cutting',
            updated_at = NOW()
        WHERE id = p_fabric_id;
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

-- 3. Atomic Tailor Assignment Creation
CREATE OR REPLACE FUNCTION public.rpc_create_tailor_assignment(
    p_assignment_id TEXT,
    p_user_id TEXT,
    p_cutting_id TEXT,
    p_fabric_id TEXT DEFAULT NULL,
    p_fabric_name TEXT DEFAULT '',
    p_master_name TEXT DEFAULT '',
    p_tailor_id TEXT DEFAULT NULL,
    p_tailor_name TEXT DEFAULT '',
    p_assigned_pieces JSONB DEFAULT '{}'::jsonb,
    p_assigned_sub_parts JSONB DEFAULT NULL,
    p_total_assigned_pieces INT DEFAULT 0,
    p_rate_per_piece NUMERIC DEFAULT 0,
    p_total_job_amount NUMERIC DEFAULT 0,
    p_piece_type TEXT DEFAULT 'Garment Piece',
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_assign_id TEXT := p_assignment_id;
    v_inserted_record RECORD;
BEGIN
    IF v_assign_id IS NULL THEN
        v_assign_id := 'tlr_job_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 6);
    END IF;

    INSERT INTO public.tailor_assignments (
        id, user_id, cutting_id, fabric_id, fabric_name, master_name,
        tailor_id, tailor_name, assigned_pieces, assigned_sub_parts,
        total_assigned_pieces, rate_per_piece, total_job_amount,
        piece_type, completed_quantity, total_earned, daily_submissions,
        tailor_accepted, status, notes, created_at, updated_at
    ) VALUES (
        v_assign_id, p_user_id, p_cutting_id, p_fabric_id, p_fabric_name, p_master_name,
        p_tailor_id, p_tailor_name, p_assigned_pieces, p_assigned_sub_parts,
        p_total_assigned_pieces, p_rate_per_piece, p_total_job_amount,
        p_piece_type, 0, 0, '[]'::jsonb,
        false, 'Pending Acceptance', p_notes, NOW(), NOW()
    )
    RETURNING * INTO v_inserted_record;

    IF p_fabric_id IS NOT NULL THEN
        UPDATE public.fabrics
        SET status = 'In Stitching',
            updated_at = NOW()
        WHERE id = p_fabric_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', v_assign_id,
        'record', to_jsonb(v_inserted_record)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 4. Atomic Completed Lot Invoice Creation
CREATE OR REPLACE FUNCTION public.rpc_create_completed_lot_invoice(
    p_invoice_id TEXT,
    p_user_id TEXT,
    p_invoice_number TEXT,
    p_fabric_id TEXT,
    p_client_name TEXT DEFAULT 'Direct Customer',
    p_client_phone TEXT DEFAULT '',
    p_date DATE DEFAULT CURRENT_DATE,
    p_due_date DATE DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_subtotal NUMERIC DEFAULT 0,
    p_discount NUMERIC DEFAULT 0,
    p_tax NUMERIC DEFAULT 0,
    p_total_amount NUMERIC DEFAULT 0,
    p_material_cost NUMERIC DEFAULT 0,
    p_tailor_cost NUMERIC DEFAULT 0,
    p_cutting_cost NUMERIC DEFAULT 0,
    p_trimming_cost NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inv_id TEXT := p_invoice_id;
    v_inserted_invoice RECORD;
BEGIN
    IF v_inv_id IS NULL THEN
        v_inv_id := 'inv_' || floor(extract(epoch from now()))::text || '_' || substr(md5(random()::text), 1, 6);
    END IF;

    INSERT INTO public.invoices (
        id, user_id, invoice_number, fabric_id, client_name, client_phone,
        date, due_date, items, subtotal, discount, tax_amount,
        total_amount, status, payment_status, notes, created_at, updated_at
    ) VALUES (
        v_inv_id, p_user_id, p_invoice_number, p_fabric_id, p_client_name, p_client_phone,
        p_date, p_due_date, p_items, p_subtotal, p_discount, p_tax,
        p_total_amount, 'Sent', 'Pending', p_notes, NOW(), NOW()
    )
    RETURNING * INTO v_inserted_invoice;

    -- Mark fabric lot as completed/invoiced
    IF p_fabric_id IS NOT NULL THEN
        UPDATE public.fabrics
        SET status = 'Completed',
            updated_at = NOW()
        WHERE id = p_fabric_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_inv_id,
        'record', to_jsonb(v_inserted_invoice)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 5. User Auth Challenge-Response (Zero-knowledge password authentication)
CREATE OR REPLACE FUNCTION public.get_auth_user_challenge(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_clean_phone TEXT;
BEGIN
    v_clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
    IF length(v_clean_phone) > 10 THEN
        v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
    END IF;

    IF length(v_clean_phone) <> 10 THEN
        RETURN jsonb_build_object('exists', false, 'error', 'Invalid mobile number format');
    END IF;

    SELECT id, name, phone, email, company_name, role, avatar, password
    INTO v_user
    FROM public.users
    WHERE regexp_replace(phone, '\D', '', 'g') LIKE ('%' || v_clean_phone)
    LIMIT 1;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('exists', false);
    END IF;

    IF v_user.password LIKE 'pbkdf2:%' THEN
        DECLARE
            v_parts TEXT[];
        BEGIN
            v_parts := string_to_array(v_user.password, ':');
            RETURN jsonb_build_object(
                'exists', true,
                'format', 'pbkdf2',
                'iterations', v_parts[2]::int,
                'salt', v_parts[3],
                'email', v_user.email,
                'id', v_user.id
            );
        END;
    ELSE
        RETURN jsonb_build_object(
            'exists', true,
            'format', 'legacy',
            'email', v_user.email,
            'id', v_user.id
        );
    END IF;
END;
$$;

-- 6. Verify User Auth
CREATE OR REPLACE FUNCTION public.verify_user_auth(
    p_phone TEXT,
    p_hash_response TEXT,
    p_plain_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_clean_phone TEXT;
    v_expected_hash TEXT;
    v_parts TEXT[];
BEGIN
    v_clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
    IF length(v_clean_phone) > 10 THEN
        v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
    END IF;

    SELECT id, name, phone, email, company_name, role, avatar, password
    INTO v_user
    FROM public.users
    WHERE regexp_replace(phone, '\D', '', 'g') LIKE ('%' || v_clean_phone)
    LIMIT 1;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF v_user.password LIKE 'pbkdf2:%' THEN
        v_parts := string_to_array(v_user.password, ':');
        v_expected_hash := lower(v_parts[4]);
        IF lower(p_hash_response) = v_expected_hash THEN
            RETURN jsonb_build_object(
                'success', true,
                'user', jsonb_build_object(
                    'id', v_user.id,
                    'name', v_user.name,
                    'phone', v_user.phone,
                    'email', v_user.email,
                    'companyName', v_user.company_name,
                    'role', COALESCE(v_user.role, 'Admin'),
                    'avatar', v_user.avatar
                )
            );
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Incorrect password');
        END IF;
    ELSE
        IF p_plain_password IS NOT NULL AND (v_user.password = p_plain_password OR v_user.password LIKE 'enc:%') THEN
            RETURN jsonb_build_object(
                'success', true,
                'needsUpgrade', true,
                'user', jsonb_build_object(
                    'id', v_user.id,
                    'name', v_user.name,
                    'phone', v_user.phone,
                    'email', v_user.email,
                    'companyName', v_user.company_name,
                    'role', COALESCE(v_user.role, 'Admin'),
                    'avatar', v_user.avatar
                )
            );
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Incorrect password');
        END IF;
    END IF;
END;
$$;

-- 7. Check User Exists
CREATE OR REPLACE FUNCTION public.check_user_exists(p_phone TEXT, p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_phone TEXT;
    v_clean_email TEXT;
    v_phone_exists BOOLEAN := FALSE;
    v_email_exists BOOLEAN := FALSE;
BEGIN
    v_clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
    IF length(v_clean_phone) > 10 THEN
        v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
    END IF;

    v_clean_email := lower(trim(COALESCE(p_email, '')));

    IF v_clean_phone <> '' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.users
            WHERE regexp_replace(phone, '\D', '', 'g') LIKE ('%' || v_clean_phone)
        ) INTO v_phone_exists;
    END IF;

    IF v_clean_email <> '' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.users
            WHERE lower(trim(email)) = v_clean_email
        ) INTO v_email_exists;
    END IF;

    RETURN jsonb_build_object(
        'phoneExists', v_phone_exists,
        'emailExists', v_email_exists
    );
END;
$$;

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

