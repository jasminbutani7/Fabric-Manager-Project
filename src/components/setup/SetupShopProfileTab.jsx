import React, { useState, useEffect } from 'react';
import {
  Building2,
  Edit2,
  Check,
  UserCheck,
  Phone,
  MapPin,
  Save,
  RotateCcw,
  Layers,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { sanitizeMobileNumber, validateMobileNumber } from '../../utils/formValidation';

export default function SetupShopProfileTab({
  onTriggerFabricReset,
  onTriggerDatabaseReset,
  isResetting,
  isResettingFabrics,
  resetSuccess,
  fabricResetSuccess,
}) {
  const { currentUser, updateProfile } = useAuth();

  const [profile, setProfile] = useState({
    name: currentUser?.name || '',
    companyName: currentUser?.companyName || '',
    phone: currentUser?.phone || '',
    gstNumber: '',
    address: '',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (currentUser) {
      // oxlint-disable-next-line react/set-state-in-effect
      setProfile((prev) => ({
        ...prev,
        name: currentUser.name || prev.name || '',
        companyName: currentUser.companyName || prev.companyName || '',
        phone: currentUser.phone || prev.phone || '',
      }));
    }
  }, [currentUser]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileError('');
    if (!profile.name.trim()) {
      setProfileError('Please enter your full name.');
      return;
    }

    const phoneVal = validateMobileNumber(profile.phone, { fieldName: 'Contact mobile number' });
    if (!phoneVal.isValid) {
      setProfileError(phoneVal.error);
      return;
    }

    updateProfile({
      name: profile.name.trim(),
      companyName: profile.companyName.trim(),
      phone: phoneVal.cleanedValue,
    });
    setIsEditingProfile(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Business settings saved successfully!</span>
        </div>
      )}

      {/* Business Profile */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Shop / Fabric Mill Profile</h2>
          </div>
          {!isEditingProfile && (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {!isEditingProfile ? (
          /* Display Profile Details (Default View) */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Shop / Mill Name</span>
              <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{profile.companyName || currentUser?.companyName || 'Not configured'}</span>
              </p>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Admin Contact Name</span>
              <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{profile.name || currentUser?.name || 'Not configured'}</span>
              </p>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mobile Number</span>
              <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{profile.phone || currentUser?.phone || 'Not configured'}</span>
              </p>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Market Address</span>
              <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{profile.address || 'Not configured'}</span>
              </p>
            </div>
          </div>
        ) : (
          /* Editable Profile Form */
          <form onSubmit={handleSaveProfile} className="space-y-3">
            {profileError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <span>{profileError}</span>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Shop / Mill Name
              </label>
              <input
                type="text"
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                placeholder="Enter Shop or Fabric Mill name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admin Contact Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Enter Admin Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: sanitizeMobileNumber(e.target.value) })}
                  placeholder="10-digit mobile"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Market Address
              </label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Enter Market / Mill Address"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setProfile({
                    name: currentUser?.name || '',
                    companyName: currentUser?.companyName || '',
                    phone: currentUser?.phone || '',
                    gstNumber: '',
                    address: profile.address || '',
                  });
                  setIsEditingProfile(false);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Settings</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Danger Zone: Factory Reset */}
      <div className="bg-rose-50/40 rounded-3xl p-5 border border-rose-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-rose-100">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-rose-900">Danger Zone: Reset Database</h2>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 uppercase tracking-wider">
            Irreversible
          </span>
        </div>

        <p className="text-xs text-rose-700 leading-relaxed">
          Wipe factory inventory, fabrics, fabric cuts, tailor assignments, and master handovers to test fresh workflows, or perform a complete factory wipe.
        </p>

        {fabricResetSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Fabric & production data cleared! You can now start with clean, fresh fabric testing.</span>
          </div>
        )}

        {resetSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Database successfully reset! You can now start with a fresh, clean slate.</span>
          </div>
        )}

        <div className="pt-1 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onTriggerFabricReset}
            disabled={isResettingFabrics}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Layers className="w-4 h-4" />
            <span>{isResettingFabrics ? 'Clearing Fabrics...' : 'Clear Fabric & Production Data Only'}</span>
          </button>

          <button
            type="button"
            onClick={onTriggerDatabaseReset}
            disabled={isResetting}
            className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isResetting ? 'Resetting Database...' : 'Clear All Data & Start From Scratch'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
