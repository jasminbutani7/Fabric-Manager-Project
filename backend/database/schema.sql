-- =============================================================================
-- FABRIC MANAGER - RELATIONAL DATABASE SCHEMA (POSTGRESQL 17)
-- Complete 16-Table Schema for Garment & Textile Manufacturing Operations
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS (Admin / Business Owner)
CREATE TABLE IF NOT EXISTS public.users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    phone         TEXT UNIQUE NOT NULL,
    email         TEXT UNIQUE,
    company_name  TEXT,
    role          TEXT DEFAULT 'Admin',
    password      TEXT,
    avatar        TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. MASTERS (Floor Supervisors & Pattern Cutters)
CREATE TABLE IF NOT EXISTS public.masters (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role           TEXT NOT NULL DEFAULT 'Master',
    name           TEXT NOT NULL,
    phone          TEXT,
    specialization TEXT,
    experience     TEXT,
    status         TEXT NOT NULL DEFAULT 'Active',
    joined_date    DATE,
    left_date      DATE,
    exit_reason    TEXT,
    password       TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_masters_user_id ON public.masters(user_id);
CREATE INDEX IF NOT EXISTS idx_masters_phone ON public.masters(phone);
CREATE INDEX IF NOT EXISTS idx_masters_status ON public.masters(status);

-- 3. MACHINES (Production Machinery & Equipment)
CREATE TABLE IF NOT EXISTS public.machines (
    id                 TEXT PRIMARY KEY,
    user_id            TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    code               TEXT NOT NULL,
    name               TEXT NOT NULL,
    type               TEXT,
    brand              TEXT,
    line               TEXT,
    status             TEXT NOT NULL DEFAULT 'Active',
    assigned_tailor_id TEXT,
    notes              TEXT,
    operator_history   JSONB DEFAULT '[]'::jsonb,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_machines_user_id ON public.machines(user_id);
CREATE INDEX IF NOT EXISTS idx_machines_user_code ON public.machines(user_id, code);
CREATE INDEX IF NOT EXISTS idx_machines_status ON public.machines(status);

-- 4. TAILORS (Stitching Operators & Piece-Workers)
CREATE TABLE IF NOT EXISTS public.tailors (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role                TEXT NOT NULL DEFAULT 'Tailor',
    name                TEXT NOT NULL,
    phone               TEXT,
    assigned_machine_id TEXT REFERENCES public.machines(id) ON DELETE SET NULL,
    specialty           TEXT,
    status              TEXT NOT NULL DEFAULT 'Active',
    joined_date         DATE,
    left_date           DATE,
    exit_reason         TEXT,
    password            TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tailors_user_id ON public.tailors(user_id);
CREATE INDEX IF NOT EXISTS idx_tailors_phone ON public.tailors(phone);
CREATE INDEX IF NOT EXISTS idx_tailors_status ON public.tailors(status);

-- 5. HELPERS (Floor Support, Thread Cutters, Ironers)
CREATE TABLE IF NOT EXISTS public.helpers (
    id                     TEXT PRIMARY KEY,
    user_id                TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role                   TEXT NOT NULL DEFAULT 'Helper',
    name                   TEXT NOT NULL,
    phone                  TEXT,
    helper_category        TEXT,
    helper_type            TEXT,
    assigned_master_id     TEXT REFERENCES public.masters(id) ON DELETE SET NULL,
    work_type              TEXT,
    wage_type              TEXT,
    default_rate_per_piece NUMERIC(10, 2) DEFAULT 0,
    default_rate_per_psc   NUMERIC(10, 2) DEFAULT 0,
    specialty              TEXT,
    notes                  TEXT,
    status                 TEXT NOT NULL DEFAULT 'Active',
    joined_date            DATE,
    left_date              DATE,
    exit_reason            TEXT,
    password               TEXT,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_helpers_user_id ON public.helpers(user_id);
CREATE INDEX IF NOT EXISTS idx_helpers_phone ON public.helpers(phone);
CREATE INDEX IF NOT EXISTS idx_helpers_status ON public.helpers(status);

-- 6. SUPPLIERS (Fabric Mills, Yarn & Trims Vendors)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    category       TEXT,
    contact_person TEXT,
    phone          TEXT,
    whatsapp       TEXT,
    gst_number     TEXT,
    address        TEXT,
    payment_terms  TEXT,
    notes          TEXT,
    status         TEXT NOT NULL DEFAULT 'Active',
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);

-- 7. PRODUCT TEMPLATES (Garment Structures & Default Piece Rates)
CREATE TABLE IF NOT EXISTS public.product_templates (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name          TEXT,
    product_name  TEXT,
    full_set_rate NUMERIC(10, 2) DEFAULT 0,
    sub_parts     JSONB DEFAULT '[]'::jsonb,
    is_default    BOOLEAN DEFAULT false,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_templates_user_id ON public.product_templates(user_id);

-- 8. FABRICS (Inward Fabric Roll Lots)
CREATE TABLE IF NOT EXISTS public.fabrics (
    id                          TEXT PRIMARY KEY,
    user_id                     TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lot_no                      INTEGER,
    supplier_id                 TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name               TEXT,
    supplier_phone              TEXT,
    assigned_master_id          TEXT REFERENCES public.masters(id) ON DELETE SET NULL,
    assigned_master_name        TEXT,
    plain_meters                NUMERIC(12, 2) DEFAULT 0,
    target_sets                 INTEGER DEFAULT 0,
    print_pieces                INTEGER DEFAULT 0,
    lot_size_print_fabric_psc   INTEGER DEFAULT 0,
    price_per_set               NUMERIC(10, 2) DEFAULT 0,
    price_per_piece             NUMERIC(10, 2) DEFAULT 0,
    total_amount                NUMERIC(14, 2) DEFAULT 0,
    product_name                TEXT,
    product_structure           JSONB,
    color                       TEXT,
    date                        DATE,
    due_date                    DATE,
    fabric_type                 TEXT,
    status                      TEXT DEFAULT 'In Stock',
    notes                       TEXT,
    tailor_rates                JSONB,
    delivered_psc               INTEGER DEFAULT 0,
    thread_cutting_decision     TEXT,
    sub_part_trimming_decisions JSONB,
    sub_part_skipped_pieces     JSONB,
    skipped_trimming_logs       JSONB,
    sub_parts_delivered         JSONB,
    is_archived                 BOOLEAN DEFAULT false,
    archived_at                 TIMESTAMPTZ,
    restored_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fabrics_user_id ON public.fabrics(user_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_lot_no ON public.fabrics(user_id, lot_no);
CREATE INDEX IF NOT EXISTS idx_fabrics_status ON public.fabrics(status);

-- 9. CUTTINGS (Cutting Orders & Breakdowns)
CREATE TABLE IF NOT EXISTS public.cuttings (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    fabric_id         TEXT REFERENCES public.fabrics(id) ON DELETE CASCADE,
    fabric_name       TEXT,
    fabric_color      TEXT,
    master_id         TEXT REFERENCES public.masters(id) ON DELETE SET NULL,
    master_name       TEXT,
    product_name      TEXT,
    cut_pieces        JSONB,
    total_pieces      INTEGER DEFAULT 0,
    sets_count        INTEGER DEFAULT 0,
    meters_used       NUMERIC(10, 2) DEFAULT 0,
    tailor_rates      JSONB,
    product_structure JSONB,
    notes             TEXT,
    status            TEXT DEFAULT 'Active',
    is_archived       BOOLEAN DEFAULT false,
    archived_at       TIMESTAMPTZ,
    restored_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cuttings_user_id ON public.cuttings(user_id);
CREATE INDEX IF NOT EXISTS idx_cuttings_fabric_id ON public.cuttings(fabric_id);

-- 10. TAILOR ASSIGNMENTS (Stitching Floor Job Allocations)
CREATE TABLE IF NOT EXISTS public.tailor_assignments (
    id                    TEXT PRIMARY KEY,
    user_id               TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    cutting_id            TEXT REFERENCES public.cuttings(id) ON DELETE CASCADE,
    fabric_id             TEXT REFERENCES public.fabrics(id) ON DELETE CASCADE,
    fabric_name           TEXT,
    master_name           TEXT,
    tailor_id             TEXT REFERENCES public.tailors(id) ON DELETE SET NULL,
    tailor_name           TEXT,
    assigned_cut_pieces   JSONB,
    assigned_garment_pcs  JSONB,
    assigned_pieces       JSONB,
    assigned_sub_parts    JSONB,
    total_assigned_pieces INTEGER DEFAULT 0,
    rate_per_piece        NUMERIC(10, 2) DEFAULT 0,
    total_job_amount      NUMERIC(12, 2) DEFAULT 0,
    piece_type            TEXT,
    completed_quantity    INTEGER DEFAULT 0,
    total_earned          NUMERIC(12, 2) DEFAULT 0,
    daily_submissions     JSONB DEFAULT '[]'::jsonb,
    tailor_accepted       BOOLEAN DEFAULT false,
    accepted_at           TIMESTAMPTZ,
    status                TEXT DEFAULT 'Pending Acceptance',
    is_archived           BOOLEAN DEFAULT false,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON public.tailor_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_tailor_id ON public.tailor_assignments(tailor_id);

-- 11. MASTER HANDOVERS (Finished Stitching Inspection)
CREATE TABLE IF NOT EXISTS public.master_handovers (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    fabric_id           TEXT REFERENCES public.fabrics(id) ON DELETE CASCADE,
    cutting_id          TEXT REFERENCES public.cuttings(id) ON DELETE CASCADE,
    master_id           TEXT REFERENCES public.masters(id) ON DELETE SET NULL,
    master_name         TEXT,
    pieces_count        INTEGER DEFAULT 0,
    sub_parts           JSONB,
    parts               JSONB,
    combination_formula TEXT,
    handover_date       DATE,
    fabric_name         TEXT,
    product_name        TEXT,
    verified_by         TEXT,
    verified_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    rejected_at         TIMESTAMPTZ,
    notes               TEXT,
    status              TEXT DEFAULT 'Pending Verification',
    is_archived         BOOLEAN DEFAULT false,
    archived_at         TIMESTAMPTZ,
    restored_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_handovers_user_id ON public.master_handovers(user_id);

-- 12. THREAD CUTTING ASSIGNMENTS (Trimming & Finishing Work)
CREATE TABLE IF NOT EXISTS public.thread_cutting_assignments (
    id                     TEXT PRIMARY KEY,
    user_id                TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    fabric_id              TEXT REFERENCES public.fabrics(id) ON DELETE CASCADE,
    cutting_id             TEXT REFERENCES public.cuttings(id) ON DELETE CASCADE,
    helper_id              TEXT REFERENCES public.helpers(id) ON DELETE SET NULL,
    helper_name            TEXT,
    helper_type            TEXT,
    helper_phone           TEXT,
    sub_part               TEXT,
    sub_part_name          TEXT,
    action_type            TEXT DEFAULT 'assign',
    fabric_name            TEXT,
    product_name           TEXT,
    handover_id            TEXT REFERENCES public.master_handovers(id) ON DELETE SET NULL,
    expense_id             TEXT,
    assigned_pieces        INTEGER DEFAULT 0,
    completed_pieces       INTEGER DEFAULT 0,
    rate_per_piece         NUMERIC(10, 2) DEFAULT 0,
    assigned_psc           INTEGER DEFAULT 0,
    completed_psc          INTEGER DEFAULT 0,
    rate_per_psc           NUMERIC(10, 2) DEFAULT 0,
    total_estimated_amount NUMERIC(12, 2) DEFAULT 0,
    status                 TEXT DEFAULT 'In Progress',
    is_archived            BOOLEAN DEFAULT false,
    archived_at            TIMESTAMPTZ,
    restored_at            TIMESTAMPTZ,
    notes                  TEXT,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_thread_user_id ON public.thread_cutting_assignments(user_id);

-- 13. EXPENSES (Factory Operational Costs)
CREATE TABLE IF NOT EXISTS public.expenses (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expense_type    TEXT NOT NULL DEFAULT 'Other',
    category        TEXT NOT NULL DEFAULT 'Other',
    title           TEXT NOT NULL,
    salary_sub_type TEXT,
    worker_id       TEXT,
    worker_name     TEXT,
    machine_id      TEXT REFERENCES public.machines(id) ON DELETE SET NULL,
    machine_code    TEXT,
    amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    date            DATE DEFAULT CURRENT_DATE,
    month           TEXT,
    payment_method  TEXT DEFAULT 'Cash',
    paid_to         TEXT,
    reference_no    TEXT,
    notes           TEXT,
    fabric_id       TEXT REFERENCES public.fabrics(id) ON DELETE SET NULL,
    cutting_id      TEXT REFERENCES public.cuttings(id) ON DELETE SET NULL,
    description     TEXT,
    recipient       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);

-- 14. INVOICES (Client Billing & Payment Tracking)
CREATE TABLE IF NOT EXISTS public.invoices (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    client_name    TEXT,
    client_phone   TEXT,
    client_address TEXT,
    date           DATE DEFAULT CURRENT_DATE,
    due_date       DATE,
    items          JSONB DEFAULT '[]'::jsonb,
    subtotal       NUMERIC(14, 2) DEFAULT 0,
    discount       NUMERIC(12, 2) DEFAULT 0,
    tax            NUMERIC(12, 2) DEFAULT 0,
    total_amount   NUMERIC(14, 2) DEFAULT 0,
    paid_amount    NUMERIC(14, 2) DEFAULT 0,
    due_amount     NUMERIC(14, 2) DEFAULT 0,
    status         TEXT DEFAULT 'Pending',
    notes          TEXT,
    payments       JSONB DEFAULT '[]'::jsonb,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);

-- 15. DELIVERY LOGS (Dispatch Challans & Delivery Tracking)
CREATE TABLE IF NOT EXISTS public.delivery_logs (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    fabric_id       TEXT REFERENCES public.fabrics(id) ON DELETE SET NULL,
    cutting_id      TEXT REFERENCES public.cuttings(id) ON DELETE SET NULL,
    thread_job_id   TEXT REFERENCES public.thread_cutting_assignments(id) ON DELETE SET NULL,
    invoice_id      TEXT REFERENCES public.invoices(id) ON DELETE SET NULL,
    invoice_number  TEXT,
    supplier_id     TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name   TEXT,
    supplier_phone  TEXT,
    total_pieces    INTEGER DEFAULT 0,
    sub_parts       JSONB DEFAULT '{}'::jsonb,
    price_per_piece NUMERIC(10, 2) DEFAULT 0,
    total_amount    NUMERIC(14, 2) DEFAULT 0,
    delivery_date   DATE DEFAULT CURRENT_DATE,
    due_date        DATE,
    vehicle_no      TEXT,
    notes           TEXT,
    is_archived     BOOLEAN DEFAULT false,
    archived_at     TIMESTAMPTZ,
    restored_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_user_id ON public.delivery_logs(user_id);

-- 16. INVOICE EXPENSES (Cost Allocation to Invoices)
CREATE TABLE IF NOT EXISTS public.invoice_expenses (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invoice_id       TEXT REFERENCES public.invoices(id) ON DELETE CASCADE,
    expense_id       TEXT REFERENCES public.expenses(id) ON DELETE CASCADE,
    fabric_id        TEXT REFERENCES public.fabrics(id) ON DELETE SET NULL,
    cutting_id       TEXT REFERENCES public.cuttings(id) ON DELETE SET NULL,
    cost_type        TEXT DEFAULT 'direct_cost',
    allocated_amount NUMERIC(12, 2) DEFAULT 0,
    notes            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_exp_user_id ON public.invoice_expenses(user_id);

-- 17. PASSWORD RESETS (Time-To-Live Email OTP Verification & Account Recovery)
CREATE TABLE IF NOT EXISTS public.password_resets (
    id               TEXT PRIMARY KEY,
    email            TEXT NOT NULL,
    otp              TEXT NOT NULL,
    user_id          TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    user_name        TEXT,
    attempts         INTEGER DEFAULT 0,
    verified         BOOLEAN DEFAULT FALSE,
    verified_at      TIMESTAMPTZ,
    expires_at       TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON public.password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON public.password_resets(expires_at);

