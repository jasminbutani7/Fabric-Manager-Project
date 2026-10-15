const { query, pool, supabase } = require('../config/db.cjs');
const {
  verifyPbkdf2Password,
  hashPasswordPbkdf2,
  verifyWorkerPin: verifyWorkerPinHelper,
  sanitizeMobileNumber,
  generateSecureOtp,
  generateTenantToken,
  generateWorkerToken,
} = require('../config/security.cjs');

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

    let user = null;
    if (pool) {
      const result = await query(
        'SELECT id, name, phone, email, company_name, role, password, avatar FROM public.users WHERE phone = $1 LIMIT 1',
        [cleanPhone]
      );
      if (result.rows.length > 0) user = result.rows[0];
    } else if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone, email, company_name, role, password, avatar')
        .eq('phone', cleanPhone)
        .limit(1);
      if (!error && data && data.length > 0) user = data[0];
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'No user registered with this phone number' });
    }
    const isPasswordValid = verifyPbkdf2Password(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Incorrect password. Please verify and try again' });
    }

    // Never return password hash
    delete user.password;

    // Issue cryptographically signed tenant session JWT
    const token = generateTenantToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      user,
      token,
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
    const isPinValid = verifyWorkerPinHelper(pin, worker.password);

    if (!isPinValid) {
      return res.status(401).json({ success: false, error: 'Invalid PIN. Please check with factory admin' });
    }

    delete worker.password;
    const token = generateWorkerToken(worker);

    return res.json({
      success: true,
      message: 'Worker verification successful',
      worker,
      token,
    });
  } catch (err) {
    console.error('Error in verifyWorkerPin:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Database-backed OTP Storage with in-memory fallback mirror
const memoryOtpStore = new Map();
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_OTP_ATTEMPTS = 5;

const { sendPasswordResetOtpEmail } = require('../services/emailService.cjs');

async function savePasswordResetOtp({ email, otp, user, expiresAt }) {
  const id = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const cleanEmail = email.toLowerCase().trim();
  const expiresDate = new Date(expiresAt);

  memoryOtpStore.set(cleanEmail, {
    id,
    otp,
    email: cleanEmail,
    createdAt: Date.now(),
    expiresAt,
    attempts: 0,
    verified: false,
    userId: user.id,
    userName: user.name,
  });

  if (pool) {
    try {
      await query(
        `INSERT INTO public.password_resets (id, email, otp, user_id, user_name, attempts, verified, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, 0, FALSE, $6, NOW())`,
        [id, cleanEmail, otp, user.id, user.name || 'Admin', expiresDate]
      );
    } catch (err) {
      console.warn('pg pool insert into password_resets failed, using memory fallback:', err.message);
    }
  } else if (supabase) {
    try {
      await supabase.from('password_resets').insert({
        id,
        email: cleanEmail,
        otp,
        user_id: user.id,
        user_name: user.name || 'Admin',
        attempts: 0,
        verified: false,
        expires_at: expiresDate.toISOString(),
      });
    } catch (err) {
      console.warn('Supabase insert into password_resets notice:', err.message);
    }
  }
  return id;
}

async function getRecentOtpCooldown(email) {
  const cleanEmail = email.toLowerCase().trim();
  if (pool) {
    try {
      const res = await query(
        `SELECT created_at FROM public.password_resets 
         WHERE LOWER(email) = LOWER($1) 
         ORDER BY created_at DESC LIMIT 1`,
        [cleanEmail]
      );
      if (res.rows.length > 0) {
        const diff = Date.now() - new Date(res.rows[0].created_at).getTime();
        if (diff < OTP_COOLDOWN_MS) {
          return Math.ceil((OTP_COOLDOWN_MS - diff) / 1000);
        }
      }
    } catch (err) {
      console.warn('pg pool query for cooldown failed, using memory fallback:', err.message);
    }
  }
  const mem = memoryOtpStore.get(cleanEmail);
  if (mem && Date.now() - mem.createdAt < OTP_COOLDOWN_MS) {
    return Math.ceil((OTP_COOLDOWN_MS - (Date.now() - mem.createdAt)) / 1000);
  }
  return 0;
}

async function getActiveOtpRecord(email) {
  const cleanEmail = email.toLowerCase().trim();
  if (pool) {
    try {
      const res = await query(
        `SELECT id, email, otp, user_id, user_name, attempts, verified, verified_at, expires_at, created_at 
         FROM public.password_resets 
         WHERE LOWER(email) = LOWER($1) AND expires_at > NOW() 
         ORDER BY created_at DESC LIMIT 1`,
        [cleanEmail]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          email: row.email,
          otp: row.otp,
          userId: row.user_id,
          userName: row.user_name,
          attempts: row.attempts,
          verified: row.verified,
          verifiedAt: row.verified_at ? new Date(row.verified_at).getTime() : null,
          expiresAt: new Date(row.expires_at).getTime(),
          createdAt: new Date(row.created_at).getTime(),
        };
      }
    } catch (err) {
      console.warn('pg pool getActiveOtpRecord failed, using memory fallback:', err.message);
    }
  } else if (supabase) {
    try {
      const { data } = await supabase
        .from('password_resets')
        .select('*')
        .ilike('email', cleanEmail)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const row = data[0];
        return {
          id: row.id,
          email: row.email,
          otp: row.otp,
          userId: row.user_id,
          userName: row.user_name,
          attempts: row.attempts,
          verified: row.verified,
          verifiedAt: row.verified_at ? new Date(row.verified_at).getTime() : null,
          expiresAt: new Date(row.expires_at).getTime(),
          createdAt: new Date(row.created_at).getTime(),
        };
      }
    } catch {}
  }
  return memoryOtpStore.get(cleanEmail) || null;
}

