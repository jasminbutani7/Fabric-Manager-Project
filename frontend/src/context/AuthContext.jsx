import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextInstance';
import { supabase, isSupabaseConfigured, setWorkerAuthHeader, setTenantAuthHeader } from '../lib/supabaseClient';
import { broadcastSyncUpdate } from '../services/realtimeSync';
import { sanitizeMobileNumber, isValidMobileNumber, isValidEmail } from '../utils/formValidation';
import { encryptPassword, decryptPassword, verifyPassword, computePbkdf2HashHex } from '../utils/cryptoAuth';
import { generateEntityId } from '../utils/idGenerator';
import { isBrowserSessionValid, purgeAllStoredSessions, purgeExpenseCaches } from '../utils/sessionSecurity';

const STORAGE_SESSION_KEY = 'fabric_app_session';
const LEGACY_STORAGE_SESSION_KEY = 'febric_app_session';

// Immediately purge persistent session from localStorage on startup so closing the browser expires sessions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(LEGACY_STORAGE_SESSION_KEY);
    purgeExpenseCaches();
  } catch {}
}

export function AuthProvider({ children }) {
  // Clear any legacy localStorage keys on init as requested
  useEffect(() => {
    try {
      const legacyKeys = [
        STORAGE_SESSION_KEY,
        LEGACY_STORAGE_SESSION_KEY,
        'febric_app_users',
        'febric_app_current_user',
        'febric_app_masters',
        'febric_app_machines',
        'febric_app_tailors',
        'febric_app_helpers',
        'febric_app_suppliers',
        'febric_app_fabrics',
        'febric_app_cuttings',
        'febric_app_tailor_assignments',
        'febric_app_master_handovers',
        'febric_app_thread_cutting',
        'febric_app_expenses',
        'febric_app_invoices',
        'febric_app_product_templates',
        'fabric_app_users',
        'fabric_app_current_user',
        'fabric_app_masters',
        'fabric_app_machines',
        'fabric_app_tailors',
        'fabric_app_helpers',
        'fabric_app_suppliers',
        'fabric_app_fabrics',
        'fabric_app_cuttings',
        'fabric_app_tailor_assignments',
        'fabric_app_master_handovers',
        'fabric_app_thread_cutting',
        'fabric_app_expenses',
        'fabric_app_invoices',
        'fabric_app_product_templates',
        'fm_expenses_cache',
      ];
      legacyKeys.forEach((key) => localStorage.removeItem(key));
    } catch (e) {
      console.error('Error clearing legacy localStorage keys', e);
    }
  }, []);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      if (!isBrowserSessionValid()) {
        purgeAllStoredSessions();
        return null;
      }
      const savedUser =
        sessionStorage.getItem(STORAGE_SESSION_KEY) ||
        sessionStorage.getItem(LEGACY_STORAGE_SESSION_KEY);
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.error('Error loading session', e);
    }
    return null;
  });

  const logout = useCallback(() => {
    try {
      if (isSupabaseConfigured && supabase?.auth) {
        supabase.auth.signOut().catch(() => {});
      }
      setWorkerAuthHeader(null);
      setTenantAuthHeader(null);
      purgeAllStoredSessions();
    } catch (e) {
      console.error('Failed to clear session', e);
    }
    setCurrentUser(null);
  }, []);


  const [registeredUsers, setRegisteredUsers] = useState([]);

  // Validate active session against Supabase without querying plain-text passwords or scanning other users
  useEffect(() => {
    let isMounted = true;
    async function validateSession() {
      if (!isSupabaseConfigured || !supabase || !currentUser?.id) return;
      try {
        if (currentUser.role === 'Admin') {
          setTenantAuthHeader(currentUser.id);
          let profile = null;
          try {
            const { data: rpcData, error: rpcErr } = await supabase.rpc('get_user_profile', {
              p_user_id: currentUser.id,
            });
            if (!rpcErr && rpcData) {
              profile = rpcData;
            }
          } catch {}

          if (!profile) {
            try {
              const { data, error } = await supabase
                .from('users')
                .select('id, name, phone, company_name, role, avatar')
                .eq('id', currentUser.id)
                .maybeSingle();
              if (!error && data) {
                profile = data;
              } else if (currentUser.role === 'Admin') {
                // Auto-sync missing user record into Supabase to satisfy foreign key integrity
                await supabase.from('users').upsert([
                  {
                    id: currentUser.id,
                    name: currentUser.name || 'Admin',
                    phone: currentUser.phone || '',
                    email: currentUser.email || null,
                    company_name: currentUser.companyName || currentUser.company_name || 'Fabric Manager',
                    role: 'Admin',
                  },
                ], { onConflict: 'id' });
              }
            } catch (err) {
              console.warn('Auto-sync user record notice:', err);
            }
          }

          if (isMounted && profile) {
            setCurrentUser((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                name: profile.name || prev.name,
                phone: profile.phone || prev.phone,
                companyName: profile.company_name || profile.companyName || prev.companyName,
                role: profile.role || prev.role,
                avatar: profile.avatar || prev.avatar,
              };
            });
          }
        } else if (currentUser.role === 'Master') {
          const { data, error } = await supabase
            .from('masters')
            .select('id, name, phone, user_id, status')
            .eq('id', currentUser.id)
            .maybeSingle();
          if (isMounted && (error || !data || data.status === 'Archived' || data.status === 'Left')) {
            logout();
          }
        } else if (currentUser.role === 'Tailor') {
          const { data, error } = await supabase
            .from('tailors')
            .select('id, name, phone, user_id, status')
            .eq('id', currentUser.id)
            .maybeSingle();
          if (isMounted && (error || !data || data.status === 'Archived' || data.status === 'Left')) {
            logout();
          }
        }
      } catch (err) {
        console.error('Failed to validate active session:', err);
      }
    }
    validateSession();
    return () => {
      isMounted = false;
    };
  }, [
    currentUser?.id,
    currentUser?.role,
    currentUser?.name,
    currentUser?.phone,
    currentUser?.email,
    currentUser?.companyName,
    currentUser?.company_name,
    logout,
  ]);

  // Sync active user session strictly to sessionStorage (browser close will expire session)
  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem(STORAGE_SESSION_KEY);
      }
      localStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem(LEGACY_STORAGE_SESSION_KEY);
    } catch (e) {
      console.error('Failed to sync session', e);
    }
  }, [currentUser]);

  const login = async (identifier, password, preferredRole = null, _rememberMe = false) => {
    const cleanPhone = sanitizeMobileNumber(identifier);
    if (!isValidMobileNumber(cleanPhone)) {
      throw new Error('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
    }

    let user = null;

    // Helper: Attempt Admin login via secure challenge-response RPC (never transfers password hash to client)
    const tryAdminLogin = async () => {
      if (isSupabaseConfigured && supabase) {
        // 1. Get challenge without exposing password hash
        const { data: challenge, error: chErr } = await supabase.rpc('get_auth_user_challenge', {
          p_phone: cleanPhone,
        });

        if (chErr) {
          console.error('Error fetching auth challenge:', chErr);
          if (chErr.code === 'PGRST202' || chErr.message?.includes('not found') || chErr.code === '404') {
            throw new Error('Authentication database service is not available. Please try again shortly or contact administrator.');
          }
        }

        if (!chErr && challenge && challenge.exists) {
          let hashResponse = '';
          let plainPassword = null;

          if (challenge.format === 'pbkdf2' && challenge.salt) {
            hashResponse = await computePbkdf2HashHex(password, challenge.salt, challenge.iterations);
          } else {
            plainPassword = password;
          }

          const { data: authResult, error: authErr } = await supabase.rpc('verify_user_auth', {
            p_phone: cleanPhone,
            p_hash_response: hashResponse,
            p_plain_password: plainPassword,
          });

          if (!authErr && authResult?.success && authResult?.user) {
            const found = authResult.user;
            // Establish native Supabase authenticated session
            if (found.email) {
              try {
                const { error: signInErr } = await supabase.auth.signInWithPassword({
                  email: found.email,
                  password,
                });
                if (signInErr && signInErr.message?.includes('Invalid login credentials')) {
                  // Bridge user into native auth
                  await supabase.auth.signUp({
                    email: found.email,
                    password,
                    options: {
                      data: {
                        name: found.name,
                        phone: found.phone,
                        company_name: found.companyName || found.company_name,
                        role: found.role || 'Admin',
                      },
                    },
                  });
                }
              } catch (authErr) {
                console.warn('Native Supabase Auth session bridge notice:', authErr);
              }
            }

            if (authResult.needsUpgrade) {
              try {
                const encrypted = await encryptPassword(password);
                await supabase.rpc('update_user_password', {
                  p_email: found.email,
                  p_new_password: encrypted,
                });
              } catch (upgradeErr) {
                console.warn('Failed to upgrade user password encryption:', upgradeErr);
              }
            }

            setTenantAuthHeader(found.id);
            return {
              id: found.id,
              name: found.name,
              phone: sanitizeMobileNumber(found.phone) || found.phone,
              email: found.email,
              companyName: found.companyName || found.company_name,
              role: found.role || 'Admin',
              avatar: found.avatar,
            };
          } else {
            throw new Error(authResult?.error || 'Incorrect Admin password. Please verify and try again.');
          }
        }
      } else {
        const found = registeredUsers.find(
          (u) => sanitizeMobileNumber(u.phone) === cleanPhone
        );
        if (found) {
          const { valid } = await verifyPassword(password, found.password);
          if (valid) {
            return found;
          } else {
            throw new Error('Incorrect Admin password. Please verify and try again.');
          }
        }
      }
      return null;
    };

    // Helper: Attempt Master login via secure worker verification RPC
    const tryMasterLogin = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc('verify_worker_pin', {
          p_worker_id: null,
          p_role: 'Master',
          p_pin: password.trim(),
          p_phone: cleanPhone,
        });

        if (!error && data?.success && data?.worker) {
          const found = data.worker;
          const token = data.token || found.token || null;
          setWorkerAuthHeader(found.id, token);
          if (found.user_id) setTenantAuthHeader(found.user_id);
          return {
            id: found.id,
            name: found.name,
            phone: sanitizeMobileNumber(found.phone) || found.phone,
            companyName: 'Fabric Manager',
            role: 'Master',
            user_id: found.user_id,
            adminUserId: found.user_id,
            token,
          };
        } else if (data?.error && data.error !== 'Worker account not found') {
          throw new Error(data.error);
        }
      }
      return null;
    };

    // Helper: Attempt Tailor login via secure worker verification RPC
    const tryTailorLogin = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc('verify_worker_pin', {
          p_worker_id: null,
          p_role: 'Tailor',
          p_pin: password.trim(),
          p_phone: cleanPhone,
        });

        if (!error && data?.success && data?.worker) {
          const found = data.worker;
          const token = data.token || found.token || null;
          setWorkerAuthHeader(found.id, token);
          if (found.user_id) setTenantAuthHeader(found.user_id);
          return {
            id: found.id,
            name: found.name,
            phone: sanitizeMobileNumber(found.phone) || found.phone,
            companyName: 'Fabric Manager',
            role: 'Tailor',
            user_id: found.user_id,
            adminUserId: found.user_id,
            token,
          };
        } else if (data?.error && data.error !== 'Worker account not found') {
          throw new Error(data.error);
        }
      }
      return null;
    };


    // Role-directed authentication flow
    if (preferredRole === 'Admin') {
      user = await tryAdminLogin();
      if (!user) throw new Error('No registered Admin account found with this mobile number.');
    } else if (preferredRole === 'Master') {
      user = await tryMasterLogin();
      if (!user) throw new Error('No registered Master account found with this mobile number.');
    } else if (preferredRole === 'Tailor') {
      user = await tryTailorLogin();
      if (!user) throw new Error('No registered Tailor account found with this mobile number.');
    } else {
      // Auto-detect role: Admin -> Master -> Tailor
      user = await tryAdminLogin();
      if (!user) user = await tryMasterLogin();
      if (!user) user = await tryTailorLogin();
      if (!user) {
        throw new Error('No registered account found with this mobile number. Please check the number or contact your factory admin.');
      }
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      companyName: user.companyName,
      role: user.role || 'Admin',
      avatar: user.avatar,
      user_id: user.user_id || null,
      adminUserId: user.adminUserId || user.user_id || null,
    };

    setCurrentUser(sessionUser);
    try {
      sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionUser));
      localStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem(LEGACY_STORAGE_SESSION_KEY);
    } catch (e) {
      console.error('Failed to save session', e);
    }
    return sessionUser;
  };

  const signup = async ({ name, phone, email, companyName, password }) => {
    const cleanPhone = sanitizeMobileNumber(phone);
    if (!isValidMobileNumber(cleanPhone)) {
      throw new Error('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address');
    }

    // Check if account already exists in database (check both phone and email via secure RPC)
    if (isSupabaseConfigured && supabase) {
      const { data: existData } = await supabase.rpc('check_user_exists', {
        p_phone: cleanPhone,
        p_email: cleanEmail,
      });

      if (existData) {
        if (existData.phoneExists) {
          throw new Error('An account with this mobile number already exists');
        }
        if (existData.emailExists) {
          throw new Error('An account with this email address already exists');
        }
      }
    } else {

      const existing = registeredUsers.find(
        (u) => sanitizeMobileNumber(u.phone) === cleanPhone || (u.email && u.email.toLowerCase() === cleanEmail)
      );
      if (existing) {
        throw new Error('An account with this mobile number or email already exists');
      }
    }

    // Encrypt password using native Web Crypto AES-256-GCM before storage
    const encryptedPassword = await encryptPassword(password);

    // Register with native Supabase Auth
    let supabaseAuthId = null;
    if (isSupabaseConfigured && supabase?.auth) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: name.trim(),
              phone: cleanPhone,
              company_name: companyName.trim() || 'My Fabric Business',
              role: 'Admin',
            },
          },
        });
        if (!authError && authData?.user?.id) {
          supabaseAuthId = authData.user.id;
        }
      } catch (authErr) {
        console.warn('Native Supabase Auth signup bridge notice:', authErr);
      }
    }

    const newUser = {
      id: supabaseAuthId || generateEntityId('usr'),
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      companyName: companyName.trim() || 'My Fabric Business',
      role: 'Admin',
      password: encryptedPassword,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('users').insert([
        {
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email,
          company_name: newUser.companyName,
          role: newUser.role,
          password: newUser.password,
          created_at: newUser.createdAt,
        },
      ]);

      if (error) {
        throw new Error(`Failed to save account to Supabase database: ${error.message}`);
      }
    }

    setRegisteredUsers((prev) => [...prev, newUser]);

    const sessionUser = {
      id: newUser.id,
      name: newUser.name,
      phone: newUser.phone,
      email: newUser.email,
      companyName: newUser.companyName,
      role: newUser.role,
    };

    setCurrentUser(sessionUser);
    return sessionUser;
  };

  const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  const sendAdminEmailOtp = async (email) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    // 1. Try Backend REST API (with Gmail SMTP / NodeMailer)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();

        if (response.ok && data.success) {
          // Store in sessionStorage as backup
          if (data.demoOtp) {
            try {
              const otpRecords = JSON.parse(sessionStorage.getItem('fm_admin_otps') || '{}');
              otpRecords[cleanEmail] = { otp: data.demoOtp, expiresAt: Date.now() + OTP_EXPIRY_MS };
              sessionStorage.setItem('fm_admin_otps', JSON.stringify(otpRecords));
            } catch {}
          }

          return {
            success: true,
            email: cleanEmail,
            message: data.message,
            simulated: data.simulated,
            demoOtp: data.demoOtp,
          };
        }

        // If user not found or validation error from backend, throw specific error
        if (!response.ok && data.error) {
          if (
            response.status >= 500 ||
            data.error.toLowerCase().includes('sasl') ||
            data.error.toLowerCase().includes('scram') ||
            data.error.toLowerCase().includes('password must be a string') ||
            data.error.toLowerCase().includes('connection')
          ) {
            console.warn('Backend /api/auth/forgot-password returned server driver error, proceeding with client fallback:', data.error);
          } else {
            throw new Error(data.error);
          }
        }
      } else {
        console.warn(`Backend /api/auth/forgot-password returned non-JSON response (${response.status}), proceeding with client fallback.`);
      }
    } catch (apiErr) {
      // If error was explicitly returned by backend business validation, rethrow it
      if (
        apiErr.message &&
        !apiErr.message.toLowerCase().includes('fetch') &&
        !apiErr.message.toLowerCase().includes('json') &&
        !apiErr.message.toLowerCase().includes('unexpected') &&
        !apiErr.message.toLowerCase().includes('network')
      ) {
        throw apiErr;
      }
      console.warn('Backend /api/auth/forgot-password unavailable, using client fallback:', apiErr.message);
    }

    // 2. Client-side Fallback (if backend is offline or standalone)
    if (isSupabaseConfigured && supabase) {
      let userFound = false;
      const { data: checkData, error: checkErr } = await supabase.rpc('request_password_reset_check', {
        p_email: cleanEmail,
      });

      if (!checkErr && checkData?.exists) {
        userFound = true;
      } else {
        // Direct query fallback in case RPC schema cache has not yet reloaded
        const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('id, email')
          .ilike('email', cleanEmail)
          .limit(1);

        if (!userErr && userData && userData.length > 0) {
          userFound = true;
        }
      }

      if (!userFound) {
        throw new Error('No registered Admin account found with this email address.');
      }
    }

    // Generate secure 6-digit OTP
    const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    try {
      const otpRecords = JSON.parse(sessionStorage.getItem('fm_admin_otps') || '{}');
      otpRecords[cleanEmail] = { otp: generatedOtp, expiresAt };
      sessionStorage.setItem('fm_admin_otps', JSON.stringify(otpRecords));
    } catch {}

    // Send through Supabase auth built-in emailer if configured
    let emailSent = false;
    if (isSupabaseConfigured && supabase?.auth?.signInWithOtp) {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: true,
          },
        });
        if (!error) emailSent = true;
      } catch (err) {
        console.warn('Supabase auth email notice:', err);
      }
    }

    return {
      success: true,
      email: cleanEmail,
      emailSent,
      demoOtp: generatedOtp,
      simulated: true,
      message: 'OTP verification code generated.',
    };
  };

  const verifyAdminEmailOtp = async (email, inputOtp) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const token = String(inputOtp || '').trim();

    if (!token || token.length !== 6) {
      throw new Error('Please enter the complete 6-digit OTP code.');
    }

    // 1. Try Backend REST API verification
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: token }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();

        if (response.ok && data.success) {
          sessionStorage.setItem(
            'fm_admin_verified_otp',
            JSON.stringify({ email: cleanEmail, otp: token, expiresAt: Date.now() + 15 * 60 * 1000 })
          );
          return { success: true };
        }

        if (!response.ok && data.error) {
          throw new Error(data.error);
        }
      } else {
        console.warn(`Backend /api/auth/verify-otp returned non-JSON response (${response.status}), proceeding with client verification.`);
      }
    } catch (apiErr) {
      if (
        apiErr.message &&
        !apiErr.message.toLowerCase().includes('fetch') &&
        !apiErr.message.toLowerCase().includes('json') &&
        !apiErr.message.toLowerCase().includes('unexpected') &&
        !apiErr.message.toLowerCase().includes('network')
      ) {
        throw apiErr;
      }
      console.warn('Backend /api/auth/verify-otp unavailable, using client fallback:', apiErr.message);
    }

    // 2. Client-side Fallback
    let localMatched = false;
    try {
      const otpRecords = JSON.parse(sessionStorage.getItem('fm_admin_otps') || '{}');
      const rec = otpRecords[cleanEmail];
      if (rec && rec.otp === token && Date.now() <= rec.expiresAt) {
        localMatched = true;
      }
    } catch {}

    let supabaseMatched = false;
    if (isSupabaseConfigured && supabase?.auth?.verifyOtp) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token,
          type: 'email',
        });
        if (!error && data?.session) {
          supabaseMatched = true;
        }
      } catch {}
    }

    if (!localMatched && !supabaseMatched) {
      throw new Error('Invalid or expired OTP code. Please check your email or request a new code.');
    }

    sessionStorage.setItem(
      'fm_admin_verified_otp',
      JSON.stringify({ email: cleanEmail, otp: token, expiresAt: Date.now() + 15 * 60 * 1000 })
    );
    return { success: true };
  };

  const resetAdminPassword = async (email, newPassword) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // Require verified OTP session proof
    let isOtpProofValid = false;
    let savedOtp = '';
    try {
      const verified = JSON.parse(sessionStorage.getItem('fm_admin_verified_otp') || '{}');
      if (verified && verified.email === cleanEmail && Date.now() <= verified.expiresAt) {
        isOtpProofValid = true;
        savedOtp = verified.otp || '';
      }
    } catch {}

    if (!isOtpProofValid) {
      throw new Error('Verification required. Please verify the email OTP code first.');
    }

    // 1. Try Backend REST API
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, newPassword, otp: savedOtp }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();

        if (response.ok && data.success) {
          sessionStorage.removeItem('fm_admin_verified_otp');
          sessionStorage.removeItem('fm_admin_otps');
          return { success: true, message: data.message };
        }

        if (!response.ok && data.error) {
          if (
            response.status >= 500 ||
            data.error.toLowerCase().includes('sasl') ||
            data.error.toLowerCase().includes('scram') ||
            data.error.toLowerCase().includes('password must be a string') ||
            data.error.toLowerCase().includes('connection')
          ) {
            console.warn('Backend /api/auth/reset-password returned server driver error, proceeding with direct database update:', data.error);
          } else {
            throw new Error(data.error);
          }
        }
      } else {
        console.warn(`Backend /api/auth/reset-password returned non-JSON response (${response.status}), proceeding with direct database update.`);
      }
    } catch (apiErr) {
      if (
        apiErr.message &&
        !apiErr.message.toLowerCase().includes('fetch') &&
        !apiErr.message.toLowerCase().includes('json') &&
        !apiErr.message.toLowerCase().includes('unexpected') &&
        !apiErr.message.toLowerCase().includes('network')
      ) {
        throw apiErr;
      }
      console.warn('Backend /api/auth/reset-password unavailable, using client fallback:', apiErr.message);
    }

    // 2. Client-side Fallback
    const encrypted = await encryptPassword(newPassword);

    if (isSupabaseConfigured && supabase) {
      try {
        if (supabase.auth?.updateUser) {
          await supabase.auth.updateUser({ password: newPassword });
        }
      } catch {}

      // Try secure database function first, fallback to standard update
      const { error: rpcErr } = await supabase.rpc('update_user_password', {
        p_email: cleanEmail,
        p_new_password: encrypted,
      });

      if (rpcErr) {
        const { error } = await supabase
          .from('users')
          .update({
            password: encrypted,
            updated_at: new Date().toISOString(),
          })
          .eq('email', cleanEmail);

        if (error) {
          throw new Error(`Failed to update password: ${error.message}`);
        }
      }
    } else {
      const found = registeredUsers.find((u) => u.email === cleanEmail);
      if (found) {
        found.password = encrypted;
      }
    }

    try {
      sessionStorage.removeItem('fm_admin_verified_otp');
      const otpRecords = JSON.parse(sessionStorage.getItem('fm_admin_otps') || '{}');
      delete otpRecords[cleanEmail];
      sessionStorage.setItem('fm_admin_otps', JSON.stringify(otpRecords));
    } catch {}

    return { success: true };
  };

  const getWorkerAdminDetails = async (phone, role = 'Master') => {
    const cleanPhone = sanitizeMobileNumber(phone);
    if (!isValidMobileNumber(cleanPhone)) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        workerName: role,
        workerRole: role,
        adminName: 'Factory Admin',
        adminPhone: '9876543210',
        adminCompanyName: 'Fabric Factory',
      };
    }

    const { data: workerAdmin, error: waErr } = await supabase.rpc('get_worker_admin_details', {
      p_phone: cleanPhone,
      p_role: role,
    });

    if (waErr || !workerAdmin?.success) {
      throw new Error(workerAdmin?.error || `No registered ${role} found with mobile number ${cleanPhone}. Please verify.`);
    }

    return {
      workerName: workerAdmin.workerName,
      workerRole: workerAdmin.workerRole,
      adminName: workerAdmin.adminName,
      adminPhone: workerAdmin.adminPhone,
      adminCompanyName: workerAdmin.adminCompanyName,
    };
  };

  const loginAsWorker = useCallback(({ id, name, phone, role, companyName, user_id, adminUserId, userId, token }) => {
    const adminId = adminUserId || user_id || userId || null;
    const workerUser = {
      id,
      name,
      phone: phone || '',
      role: role || 'Worker',
      companyName: companyName || 'Fabric Factory',
      user_id: adminId,
      adminUserId: adminId,
      token: token || null,
    };
    setWorkerAuthHeader(id, token || null);
    if (adminId) setTenantAuthHeader(adminId);
    setCurrentUser(workerUser);
    try {
      sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(workerUser));
    } catch (e) {
      console.error('Failed to save worker session', e);
    }
    return workerUser;
  }, []);


  // Listen for profile updates across tabs and devices
  useEffect(() => {
    const handleProfileSync = (e) => {
      const data = e?.detail || e?.data;
      if (data?.type === 'PROFILE_UPDATED' && data.item) {
        setCurrentUser((prev) => {
          if (!prev || prev.id !== data.item.id) return prev;
          const merged = { ...prev, ...data.item };
          try {
            sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    };

    window.addEventListener('fm_sync_event', handleProfileSync);
    return () => {
      window.removeEventListener('fm_sync_event', handleProfileSync);
    };
  }, []);

  const updateProfile = async (updates) => {
    const cleanUpdates = { ...updates };
    if (cleanUpdates.phone !== undefined) {
      cleanUpdates.phone = sanitizeMobileNumber(cleanUpdates.phone);
    }

    let updatedUser = null;
    setCurrentUser((prev) => {
      if (!prev) return null;
      updatedUser = { ...prev, ...cleanUpdates };
      try {
        sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedUser));
      } catch {}
      return updatedUser;
    });

    if (currentUser?.id && isSupabaseConfigured && supabase) {
      try {
        const dbUpdates = {};
        if (cleanUpdates.name !== undefined) dbUpdates.name = cleanUpdates.name;
        if (cleanUpdates.companyName !== undefined) dbUpdates.company_name = cleanUpdates.companyName;
        if (cleanUpdates.phone !== undefined) dbUpdates.phone = cleanUpdates.phone;
        await supabase.from('users').update(dbUpdates).eq('id', currentUser.id);
      } catch (e) {
        console.error('Failed to update user profile in Supabase:', e);
      }
    }

    if (updatedUser) {
      broadcastSyncUpdate({
        type: 'PROFILE_UPDATED',
        item: updatedUser,
        id: updatedUser.id,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        signup,
        loginAsWorker,
        logout,
        updateProfile,
        sendAdminEmailOtp,
        verifyAdminEmailOtp,
        resetAdminPassword,
        getWorkerAdminDetails,
        encryptPassword,
        decryptPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
