/**
 * Fabric Manager - Automated Pre-Launch Database Backup Script
 * Exports full transactional data snapshots from Supabase PostgreSQL to /backups/
 */
const fs = require('fs');
const path = require('path');
const { pool, projectRef } = require('../backend/config/db.cjs');

const CORE_TABLES = [
  'users',
  'masters',
  'machines',
  'tailors',
  'helpers',
  'suppliers',
  'fabrics',
  'cuttings',
  'invoices',
  'expenses',
  'master_handovers',
  'thread_cutting_assignments'
];

async function runBackup() {
  console.log('======================================================');
  console.log(`📦 Fabric Manager - Database Backup Runner (${projectRef})`);
  console.log('======================================================\n');

  if (!pool) {
    console.error('❌ Database connection pool is not configured. Check SUPABASE_DB_PASSWORD in .env');
    process.exit(1);
  }

  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup_fabric_manager_${timestamp}.json`;
  const backupFilePath = path.join(backupDir, backupFileName);

  const dumpData = {
    metadata: {
      timestamp: new Date().toISOString(),
      projectRef,
      tablesIncluded: CORE_TABLES,
    },
    tables: {},
  };

  let totalRows = 0;

  for (const table of CORE_TABLES) {
    try {
      const res = await pool.query(`SELECT * FROM public.${table}`);
      dumpData.tables[table] = res.rows;
      totalRows += res.rows.length;
      console.log(`  ✓ Exported table '${table}': ${res.rows.length} rows`);
    } catch (err) {
      console.warn(`  ⚠️ Could not export table '${table}': ${err.message}`);
      dumpData.tables[table] = [];
    }
  }

  fs.writeFileSync(backupFilePath, JSON.stringify(dumpData, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log(`✅ Backup successfully created!`);
  console.log(`📁 File: ${backupFilePath}`);
  console.log(`📊 Total rows exported: ${totalRows}`);
  console.log('======================================================\n');

  await pool.end();
}

runBackup().catch((err) => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