async function incrementOtpAttempts(record) {
  const newAttempts = (record.attempts || 0) + 1;
  record.attempts = newAttempts;
  memoryOtpStore.set(record.email, record);

  if (pool && record.id) {
    try {
      await query('UPDATE public.password_resets SET attempts = $1 WHERE id = $2', [newAttempts, record.id]);
    } catch {}
  }
  return newAttempts;
}

async function markOtpVerified(record) {
  const now = Date.now();
  record.verified = true;
  record.verifiedAt = now;
  memoryOtpStore.set(record.email, record);

  if (pool && record.id) {
    try {
      await query('UPDATE public.password_resets SET verified = TRUE, verified_at = NOW() WHERE id = $1', [record.id]);
    } catch {}
  }
}

async function clearOtpRecords(email) {
  const cleanEmail = email.toLowerCase().trim();
  memoryOtpStore.delete(cleanEmail);

  if (pool) {
    try {
      await query('DELETE FROM public.password_resets WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    } catch {}
  } else if (supabase) {
    try {
      await supabase.from('password_resets').delete().ilike('email', cleanEmail);
    } catch {}
  }
}

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

    // Rate-limiting: Cooldown period of 60 seconds between OTP requests
    const waitSeconds = await getRecentOtpCooldown(cleanEmail);
    if (waitSeconds > 0) {
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting another verification code.`,
      });
    }

    // 1. Verify user exists in public.users
    let user = null;
    if (pool) {
      try {
        const userResult = await query(
          'SELECT id, name, phone, email FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1',
          [cleanEmail]
        );
        if (userResult.rows.length > 0) user = userResult.rows[0];
      } catch (err) {
        console.warn('pg pool query failed in forgotPassword, trying Supabase REST:', err.message);
      }
    }

    if (!user && supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone, email')
        .ilike('email', cleanEmail)
        .limit(1);
      if (!error && data && data.length > 0) user = data[0];
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No registered Admin account found with this email address.',
      });
    }

    // 2. Generate cryptographically secure 6-digit OTP via crypto.randomInt
    const otp = generateSecureOtp();
    const now = Date.now();
    const expiresAt = now + OTP_EXPIRY_MS;

    // Persist OTP with TTL and attempt tracking
    await savePasswordResetOtp({
      email: cleanEmail,
      otp,
      user,
      expiresAt,
    });

    // 3. Dispatch Email via Gmail SMTP or fallback simulation
    await sendPasswordResetOtpEmail(cleanEmail, otp, user.name || 'Admin');

    return res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
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

    const record = await getActiveOtpRecord(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'No active OTP request found for this email. Please request a new code.',
      });
    }

    if (Date.now() > record.expiresAt) {
      await clearOtpRecords(cleanEmail);
      return res.status(400).json({
        success: false,
        error: 'OTP code has expired. Please request a new verification code.',
      });
    }

    // Brute-force protection: check attempt count
    if ((record.attempts || 0) >= MAX_OTP_ATTEMPTS) {
      await clearOtpRecords(cleanEmail);
      return res.status(429).json({
        success: false,
        error: 'Too many incorrect attempts. For security, this code was invalidated. Please request a new one.',
      });
    }

    if (record.otp !== cleanOtp) {
      const attempts = await incrementOtpAttempts(record);
      const remaining = MAX_OTP_ATTEMPTS - attempts;
      if (remaining <= 0) {
        await clearOtpRecords(cleanEmail);
        return res.status(429).json({
          success: false,
          error: 'Too many incorrect attempts. This code was invalidated. Please request a new one.',
        });
      }
      return res.status(400).json({
        success: false,
        error: `Invalid OTP code. ${remaining} attempts remaining.`,
      });
    }

    // Mark as verified
    await markOtpVerified(record);

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

    const record = await getActiveOtpRecord(cleanEmail);
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
      await clearOtpRecords(cleanEmail);
      return res.status(403).json({
        success: false,
        error: 'Password reset window expired. Please request a new code.',
      });
    }

    // 1. Hash new password with PBKDF2
    const hashedPassword = hashPasswordPbkdf2(newPassword);

    // 2. Update in PostgreSQL database (try pool if available, fallback to Supabase REST)
    let updatedUser = null;
    if (pool) {
      try {
        const updateRes = await query(
          `UPDATE public.users 
           SET password = $1, updated_at = NOW() 
           WHERE LOWER(email) = LOWER($2) 
           RETURNING id, name, phone, email, role`,
          [hashedPassword, cleanEmail]
        );
        if (updateRes.rows.length > 0) updatedUser = updateRes.rows[0];
      } catch (err) {
        console.warn('pg pool update failed in resetPassword, trying Supabase REST:', err.message);
      }
    }

    if (!updatedUser && supabase) {
      const { data: supaUpdated, error: supaErr } = await supabase
        .from('users')
        .update({ password: hashedPassword, updated_at: new Date().toISOString() })
        .ilike('email', cleanEmail)
        .select('id, name, phone, email, role');
      if (!supaErr && supaUpdated && supaUpdated.length > 0) {
        updatedUser = supaUpdated[0];
      }
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'Failed to update password. User account not found.',
      });
    }

    // 3. Clear OTP database record to prevent re-use
    await clearOtpRecords(cleanEmail);

    return res.json({
      success: true,
      message: 'Password has been successfully reset. You can now log in with your new password.',
      user: updatedUser,
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


