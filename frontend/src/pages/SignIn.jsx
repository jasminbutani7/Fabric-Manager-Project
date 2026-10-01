import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Layers,
  ShieldCheck,
  Scissors,
  Shirt,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { sanitizeMobileNumber, validateMobileNumber } from '../utils/formValidation';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role can be 'Admin' | 'Master' | 'Tailor' derived directly from URL searchParams
  const roleParam = searchParams.get('role')?.toLowerCase();
  const selectedRole = roleParam === 'master' ? 'Master' : roleParam === 'tailor' ? 'Tailor' : 'Admin';

  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const handleRoleChange = (role) => {
    setError('');
    setSearchParams(role === 'Admin' ? {} : { role: role.toLowerCase() }, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const phoneVal = validateMobileNumber(mobileNumber, { fieldName: 'Mobile number' });
    if (!phoneVal.isValid) {
      setError(phoneVal.error);
      return;
    }

    if (!password) {
      setError(`Please enter your ${selectedRole === 'Admin' ? 'password' : 'PIN / password'}`);
      return;
    }

    try {
      setLoading(true);
      const user = await login(phoneVal.cleanedValue, password, selectedRole);
      
      // Dynamic role-based redirection
      if (user.role === 'Master') {
        navigate(`/portal/master/${user.id}`, { replace: true });
      } else if (user.role === 'Tailor') {
        navigate(`/portal/tailor/${user.id}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Role visual config
  const roleConfig = {
    Admin: {
      title: 'Admin Portal',
      badgeClass: 'bg-indigo-50 border-indigo-100/80 text-indigo-700',
      icon: ShieldCheck,
      iconColor: 'text-indigo-600',
      accentColor: 'indigo',
      subTitle: 'Sign in to manage your fabric business, inventory & orders',
      btnText: 'Sign In as Admin',
      btnGradient: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
      ringColor: 'focus:ring-indigo-500',
      passwordLabel: 'Admin Password',
      passwordPlaceholder: '••••••••',
    },
    Master: {
      title: 'Cutting Master Portal',
      badgeClass: 'bg-purple-50 border-purple-100/80 text-purple-700',
      icon: Scissors,
      iconColor: 'text-purple-600',
      accentColor: 'purple',
      subTitle: 'Sign in to view assigned fabrics, record cutting & floor trimming',
      btnText: 'Sign In to Master Portal',
      btnGradient: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200',
      ringColor: 'focus:ring-purple-500',
      passwordLabel: 'Master Password / PIN',
      passwordPlaceholder: 'e.g. master123 or your 4-digit PIN',
    },
    Tailor: {
      title: 'Tailor Portal',
      badgeClass: 'bg-teal-50 border-teal-100/80 text-teal-700',
      icon: Shirt,
      iconColor: 'text-teal-600',
      accentColor: 'teal',
      subTitle: 'Sign in to view stitching orders & log finished pieces',
      btnText: 'Sign In to Tailor Portal',
      btnGradient: 'bg-teal-600 hover:bg-teal-700 shadow-teal-200',
      ringColor: 'focus:ring-teal-500',
      passwordLabel: 'Tailor PIN / Password',
      passwordPlaceholder: 'e.g. tailor123 or your 4-digit PIN',
    },
  }[selectedRole];

  const RoleIcon = roleConfig.icon;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8 max-w-md mx-auto">
      {/* Brand & Header */}
      <div className="text-center mb-5">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr ${selectedRole === 'Master' ? 'from-purple-600 to-indigo-600 shadow-purple-200' : selectedRole === 'Tailor' ? 'from-teal-600 to-emerald-600 shadow-teal-200' : 'from-indigo-600 to-violet-600 shadow-indigo-200'} text-white shadow-lg mb-3 transition-all duration-300`}>
          <Layers className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Fabric Manager
        </h1>
        <div className={`inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 border rounded-full ${roleConfig.badgeClass} transition-all`}>
          <RoleIcon className={`w-3.5 h-3.5 ${roleConfig.iconColor}`} />
          <span className="text-xs font-semibold uppercase tracking-wide">
            {roleConfig.title}
          </span>
        </div>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          {roleConfig.subTitle}
        </p>
      </div>

      {/* Role Selector Pill Tabs */}
      <div className="mb-4 bg-slate-200/70 p-1 rounded-2xl flex items-center shadow-inner">
        <button
          type="button"
          onClick={() => handleRoleChange('Admin')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedRole === 'Admin'
              ? 'bg-white text-indigo-700 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>
        <button
          type="button"
          onClick={() => handleRoleChange('Master')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedRole === 'Master'
              ? 'bg-white text-purple-700 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Master</span>
        </button>
        <button
          type="button"
          onClick={() => handleRoleChange('Tailor')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedRole === 'Tailor'
              ? 'bg-white text-teal-700 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shirt className="w-3.5 h-3.5" />
          <span>Tailor</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white py-7 px-5 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-100 sm:px-8">
        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mobile Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {selectedRole === 'Admin' ? 'Mobile Number' : `${selectedRole} Mobile Number`}
              </label>
              {mobileNumber.length > 0 && (
                <span
                  className={`text-[11px] font-semibold ${
                    mobileNumber.length === 10 ? 'text-emerald-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  {mobileNumber.length}/10 digits
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                autoComplete="tel"
                value={mobileNumber}
                onChange={(e) => {
                  setError('');
                  setMobileNumber(sanitizeMobileNumber(e.target.value));
                }}
                placeholder="10-digit registered number"
                className={`w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${roleConfig.ringColor} focus:bg-white transition-all`}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Enter the 10-digit phone registered with your factory
            </p>
          </div>

          {/* Password / PIN */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {roleConfig.passwordLabel}
              </label>
              <button
                type="button"
                onClick={() => setForgotModalOpen(true)}
                className={`text-xs font-semibold cursor-pointer ${
                  selectedRole === 'Admin'
                    ? 'text-indigo-600 hover:text-indigo-500'
                    : selectedRole === 'Master'
                    ? 'text-purple-600 hover:text-purple-500'
                    : 'text-teal-600 hover:text-teal-500'
                }`}
              >
                {selectedRole === 'Admin' ? 'Forgot?' : 'Forgot PIN?'}
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={roleConfig.passwordPlaceholder}
                className={`w-full pl-10 pr-11 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${roleConfig.ringColor} focus:bg-white transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {selectedRole !== 'Admin' && (
              <p className="mt-1 text-[11px] text-slate-400">
                Default PIN is <span className="font-bold text-slate-600">{selectedRole === 'Master' ? 'master123' : 'tailor123'}</span> or set by your factory Admin.
              </p>
            )}
          </div>



          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 py-3.5 px-4 ${roleConfig.btnGradient} active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer`}
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{roleConfig.btnText}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch to Sign Up (Admin only) */}
        {selectedRole === 'Admin' ? (
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Need to register a new fabric business?{' '}
              <Link
                to="/signup"
                className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 ml-1"
              >
                Sign Up as Admin
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Are you a factory owner or admin?{' '}
              <button
                type="button"
                onClick={() => handleRoleChange('Admin')}
                className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 ml-1 cursor-pointer"
              >
                Switch to Admin Sign In
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Feature highlights */}
      <div className="mt-6 flex items-center justify-center gap-4 text-slate-500 text-[11px] font-medium">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Secure Sign-In
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Fast PIN Login
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Mobile Ready
        </span>
      </div>

      {/* Forgot Password / Account Recovery Modal */}
      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        initialRole={selectedRole}
        initialPhone={mobileNumber}
        onSuccessPasswordReset={() => {
          setPassword('');
        }}
      />
    </div>
  );
}
