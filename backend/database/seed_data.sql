-- =============================================================================
-- FABRIC MANAGER - SAMPLE DEMO SEED DATA
-- Production Demo Setup and Initial Environment Verification
-- =============================================================================

-- 1. Demo Admin User (Mobile: 9876543210, Pass: admin123)
INSERT INTO public.users (id, name, phone, email, company_name, role, password)
VALUES (
    'user_demo_admin',
    'Admin User',
    '9876543210',
    'admin@fabricmanager.local',
    'Apex Garments Pvt Ltd',
    'Admin',
    'pbkdf2$100000$7b613936616634353265326364653733$517726f1a8c0840b3cb1c9cb4422e84d416bdf675ba3152c92e76f9c8f041b39'
) ON CONFLICT (id) DO NOTHING;

-- 2. Demo Master (Mobile: 9876543211, PIN: 1234)
INSERT INTO public.masters (id, user_id, role, name, phone, specialization, experience, status, password)
VALUES (
    'mst_demo_01',
    'user_demo_admin',
    'Master',
    'Ramesh Master',
    '9876543211',
    'Shirt Pattern Cutting & Grading',
    '8 Years',
    'Active',
    '1234'
) ON CONFLICT (id) DO NOTHING;

-- 3. Demo Machine
INSERT INTO public.machines (id, user_id, code, name, type, brand, line, status)
VALUES (
    'mch_demo_01',
    'user_demo_admin',
    'SN-101',
    'Single Needle High-Speed Lockstitch',
    'Single Needle',
    'Juki DDL-8700',
    'Line A',
    'Active'
) ON CONFLICT (id) DO NOTHING;

-- 4. Demo Tailor (Mobile: 9876543212, PIN: 1234)
INSERT INTO public.tailors (id, user_id, role, name, phone, assigned_machine_id, specialty, status, password)
VALUES (
    'tlr_demo_01',
    'user_demo_admin',
    'Tailor',
    'Suresh Tailor',
    '9876543212',
    'mch_demo_01',
    'Full Stitching & Collar Assembly',
    'Active',
    '1234'
) ON CONFLICT (id) DO NOTHING;

-- 5. Demo Supplier
INSERT INTO public.suppliers (id, user_id, name, category, contact_person, phone, gst_number, address)
VALUES (
    'sup_demo_01',
    'user_demo_admin',
    'Surat Textile Mills',
    'Fabric Manufacturer',
    'Rajesh Patel',
    '9876543213',
    '24AAACT2727Q1ZB',
    'Ring Road, Surat, Gujarat'
) ON CONFLICT (id) DO NOTHING;

-- 6. Demo Fabric Lot
INSERT INTO public.fabrics (id, user_id, lot_no, supplier_id, supplier_name, plain_meters, target_sets, price_per_set, total_amount, product_name, color, fabric_type, status)
VALUES (
    'fab_demo_01',
    'user_demo_admin',
    101,
    'sup_demo_01',
    'Surat Textile Mills',
    500.00,
    250,
    180.00,
    45000.00,
    'Men Formal Cotton Shirt',
    'Sky Blue',
    '100% Giza Cotton',
    'In Stock'
) ON CONFLICT (id) DO NOTHING;
