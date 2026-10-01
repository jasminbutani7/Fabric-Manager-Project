import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
  Building2,
  ShieldCheck,
  Scissors,
  Shirt,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { validateEmail, sanitizeMobileNumber, validateMobileNumber } from '../../utils/formValidation';

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialRole = 'Admin',
  initialPhone = '',
  onSuccessPasswordReset = null,
}) {
  const { sendAdminEmailOtp, verifyAdminEmailOtp, resetAdminPassword, getWorkerAdminDetails } = useAuth();

  // Role: Admin, Master, or Tailor
  const [role, setRole] = useState(initialRole);

  // Admin Flow States
  // step: 1 (Email), 2 (OTP), 3 (New Password), 4 (Success)
  const [adminStep, setAdminStep] = useState(1);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminOtp, setAdminOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Worker Flow States (Master / Tailor)
  const [workerPhone, setWorkerPhone] = useState(initialPhone);
  const [workerData, setWorkerData] = useState(null); // { workerName, adminName, adminPhone, companyName }

  // Shared status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset state when modal opens or initialRole changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setRole(initialRole);
        setAdminStep(1);
        setAdminEmail('');
        setAdminOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setWorkerPhone(initialPhone || '');
        setWorkerData(null);
        setError('');
        setSuccessMsg('');
        setResendCountdown(0);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialRole, initialPhone]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  if (!isOpen) return null;

  // --- ADMIN HANDLERS ---
  const handleAdminSendOtp = async (e) => {
    e?.preventDefault();
    setError('');
    const emailVal = validateEmail(adminEmail);
    if (!emailVal.isValid) {
      setError(emailVal.error);
      return;
    }

    try {
      setLoading(true);
      const res = await sendAdminEmailOtp(emailVal.cleanedValue);
      setSuccessMsg(res.message || 'OTP verification code sent to your email.');
      setAdminStep(2);
      setResendCountdown(60);
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminVerifyOtp = async (e) => {
    e?.preventDefault();
    setError('');
    const cleanOtp = adminOtp.trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email');
      return;
    }

    try {
      setLoading(true);
      await verifyAdminEmailOtp(adminEmail, cleanOtp);
      setSuccessMsg('Email verified! Now choose a new secure password.');
      setAdminStep(3);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminResetPassword = async (e) => {
    e?.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await resetAdminPassword(adminEmail, newPassword);
      setAdminStep(4);
      if (onSuccessPasswordReset) {
        onSuccessPasswordReset();
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // --- WORKER HANDLERS (Master / Tailor) ---
  const handleWorkerFindAdmin = async (e) => {
    e?.preventDefault();
    setError('');
    const phoneVal = validateMobileNumber(workerPhone, { fieldName: 'Mobile number' });
    if (!phoneVal.isValid) {
      setError(phoneVal.error);
      return;
    }

    try {
      setLoading(true);
      const data = await getWorkerAdminDetails(phoneVal.cleanedValue, role);
      setWorkerData(data);
    } catch (err) {
      setError(err.message || `No ${role} profile found with this mobile number.`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!workerData || !workerData.adminPhone) return;
    const cleanAdminPhone = workerData.adminPhone.replace(/\D/g, '');
    const prefilledText = `Hello ${workerData.adminName || 'Admin'},\n\nI am ${workerData.workerName || ''} (${role}) registered at ${workerData.companyName || 'your factory'}.\n\nI have forgotten my login PIN/password for the Fabric Manager portal. Please reset my PIN or share my login credentials.\n\nThank you!`;
    const encodedText = encodeURIComponent(prefilledText);
    const whatsappUrl = `https://wa.me/91${cleanAdminPhone}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                role === 'Admin'
                  ? 'bg-indigo-600'
                  : role === 'Master'
                  ? 'bg-purple-600'
                  : 'bg-teal-600'
              }`}
            >
              {role === 'Admin' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : role === 'Master' ? (
                <Scissors className="w-5 h-5" />
              ) : (
                <Shirt className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {role === 'Admin' ? 'Reset Admin Password' : `${role} Account Help`}
              </h2>
              <p className="text-[11px] text-slate-500">
                {role === 'Admin' ? 'Free Email OTP Verification' : 'Instant Admin WhatsApp Request'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Role Pill Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            {['Admin', 'Master', 'Tailor'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  role === r
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && adminStep !== 4 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-emerald-700 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================= ADMIN FLOW ================= */}
          {role === 'Admin' && (
            <div>
              {/* Step Indicators */}
              <div className="flex items-center justify-between mb-5 px-4">
                {[
                  { step: 1, label: 'Email' },
                  { step: 2, label: 'OTP' },
                  { step: 3, label: 'New Pass' },
                ].map((s, idx) => (
                  <React.Fragment key={s.step}>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          adminStep === s.step
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                            : adminStep > s.step
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {adminStep > s.step ? '✓' : s.step}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">{s.label}</span>
                    </div>
                    {idx < 2 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          adminStep > s.step ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* ADMIN STEP 1: Enter Email */}
              {adminStep === 1 && (
                <form onSubmit={handleAdminSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Registered Admin Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@yourcompany.com"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      We will send a 6-digit OTP code to verify your ownership at no cost.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Send 6-Digit Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ADMIN STEP 2: Enter 6-digit OTP */}
              {adminStep === 2 && (
                <form onSubmit={handleAdminVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Enter 6-Digit OTP
                      </label>
                      <button
                        type="button"
                        onClick={() => setAdminStep(1)}
                        className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3 h-3" /> Change Email
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      required
                      value={adminOtp}
                      onChange={(e) => setAdminOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.5em] text-xl font-bold py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-slate-500">
                        Code sent to: <span className="font-semibold text-slate-700">{adminEmail}</span>
                      </span>
                      {resendCountdown > 0 ? (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Resend in {resendCountdown}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAdminSendOtp}
                          disabled={loading}
                          className="text-[11px] text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Resend Code
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || adminOtp.length !== 6}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Verify Code & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ADMIN STEP 3: Enter New Password */}
              {adminStep === 3 && (
                <form onSubmit={handleAdminResetPassword} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Save New Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ADMIN STEP 4: Success Message */}
              {adminStep === 4 && (
                <div className="text-center py-4 space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Password Successfully Updated!
                  </h3>
                  <p className="text-xs text-slate-600 px-4 leading-relaxed">
                    Your Admin password has been securely reset. You can now sign in with your new credentials.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition-all cursor-pointer"
                  >
                    Sign In Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= WORKER FLOW (Master / Tailor) ================= */}
          {(role === 'Master' || role === 'Tailor') && (
            <div className="space-y-4">
              {!workerData ? (
                /* Step 1: Input registered mobile number */
                <form onSubmit={handleWorkerFindAdmin} className="space-y-4">
                  <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-purple-900">
                      <p className="font-bold">Managed by your Factory Admin</p>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        Enter your registered mobile number below to connect directly with your Admin on WhatsApp to get your PIN reset.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Your Registered Mobile Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        required
                        value={workerPhone}
                        onChange={(e) => setWorkerPhone(sanitizeMobileNumber(e.target.value))}
                        placeholder="10-digit mobile number"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 ${
                      role === 'Master' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-200'
                    } active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer`}
                  >
                    {loading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Find My Factory Admin</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Display Admin details card & 1-click WhatsApp button */
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Worker Profile Found
                        </span>
                        <p className="text-sm font-extrabold text-slate-900">
                          {workerData.workerName}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {role}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {workerData.companyName || 'Fabric Business'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <ShieldCheck className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span>
                          Admin: <strong className="text-slate-800">{workerData.adminName}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>Phone: +91 {workerData.adminPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click WhatsApp Button */}
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {/* WhatsApp Icon */}
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                    <span>Message Admin on WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWorkerData(null)}
                      className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                    >
                      Search Another Number
                    </button>
                    <a
                      href={`tel:${workerData.adminPhone}`}
                      className="py-2 px-4 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all inline-flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" /> Direct Call
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
