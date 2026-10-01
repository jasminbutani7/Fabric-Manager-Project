const { query } = require('../config/db.cjs');
const { verifyPbkdf2Password, hashPasswordPbkdf2, sanitizeMobileNumber } = require('../config/security.cjs');

/**
 * Admin Login Endpoint
 */
async function loginAdmin(req, res) {
  try {
    const { phone, password } = req.body;
    const cleanPhone = sanitizeMobileNumber(phone);

    if (!cleanPhone || !password) {
      return res.status(400).json({ success: false, error: 'Phone and password are required' });
    }

    const result = await query(
      'SELECT id, name, phone, email, company_name, role, password, avatar FROM public.users WHERE phone = $1 LIMIT 1',
      [cleanPhone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No user registered with this phone number' });
    }

    const user = result.rows[0];
    const isPasswordValid = verifyPbkdf2Password(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Incorrect password. Please verify and try again' });
    }

    // Never return password hash
    delete user.password;

    return res.json({
      success: true,
      message: 'Login successful',
      user,
    });
  } catch (err) {
    console.error('Error in loginAdmin:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Admin Registration Endpoint
 */
async function registerAdmin(req, res) {
  try {
    const { name, phone, email, company_name, password } = req.body;
    const cleanPhone = sanitizeMobileNumber(phone);

    if (!name || !cleanPhone || !password) {
      return res.status(400).json({ success: false, error: 'Name, 10-digit phone, and password are required' });
    }

    const checkExisting = await query(
      'SELECT id FROM public.users WHERE phone = $1 OR (email = $2 AND email IS NOT NULL) LIMIT 1',
      [cleanPhone, email || null]
    );

    if (checkExisting.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'A user with this mobile number or email already exists' });
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const hashedPassword = hashPasswordPbkdf2(password);

    const insertResult = await query(
      `INSERT INTO public.users (id, name, phone, email, company_name, role, password, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'Admin', $6, NOW(), NOW())
       RETURNING id, name, phone, email, company_name, role, created_at`,
      [id, name.trim(), cleanPhone, email ? email.trim().toLowerCase() : null, company_name ? company_name.trim() : null, hashedPassword]
    );

    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      user: insertResult.rows[0],
    });
  } catch (err) {
    console.error('Error in registerAdmin:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Worker Portal PIN Login Endpoint (Master, Tailor, Helper)
 */
async function verifyWorkerPin(req, res) {
  try {
    const { phone, role, pin } = req.body;
    const cleanPhone = sanitizeMobileNumber(phone);

    if (!cleanPhone || !role || !pin) {
      return res.status(400).json({ success: false, error: 'Phone, role, and PIN are required' });
    }

    let tableName = 'tailors';
    if (role.toLowerCase() === 'master') tableName = 'masters';
    else if (role.toLowerCase() === 'helper') tableName = 'helpers';

    const result = await query(
      `SELECT id, user_id, role, name, phone, password, status 
       FROM public.${tableName} 
       WHERE phone = $1 AND status = 'Active' 
       LIMIT 1`,
      [cleanPhone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: `No active ${role} found with this phone number` });
    }

    const worker = result.rows[0];
    const isPinValid = worker.password === pin.trim();

    if (!isPinValid) {
      return res.status(401).json({ success: false, error: 'Invalid PIN. Please check with factory admin' });
    }

    delete worker.password;

    return res.json({
      success: true,
      message: 'Worker verification successful',
      worker,
    });
  } catch (err) {
    console.error('Error in verifyWorkerPin:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  loginAdmin,
  registerAdmin,
  verifyWorkerPin,
};
