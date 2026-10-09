const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file for credentials
const envPath = path.resolve(__dirname, '../../.env');
let env = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const k = trimmed.substring(0, idx).trim();
    const v = trimmed.substring(idx + 1).trim();
    env[k] = v.replace(/^["']|["']$/g, '');
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';
const dbPassword = process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD || '';

const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = projectRefMatch ? projectRefMatch[1] : (process.env.SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF || '');

// PostgreSQL Connection Pool (AWS ap-south-1 Pooler on Port 6543)
const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST || env.SUPABASE_DB_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
  port: parseInt(process.env.SUPABASE_DB_PORT || env.SUPABASE_DB_PORT || '6543', 10),
  user: projectRef ? `postgres.${projectRef}` : (process.env.SUPABASE_DB_USER || 'postgres'),
  password: dbPassword,
  database: process.env.SUPABASE_DB_NAME || env.SUPABASE_DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Direct Supabase Client
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return { ...res, duration };
}

async function getClient() {
  return await pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
  supabase,
  supabaseUrl,
  projectRef,
};
