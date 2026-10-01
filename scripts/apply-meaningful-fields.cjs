const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Read credentials dynamically from .env
const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

function getEnvValue(key) {
  const match = envContent.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : process.env[key] || '';
}

const supabaseUrl = getEnvValue('VITE_SUPABASE_URL');
const dbPassword = getEnvValue('SUPABASE_DB_PASSWORD');

if (!dbPassword) {
  console.error('Error: SUPABASE_DB_PASSWORD is not set in .env');
  process.exit(1);
}

const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = projectRefMatch ? projectRefMatch[1] : 'eextvcyhciyqcwhsypmr';

console.log('Connecting to Supabase PostgreSQL using credentials from .env:');
console.log(' - User: postgres.' + projectRef);

const migrationStatements = [
  // 1. Fix tailors role typo
  `ALTER TABLE public.tailors ALTER COLUMN role SET DEFAULT 'Tailor';`,
  `UPDATE public.tailors SET role = 'Tailor' WHERE role = 'Tailer';`,

  // 2. Helpers meaningful columns
  `ALTER TABLE public.helpers ADD COLUMN IF NOT EXISTS default_rate_per_piece NUMERIC DEFAULT 0;`,
  `UPDATE public.helpers SET default_rate_per_piece = default_rate_per_psc WHERE default_rate_per_piece IS NULL OR default_rate_per_piece = 0;`,

  // 3. Fabrics meaningful columns
  `ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS target_sets INTEGER DEFAULT 0;`,
  `ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS price_per_set NUMERIC DEFAULT 0;`,
  `UPDATE public.fabrics SET target_sets = print_pieces WHERE (target_sets IS NULL OR target_sets = 0) AND print_pieces > 0;`,
  `UPDATE public.fabrics SET price_per_set = price_per_piece WHERE (price_per_set IS NULL OR price_per_set = 0) AND price_per_piece > 0;`,

  // 4. Tailor assignments meaningful columns
  `ALTER TABLE public.tailor_assignments ADD COLUMN IF NOT EXISTS assigned_cut_pieces JSONB;`,
  `ALTER TABLE public.tailor_assignments ADD COLUMN IF NOT EXISTS assigned_garment_pcs JSONB;`,
  `UPDATE public.tailor_assignments SET assigned_cut_pieces = assigned_pieces WHERE assigned_cut_pieces IS NULL AND assigned_pieces IS NOT NULL;`,
  `UPDATE public.tailor_assignments SET assigned_garment_pcs = assigned_sub_parts WHERE assigned_garment_pcs IS NULL AND assigned_sub_parts IS NOT NULL;`,

  // 5. Thread cutting assignments meaningful columns
  `ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS assigned_pieces INTEGER DEFAULT 0;`,
  `ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS completed_pieces INTEGER DEFAULT 0;`,
  `ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS rate_per_piece NUMERIC DEFAULT 0;`,
  `UPDATE public.thread_cutting_assignments SET assigned_pieces = assigned_psc WHERE (assigned_pieces IS NULL OR assigned_pieces = 0) AND assigned_psc > 0;`,
  `UPDATE public.thread_cutting_assignments SET completed_pieces = completed_psc WHERE (completed_pieces IS NULL OR completed_pieces = 0) AND completed_psc > 0;`,
  `UPDATE public.thread_cutting_assignments SET rate_per_piece = rate_per_psc WHERE (rate_per_piece IS NULL OR rate_per_piece = 0) AND rate_per_psc > 0;`,
];

async function applyMigrations() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${projectRef}`,
    password: dbPassword,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✓ Successfully connected to PostgreSQL.');

    for (const sql of migrationStatements) {
      process.stdout.write(`Executing: ${sql.slice(0, 50)}... `);
      await client.query(sql);
      console.log('Done.');
    }

    console.log('\n✓ All meaningful field migrations applied successfully!');
    await client.end();
  } catch (err) {
    console.error('\n✗ Migration failed:', err.message);
    try { await client.end(); } catch {}
    process.exit(1);
  }
}

applyMigrations();
