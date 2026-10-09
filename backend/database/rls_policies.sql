-- =============================================================================
-- FABRIC MANAGER - ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Data Isolation for 16 Production Tables
-- =============================================================================

-- 1. Helper function: Resolve current authenticated tenant ID
-- Checks Native Supabase JWT 'sub', session header 'x-tenant-id', or JWT claims
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', ''),
    NULLIF(current_setting('request.headers', true)::json->>'x-tenant-id', ''),
    NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')
  );
$$;

-- 2. Helper function: Detect backend service_role / superuser execution
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (
    current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin') OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );
$$;

-- 3. Apply strict tenant-isolated RLS policies across all production tables
DO $$
DECLARE
    t text;
    tenant_tables text[] := ARRAY[
        'masters', 'machines', 'tailors', 'helpers', 'suppliers',
        'product_templates', 'fabrics', 'cuttings', 'tailor_assignments',
        'master_handovers', 'thread_cutting_assignments', 'expenses',
        'invoices', 'delivery_logs', 'invoice_expenses'
    ];
BEGIN
    -- Configure USERS table isolation
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "users_select_policy" ON public.users;
    DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
    DROP POLICY IF EXISTS "users_update_policy" ON public.users;
    DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

    -- Self-service read, update, delete; allow new account signups on insert
    CREATE POLICY "users_select_policy" ON public.users
        FOR SELECT
        USING (public.is_service_role() OR id = public.current_tenant_id());

    CREATE POLICY "users_insert_policy" ON public.users
        FOR INSERT
        WITH CHECK (true);

    CREATE POLICY "users_update_policy" ON public.users
        FOR UPDATE
        USING (public.is_service_role() OR id = public.current_tenant_id())
        WITH CHECK (public.is_service_role() OR id = public.current_tenant_id());

    CREATE POLICY "users_delete_policy" ON public.users
        FOR DELETE
        USING (public.is_service_role() OR id = public.current_tenant_id());

    -- Configure all 15 tenant child tables with strict user_id scoping
    FOREACH t IN ARRAY tenant_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select_policy" ON public.%I;', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert_policy" ON public.%I;', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update_policy" ON public.%I;', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete_policy" ON public.%I;', t, t);

        -- Strict tenant isolation for SELECT
        EXECUTE format(
            'CREATE POLICY "%s_select_policy" ON public.%I FOR SELECT USING (public.is_service_role() OR user_id = public.current_tenant_id());',
            t, t
        );

        -- Strict tenant isolation for INSERT
        EXECUTE format(
            'CREATE POLICY "%s_insert_policy" ON public.%I FOR INSERT WITH CHECK (public.is_service_role() OR user_id = public.current_tenant_id());',
            t, t
        );

        -- Strict tenant isolation for UPDATE
        EXECUTE format(
            'CREATE POLICY "%s_update_policy" ON public.%I FOR UPDATE USING (public.is_service_role() OR user_id = public.current_tenant_id()) WITH CHECK (public.is_service_role() OR user_id = public.current_tenant_id());',
            t, t
        );

        -- Strict tenant isolation for DELETE
        EXECUTE format(
            'CREATE POLICY "%s_delete_policy" ON public.%I FOR DELETE USING (public.is_service_role() OR user_id = public.current_tenant_id());',
            t, t
        );
    END LOOP;
END $$;
