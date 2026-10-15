const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Read credentials with isolation: check scripts/.env.server, .env.server, process.env, with fallback to root .env
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const idx = trimmed.indexOf('=');
      const k = trimmed.substring(0, idx).trim();
      const v = trimmed.substring(idx + 1).trim();
      result[k] = v.replace(/^["']|["']$/g, '');
    }
    return result;
  } catch {
    return {};
  }
}

const serverEnvInScripts = parseEnvFile(path.resolve(__dirname, '.env.server'));
const serverEnvInRoot = parseEnvFile(path.resolve(__dirname, '../.env.server'));
const clientEnvInRoot = parseEnvFile(path.resolve(__dirname, '../.env'));

const mergedEnv = {
  ...clientEnvInRoot,
  ...serverEnvInRoot,
  ...serverEnvInScripts,
};

const supabaseUrl =
  process.env.SUPABASE_URL ||
  mergedEnv.SUPABASE_URL ||
  mergedEnv.VITE_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

const dbPassword =
  process.env.SUPABASE_DB_PASSWORD ||
  mergedEnv.SUPABASE_DB_PASSWORD ||
  '';

if (!dbPassword) {
  console.error('Error: SUPABASE_DB_PASSWORD is not set.');
  console.error('Please configure SUPABASE_DB_PASSWORD in scripts/.env.server (or export as an environment variable).');
  process.exit(1);
}

const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = projectRefMatch ? projectRefMatch[1] : '';

const sqlPath = path.resolve(__dirname, '../backend/database/schema.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Error: schema.sql not found at', sqlPath);
  process.exit(1);
}

const _sql = fs.readFileSync(sqlPath, 'utf8');

