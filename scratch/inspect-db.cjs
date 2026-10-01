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
  const fCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'fabrics'");
  console.log('FABRICS COLS:', fCols.rows.map(r => r.column_name));
  const fRes = await client.query('SELECT * FROM fabrics');
  console.log('FABRICS COUNT:', fRes.rows.length);
  fRes.rows.forEach(r => console.log('FABRIC:', { id: r.id, fabric_type: r.fabric_type, product_name: r.product_name, status: r.status, user_id: r.user_id }));
  const cRes = await client.query('SELECT * FROM cuttings');
  console.log('CUTTINGS COUNT:', cRes.rows.length);
  cRes.rows.forEach(r => console.log('CUTTING:', { id: r.id, fabric_id: r.fabric_id, fabric_name: r.fabric_name, status: r.status, user_id: r.user_id }));
  await client.end();
}
run();
