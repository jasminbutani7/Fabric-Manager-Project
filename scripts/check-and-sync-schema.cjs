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
    if (k === key) {
      return v.replace(/^["']|["']$/g, '');
    }
  }
  return '';
}

const supabaseUrl = getEnvValue('VITE_SUPABASE_URL');
const dbPassword = getEnvValue('SUPABASE_DB_PASSWORD');
const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = projectRefMatch ? projectRefMatch[1] : '';

// Parse expected tables and columns from supabase-schema.sql
const schemaPath = path.resolve(__dirname, '../supabase-schema.sql');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

function parseExpectedSchema(sql) {
  const tables = {};
  
  // Match CREATE TABLE public.<name> ( ... );
  const createTableRegex = /CREATE TABLE IF NOT EXISTS public\.([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = createTableRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    const body = match[2];
    tables[tableName] = new Set();

    const lines = body.split('\n');
    for (let line of lines) {
      line = line.trim().replace(/,$/, '');
      if (!line || line.startsWith('--') || line.startsWith('CONSTRAINT') || line.startsWith('PRIMARY KEY')) continue;
      const colMatch = line.match(/^([a-zA-Z0-9_]+)\s+([A-Z]+(?:\([^)]+\))?)/i);
      if (colMatch) {
        tables[tableName].add(colMatch[1].toLowerCase());
      }
    }
  }

  // Also match ALTER TABLE public.<name> ADD COLUMN IF NOT EXISTS <col> <type>
  const alterColRegex = /ALTER TABLE public\.([a-zA-Z0-9_]+)\s+ADD COLUMN IF NOT EXISTS\s+([a-zA-Z0-9_]+)/gi;
  while ((match = alterColRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    const colName = match[2].toLowerCase();
    if (tables[tableName]) {
      tables[tableName].add(colName);
    }
  }

  return tables;
}

const expectedSchema = parseExpectedSchema(schemaContent);

async function runCheck() {
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

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  const liveTables = tablesRes.rows.map((r) => r.table_name.toLowerCase());

  const colsRes = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  const liveTableCols = {};
  colsRes.rows.forEach((r) => {
    const t = r.table_name.toLowerCase();
    const c = r.column_name.toLowerCase();
    if (!liveTableCols[t]) liveTableCols[t] = new Set();
    liveTableCols[t].add(c);
  });

  console.log('\n================ SCHEMA COMPARISON REPORT ================');

  // Check missing tables
  const expectedTableNames = Object.keys(expectedSchema);
  const missingTables = expectedTableNames.filter(t => !liveTables.includes(t));
  const extraTables = liveTables.filter(t => !expectedTableNames.includes(t));

  console.log(`Expected tables (${expectedTableNames.length}):`, expectedTableNames.sort().join(', '));
  console.log(`Live tables (${liveTables.length}):`, liveTables.sort().join(', '));

  if (missingTables.length > 0) {
    console.log('\n❌ MISSING TABLES IN DATABASE:', missingTables);
  } else {
    console.log('\n✓ All 14 expected tables exist in database!');
  }

  if (extraTables.length > 0) {
    console.log('⚠️  EXTRA TABLES IN DATABASE:', extraTables);
  }

  console.log('\n--- COLUMN COMPARISON PER TABLE ---');
  const missingColActions = [];
  const extraColReport = [];

  for (const t of expectedTableNames) {
    const expectedCols = Array.from(expectedSchema[t] || []).sort();
    const liveCols = liveTableCols[t] ? Array.from(liveTableCols[t]).sort() : [];

    const missingInDb = expectedCols.filter(c => !liveCols.includes(c));
    const extraInDb = liveCols.filter(c => !expectedCols.includes(c));

    console.log(`\nTable: [${t}]`);
    console.log(`  Live Columns (${liveCols.length}): ${liveCols.join(', ')}`);
    if (missingInDb.length > 0) {
      console.log(`  ❌ Missing in DB (${missingInDb.length}): ${missingInDb.join(', ')}`);
      missingColActions.push({ table: t, missing: missingInDb });
    }
    if (extraInDb.length > 0) {
      console.log(`  ⚠️  Extra in DB (${extraInDb.length}): ${extraInDb.join(', ')}`);
      extraColReport.push({ table: t, extra: extraInDb });
    }
    if (missingInDb.length === 0 && extraInDb.length === 0) {
      console.log('  ✓ Perfectly matches expected schema.');
    }
  }

  console.log('\n==========================================================');
  console.log('SUMMARY:');
  console.log(`- Missing Tables: ${missingTables.length}`);
  console.log(`- Tables with Missing Columns: ${missingColActions.length}`);
  console.log(`- Tables with Extra Columns: ${extraColReport.length}`);
  console.log('==========================================================\n');

  await client.end();
}

runCheck().catch(console.error);