async function runMigration() {
  const hostsToTry = [
    'aws-0-ap-south-1.pooler.supabase.com',
    'aws-0-ap-southeast-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
  ];
  const portsToTry = [6543, 5432];

  let client = null;
  for (const host of hostsToTry) {
    for (const port of portsToTry) {
      const c = new Client({
        host,
        port,
        user: `postgres.${projectRef}`,
        password: dbPassword,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
      try {
        await c.connect();
        client = c;
        console.log(`✓ Connected to PostgreSQL (${host}:${port}).`);
        break;
      } catch {
        try { await c.end(); } catch {}
      }
    }
    if (client) break;
  }

  if (!client) {
    console.error('✗ Failed to connect to any Supabase host.');
    process.exit(1);
  }

  try {
    console.log('1. Ensuring email column exists on public.users...');
    await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;');
    console.log('✓ Email column verified.');

    console.log('2. Ensuring pgcrypto and auth_secrets table exist...');
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS public.auth_secrets (
        key TEXT PRIMARY KEY,
        secret TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      REVOKE ALL ON public.auth_secrets FROM anon, authenticated, public;
    `);

    console.log('2b. Ensuring password_resets table exists with RLS...');
    await client.query(`
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
      ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "password_resets_service_only" ON public.password_resets;
      CREATE POLICY "password_resets_service_only" ON public.password_resets
        FOR ALL
        USING (public.is_service_role());
    `);
    console.log('✓ password_resets table verified with RLS.');

    console.log('3. Installing cryptographic functions & RPC helpers...');
    await client.query(`
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
    `);
    console.log('✓ Cryptographic Worker JWT functions and hardened is_tenant_record created/updated.');

    console.log('3. Updating public.users RLS policies for enhanced security (locking down anon access)...');
    await client.query(`
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow public access on users" ON public.users;
      DROP POLICY IF EXISTS "Allow select on users" ON public.users;
      DROP POLICY IF EXISTS "Allow update on users" ON public.users;
      DROP POLICY IF EXISTS "Allow insert on users for signup" ON public.users;

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
    `);
    console.log('✓ public.users RLS policies locked down.');

    console.log('3b. Enabling Row Level Security (RLS) across all domain tables...');
    const domainTables = [
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
      'product_templates',
    ];

    for (const tbl of domainTables) {
      await client.query(`
        ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "tenant_isolation_${tbl}" ON public.${tbl};
        DROP POLICY IF EXISTS "allow_public_${tbl}" ON public.${tbl};
        CREATE POLICY "tenant_isolation_${tbl}" ON public.${tbl}
          FOR ALL
          USING (public.is_tenant_record(user_id))
          WITH CHECK (public.is_tenant_record(user_id));
      `);
    }
    console.log('✓ Row Level Security and tenant isolation policies applied to all 15 domain tables.');

    console.log('4. Installing secure RPC authentication functions...');
    await client.query(`
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
        v_clean_phone := regexp_replace(COALESCE(p_phone, ''), '\\D', '', 'g');
        IF length(v_clean_phone) > 10 THEN
          v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
        END IF;

        v_clean_email := lower(trim(COALESCE(p_email, '')));

        IF v_clean_phone <> '' THEN
          SELECT EXISTS (
            SELECT 1 FROM public.users
            WHERE regexp_replace(phone, '\\D', '', 'g') LIKE ('%' || v_clean_phone)
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
        v_clean_phone := regexp_replace(COALESCE(p_phone, ''), '\\D', '', 'g');
        IF length(v_clean_phone) > 10 THEN
          v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
        END IF;

        IF length(v_clean_phone) <> 10 THEN
          RETURN jsonb_build_object('exists', false, 'error', 'Invalid mobile number format');
        END IF;

        SELECT id, name, phone, email, company_name, role, avatar, password
        INTO v_user
        FROM public.users
        WHERE regexp_replace(phone, '\\D', '', 'g') LIKE ('%' || v_clean_phone)
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
        v_clean_phone := regexp_replace(COALESCE(p_phone, ''), '\\D', '', 'g');
        IF length(v_clean_phone) > 10 THEN
          v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
        END IF;

        SELECT id, name, phone, email, company_name, role, avatar, password
        INTO v_user
        FROM public.users
        WHERE regexp_replace(phone, '\\D', '', 'g') LIKE ('%' || v_clean_phone)
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

      CREATE OR REPLACE FUNCTION public.verify_worker_pin(
        p_worker_id TEXT,
        p_role TEXT,
        p_pin TEXT,
        p_phone TEXT DEFAULT NULL
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, extensions
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
            v_clean_phone := regexp_replace(p_phone, '\\D', '', 'g');
            IF length(v_clean_phone) > 10 THEN
              v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
            END IF;
            SELECT id, name, phone, user_id, role, password, status
            INTO v_record
            FROM public.masters
            WHERE regexp_replace(phone, '\\D', '', 'g') LIKE ('%' || v_clean_phone)
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
            v_clean_phone := regexp_replace(p_phone, '\\D', '', 'g');
            IF length(v_clean_phone) > 10 THEN
              v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
            END IF;
            SELECT id, name, phone, user_id, role, password, status
            INTO v_record
            FROM public.tailors
            WHERE regexp_replace(phone, '\\D', '', 'g') LIKE ('%' || v_clean_phone)
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
        v_clean_phone := regexp_replace(COALESCE(v_record.phone, ''), '\\D', '', 'g');
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
        v_clean_phone := regexp_replace(COALESCE(p_phone, ''), '\\D', '', 'g');
        IF length(v_clean_phone) > 10 THEN
          v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
        END IF;

        IF p_role = 'Tailor' THEN
          SELECT id, name, phone, user_id, role
          INTO v_worker
          FROM public.tailors
          WHERE regexp_replace(phone, '\\D', '', 'g') LIKE ('%' || v_clean_phone)
          LIMIT 1;
        ELSE
          SELECT id, name, phone, user_id, role
          INTO v_worker
          FROM public.masters
          WHERE regexp_replace(phone, '\\D', '', 'g') LIKE ('%' || v_clean_phone)
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

      -- Grant execute permissions to anon and authenticated roles for Supabase PostgREST RPC access
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
      NOTIFY pgrst, 'reload schema';
    `);
    console.log('✓ Secure RPC authentication functions installed, granted to anon/authenticated, and schema reloaded.');

    console.log('4. Applying 004_atomic_transactions.sql...');
    const atomicSqlPath = path.resolve(__dirname, '004_atomic_transactions.sql');
    if (fs.existsSync(atomicSqlPath)) {
      const atomicSql = fs.readFileSync(atomicSqlPath, 'utf8');
      await client.query(atomicSql);
      console.log('✓ Atomic stored procedures installed.');
    }

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n--- VERIFIED TABLES ---');
    console.table(res.rows);

    await client.end();
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    try { await client.end(); } catch {}
    process.exit(1);
  }
}

runMigration();
