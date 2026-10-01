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
  const res = await client.query("SELECT id, tailor_name, total_assigned_pieces, completed_quantity, daily_submissions FROM tailor_assignments");
  res.rows.forEach((a, i) => {
    console.log(`[${i}] id=${a.id} tailor=${a.tailor_name} total=${a.total_assigned_pieces} done=${a.completed_quantity} subsCount=${(a.daily_submissions || []).length}`);
    const latest = (a.daily_submissions || [])[0];
    if (latest) {
      console.log('   Latest sub:', latest.id, latest.quantity, latest.approvalStatus, latest.date, latest.subParts);
    }
  });
  await client.end();
}
run();
