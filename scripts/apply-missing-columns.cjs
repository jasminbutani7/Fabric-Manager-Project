const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnvValue(key) {
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const k = trimmed.substring(0, idx).trim();
    const v = trimmed.substring(idx + 1).trim();
    if (k === key) return v.replace(/^["']|["']$/g, '');
  }
  return '';
}

const supabaseUrl = getEnvValue('VITE_SUPABASE_URL');
const dbPassword = getEnvValue('SUPABASE_DB_PASSWORD');
const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = projectRefMatch ? projectRefMatch[1] : '';

async function applyMigrations() {
  const client = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${projectRef}`,
    password: dbPassword,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  console.log('✓ Connected to PostgreSQL (' + projectRef + ')');

  console.log('\nApplying missing columns and data sync...');

  // 1. fabrics: target_sets, price_per_set
  console.log('- Adding fabrics.target_sets & fabrics.price_per_set...');
  await client.query(`
    ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS target_sets INTEGER DEFAULT 0;
    ALTER TABLE public.fabrics ADD COLUMN IF NOT EXISTS price_per_set NUMERIC DEFAULT 0;
    UPDATE public.fabrics SET target_sets = COALESCE(print_pieces, lot_size_print_fabric_psc, 0) WHERE target_sets = 0 OR target_sets IS NULL;
    UPDATE public.fabrics SET price_per_set = COALESCE(price_per_piece, 0) WHERE price_per_set = 0 OR price_per_set IS NULL;
  `);

  // 2. helpers: default_rate_per_piece
  console.log('- Adding helpers.default_rate_per_piece...');
  await client.query(`
    ALTER TABLE public.helpers ADD COLUMN IF NOT EXISTS default_rate_per_piece NUMERIC DEFAULT 0;
    UPDATE public.helpers SET default_rate_per_piece = COALESCE(default_rate_per_psc, 0) WHERE default_rate_per_piece = 0 OR default_rate_per_piece IS NULL;
  `);

  // 3. tailor_assignments: assigned_cut_pieces, assigned_garment_pcs
  console.log('- Adding tailor_assignments.assigned_cut_pieces & assigned_garment_pcs...');
  await client.query(`
    ALTER TABLE public.tailor_assignments ADD COLUMN IF NOT EXISTS assigned_cut_pieces JSONB;
    ALTER TABLE public.tailor_assignments ADD COLUMN IF NOT EXISTS assigned_garment_pcs JSONB;
    UPDATE public.tailor_assignments SET assigned_cut_pieces = assigned_pieces WHERE assigned_cut_pieces IS NULL AND assigned_pieces IS NOT NULL;
    UPDATE public.tailor_assignments SET assigned_garment_pcs = assigned_sub_parts WHERE assigned_garment_pcs IS NULL AND assigned_sub_parts IS NOT NULL;
  `);

  // 4. thread_cutting_assignments: assigned_pieces, completed_pieces, rate_per_piece
  console.log('- Adding thread_cutting_assignments.assigned_pieces, completed_pieces, rate_per_piece...');
  await client.query(`
    ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS assigned_pieces INTEGER DEFAULT 0;
    ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS completed_pieces INTEGER DEFAULT 0;
    ALTER TABLE public.thread_cutting_assignments ADD COLUMN IF NOT EXISTS rate_per_piece NUMERIC DEFAULT 0;
    UPDATE public.thread_cutting_assignments SET assigned_pieces = COALESCE(assigned_psc, 0) WHERE assigned_pieces = 0 OR assigned_pieces IS NULL;
    UPDATE public.thread_cutting_assignments SET completed_pieces = COALESCE(completed_psc, 0) WHERE completed_pieces = 0 OR completed_pieces IS NULL;
    UPDATE public.thread_cutting_assignments SET rate_per_piece = COALESCE(rate_per_psc, 0) WHERE rate_per_piece = 0 OR rate_per_piece IS NULL;
  `);

  // 5. Remove any deprecated extra columns if present
  console.log('- Checking for deprecated extra columns...');
  await client.query(`
    ALTER TABLE public.tailors DROP COLUMN IF EXISTS salary_type;
  `);

  console.log('✓ All migrations applied successfully!\n');

  await client.end();
}

applyMigrations().catch(console.error);
