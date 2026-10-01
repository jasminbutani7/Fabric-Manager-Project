-- =============================================================================
-- FABRIC MANAGER - SUPABASE POSTGRESQL DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor to create all tables and policies.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. USERS TABLE (For Admins and System Users)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    company_name TEXT,
    role TEXT DEFAULT 'Admin',
    password TEXT,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. MASTERS TABLE
CREATE TABLE IF NOT EXISTS public.masters (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role TEXT DEFAULT 'Master',
    name TEXT NOT NULL,
    phone TEXT,
    specialization TEXT,
    experience TEXT,
    status TEXT DEFAULT 'Active',
    joined_date DATE,
    left_date DATE,
    exit_reason TEXT,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MACHINES TABLE
CREATE TABLE IF NOT EXISTS public.machines (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    brand TEXT,
    line TEXT,
    status TEXT DEFAULT 'Active',
    assigned_tailor_id TEXT,
    notes TEXT,
    operator_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TAILORS TABLE
CREATE TABLE IF NOT EXISTS public.tailors (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role TEXT DEFAULT 'Tailor',
    name TEXT NOT NULL,
    phone TEXT,
    assigned_machine_id TEXT,
    specialty TEXT DEFAULT 'Stitching',
    status TEXT DEFAULT 'Active',
    joined_date DATE,
    left_date DATE,
    exit_reason TEXT,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HELPERS TABLE
CREATE TABLE IF NOT EXISTS public.helpers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role TEXT DEFAULT 'Helper',
    name TEXT NOT NULL,
    phone TEXT,
    helper_category TEXT,
    helper_type TEXT,
    assigned_master_id TEXT,
    work_type TEXT,
    wage_type TEXT,
    default_rate_per_piece NUMERIC DEFAULT 0,
    default_rate_per_psc NUMERIC DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'Active',
    joined_date DATE,
    left_date DATE,
    exit_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    whatsapp TEXT,
    category TEXT DEFAULT 'Fabric / Cloth',
    address TEXT,
    gst_number TEXT,
    payment_terms TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FABRICS TABLE
CREATE TABLE IF NOT EXISTS public.fabrics (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    lot_no INTEGER,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    supplier_phone TEXT,
    assigned_master_id TEXT,
    assigned_master_name TEXT,
    plain_meters NUMERIC DEFAULT 0,
    target_sets INTEGER DEFAULT 0,
    print_pieces INTEGER DEFAULT 0,
    lot_size_print_fabric_psc INTEGER DEFAULT 0,
    price_per_set NUMERIC DEFAULT 0,
    price_per_piece NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    product_name TEXT,
    product_structure JSONB,
    color TEXT,
    date DATE,
    due_date DATE,
    fabric_type TEXT,
    status TEXT DEFAULT 'In Stock',
    notes TEXT,
    tailor_rates JSONB,
    delivered_psc INTEGER DEFAULT 0,
    sub_parts_delivered JSONB DEFAULT '{}'::jsonb,
    delivery_logs JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CUTTINGS TABLE
CREATE TABLE IF NOT EXISTS public.cuttings (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    fabric_id TEXT REFERENCES public.fabrics(id) ON DELETE CASCADE,
    fabric_name TEXT,
    fabric_color TEXT,
    master_id TEXT,
    master_name TEXT,
    product_name TEXT,
    cut_pieces JSONB,
    total_pieces INTEGER DEFAULT 0,
    sets_count INTEGER DEFAULT 0,
    meters_used NUMERIC,
    status TEXT DEFAULT 'Ready for Stitching',
    notes TEXT,
    tailor_rates JSONB,
    product_structure JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TAILOR ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.tailor_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    cutting_id TEXT REFERENCES public.cuttings(id) ON DELETE CASCADE,
    fabric_id TEXT,
    fabric_name TEXT,
    master_name TEXT,
    tailor_id TEXT REFERENCES public.tailors(id) ON DELETE CASCADE,
    tailor_name TEXT,
    assigned_cut_pieces JSONB,
    assigned_garment_pcs JSONB,
    assigned_pieces JSONB,
    assigned_sub_parts JSONB,
    total_assigned_pieces INTEGER DEFAULT 0,
    rate_per_piece NUMERIC DEFAULT 0,
    total_job_amount NUMERIC DEFAULT 0,
    piece_type TEXT,
    status TEXT DEFAULT 'Pending Acceptance',
    completed_quantity INTEGER DEFAULT 0,
    total_earned NUMERIC DEFAULT 0,
    daily_submissions JSONB DEFAULT '[]'::jsonb,
    tailor_accepted BOOLEAN DEFAULT false,
    accepted_at TIMESTAMPTZ,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. MASTER HANDOVERS TABLE
CREATE TABLE IF NOT EXISTS public.master_handovers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    fabric_id TEXT,
    cutting_id TEXT,
    master_id TEXT,
    master_name TEXT,
    pieces_count INTEGER DEFAULT 0,
    sub_parts JSONB DEFAULT '{}'::jsonb,
    parts JSONB DEFAULT '{}'::jsonb,
    trimming_status TEXT,
    trimmed_pieces INTEGER DEFAULT 0,
    skipped_trimming_pieces INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. THREAD CUTTING ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.thread_cutting_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    fabric_id TEXT,
    cutting_id TEXT,
    helper_id TEXT,
    helper_name TEXT,
    helper_type TEXT,
    helper_phone TEXT,
    sub_part TEXT,
    sub_part_name TEXT,
    action_type TEXT DEFAULT 'assign',
    fabric_name TEXT,
    handover_id TEXT,
    master_id TEXT,
    master_name TEXT,
    created_by_role TEXT,
    assigned_pieces INTEGER DEFAULT 0,
    completed_pieces INTEGER DEFAULT 0,
    rate_per_piece NUMERIC DEFAULT 0,
    assigned_psc INTEGER DEFAULT 0,
    completed_psc INTEGER DEFAULT 0,
    rate_per_psc NUMERIC DEFAULT 0,
    total_estimated_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Assigned',
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    category TEXT,
    expense_type TEXT,
    salary_sub_type TEXT,
    worker_id TEXT,
    worker_name TEXT,
    machine_id TEXT,
    machine_code TEXT,
    title TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    date DATE,
    month TEXT,
    payment_method TEXT,
    paid_to TEXT,
    reference_no TEXT,
    notes TEXT,
    fabric_id TEXT,
    cutting_id TEXT,
    description TEXT,
    recipient TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    invoice_number TEXT NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    client_address TEXT,
    date DATE,
    due_date DATE,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    due_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    notes TEXT,
    payments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PRODUCT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.product_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    full_set_rate NUMERIC DEFAULT 0,
    sub_parts JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. DELIVERY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.delivery_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    fabric_id TEXT,
    cutting_id TEXT,
    thread_job_id TEXT,
    invoice_id TEXT,
    invoice_number TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    supplier_phone TEXT,
    total_pieces INTEGER DEFAULT 0,
    sub_parts JSONB DEFAULT '{}'::jsonb,
    price_per_piece NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    delivery_date DATE,
    due_date DATE,
    vehicle_no TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. INVOICE_EXPENSES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.invoice_expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    invoice_id TEXT REFERENCES public.invoices(id) ON DELETE CASCADE,
    expense_id TEXT REFERENCES public.expenses(id) ON DELETE CASCADE,
    fabric_id TEXT REFERENCES public.fabrics(id) ON DELETE SET NULL,
    cutting_id TEXT REFERENCES public.cuttings(id) ON DELETE SET NULL,
    cost_type TEXT DEFAULT 'direct_cost',
    allocated_amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations to safely add user_id column if tables already exist
ALTER TABLE public.masters ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.tailors ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.helpers ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.cuttings ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.tailor_assignments ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.master_handovers ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.invoice_expenses ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.product_templates ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.delivery_logs ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Migrations for meaningful column names and clean role defaults
ALTER TABLE public.tailors ALTER COLUMN role SET DEFAULT 'Tailor';
ALTER TABLE public.helpers ADD COLUMN IF NOT EXISTS default_rate_per_piece NUMERIC DEFAULT 0;
ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS target_sets INTEGER DEFAULT 0;
ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS price_per_set NUMERIC DEFAULT 0;
ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS delivered_psc INTEGER DEFAULT 0;
ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS sub_parts_delivered JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS delivery_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tailor_assignments ADD COLUMN IF NOT EXISTS assigned_cut_pieces JSONB;
ALTER TABLE public.tailor_assignments ADD COLUMN IF NOT EXISTS assigned_garment_pcs JSONB;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS assigned_pieces INTEGER DEFAULT 0;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS completed_pieces INTEGER DEFAULT 0;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS rate_per_piece NUMERIC DEFAULT 0;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS helper_phone TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS sub_part TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS sub_part_name TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS fabric_name TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS handover_id TEXT;

-- =============================================================================
-- SECTION: OPERATIONAL FOREIGN KEY CONSTRAINTS (Idempotent)
-- =============================================================================
DO $$
BEGIN
  -- master_handovers -> fabrics
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_master_handovers_fabric') THEN
    ALTER TABLE public.master_handovers
      ADD CONSTRAINT fk_master_handovers_fabric
      FOREIGN KEY (fabric_id) REFERENCES public.fabrics(id) ON DELETE CASCADE;
  END IF;

  -- master_handovers -> cuttings
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_master_handovers_cutting') THEN
    ALTER TABLE public.master_handovers
      ADD CONSTRAINT fk_master_handovers_cutting
      FOREIGN KEY (cutting_id) REFERENCES public.cuttings(id) ON DELETE CASCADE;
  END IF;

  -- master_handovers -> masters
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_master_handovers_master') THEN
    ALTER TABLE public.master_handovers
      ADD CONSTRAINT fk_master_handovers_master
      FOREIGN KEY (master_id) REFERENCES public.masters(id) ON DELETE SET NULL;
  END IF;

  -- thread_cutting_assignments -> fabrics
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_thread_cutting_fabric') THEN
    ALTER TABLE public.thread_cutting_assignments
      ADD CONSTRAINT fk_thread_cutting_fabric
      FOREIGN KEY (fabric_id) REFERENCES public.fabrics(id) ON DELETE CASCADE;
  END IF;

  -- thread_cutting_assignments -> cuttings
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_thread_cutting_cutting') THEN
    ALTER TABLE public.thread_cutting_assignments
      ADD CONSTRAINT fk_thread_cutting_cutting
      FOREIGN KEY (cutting_id) REFERENCES public.cuttings(id) ON DELETE CASCADE;
  END IF;

  -- thread_cutting_assignments -> helpers
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_thread_cutting_helper') THEN
    ALTER TABLE public.thread_cutting_assignments
      ADD CONSTRAINT fk_thread_cutting_helper
      FOREIGN KEY (helper_id) REFERENCES public.helpers(id) ON DELETE SET NULL;
  END IF;

  -- delivery_logs -> fabrics
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_delivery_logs_fabric') THEN
    ALTER TABLE public.delivery_logs
      ADD CONSTRAINT fk_delivery_logs_fabric
      FOREIGN KEY (fabric_id) REFERENCES public.fabrics(id) ON DELETE CASCADE;
  END IF;

  -- delivery_logs -> cuttings
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_delivery_logs_cutting') THEN
    ALTER TABLE public.delivery_logs
      ADD CONSTRAINT fk_delivery_logs_cutting
      FOREIGN KEY (cutting_id) REFERENCES public.cuttings(id) ON DELETE CASCADE;
  END IF;

  -- delivery_logs -> suppliers
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_delivery_logs_supplier') THEN
    ALTER TABLE public.delivery_logs
      ADD CONSTRAINT fk_delivery_logs_supplier
      FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;
  END IF;

  -- expenses -> fabrics
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_fabric') THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT fk_expenses_fabric
      FOREIGN KEY (fabric_id) REFERENCES public.fabrics(id) ON DELETE SET NULL;
  END IF;

  -- expenses -> cuttings
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_cutting') THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT fk_expenses_cutting
      FOREIGN KEY (cutting_id) REFERENCES public.cuttings(id) ON DELETE SET NULL;
  END IF;

  -- expenses -> machines
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_machine') THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT fk_expenses_machine
      FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;
  END IF;

  -- machines -> tailors
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_machines_tailor') THEN
    ALTER TABLE public.machines
      ADD CONSTRAINT fk_machines_tailor
      FOREIGN KEY (assigned_tailor_id) REFERENCES public.tailors(id) ON DELETE SET NULL;
  END IF;

  -- tailors -> machines
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tailors_machine') THEN
    ALTER TABLE public.tailors
      ADD CONSTRAINT fk_tailors_machine
      FOREIGN KEY (assigned_machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;
  END IF;

  -- helpers -> masters
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_helpers_master') THEN
    ALTER TABLE public.helpers
      ADD CONSTRAINT fk_helpers_master
      FOREIGN KEY (assigned_master_id) REFERENCES public.masters(id) ON DELETE SET NULL;
  END IF;

  -- fabrics -> masters
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fabrics_master') THEN
    ALTER TABLE public.fabrics
      ADD CONSTRAINT fk_fabrics_master
      FOREIGN KEY (assigned_master_id) REFERENCES public.masters(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- SECTION: PERFORMANCE & QUERY OPTIMIZATION INDEXES (Idempotent)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_masters_user_id ON public.masters(user_id);
CREATE INDEX IF NOT EXISTS idx_masters_phone ON public.masters(phone);
CREATE INDEX IF NOT EXISTS idx_masters_status ON public.masters(status);

CREATE INDEX IF NOT EXISTS idx_machines_user_id ON public.machines(user_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON public.machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_assigned_tailor ON public.machines(assigned_tailor_id);

CREATE INDEX IF NOT EXISTS idx_tailors_user_id ON public.tailors(user_id);
CREATE INDEX IF NOT EXISTS idx_tailors_phone ON public.tailors(phone);
CREATE INDEX IF NOT EXISTS idx_tailors_status ON public.tailors(status);
CREATE INDEX IF NOT EXISTS idx_tailors_assigned_machine ON public.tailors(assigned_machine_id);

CREATE INDEX IF NOT EXISTS idx_helpers_user_id ON public.helpers(user_id);
CREATE INDEX IF NOT EXISTS idx_helpers_status ON public.helpers(status);
CREATE INDEX IF NOT EXISTS idx_helpers_assigned_master ON public.helpers(assigned_master_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON public.suppliers(phone);

CREATE INDEX IF NOT EXISTS idx_fabrics_user_id ON public.fabrics(user_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_status ON public.fabrics(status);
CREATE INDEX IF NOT EXISTS idx_fabrics_supplier ON public.fabrics(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_master ON public.fabrics(assigned_master_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_date ON public.fabrics(date);

CREATE INDEX IF NOT EXISTS idx_cuttings_user_id ON public.cuttings(user_id);
CREATE INDEX IF NOT EXISTS idx_cuttings_fabric_id ON public.cuttings(fabric_id);
CREATE INDEX IF NOT EXISTS idx_cuttings_master_id ON public.cuttings(master_id);
CREATE INDEX IF NOT EXISTS idx_cuttings_status ON public.cuttings(status);

CREATE INDEX IF NOT EXISTS idx_tailor_assignments_user_id ON public.tailor_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_tailor_assignments_tailor_id ON public.tailor_assignments(tailor_id);
CREATE INDEX IF NOT EXISTS idx_tailor_assignments_cutting_id ON public.tailor_assignments(cutting_id);
CREATE INDEX IF NOT EXISTS idx_tailor_assignments_fabric_id ON public.tailor_assignments(fabric_id);
CREATE INDEX IF NOT EXISTS idx_tailor_assignments_status ON public.tailor_assignments(status);
CREATE INDEX IF NOT EXISTS idx_tailor_assignments_archived ON public.tailor_assignments(is_archived);

CREATE INDEX IF NOT EXISTS idx_master_handovers_user_id ON public.master_handovers(user_id);
CREATE INDEX IF NOT EXISTS idx_master_handovers_fabric_id ON public.master_handovers(fabric_id);
CREATE INDEX IF NOT EXISTS idx_master_handovers_cutting_id ON public.master_handovers(cutting_id);
CREATE INDEX IF NOT EXISTS idx_master_handovers_master_id ON public.master_handovers(master_id);
CREATE INDEX IF NOT EXISTS idx_master_handovers_status ON public.master_handovers(status);

CREATE INDEX IF NOT EXISTS idx_thread_cutting_user_id ON public.thread_cutting_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_cutting_fabric_id ON public.thread_cutting_assignments(fabric_id);
CREATE INDEX IF NOT EXISTS idx_thread_cutting_cutting_id ON public.thread_cutting_assignments(cutting_id);
CREATE INDEX IF NOT EXISTS idx_thread_cutting_helper_id ON public.thread_cutting_assignments(helper_id);
CREATE INDEX IF NOT EXISTS idx_thread_cutting_status ON public.thread_cutting_assignments(status);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_fabric_id ON public.expenses(fabric_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cutting_id ON public.expenses(cutting_id);
CREATE INDEX IF NOT EXISTS idx_expenses_worker_id ON public.expenses(worker_id);
CREATE INDEX IF NOT EXISTS idx_expenses_machine_id ON public.expenses(machine_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(date);

CREATE INDEX IF NOT EXISTS idx_invoice_expenses_user_id ON public.invoice_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_expenses_invoice_id ON public.invoice_expenses(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_expenses_expense_id ON public.invoice_expenses(expense_id);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_user_id ON public.delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_fabric_id ON public.delivery_logs(fabric_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_cutting_id ON public.delivery_logs(cutting_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_supplier_id ON public.delivery_logs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_date ON public.delivery_logs(delivery_date);

CREATE INDEX IF NOT EXISTS idx_product_templates_user_id ON public.product_templates(user_id);

-- =============================================================================
-- SECTION: SECURE AUTHENTICATION RPC FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.verify_user_credentials(p_phone TEXT, p_password_hash TEXT)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    phone TEXT,
    company_name TEXT,
    role TEXT,
    avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.phone, u.company_name, u.role, u.avatar
    FROM public.users u
    WHERE (u.phone = p_phone OR u.phone = '+91' || p_phone OR u.phone = '91' || p_phone)
      AND u.password = p_password_hash
    LIMIT 1;
END;
$$;

-- =============================================================================
-- SECTION: ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuttings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_cutting_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;

-- Extension for cryptographic signing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Dedicated table for auth server secrets (isolated from any client API)
CREATE TABLE IF NOT EXISTS public.auth_secrets (
  key TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
REVOKE ALL ON public.auth_secrets FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.get_or_create_auth_secret(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT secret INTO v_secret FROM public.auth_secrets WHERE key = p_key;
  IF v_secret IS NULL THEN
    v_secret := md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text);
    INSERT INTO public.auth_secrets (key, secret) VALUES (p_key, v_secret)
    ON CONFLICT (key) DO UPDATE SET secret = EXCLUDED.secret
    RETURNING secret INTO v_secret;
  END IF;
  RETURN v_secret;
END;
$$;

-- RFC 7519 URL-safe Base64 encoder and decoder
CREATE OR REPLACE FUNCTION public.url_safe_b64encode(p_data BYTEA)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(replace(trim(trailing '=' from encode(p_data, 'base64')), '+', '-'), '/', '_');
$$;

CREATE OR REPLACE FUNCTION public.url_safe_b64decode(p_str TEXT)
RETURNS BYTEA
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT decode(
    replace(replace(p_str, '-', '+'), '_', '/') ||
    repeat('=', (4 - length(p_str) % 4) % 4),
    'base64'
  );
$$;

-- Secure definer function to generate a cryptographically signed HMAC-SHA256 Worker JWT
CREATE OR REPLACE FUNCTION public.sign_worker_jwt(
  p_worker_id TEXT,
  p_role TEXT,
  p_tenant_id TEXT,
  p_name TEXT DEFAULT ''
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
  v_header JSONB;
  v_payload JSONB;
  v_header_b64 TEXT;
  v_payload_b64 TEXT;
  v_data_to_sign TEXT;
  v_signature TEXT;
  v_exp BIGINT;
  v_iat BIGINT;
BEGIN
  v_secret := public.get_or_create_auth_secret('worker_jwt_secret');
  v_iat := extract(epoch from now())::bigint;
  -- Worker token is valid for 30 days
  v_exp := v_iat + (30 * 86400);

  v_header := jsonb_build_object('alg', 'HS256', 'typ', 'JWT');
  v_payload := jsonb_build_object(
    'sub', p_worker_id,
    'worker_id', p_worker_id,
    'role', p_role,
    'tenant_id', p_tenant_id,
    'name', p_name,
    'iat', v_iat,
    'exp', v_exp
  );

  v_header_b64 := public.url_safe_b64encode(convert_to(v_header::text, 'UTF8'));
  v_payload_b64 := public.url_safe_b64encode(convert_to(v_payload::text, 'UTF8'));
  v_data_to_sign := v_header_b64 || '.' || v_payload_b64;

  v_signature := public.url_safe_b64encode(
    hmac(convert_to(v_data_to_sign, 'UTF8'), convert_to(v_secret, 'UTF8'), 'sha256')
  );

  RETURN v_data_to_sign || '.' || v_signature;
END;
$$;

-- Secure definer function to verify a Worker JWT signature and payload
CREATE OR REPLACE FUNCTION public.verify_worker_jwt(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
  v_parts TEXT[];
  v_header_b64 TEXT;
  v_payload_b64 TEXT;
  v_sig_b64 TEXT;
  v_data_to_verify TEXT;
  v_expected_sig TEXT;
  v_payload JSONB;
  v_exp BIGINT;
  v_worker_id TEXT;
  v_tenant_id TEXT;
  v_role TEXT;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token is empty or invalid');
  END IF;

  IF p_token ILIKE 'Bearer %' THEN
    p_token := substring(p_token from 8);
  END IF;

  v_parts := string_to_array(p_token, '.');
  IF array_length(v_parts, 1) <> 3 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid JWT structure');
  END IF;

  v_header_b64 := v_parts[1];
  v_payload_b64 := v_parts[2];
  v_sig_b64 := v_parts[3];
  v_data_to_verify := v_header_b64 || '.' || v_payload_b64;

  v_secret := public.get_or_create_auth_secret('worker_jwt_secret');

  v_expected_sig := public.url_safe_b64encode(
    hmac(convert_to(v_data_to_verify, 'UTF8'), convert_to(v_secret, 'UTF8'), 'sha256')
  );

  IF v_sig_b64 <> v_expected_sig THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid token signature');
  END IF;

  BEGIN
    v_payload := convert_from(public.url_safe_b64decode(v_payload_b64), 'UTF8')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Failed to decode payload');
  END;

  v_exp := (v_payload->>'exp')::bigint;
  IF v_exp IS NULL OR v_exp < extract(epoch from now())::bigint THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token has expired');
  END IF;

  v_worker_id := v_payload->>'worker_id';
  v_tenant_id := v_payload->>'tenant_id';
  v_role := v_payload->>'role';

  RETURN jsonb_build_object(
    'valid', true,
    'worker_id', v_worker_id,
    'tenant_id', v_tenant_id,
    'role', v_role,
    'payload', v_payload
  );
END;
$$;

-- Secure helper function to validate worker token directly against tenant and active status
CREATE OR REPLACE FUNCTION public.is_valid_worker_token_for_tenant(
  p_token TEXT,
  record_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_res JSONB;
  v_worker_id TEXT;
  v_tenant_id TEXT;
  v_role TEXT;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN FALSE;
  END IF;

  v_res := public.verify_worker_jwt(p_token);
  IF NOT (v_res->>'valid')::boolean THEN
    RETURN FALSE;
  END IF;

  v_worker_id := v_res->>'worker_id';
  v_tenant_id := v_res->>'tenant_id';
  v_role := v_res->>'role';

  IF v_tenant_id IS NULL OR v_tenant_id <> record_user_id THEN
    RETURN FALSE;
  END IF;

  IF v_role = 'Master' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.masters m
      WHERE m.id = v_worker_id
        AND m.user_id = record_user_id
        AND m.status = 'Active'
    );
  ELSIF v_role = 'Tailor' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.tailors t
      WHERE t.id = v_worker_id
        AND t.user_id = record_user_id
        AND t.status = 'Active'
    );
  END IF;

  RETURN FALSE;
END;
$$;

-- Helper to extract current requesting user ID from Supabase Auth JWT
CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    auth.uid()::text,
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  );
$$;

-- Helper to check if record belongs to current requesting tenant/user
CREATE OR REPLACE FUNCTION public.is_tenant_record(record_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_worker_token TEXT;
BEGIN
  -- 1. Service role (migrations / backend scripts) has full access
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- 2. Native Supabase Auth authenticated user matches record
  IF public.requesting_user_id() IS NOT NULL AND record_user_id = public.requesting_user_id() THEN
    RETURN TRUE;
  END IF;

  -- 3. Authenticated active worker strictly via cryptographically signed Worker JWT
  BEGIN
    v_worker_token := coalesce(
      current_setting('request.headers', true)::json->>'x-worker-token',
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'worker_token')
    );
  EXCEPTION WHEN OTHERS THEN
    v_worker_token := NULL;
  END;

  IF v_worker_token IS NOT NULL AND public.is_valid_worker_token_for_tenant(v_worker_token, record_user_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Scoped Users RLS Policies
DROP POLICY IF EXISTS "Allow public access on users" ON public.users;
DROP POLICY IF EXISTS "Allow insert on users for signup" ON public.users;
DROP POLICY IF EXISTS "Allow select on users" ON public.users;
DROP POLICY IF EXISTS "Allow update on users" ON public.users;

CREATE POLICY "Allow insert on users for signup" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select on users" ON public.users FOR SELECT USING (
  auth.role() = 'service_role' OR
  id = public.requesting_user_id()
);
CREATE POLICY "Allow update on users" ON public.users FOR UPDATE USING (
  auth.role() = 'service_role' OR
  id = public.requesting_user_id()
) WITH CHECK (
  auth.role() = 'service_role' OR
  id = public.requesting_user_id()
);

-- Secure definer function to retrieve user profile safely bypassing raw table RLS
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, name, phone, company_name, role, avatar
  INTO v_user
  FROM public.users
  WHERE id = p_user_id;

  IF v_user.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_user.id,
    'name', v_user.name,
    'phone', v_user.phone,
    'company_name', v_user.company_name,
    'companyName', v_user.company_name,
    'role', v_user.role,
    'avatar', v_user.avatar
  );
END;
$$;

-- Secure definer function to update password with verified email matching
CREATE OR REPLACE FUNCTION public.update_user_password(p_email TEXT, p_new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET password = p_new_password, updated_at = NOW()
  WHERE LOWER(email) = LOWER(p_email);
  RETURN FOUND;
END;
$$;

-- Secure definer function to safely check user existence during registration
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

-- Secure definer function to retrieve user authentication challenge (PBKDF2 salt/iterations) without exposing stored hash
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

-- Secure definer function to verify user auth response without sending password hash to client
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

-- Secure definer function to verify worker PIN and return safe worker session
CREATE OR REPLACE FUNCTION public.verify_worker_pin(
  p_worker_id TEXT,
  p_role TEXT,
  p_pin TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_stored_pw TEXT;
  v_clean_phone TEXT;
  v_last4 TEXT;
  v_valid BOOLEAN := FALSE;
  v_default_pin TEXT;
  v_token TEXT;
BEGIN
  IF p_role = 'Master' THEN
    v_default_pin := 'master123';
    IF p_worker_id IS NOT NULL AND p_worker_id <> '' THEN
      SELECT id, name, phone, user_id, role, password, status
      INTO v_record
      FROM public.masters
      WHERE id = p_worker_id;
    ELSIF p_phone IS NOT NULL THEN
      v_clean_phone := regexp_replace(p_phone, '\D', '', 'g');
      IF length(v_clean_phone) > 10 THEN
        v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
      END IF;
      SELECT id, name, phone, user_id, role, password, status
      INTO v_record
      FROM public.masters
      WHERE regexp_replace(phone, '\D', '', 'g') LIKE ('%' || v_clean_phone)
      LIMIT 1;
    END IF;
  ELSIF p_role = 'Tailor' THEN
    v_default_pin := 'tailor123';
    IF p_worker_id IS NOT NULL AND p_worker_id <> '' THEN
      SELECT id, name, phone, user_id, role, password, status
      INTO v_record
      FROM public.tailors
      WHERE id = p_worker_id;
    ELSIF p_phone IS NOT NULL THEN
      v_clean_phone := regexp_replace(p_phone, '\D', '', 'g');
      IF length(v_clean_phone) > 10 THEN
        v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
      END IF;
      SELECT id, name, phone, user_id, role, password, status
      INTO v_record
      FROM public.tailors
      WHERE regexp_replace(phone, '\D', '', 'g') LIKE ('%' || v_clean_phone)
      LIMIT 1;
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid worker role');
  END IF;

  IF v_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Worker account not found');
  END IF;

  IF v_record.status = 'Archived' OR v_record.status = 'Left' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Worker account is inactive');
  END IF;

  v_stored_pw := COALESCE(v_record.password, '');
  v_clean_phone := regexp_replace(COALESCE(v_record.phone, ''), '\D', '', 'g');
  IF length(v_clean_phone) >= 4 THEN
    v_last4 := substring(v_clean_phone from length(v_clean_phone) - 3);
  ELSE
    v_last4 := '';
  END IF;

  -- If custom password was configured, verify strictly against custom password
  IF v_stored_pw <> '' THEN
    IF v_stored_pw = p_pin THEN
      v_valid := TRUE;
    END IF;
  ELSE
    -- If no password has been configured, allow default pin or last 4 mobile digits
    IF p_pin = v_default_pin OR (v_last4 <> '' AND p_pin = v_last4) THEN
      v_valid := TRUE;
    END IF;
  END IF;

  IF v_valid THEN
    v_token := public.sign_worker_jwt(v_record.id, v_record.role, v_record.user_id, v_record.name);
    RETURN jsonb_build_object(
      'success', true,
      'token', v_token,
      'worker', jsonb_build_object(
        'id', v_record.id,
        'name', v_record.name,
        'phone', v_record.phone,
        'role', v_record.role,
        'user_id', v_record.user_id,
        'token', v_token,
        'status', v_record.status
      )
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Incorrect PIN or password');
  END IF;
END;
$$;

-- Secure definer function to get worker admin contact details for password recovery
CREATE OR REPLACE FUNCTION public.get_worker_admin_details(p_phone TEXT, p_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker RECORD;
  v_admin RECORD;
  v_clean_phone TEXT;
BEGIN
  v_clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(v_clean_phone) > 10 THEN
    v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
  END IF;

  IF p_role = 'Tailor' THEN
    SELECT id, name, phone, user_id, role
    INTO v_worker
    FROM public.tailors
    WHERE regexp_replace(phone, '\D', '', 'g') LIKE ('%' || v_clean_phone)
    LIMIT 1;
  ELSE
    SELECT id, name, phone, user_id, role
    INTO v_worker
    FROM public.masters
    WHERE regexp_replace(phone, '\D', '', 'g') LIKE ('%' || v_clean_phone)
    LIMIT 1;
  END IF;

  IF v_worker.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Worker not found');
  END IF;

  IF v_worker.user_id IS NOT NULL THEN
    SELECT name, phone, company_name
    INTO v_admin
    FROM public.users
    WHERE id = v_worker.user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'workerName', v_worker.name,
    'workerRole', COALESCE(v_worker.role, p_role),
    'adminName', COALESCE(v_admin.name, 'Factory Admin'),
    'adminPhone', COALESCE(v_admin.phone, ''),
    'adminCompanyName', COALESCE(v_admin.company_name, 'Fabric Factory')
  );
END;
$$;

-- Secure definer function to check admin email existence for OTP password reset
CREATE OR REPLACE FUNCTION public.request_password_reset_check(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
  v_clean_email TEXT;
BEGIN
  v_clean_email := lower(trim(COALESCE(p_email, '')));
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE lower(trim(email)) = v_clean_email
  ) INTO v_exists;

  RETURN jsonb_build_object(
    'exists', v_exists
  );
END;
$$;

-- Protect sensitive password columns from direct client API selection
REVOKE SELECT (password) ON public.users FROM anon, authenticated;
REVOKE SELECT (password) ON public.masters FROM anon, authenticated;
REVOKE SELECT (password) ON public.tailors FROM anon, authenticated;



-- Multi-Tenant Operational RLS Policies (Idempotent & Tenant-Isolated)
DROP POLICY IF EXISTS "Allow public access on masters" ON public.masters;
DROP POLICY IF EXISTS "Tenant isolation on masters" ON public.masters;
CREATE POLICY "Tenant isolation on masters" ON public.masters FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on machines" ON public.machines;
DROP POLICY IF EXISTS "Tenant isolation on machines" ON public.machines;
CREATE POLICY "Tenant isolation on machines" ON public.machines FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on tailors" ON public.tailors;
DROP POLICY IF EXISTS "Tenant isolation on tailors" ON public.tailors;
CREATE POLICY "Tenant isolation on tailors" ON public.tailors FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on helpers" ON public.helpers;
DROP POLICY IF EXISTS "Tenant isolation on helpers" ON public.helpers;
CREATE POLICY "Tenant isolation on helpers" ON public.helpers FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Tenant isolation on suppliers" ON public.suppliers;
CREATE POLICY "Tenant isolation on suppliers" ON public.suppliers FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on fabrics" ON public.fabrics;
DROP POLICY IF EXISTS "Tenant isolation on fabrics" ON public.fabrics;
CREATE POLICY "Tenant isolation on fabrics" ON public.fabrics FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on cuttings" ON public.cuttings;
DROP POLICY IF EXISTS "Tenant isolation on cuttings" ON public.cuttings;
CREATE POLICY "Tenant isolation on cuttings" ON public.cuttings FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on tailor_assignments" ON public.tailor_assignments;
DROP POLICY IF EXISTS "Tenant isolation on tailor_assignments" ON public.tailor_assignments;
CREATE POLICY "Tenant isolation on tailor_assignments" ON public.tailor_assignments FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on master_handovers" ON public.master_handovers;
DROP POLICY IF EXISTS "Tenant isolation on master_handovers" ON public.master_handovers;
CREATE POLICY "Tenant isolation on master_handovers" ON public.master_handovers FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on thread_cutting_assignments" ON public.thread_cutting_assignments;
DROP POLICY IF EXISTS "Tenant isolation on thread_cutting_assignments" ON public.thread_cutting_assignments;
CREATE POLICY "Tenant isolation on thread_cutting_assignments" ON public.thread_cutting_assignments FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Tenant isolation on expenses" ON public.expenses;
CREATE POLICY "Tenant isolation on expenses" ON public.expenses FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on invoices" ON public.invoices;
DROP POLICY IF EXISTS "Tenant isolation on invoices" ON public.invoices;
CREATE POLICY "Tenant isolation on invoices" ON public.invoices FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on invoice_expenses" ON public.invoice_expenses;
DROP POLICY IF EXISTS "Tenant isolation on invoice_expenses" ON public.invoice_expenses;
CREATE POLICY "Tenant isolation on invoice_expenses" ON public.invoice_expenses FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on product_templates" ON public.product_templates;
DROP POLICY IF EXISTS "Tenant isolation on product_templates" ON public.product_templates;
CREATE POLICY "Tenant isolation on product_templates" ON public.product_templates FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

DROP POLICY IF EXISTS "Allow public access on delivery_logs" ON public.delivery_logs;
DROP POLICY IF EXISTS "Tenant isolation on delivery_logs" ON public.delivery_logs;
CREATE POLICY "Tenant isolation on delivery_logs" ON public.delivery_logs FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));

-- Drop deprecated columns if they exist
ALTER TABLE public.tailors DROP COLUMN IF EXISTS salary_type;

-- Scoped invoice number uniqueness per user/business account
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_user_invoice_unique'
  ) THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_user_invoice_unique UNIQUE (user_id, invoice_number);
  END IF;
END $$;

-- Enable Realtime publication for key live tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'fabrics',
    'cuttings',
    'tailor_assignments',
    'master_handovers',
    'thread_cutting_assignments',
    'expenses',
    'invoices',
    'delivery_logs'
  ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    END IF;
  END LOOP;
END $$;

-- 22. IDEMPOTENT MIGRATIONS FOR SCHEMA NORMALIZATION (PHASE 2)
ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS delivered_psc INTEGER DEFAULT 0;
ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS sub_parts_delivered JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS delivery_logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.master_handovers ADD COLUMN IF NOT EXISTS sub_parts JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.master_handovers ADD COLUMN IF NOT EXISTS parts JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.master_handovers ADD COLUMN IF NOT EXISTS trimming_status TEXT;
ALTER TABLE public.master_handovers ADD COLUMN IF NOT EXISTS trimmed_pieces INTEGER DEFAULT 0;
ALTER TABLE public.master_handovers ADD COLUMN IF NOT EXISTS skipped_trimming_pieces INTEGER DEFAULT 0;
ALTER TABLE public.master_handovers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS helper_phone TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS sub_part TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS sub_part_name TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'assign';
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS fabric_name TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS handover_id TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS master_id TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS master_name TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS created_by_role TEXT;
ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 23. IDEMPOTENT MIGRATIONS FOR UNIVERSAL ARCHIVING ON DELIVERY LOGS
ALTER TABLE public.delivery_logs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.delivery_logs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.delivery_logs ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_delivery_logs_archived ON public.delivery_logs(is_archived);

-- =============================================================================
-- 24. ATOMIC STORED PROCEDURES & MULTI-TABLE TRANSACTIONS
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

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR TENANT ISOLATION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    auth.uid()::text,
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_record(record_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_worker_token TEXT;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF public.requesting_user_id() IS NOT NULL AND record_user_id = public.requesting_user_id() THEN
    RETURN TRUE;
  END IF;

  BEGIN
    v_worker_token := coalesce(
      current_setting('request.headers', true)::json->>'x-worker-token',
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'worker_token')
    );
  EXCEPTION WHEN OTHERS THEN
    v_worker_token := NULL;
  END;

  IF v_worker_token IS NOT NULL AND public.is_valid_worker_token_for_tenant(v_worker_token, record_user_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Enable RLS and apply tenant isolation on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on users" ON public.users;
DROP POLICY IF EXISTS "Allow select on users" ON public.users;
DROP POLICY IF EXISTS "Allow update on users" ON public.users;
DROP POLICY IF EXISTS "Allow insert on users for signup" ON public.users;
CREATE POLICY "Allow insert on users for signup" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select on users" ON public.users FOR SELECT USING (
  auth.role() = 'service_role' OR id = public.requesting_user_id()
);
CREATE POLICY "Allow update on users" ON public.users FOR UPDATE USING (
  auth.role() = 'service_role' OR id = public.requesting_user_id()
) WITH CHECK (
  auth.role() = 'service_role' OR id = public.requesting_user_id()
);

DO $$
DECLARE
  tbl text;
  domain_tables text[] := ARRAY[
    'masters',
    'machines',
    'tailors',
    'helpers',
    'suppliers',
    'fabrics',
    'cuttings',
    'tailor_assignments',
    'master_handovers',
    'thread_cutting_assignments',
    'delivery_logs',
    'expenses',
    'invoices',
    'invoice_expenses',
    'product_templates'
  ];
BEGIN
  FOREACH tbl IN ARRAY domain_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'tenant_isolation_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'allow_public_' || tbl, tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.is_tenant_record(user_id)) WITH CHECK (public.is_tenant_record(user_id));', 'tenant_isolation_' || tbl, tbl);
  END LOOP;
END;
$$;

