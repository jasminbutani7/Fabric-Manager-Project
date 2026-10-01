const { query } = require('../config/db.cjs');

/**
 * Get cutting orders for tenant
 */
async function getCuttings(req, res) {
  try {
    const userId = req.query.user_id || req.headers['x-tenant-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Tenant user_id is required' });
    }

    const result = await query(
      `SELECT * FROM public.cuttings 
       WHERE user_id = $1 AND is_archived = false 
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Error in getCuttings:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Record a new cutting batch
 */
async function recordCutting(req, res) {
  try {
    const userId = req.body.user_id || req.headers['x-tenant-id'];
    const {
      fabric_id,
      fabric_name,
      fabric_color,
      master_id,
      master_name,
      product_name,
      cut_pieces,
      total_pieces,
      sets_count,
      meters_used,
    } = req.body;

    if (!userId || !fabric_id) {
      return res.status(400).json({ success: false, error: 'user_id and fabric_id are required' });
    }

    const id = `cut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const result = await query(
      `INSERT INTO public.cuttings (
        id, user_id, fabric_id, fabric_name, fabric_color,
        master_id, master_name, product_name, cut_pieces,
        total_pieces, sets_count, meters_used, status,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Active',
        NOW(), NOW()
      ) RETURNING *`,
      [
        id, userId, fabric_id, fabric_name || null, fabric_color || null,
        master_id || null, master_name || null, product_name || null,
        cut_pieces ? JSON.stringify(cut_pieces) : null,
        Number(total_pieces) || 0, Number(sets_count) || 0, Number(meters_used) || 0
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error in recordCutting:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Get tailor assignments
 */
async function getTailorAssignments(req, res) {
  try {
    const userId = req.query.user_id || req.headers['x-tenant-id'];
    const tailorId = req.query.tailor_id;

    let sql = 'SELECT * FROM public.tailor_assignments WHERE is_archived = false';
    const params = [];

    if (userId) {
      params.push(userId);
      sql += ` AND user_id = $${params.length}`;
    }
    if (tailorId) {
      params.push(tailorId);
      sql += ` AND tailor_id = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Error in getTailorAssignments:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Update daily completed work submission for tailor assignment
 */
async function submitTailorWork(req, res) {
  try {
    const { assignment_id, completed_quantity, daily_submission } = req.body;

    if (!assignment_id) {
      return res.status(400).json({ success: false, error: 'assignment_id is required' });
    }

    const currentResult = await query(
      'SELECT completed_quantity, daily_submissions, rate_per_piece FROM public.tailor_assignments WHERE id = $1',
      [assignment_id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    const current = currentResult.rows[0];
    const newQty = (current.completed_quantity || 0) + (Number(completed_quantity) || 0);
    const newEarned = newQty * (Number(current.rate_per_piece) || 0);
    const existingSubs = Array.isArray(current.daily_submissions) ? current.daily_submissions : [];
    const updatedSubs = daily_submission ? [...existingSubs, daily_submission] : existingSubs;

    const updateResult = await query(
      `UPDATE public.tailor_assignments 
       SET completed_quantity = $1, total_earned = $2, daily_submissions = $3, status = 'In Stitching', updated_at = NOW() 
       WHERE id = $4 RETURNING *`,
      [newQty, newEarned, JSON.stringify(updatedSubs), assignment_id]
    );

    return res.json({ success: true, data: updateResult.rows[0] });
  } catch (err) {
    console.error('Error in submitTailorWork:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getCuttings,
  recordCutting,
  getTailorAssignments,
  submitTailorWork,
};
