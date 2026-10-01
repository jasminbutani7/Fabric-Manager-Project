const { query } = require('../config/db.cjs');

/**
 * Get all invoices
 */
async function getInvoices(req, res) {
  try {
    const userId = req.query.user_id || req.headers['x-tenant-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Tenant user_id is required' });
    }

    const result = await query(
      'SELECT * FROM public.invoices WHERE user_id = $1 ORDER BY date DESC',
      [userId]
    );

    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Error in getInvoices:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Create a new client invoice
 */
async function createInvoice(req, res) {
  try {
    const userId = req.body.user_id || req.headers['x-tenant-id'];
    const {
      invoice_number,
      client_name,
      client_phone,
      client_address,
      date,
      items,
      subtotal,
      discount,
      tax,
      total_amount,
      paid_amount,
      notes,
    } = req.body;

    if (!userId || !invoice_number || !client_name) {
      return res.status(400).json({ success: false, error: 'user_id, invoice_number, and client_name are required' });
    }

    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const total = Number(total_amount) || 0;
    const paid = Number(paid_amount) || 0;
    const due = Math.max(0, total - paid);
    const status = paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

    const result = await query(
      `INSERT INTO public.invoices (
        id, user_id, invoice_number, client_name, client_phone, client_address,
        date, items, subtotal, discount, tax, total_amount, paid_amount, due_amount,
        status, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        NOW(), NOW()
      ) RETURNING *`,
      [
        id, userId, invoice_number, client_name.trim(), client_phone || null, client_address || null,
        date || new Date().toISOString().split('T')[0],
        items ? JSON.stringify(items) : '[]',
        Number(subtotal) || 0, Number(discount) || 0, Number(tax) || 0,
        total, paid, due, status, notes || null
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error in createInvoice:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Get all expenses
 */
async function getExpenses(req, res) {
  try {
    const userId = req.query.user_id || req.headers['x-tenant-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Tenant user_id is required' });
    }

    const result = await query(
      'SELECT * FROM public.expenses WHERE user_id = $1 ORDER BY date DESC',
      [userId]
    );

    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Error in getExpenses:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Record a factory expense
 */
async function addExpense(req, res) {
  try {
    const userId = req.body.user_id || req.headers['x-tenant-id'];
    const {
      title,
      expense_type,
      category,
      amount,
      date,
      payment_method,
      paid_to,
      notes,
    } = req.body;

    if (!userId || !title || !amount) {
      return res.status(400).json({ success: false, error: 'user_id, title, and amount are required' });
    }

    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const result = await query(
      `INSERT INTO public.expenses (
        id, user_id, title, expense_type, category, amount, date,
        payment_method, paid_to, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        NOW(), NOW()
      ) RETURNING *`,
      [
        id, userId, title.trim(), expense_type || 'Other', category || 'Other',
        Number(amount) || 0, date || new Date().toISOString().split('T')[0],
        payment_method || 'Cash', paid_to || null, notes || null
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error in addExpense:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Overview metrics for dashboard
 */
async function getFinancialOverview(req, res) {
  try {
    const userId = req.query.user_id || req.headers['x-tenant-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Tenant user_id is required' });
    }

    const [invRes, expRes] = await Promise.all([
      query('SELECT SUM(total_amount) as total_revenue, SUM(paid_amount) as total_received, SUM(due_amount) as total_receivable FROM public.invoices WHERE user_id = $1', [userId]),
      query('SELECT SUM(amount) as total_expenses FROM public.expenses WHERE user_id = $1', [userId]),
    ]);

    const revenue = Number(invRes.rows[0]?.total_revenue) || 0;
    const received = Number(invRes.rows[0]?.total_received) || 0;
    const receivable = Number(invRes.rows[0]?.total_receivable) || 0;
    const expenses = Number(expRes.rows[0]?.total_expenses) || 0;
    const netProfit = revenue - expenses;

    return res.json({
      success: true,
      data: {
        totalRevenue: revenue,
        totalReceived: received,
        totalReceivable: receivable,
        totalExpenses: expenses,
        netProfit,
      },
    });
  } catch (err) {
    console.error('Error in getFinancialOverview:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getInvoices,
  createInvoice,
  getExpenses,
  addExpense,
  getFinancialOverview,
};
