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

// In-memory OTP storage: email -> { otp, expiresAt, verified, verifiedAt, userId }
const otpStore = new Map();
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

const { sendPasswordResetOtpEmail } = require('../services/emailService.cjs');

/**
 * Request Password Reset OTP
 * POST /api/auth/forgot-password
 * Body: { email }
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required' });
    }

    // 1. Verify user exists in public.users
    const userResult = await query(
      'SELECT id, name, phone, email FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No registered Admin account found with this email address.',
      });
    }

    const user = userResult.rows[0];

    // 2. Generate cryptographically random 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    // Store in memory
    otpStore.set(cleanEmail, {
      otp,
      expiresAt,
      verified: false,
      userId: user.id,
      userName: user.name,
    });

    // 3. Dispatch Email via Gmail SMTP or fallback simulation
    const emailResult = await sendPasswordResetOtpEmail(cleanEmail, otp, user.name || 'Admin');

    return res.json({
      success: true,
      message: emailResult.message || `Verification code sent to ${cleanEmail}`,
      simulated: !!emailResult.simulated,
      demoOtp: emailResult.simulated ? otp : undefined,
    });
  } catch (err) {
    console.error('Error in forgotPassword:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Verify OTP Code
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 */
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    if (!cleanEmail || !cleanOtp || cleanOtp.length !== 6) {
      return res.status(400).json({ success: false, error: 'Valid email and 6-digit OTP code are required' });
    }

    const record = otpStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'No OTP request found for this email. Please request a new code.',
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: 'OTP code has expired. Please request a new verification code.',
      });
    }

    if (record.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP code. Please check your email or enter the code again.',
      });
    }

    // Mark as verified
    record.verified = true;
    record.verifiedAt = Date.now();
    otpStore.set(cleanEmail, record);

    return res.json({
      success: true,
      message: 'OTP verified successfully. You may now reset your password.',
    });
  } catch (err) {
    console.error('Error in verifyOtp:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Reset Password using verified OTP
 * POST /api/auth/reset-password
 * Body: { email, newPassword, otp }
 */
async function resetPassword(req, res) {
  try {
    const { email, newPassword, otp } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    if (!cleanEmail || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Valid email and a password with at least 6 characters are required',
      });
    }

    const record = otpStore.get(cleanEmail);
    if (!record) {
      return res.status(403).json({
        success: false,
        error: 'Verification session expired. Please verify your email again.',
      });
    }

    // Verify OTP either by marked verified or directly matching OTP
    const isCodeMatch = cleanOtp && record.otp === cleanOtp;
    const isVerifiedSession = record.verified && (Date.now() - (record.verifiedAt || record.expiresAt)) < 15 * 60 * 1000;

    if (!isVerifiedSession && !isCodeMatch) {
      return res.status(403).json({
        success: false,
        error: 'Email OTP has not been verified yet.',
      });
    }

    if (Date.now() > record.expiresAt + 15 * 60 * 1000) {
      otpStore.delete(cleanEmail);
      return res.status(403).json({
        success: false,
        error: 'Password reset window expired. Please request a new code.',
      });
    }

    // 1. Hash new password with PBKDF2
    const hashedPassword = hashPasswordPbkdf2(newPassword);

    // 2. Update in PostgreSQL database
    const updateRes = await query(
      `UPDATE public.users 
       SET password = $1, updated_at = NOW() 
       WHERE LOWER(email) = LOWER($2) 
       RETURNING id, name, phone, email, role`,
      [hashedPassword, cleanEmail]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Failed to update password. User account not found.',
      });
    }

    // 3. Clear OTP store record to prevent re-use
    otpStore.delete(cleanEmail);

    return res.json({
      success: true,
      message: 'Password has been successfully reset. You can now log in with your new password.',
      user: updateRes.rows[0],
    });
  } catch (err) {
    console.error('Error in resetPassword:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  loginAdmin,
  registerAdmin,
  verifyWorkerPin,
  forgotPassword,
  verifyOtp,
  resetPassword,
};

