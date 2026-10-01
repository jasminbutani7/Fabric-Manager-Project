const { query } = require('../config/db.cjs');

/**
 * Get all fabrics for tenant
 */
async function getFabrics(req, res) {
  try {
    const userId = req.query.user_id || req.headers['x-tenant-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Tenant user_id is required' });
    }

    const result = await query(
      `SELECT * FROM public.fabrics 
       WHERE user_id = $1 AND is_archived = false 
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Error in getFabrics:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Add a new fabric roll lot
 */
async function addFabric(req, res) {
  try {
    const userId = req.body.user_id || req.headers['x-tenant-id'];
    const {
      lot_no,
      supplier_id,
      supplier_name,
      supplier_phone,
      assigned_master_id,
      assigned_master_name,
      plain_meters,
      target_sets,
      price_per_set,
      product_name,
      color,
      fabric_type,
    } = req.body;

    if (!userId || !lot_no) {
      return res.status(400).json({ success: false, error: 'user_id and lot_no are required' });
    }

    const id = `fab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const totalAmount = (Number(plain_meters) || 0) * (Number(price_per_set) || 0);

    const result = await query(
      `INSERT INTO public.fabrics (
        id, user_id, lot_no, supplier_id, supplier_name, supplier_phone,
        assigned_master_id, assigned_master_name, plain_meters, target_sets,
        price_per_set, total_amount, product_name, color, fabric_type, status,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'In Stock',
        NOW(), NOW()
      ) RETURNING *`,
      [
        id, userId, lot_no, supplier_id || null, supplier_name || null, supplier_phone || null,
        assigned_master_id || null, assigned_master_name || null,
        plain_meters || 0, target_sets || 0, price_per_set || 0, totalAmount,
        product_name || null, color || null, fabric_type || null
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error in addFabric:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Get all suppliers
 */
async function getSuppliers(req, res) {
  try {
    const userId = req.query.user_id || req.headers['x-tenant-id'];
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Tenant user_id is required' });
    }

    const result = await query(
      'SELECT * FROM public.suppliers WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );

    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Error in getSuppliers:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Add a new supplier
 */
async function addSupplier(req, res) {
  try {
    const userId = req.body.user_id || req.headers['x-tenant-id'];
    const { name, category, contact_person, phone, gst_number, address } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ success: false, error: 'user_id and supplier name are required' });
    }

    const id = `sup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const result = await query(
      `INSERT INTO public.suppliers (id, user_id, name, category, contact_person, phone, gst_number, address, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active', NOW(), NOW())
       RETURNING *`,
      [id, userId, name.trim(), category || null, contact_person || null, phone || null, gst_number || null, address || null]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error in addSupplier:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getFabrics,
  addFabric,
  getSuppliers,
  addSupplier,
};
