const express = require('express');
const cors = require('cors');
const { pool, projectRef } = require('./config/db.cjs');

const authRoutes = require('./routes/authRoutes.cjs');
const inventoryRoutes = require('./routes/inventoryRoutes.cjs');
const productionRoutes = require('./routes/productionRoutes.cjs');
const financeRoutes = require('./routes/financeRoutes.cjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as current_time, version()');
    return res.json({
      status: 'healthy',
      service: 'Fabric Manager Backend REST API',
      database: 'Connected (Supabase PostgreSQL 17)',
      projectRef,
      dbTime: dbRes.rows[0].current_time,
      uptime: process.uptime(),
    });
  } catch (err) {
    return res.status(500).json({
      status: 'unhealthy',
      service: 'Fabric Manager Backend REST API',
      database: 'Error: ' + err.message,
    });
  }
});

// System stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const tables = ['users', 'masters', 'machines', 'tailors', 'helpers', 'suppliers', 'fabrics', 'cuttings', 'invoices', 'expenses'];
    const counts = {};

    for (const t of tables) {
      try {
        const r = await pool.query(`SELECT COUNT(*)::int as count FROM public.${t}`);
        counts[t] = r.rows[0].count;
      } catch {
        counts[t] = 0;
      }
    }

    return res.json({ success: true, counts });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/finance', financeRoutes);

// 404 Handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error', details: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Fabric Manager Backend REST API running on port ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Database: Connected to Supabase (${projectRef})`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
