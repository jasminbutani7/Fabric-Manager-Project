import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Layers,
  ShieldCheck,
  User,
  Building2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { sanitizeMobileNumber, validateMobileNumber, validateEmail } from '../utils/formValidation';

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (error) setError('');
    const sanitizedVal = name === 'phone' ? sanitizeMobileNumber(value) : value;
    setFormData((prev) => ({ ...prev, [name]: sanitizedVal }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!formData.companyName.trim()) {
      setError('Please enter your Fabric Business or Shop Name');
      return;
    }
    const phoneVal = validateMobileNumber(formData.phone, { fieldName: 'Mobile phone number' });
    if (!phoneVal.isValid) {
      setError(phoneVal.error);
      return;
    }
    const emailVal = validateEmail(formData.email);
    if (!emailVal.isValid) {
      setError(emailVal.error);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await signup({
        name: formData.name.trim(),
        companyName: formData.companyName.trim(),
        email: emailVal.cleanedValue,
        phone: phoneVal.cleanedValue,
        password: formData.password,
      });
      // Redirect to Home/Dashboard upon registration
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to create Admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8 max-w-md mx-auto">
      {/* Brand & Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 mb-2">
          <Layers className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Create Admin Account
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Setup your fabric business profile to start managing stock & orders
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white py-6 px-5 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-100 sm:px-8">
        {/* Admin Role Highlight Banner */}
        <div className="mb-4 p-3 bg-indigo-50/80 border border-indigo-100 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">Assigned Role: Admin</p>
              <p className="text-[11px] text-indigo-700">Full system access & business setup control</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-200/70 text-indigo-800 px-2 py-0.5 rounded-full">
            Primary
          </span>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Admin Full Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Your Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Fabric Business / Shop Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Fabric Business / Shop Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Building2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="companyName"
                required
                value={formData.companyName}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Email Address (for free password recovery) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Admin Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                name="email"
                required
                placeholder="admin@yourcompany.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Required for free 1-click password recovery via Email OTP
            </p>
          </div>

          {/* Mobile Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Mobile Number
              </label>
              {formData.phone.length > 0 && (
                <span
                  className={`text-[11px] font-semibold ${
                    formData.phone.length === 10 ? 'text-emerald-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  {formData.phone.length}/10 digits
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
                name="phone"
                required
                maxLength={10}
                placeholder="10-digit mobile number (e.g. 9876543210)"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Must be a valid 10-digit mobile number starting with 6, 7, 8, or 9
            </p>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirm
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Complete Admin Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch to Sign In */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Already have an Admin account?{' '}
            <Link
              to="/signin"
              className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 ml-1"
            >
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
