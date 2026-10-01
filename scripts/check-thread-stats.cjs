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

async function run() {
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

  console.log('--- FABRICS ---');
  const fab = await client.query("SELECT id, fabric_type, product_structure, notes FROM public.fabrics");
  console.log(JSON.stringify(fab.rows, null, 2));

  console.log('--- CUTTINGS ---');
  const cut = await client.query("SELECT id, fabric_id, fabric_name, total_pieces, sets_count, cut_pieces, product_structure FROM public.cuttings");
  console.log(JSON.stringify(cut.rows, null, 2));

  console.log('--- HANDOVERS ---');
  const hand = await client.query("SELECT id, cutting_id, fabric_id, master_name, pieces_count, notes, status FROM public.master_handovers");
  console.log(JSON.stringify(hand.rows, null, 2));

  console.log('--- THREAD CUTTING ASSIGNMENTS ---');
  const tc = await client.query("SELECT * FROM public.thread_cutting_assignments");
  console.log(JSON.stringify(tc.rows, null, 2));

  await client.end();
}

run().catch(console.error);
