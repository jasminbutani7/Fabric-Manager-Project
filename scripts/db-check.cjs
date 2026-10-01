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

async function checkDatabase() {
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
        console.log(`✓ Successfully connected to PostgreSQL (${host}:${port})!`);
        break;
      } catch {
        try { await c.end(); } catch {}
      }
    }
    if (client) break;
  }

  if (!client) {
    console.error('✗ Database connection failed to all available pooler hosts.');
    process.exit(1);
  }

  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n--- ACTIVE TABLES IN DATABASE ---');
    console.table(res.rows);

    const realtimeRes = await client.query(`
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
      ORDER BY tablename;
    `);

    console.log('\n--- SUPABASE REALTIME ENABLED TABLES ---');
    console.table(realtimeRes.rows);

    const newColumnsRes = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND (
          (table_name = 'fabrics' AND column_name IN ('sub_parts_delivered', 'delivery_logs'))
          OR (table_name = 'thread_cutting_assignments' AND column_name IN ('helper_phone', 'sub_part', 'sub_part_name', 'action_type', 'fabric_name', 'handover_id'))
        )
      ORDER BY table_name, column_name;
    `);

    console.log('\n--- VERIFIED NEW COLUMNS ---');
    console.table(newColumnsRes.rows);

    const rlsRes = await client.query(`
      SELECT
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        count(p.polname)::int AS policy_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policy p ON p.polrelid = c.oid
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
      GROUP BY c.relname, c.relrowsecurity
      ORDER BY c.relname;
    `);

    console.log('\n--- ROW LEVEL SECURITY (RLS) & TENANT POLICIES ---');
    console.table(rlsRes.rows);

    const domainTables = [
      'users', 'masters', 'machines', 'tailors', 'helpers', 'suppliers',
      'fabrics', 'cuttings', 'tailor_assignments', 'master_handovers',
      'thread_cutting_assignments', 'delivery_logs', 'expenses', 'invoices',
      'invoice_expenses', 'product_templates'
    ];

    const unprotectedDomain = rlsRes.rows.filter(
      (r) => domainTables.includes(r.table_name) && (!r.rls_enabled || r.policy_count === 0)
    );

    if (unprotectedDomain.length > 0) {
      console.warn('\n⚠️ WARNING: Found domain tables missing RLS or policies:');
      unprotectedDomain.forEach((t) => console.warn(`   - ${t.table_name} (RLS: ${t.rls_enabled}, Policies: ${t.policy_count})`));
      console.warn('   Run "npm run db:migrate" to apply tenant isolation policies.');
    } else {
      console.log('✓ All domain tables have Row Level Security enabled with active isolation policies.');
    }

    await client.end();
  } catch (err) {
    console.error('✗ Query failed:', err.message);
    try { await client.end(); } catch {}
    process.exit(1);
  }
}

checkDatabase();
