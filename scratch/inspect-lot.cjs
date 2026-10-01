const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const envContent = fs.readFileSync(path.resolve('.env'), 'utf8');
const dbPassword = envContent.match(/SUPABASE_DB_PASSWORD=([^\r\n]+)/)[1].trim();
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const client = new Client({
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.' + projectRef,
  password: dbPassword,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const fRes = await client.query("SELECT * FROM fabrics WHERE id = 'fab_1789112024378'");
  console.log('FABRIC:', fRes.rows[0]);
  const cRes = await client.query("SELECT id, total_pieces, status FROM cuttings WHERE fabric_id = 'fab_1789112024378'");
  console.log('CUTTINGS:', cRes.rows);
  const aRes = await client.query("SELECT id, total_assigned_pieces, completed_quantity, status FROM tailor_assignments WHERE fabric_id = 'fab_1789112024378'");
  console.log('ASSIGNMENTS:', aRes.rows);
  const hRes = await client.query("SELECT id, pieces_count, status FROM master_handovers WHERE fabric_id = 'fab_1789112024378'");
  const cMeters = await client.query("SELECT id, total_pieces, meters_used, status FROM cuttings WHERE fabric_id = 'fab_1789112024378'");
  console.log('CUTTINGS METERS:', cMeters.rows);
  await client.end();
}
run();
